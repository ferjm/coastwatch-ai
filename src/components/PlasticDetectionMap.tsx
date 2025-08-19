import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getGoogleMapsApiKey } from '@/services/mapsApi';
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
}

interface PlasticMapProps {
  detections?: MapDetection[];
  onDetectionClick?: (detection: MapDetection) => void;
  className?: string;
}

// Mock detection data for demonstration - Brazilian beaches and coastal areas
const mockDetections: MapDetection[] = [
  {
    id: '1',
    lat: -22.9707,
    lng: -43.1823,
    confidence: 0.92,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    description: 'Plástico detectado en Playa de Copacabana',
    verified: true
  },
  {
    id: '2',
    lat: -22.9845,
    lng: -43.2096,
    confidence: 0.78,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    description: 'Plástico disperso en las aguas de Playa de Ipanema',
    verified: false
  },
  {
    id: '3',
    lat: -22.9831,
    lng: -43.2089,
    confidence: 0.87,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    description: 'Plástico entre las rocas del Arpoador',
    verified: true
  },
  {
    id: '4',
    lat: -22.9864,
    lng: -43.2223,
    confidence: 0.95,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    description: 'Plástico en Playa de Leblon',
    verified: false
  },
  {
    id: '5',
    lat: -22.9523,
    lng: -43.1656,
    confidence: 0.89,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    description: 'Plástico en Praia Vermelha, Urca',
    verified: true
  },
  {
    id: '6',
    lat: -24.0142,
    lng: -46.2567,
    confidence: 0.76,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    description: 'Plástico en Praia de Pitangueiras, Guarujá',
    verified: false
  }
];

// Map component that uses Google Maps
function MapComponent({ 
  detections = mockDetections, 
  onDetectionClick,
  className = ""
}: PlasticMapProps) {
  const { t } = useTranslation();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [mapType, setMapType] = useState<string>('roadmap');
  const [heatmapLayer, setHeatmapLayer] = useState<google.maps.visualization.HeatmapLayer | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const filteredDetections = detections;

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || map) return;

    const newMap = new google.maps.Map(mapRef.current, {
      center: { lat: -22.9707, lng: -43.1823 }, // Rio de Janeiro - Copacabana
      zoom: 7,
      mapTypeId: mapType as google.maps.MapTypeId,
      styles: [
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#193441' }]
        },
        {
          featureType: 'landscape',
          elementType: 'geometry',
          stylers: [{ color: '#2c5530' }]
        }
      ]
    });

    setMap(newMap);

    // Initialize InfoWindow
    infoWindowRef.current = new google.maps.InfoWindow();

    return () => {
      // Cleanup
      markersRef.current.forEach(marker => marker.setMap(null));
      if (heatmapLayer) {
        heatmapLayer.setMap(null);
      }
    };
  }, [mapType]);

  // Update markers when detections or filters change
  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    filteredDetections.forEach(detection => {
      const marker = new google.maps.Marker({
        position: { lat: detection.lat, lng: detection.lng },
        map: map,
        title: `Plástico - ${Math.round(detection.confidence * 100)}%`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: detection.verified ? '#10B981' : '#F59E0B',
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      marker.addListener('click', () => {
        const verificationStatus = detection.verified ? 'Verificado' : 'Pendiente de verificación';
        const content = `
          <div class="p-3 max-w-xs">
            <div class="font-semibold text-lg mb-2">Plástico detectado</div>
            <div class="text-sm text-gray-600 mb-2">
              ${t('confidence')}: ${Math.round(detection.confidence * 100)}%
            </div>
            <div class="text-sm text-gray-600 mb-2">
              Estado: ${verificationStatus}
            </div>
            <div class="text-sm text-gray-600 mb-2">
              ${t('coordinates')}: ${detection.lat.toFixed(4)}, ${detection.lng.toFixed(4)}
            </div>
            <div class="text-xs text-gray-500 mb-3">
              ${t('lastUpdated')}: ${detection.detectedAt.toLocaleDateString()}
            </div>
            ${detection.description ? `<div class="text-sm mb-3">${detection.description}</div>` : ''}
            <button 
              onclick="window.viewDetectionImage('${detection.id}')"
              class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
            >
              ${t('viewImage')}
            </button>
          </div>
        `;

        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open(map, marker);
        }

        onDetectionClick?.(detection);
      });

      markersRef.current.push(marker);
    });
  }, [map, filteredDetections, t, onDetectionClick]);

  // Handle heatmap toggle
  useEffect(() => {
    if (!map) return;

    if (showHeatmap) {
      const heatmapData = filteredDetections.map(detection => ({
        location: new google.maps.LatLng(detection.lat, detection.lng),
        weight: detection.confidence
      }));

      const newHeatmapLayer = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: map,
        radius: 50,
        opacity: 0.6
      });

      setHeatmapLayer(newHeatmapLayer);
    } else {
      if (heatmapLayer) {
        heatmapLayer.setMap(null);
        setHeatmapLayer(null);
      }
    }

    return () => {
      if (heatmapLayer) {
        heatmapLayer.setMap(null);
      }
    };
  }, [map, showHeatmap, filteredDetections]);

  const zoomToDetections = () => {
    if (!map || filteredDetections.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    filteredDetections.forEach(detection => {
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
            {t('plasticDetections')} ({filteredDetections.length})
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500" />
                <span className="font-medium">Verificadas</span>
              </div>
              <div className="text-lg font-bold">
                {filteredDetections.filter(d => d.verified).length}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-orange-500" />
                <span className="font-medium">Pendientes</span>
              </div>
              <div className="text-lg font-bold">
                {filteredDetections.filter(d => !d.verified).length}
              </div>
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

// Render function for Wrapper
const render = (status: Status) => {
  switch (status) {
    case Status.LOADING:
      return <MapLoadingComponent />;
    case Status.FAILURE:
      return <MapErrorComponent />;
    case Status.SUCCESS:
      return <MapComponent />;
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
      libraries={['visualization']}
    >
      <MapComponent 
        detections={detections}
        onDetectionClick={onDetectionClick}
        className={className}
      />
    </Wrapper>
  );
}