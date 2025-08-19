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
  // Rio de Janeiro - Copacabana
  {
    id: '1',
    lat: -22.9707,
    lng: -43.1823,
    confidence: 0.92,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    description: 'Botellas plásticas detectadas en la arena de Copacabana',
    verified: true
  },
  {
    id: '2',
    lat: -22.9715,
    lng: -43.1830,
    confidence: 0.85,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    description: 'Residuos plásticos arrastrados por las olas en Copacabana',
    verified: false
  },
  
  // Rio de Janeiro - Ipanema
  {
    id: '3',
    lat: -22.9845,
    lng: -43.2096,
    confidence: 0.78,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    description: 'Fragmentos de plástico en las aguas cristalinas de Ipanema',
    verified: true
  },
  {
    id: '4',
    lat: -22.9850,
    lng: -43.2105,
    confidence: 0.91,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    description: 'Bolsas plásticas entre las rocas del Arpoador',
    verified: false
  },
  
  // Rio de Janeiro - Leblon
  {
    id: '5',
    lat: -22.9864,
    lng: -43.2223,
    confidence: 0.95,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    description: 'Envases plásticos en la exclusiva Playa de Leblon',
    verified: true
  },
  {
    id: '6',
    lat: -22.9870,
    lng: -43.2230,
    confidence: 0.82,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    description: 'Microplásticos dispersos en Leblon',
    verified: false
  },
  
  // Rio de Janeiro - Barra da Tijuca
  {
    id: '7',
    lat: -23.0129,
    lng: -43.3093,
    confidence: 0.88,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
    description: 'Residuos plásticos en la extensa Barra da Tijuca',
    verified: true
  },
  {
    id: '8',
    lat: -23.0140,
    lng: -43.3100,
    confidence: 0.79,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    description: 'Botellas de bebidas en Barra da Tijuca',
    verified: false
  },
  
  // São Paulo - Guarujá
  {
    id: '9',
    lat: -24.0142,
    lng: -46.2567,
    confidence: 0.76,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 9 * 60 * 60 * 1000),
    description: 'Plásticos en Praia de Pitangueiras, Guarujá',
    verified: true
  },
  {
    id: '10',
    lat: -24.0089,
    lng: -46.2678,
    confidence: 0.93,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
    description: 'Redes plásticas en Praia das Astúrias, Guarujá',
    verified: false
  },
  {
    id: '11',
    lat: -24.0167,
    lng: -46.2589,
    confidence: 0.87,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 11 * 60 * 60 * 1000),
    description: 'Contenedores de alimentos en zona turística de Guarujá',
    verified: true
  },
  
  // Santa Catarina - Florianópolis
  {
    id: '12',
    lat: -27.5954,
    lng: -48.5480,
    confidence: 0.84,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    description: 'Plásticos en Praia da Joaquina, Florianópolis',
    verified: false
  },
  {
    id: '13',
    lat: -27.6089,
    lng: -48.4234,
    confidence: 0.91,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 13 * 60 * 60 * 1000),
    description: 'Fragmentos plásticos en Praia Mole',
    verified: true
  },
  {
    id: '14',
    lat: -27.4891,
    lng: -48.3958,
    confidence: 0.77,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 14 * 60 * 60 * 1000),
    description: 'Residuos plásticos en Praia dos Ingleses',
    verified: false
  },
  
  // Bahia - Salvador
  {
    id: '15',
    lat: -12.9714,
    lng: -38.5014,
    confidence: 0.89,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 15 * 60 * 60 * 1000),
    description: 'Botellas plásticas en Praia do Flamengo, Salvador',
    verified: true
  },
  {
    id: '16',
    lat: -12.9234,
    lng: -38.4756,
    confidence: 0.83,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 16 * 60 * 60 * 1000),
    description: 'Bolsas plásticas en Praia de Stella Maris',
    verified: false
  },
  {
    id: '17',
    lat: -13.0042,
    lng: -38.5145,
    confidence: 0.94,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 17 * 60 * 60 * 1000),
    description: 'Residuos plásticos en Porto da Barra',
    verified: true
  },
  
  // Pernambuco - Recife
  {
    id: '18',
    lat: -8.1398,
    lng: -34.9039,
    confidence: 0.86,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
    description: 'Plásticos en los arrecifes de Boa Viagem',
    verified: false
  },
  {
    id: '19',
    lat: -8.1423,
    lng: -34.9067,
    confidence: 0.92,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 19 * 60 * 60 * 1000),
    description: 'Botellas en zona hotelera de Boa Viagem',
    verified: true
  },
  
  // Ceará - Fortaleza  
  {
    id: '20',
    lat: -3.7319,
    lng: -38.5267,
    confidence: 0.81,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
    description: 'Residuos plásticos en Praia de Iracema',
    verified: false
  },
  {
    id: '21',
    lat: -3.7567,
    lng: -38.4789,
    confidence: 0.88,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 21 * 60 * 60 * 1000),
    description: 'Fragmentos plásticos en Praia do Futuro',
    verified: true
  },
  {
    id: '22',
    lat: -3.7289,
    lng: -38.5123,
    confidence: 0.75,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
    description: 'Plásticos dispersos en Praia de Meireles',
    verified: false
  },
  
  // Rio Grande do Norte - Natal
  {
    id: '23',
    lat: -5.8839,
    lng: -35.1856,
    confidence: 0.86,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
    description: 'Bolsas plásticas en dunas de Ponta Negra',
    verified: true
  },
  {
    id: '24',
    lat: -6.2298,
    lng: -35.0656,
    confidence: 0.94,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    description: 'Redes fantasma afectando vida marina en Pipa',
    verified: false
  },
  
  // Espírito Santo - Vitória
  {
    id: '25',
    lat: -20.3155,
    lng: -40.2918,
    confidence: 0.79,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    description: 'Residuos plásticos en Praia de Camburi',
    verified: true
  },
  {
    id: '26',
    lat: -20.2845,
    lng: -40.2598,
    confidence: 0.85,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
    description: 'Botellas plásticas en Praia da Costa',
    verified: false
  },
  
  // Paraná - Matinhos
  {
    id: '27',
    lat: -25.8175,
    lng: -48.5424,
    confidence: 0.82,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 27 * 60 * 60 * 1000),
    description: 'Plásticos en Praia de Matinhos',
    verified: true
  },
  {
    id: '28',
    lat: -25.8934,
    lng: -48.6123,
    confidence: 0.77,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 28 * 60 * 60 * 1000),
    description: 'Fragmentos plásticos en Praia de Guaratuba',
    verified: false
  },
  
  // Alagoas - Maceió
  {
    id: '29',
    lat: -9.6658,
    lng: -35.7353,
    confidence: 0.90,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 29 * 60 * 60 * 1000),
    description: 'Residuos plásticos en Praia de Pajuçara',
    verified: true
  },
  {
    id: '30',
    lat: -9.6456,
    lng: -35.7123,
    confidence: 0.83,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    description: 'Botellas en aguas cristalinas de Maceió',
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
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [mapType, setMapType] = useState<string>('roadmap');
  const [heatmapLayer, setHeatmapLayer] = useState<google.maps.visualization.HeatmapLayer | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const filteredDetections = showVerifiedOnly 
    ? detections.filter(d => d.verified) 
    : detections;

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || map) return;

    const newMap = new google.maps.Map(mapRef.current, {
      center: { lat: -22.9707, lng: -43.1823 }, // Rio de Janeiro - Copacabana
      zoom: 7,
      mapTypeId: mapType as google.maps.MapTypeId
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

            {/* Verified Only Toggle */}
            <div className="space-y-2">
              <Label htmlFor="verified-toggle">{t('filterDetections')}</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="verified-toggle"
                  checked={showVerifiedOnly}
                  onCheckedChange={setShowVerifiedOnly}
                />
                <Label htmlFor="verified-toggle" className="text-sm">
                  {t('showVerifiedOnly')}
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