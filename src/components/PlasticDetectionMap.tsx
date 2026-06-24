/// <reference types="google.maps" />
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getGoogleMapsApiKey } from '@/services/mapsApi';
import { DetectionImageViewer } from './DetectionImageViewer';
import {
  Map as MapIcon,
  Satellite,
  Layers,
  Mountain,
  ZoomIn,
  MapPin,
  Clock,
  Eye
} from 'lucide-react';


// Detection data interface
export interface MapDetection {
  id: string;
  lat: number;
  lng: number;
  confidence: number;
  imageUrl: string;
  detectedAt: Date;
  description?: string;
  verified?: boolean;
  count?: number;
  source?: 'edge' | 'cloud' | 'both';
}

interface PlasticMapProps {
  detections?: MapDetection[];
  onDetectionClick?: (detection: MapDetection) => void;
  className?: string;
}

const SRC = { edge: '#EC4899', cloud: '#06B6D4', both: '#3B82F6' } as const;

// Map component that uses Google Maps
function MapComponent({
  detections = [],
  onDetectionClick,
  className = ""
}: PlasticMapProps) {
  const { t } = useTranslation();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [mapType, setMapType] = useState<string>('roadmap');
  // Heatmap propio a base de círculos translúcidos superpuestos (la API de Google retiró
  // google.maps.visualization.HeatmapLayer en la v3.65). Donde se solapan, el compositing
  // alfa oscurece el área → efecto de densidad sin depender de la librería `visualization`.
  const heatmapCirclesRef = useRef<google.maps.Circle[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || map) return;

    const newMap = new google.maps.Map(mapRef.current, {
      center: { lat: -22.9707, lng: -43.1823 },
      zoom: 7,
      mapTypeId: mapType as google.maps.MapTypeId
    });

    setMap(newMap);

    // Initialize InfoWindow
    infoWindowRef.current = new google.maps.InfoWindow();

    return () => {
      // Cleanup
      markersRef.current.forEach(marker => marker.setMap(null));
      heatmapCirclesRef.current.forEach(c => c.setMap(null));
      heatmapCirclesRef.current = [];
    };
  }, []);

  // Handle map type changes
  useEffect(() => {
    if (!map) return;
    map.setMapTypeId(mapType as google.maps.MapTypeId);
  }, [map, mapType]);

  // Update markers when detections change
  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    detections.forEach(detection => {
      const marker = new google.maps.Marker({
        position: { lat: detection.lat, lng: detection.lng },
        map: map,
        title: `Plástico - ${Math.round(detection.confidence * 100)}%`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: Math.min(20, 6 + (detection.count ?? 1)),
          fillColor: SRC[detection.source ?? 'both'],
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      marker.addListener('click', () => {
        if (infoWindowRef.current) {
          const content = `
            <div class="p-3 max-w-xs">
              <div class="font-semibold text-lg mb-2">Plástico detectado</div>
              <div class="text-sm text-gray-600 mb-2">
                ${t('confidence')}: ${Math.round(detection.confidence * 100)}%
              </div>
              <div class="text-sm text-gray-600 mb-2">
                ${t('coordinates')}: ${detection.lat.toFixed(4)}, ${detection.lng.toFixed(4)}
              </div>
              <div class="text-xs text-gray-500 mb-3">
                ${t('lastUpdated')}: ${detection.detectedAt.toLocaleDateString()}
              </div>
              ${detection.description ? `<div class="text-sm mb-3">${detection.description}</div>` : ''}
            </div>
          `;

          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open(map, marker);
        }

        onDetectionClick?.(detection);
      });

      markersRef.current.push(marker);
    });
  }, [map, detections, t, onDetectionClick]);

  // Handle heatmap toggle (círculos translúcidos; ver nota en heatmapCirclesRef)
  useEffect(() => {
    if (!map) return;

    // Limpia los círculos previos antes de redibujar o al desactivar.
    const clearCircles = () => {
      heatmapCirclesRef.current.forEach(c => c.setMap(null));
      heatmapCirclesRef.current = [];
    };
    clearCircles();

    if (showHeatmap) {
      const maxWeight = detections.reduce((m, d) => Math.max(m, d.count ?? 1), 1);
      heatmapCirclesRef.current = detections.map(detection => {
        const weight = detection.count ?? 1;
        // Opacidad por peso (saturada) + composición alfa al solapar → densidad.
        const fillOpacity = 0.18 + 0.32 * Math.min(1, weight / maxWeight);
        return new google.maps.Circle({
          map,
          center: { lat: detection.lat, lng: detection.lng },
          radius: 60, // metros; el solape entre puntos cercanos crea el degradado de densidad
          strokeWeight: 0,
          fillColor: '#FF3D00',
          fillOpacity,
          clickable: false,
          zIndex: 1,
        });
      });
    }

    return clearCircles;
  }, [map, showHeatmap, detections]);

  const zoomToDetections = () => {
    if (!map || detections.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    detections.forEach(detection => {
      bounds.extend({ lat: detection.lat, lng: detection.lng });
    });
    map.fitBounds(bounds);
  };

  // Global function for InfoWindow buttons
  useEffect(() => {
    (window as any).viewDetectionImage = (detectionId: string) => {
      const detection = detections.find(d => d.id === detectionId);
      if (detection) {
        onDetectionClick?.(detection);
      }
    };

    return () => {
      delete (window as any).viewDetectionImage;
    };
  }, [detections, onDetectionClick]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapIcon className="h-5 w-5" />
            {t('plasticDetections')} ({detections.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Map Type */}
            <div className="space-y-2">
              <Label>{t('mapView')}</Label>
              <select
                value={mapType}
                onChange={(e) => setMapType(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="roadmap">{t('mapView')}</option>
                <option value="satellite">{t('satelliteView')}</option>
                <option value="terrain">{t('terrainView')}</option>
                <option value="hybrid">{t('hybridView')}</option>
              </select>
            </div>

            {/* Heatmap Toggle */}
            <div className="space-y-2">
              <Label htmlFor="heatmap-toggle">{t('detectionDensity')}</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="heatmap-toggle"
                  checked={showHeatmap}
                  onCheckedChange={setShowHeatmap}
                />
                <Label htmlFor="heatmap-toggle" className="text-sm">
                  {showHeatmap ? t('hideHeatmap') : t('showHeatmap')}
                </Label>
              </div>
            </div>

            {/* Zoom to Detections */}
            <div className="space-y-2">
              <Label>{t('navigation')}</Label>
              <Button onClick={zoomToDetections} variant="outline" className="w-full">
                <ZoomIn className="h-4 w-4 mr-2" />
                {t('zoomToDetections')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card>
        <CardContent className="p-0">
          <div ref={mapRef} className="w-full h-96 md:h-[500px] rounded-lg" />
        </CardContent>
      </Card>

      {/* Detection Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t('detectionSummary')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-medium">Imágenes con detecciones</span>
            </div>
            <div className="text-lg font-bold">
              {detections.length}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading component
function MapLoadingComponent() {
  const { t } = useTranslation();
  return (
    <div className="w-full h-96 md:h-[500px] bg-muted rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">{t('mapLoading')}</p>
      </div>
    </div>
  );
}

// Error component
function MapErrorComponent() {
  const { t } = useTranslation();
  return (
    <div className="w-full h-96 md:h-[500px] bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="text-red-600 mb-2">{t('mapError')}</div>
        <p className="text-sm text-red-500">
          Please check your Google Maps API key configuration.
        </p>
      </div>
    </div>
  );
}

// Render function for Wrapper — only handles LOADING/FAILURE; SUCCESS lets children render
const render = (status: Status) => {
  switch (status) {
    case Status.LOADING:
      return <MapLoadingComponent />;
    case Status.FAILURE:
      return <MapErrorComponent />;
    default:
      return <></>;
  }
};

// Main component
export function PlasticDetectionMap({
  detections,
  onDetectionClick,
  className
}: PlasticMapProps) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const key = await getGoogleMapsApiKey();

        if (key) {
          setApiKey(key);
        } else {
          setError('No API key received from Supabase');
        }
      } catch (error: any) {
        setError(`Error: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApiKey();
  }, []);

  if (isLoading) {
    return <MapLoadingComponent />;
  }

  if (error || !apiKey) {
    return <MapErrorComponent />;
  }

  return (
    <Wrapper
      apiKey={apiKey}
      render={render}
    >
      <MapComponent
        detections={detections}
        onDetectionClick={onDetectionClick}
        className={className}
      />
    </Wrapper>
  );
}
