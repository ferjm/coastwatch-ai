import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getGoogleMapsApiKey } from '@/services/mapsApi';
import { 
  Map as MapIcon, 
  Satellite, 
  Layers, 
  Mountain, 
  ZoomIn, 
  Filter, 
  MapPin,
  Clock,
  Eye
} from 'lucide-react';


// Detection data interface
export interface MapDetection {
  id: string;
  lat: number;
  lng: number;
  type: string;
  confidence: number;
  imageUrl: string;
  detectedAt: Date;
  description?: string;
}

interface PlasticMapProps {
  detections?: MapDetection[];
  onDetectionClick?: (detection: MapDetection) => void;
  className?: string;
}

// Mock detection data for demonstration - Brazilian beaches and coastal areas
const mockDetections: MapDetection[] = [
  // Copacabana Beach - Rio de Janeiro
  {
    id: '1',
    lat: -22.9707,
    lng: -43.1823,
    type: 'Botellas',
    confidence: 0.92,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    description: 'Botellas plásticas arrastradas por la marea en Playa de Copacabana'
  },
  // Ipanema Beach - Rio de Janeiro
  {
    id: '2',
    lat: -22.9845,
    lng: -43.2096,
    type: 'Fragmentos',
    confidence: 0.78,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    description: 'Microplásticos dispersos en las aguas de Playa de Ipanema'
  },
  {
    id: '3',
    lat: -22.9831,
    lng: -43.2089,
    type: 'Bolsas',
    confidence: 0.87,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    description: 'Bolsas plásticas entre las rocas del Arpoador'
  },
  
  // Leblon Beach - Rio de Janeiro
  {
    id: '4',
    lat: -22.9864,
    lng: -43.2223,
    type: 'Redes',
    confidence: 0.95,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    description: 'Red de pesca abandonada en Playa de Leblon'
  },
  
  // Praia Vermelha - Rio de Janeiro  
  {
    id: '5',
    lat: -22.9523,
    lng: -43.1656,
    type: 'Botellas',
    confidence: 0.89,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    description: 'Botellas de vidrio y plástico en Praia Vermelha, Urca'
  },
  
  // Praia de Pitangueiras - Guarujá, SP
  {
    id: '6',
    lat: -24.0142,
    lng: -46.2567,
    type: 'Fragmentos',
    confidence: 0.76,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    description: 'Fragmentos de plástico en Praia de Pitangueiras, Guarujá'
  },
  {
    id: '7',
    lat: -24.0167,
    lng: -46.2589,
    type: 'Contenedores',
    confidence: 0.91,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
    description: 'Envases de alimentos en zona de restaurantes playeros'
  },
  
  // Praia das Astúrias - Guarujá, SP
  {
    id: '8',
    lat: -24.0089,
    lng: -46.2678,
    type: 'Redes',
    confidence: 0.88,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    description: 'Restos de redes de pesca en Praia das Astúrias'
  },
  
  // Praia de Joaquina - Florianópolis, SC
  {
    id: '9',
    lat: -27.6234,
    lng: -48.4456,
    type: 'Botellas',
    confidence: 0.94,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 9 * 60 * 60 * 1000),
    description: 'Botellas acumuladas tras eventos de surf en Joaquina'
  },
  {
    id: '10',
    lat: -27.6198,
    lng: -48.4423,
    type: 'Bolsas',
    confidence: 0.82,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
    description: 'Bolsas de snacks dispersas en dunas de Joaquina'
  },
  
  // Praia Mole - Florianópolis, SC
  {
    id: '11',
    lat: -27.6089,
    lng: -48.4234,
    type: 'Fragmentos',
    confidence: 0.79,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 11 * 60 * 60 * 1000),
    description: 'Microplásticos en zona de surf de Praia Mole'
  },
  
  // Praia do Flamengo - Salvador, BA
  {
    id: '12',
    lat: -12.9714,
    lng: -38.5014,
    type: 'Contenedores',
    confidence: 0.86,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    description: 'Envases de bebidas en Praia do Flamengo, Salvador'
  },
  
  // Praia de Stella Maris - Salvador, BA
  {
    id: '13',
    lat: -12.9234,
    lng: -38.4756,
    type: 'Bolsas',
    confidence: 0.83,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 13 * 60 * 60 * 1000),
    description: 'Bolsas plásticas en Praia de Stella Maris'
  },
  
  // Praia de Boa Viagem - Recife, PE
  {
    id: '14',
    lat: -8.1398,
    lng: -34.9039,
    type: 'Redes',
    confidence: 0.93,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 14 * 60 * 60 * 1000),
    description: 'Redes de pesca en arrecifes de Boa Viagem'
  },
  {
    id: '15',
    lat: -8.1423,
    lng: -34.9067,
    type: 'Botellas',
    confidence: 0.85,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 15 * 60 * 60 * 1000),
    description: 'Botellas en zona hotelera de Boa Viagem'
  },
  
  // Praia de Iracema - Fortaleza, CE
  {
    id: '16',
    lat: -3.7319,
    lng: -38.5267,
    type: 'Bolsas',
    confidence: 0.81,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 16 * 60 * 60 * 1000),
    description: 'Bolsas plásticas en Praia de Iracema tras eventos nocturnos'
  },
  
  // Praia do Futuro - Fortaleza, CE
  {
    id: '17',
    lat: -3.7567,
    lng: -38.4789,
    type: 'Fragmentos',
    confidence: 0.77,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 17 * 60 * 60 * 1000),
    description: 'Fragmentos dispersos por viento en Praia do Futuro'
  },
  
  // Praia da Ferradura - Búzios, RJ
  {
    id: '18',
    lat: -22.7469,
    lng: -41.8819,
    type: 'Botellas',
    confidence: 0.90,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
    description: 'Botellas en zona de fondeo de yates en Ferradura'
  },
  
  // Praia do Forno - Arraial do Cabo, RJ
  {
    id: '19',
    lat: -22.9661,
    lng: -42.0278,
    type: 'Redes',
    confidence: 0.92,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 19 * 60 * 60 * 1000),
    description: 'Red dañando coral en área protegida do Forno'
  },
  
  // Praia dos Anjos - Arraial do Cabo, RJ
  {
    id: '20',
    lat: -22.9689,
    lng: -42.0298,
    type: 'Contenedores',
    confidence: 0.88,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
    description: 'Envases de pescadores en puerto de Anjos'
  },
  
  // Praia Grande - Ubatuba, SP
  {
    id: '21',
    lat: -23.4267,
    lng: -45.0689,
    type: 'Fragmentos',
    confidence: 0.73,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 21 * 60 * 60 * 1000),
    description: 'Microplásticos en zona de preservación de Ubatuba'
  },
  
  // Praia de Ponta Negra - Natal, RN
  {
    id: '22',
    lat: -5.8839,
    lng: -35.1856,
    type: 'Bolsas',
    confidence: 0.86,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
    description: 'Bolsas en dunas de Ponta Negra, Natal'
  },
  
  // Praia de Pipa - Rio Grande do Norte
  {
    id: '23',
    lat: -6.2298,
    lng: -35.0656,
    type: 'Redes',
    confidence: 0.94,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
    description: 'Redes fantasma afectando vida marina en Pipa'
  },
  
  // Praia de Camboinhas - Niterói, RJ
  {
    id: '24',
    lat: -22.9556,
    lng: -43.0456,
    type: 'Botellas',
    confidence: 0.87,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    description: 'Botellas en zona residencial de Camboinhas'
  },
  
  // Praia de Itaúna - Saquarema, RJ
  {
    id: '25',
    lat: -22.9234,
    lng: -42.5678,
    type: 'Fragmentos',
    confidence: 0.80,
    imageUrl: '/placeholder.svg',
    detectedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    description: 'Fragmentos tras competencia de surf en Itaúna'
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
  const [selectedType, setSelectedType] = useState<string>('all');
  const [mapType, setMapType] = useState<string>('roadmap');
  const [heatmapLayer, setHeatmapLayer] = useState<google.maps.visualization.HeatmapLayer | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const filteredDetections = selectedType === 'all' 
    ? detections 
    : detections.filter(d => d.type === selectedType);

  const uniqueTypes = [...new Set(detections.map(d => d.type))];

  const getMarkerColor = (type: string) => {
    const colors: Record<string, string> = {
      'Botellas': '#3B82F6',
      'Bolsas': '#10B981', 
      'Redes': '#F59E0B',
      'Fragmentos': '#EF4444',
      'Contenedores': '#8B5CF6',
      'Otros': '#6B7280'
    };
    return colors[type] || '#6B7280';
  };

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
        title: `${detection.type} - ${Math.round(detection.confidence * 100)}%`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: getMarkerColor(detection.type),
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      marker.addListener('click', () => {
        const content = `
          <div class="p-3 max-w-xs">
            <div class="font-semibold text-lg mb-2">${detection.type}</div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Map Type */}
            <div className="space-y-2">
              <Label>{t('mapView')}</Label>
              <Select value={mapType} onValueChange={setMapType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="roadmap">
                    <div className="flex items-center gap-2">
                      <MapIcon className="h-4 w-4" />
                      {t('mapView')}
                    </div>
                  </SelectItem>
                  <SelectItem value="satellite">
                    <div className="flex items-center gap-2">
                      <Satellite className="h-4 w-4" />
                      {t('satelliteView')}
                    </div>
                  </SelectItem>
                  <SelectItem value="terrain">
                    <div className="flex items-center gap-2">
                      <Mountain className="h-4 w-4" />
                      {t('terrainView')}
                    </div>
                  </SelectItem>
                  <SelectItem value="hybrid">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      {t('hybridView')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter by Type */}
            <div className="space-y-2">
              <Label>{t('filterByType')}</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allTypes')}</SelectItem>
                  {uniqueTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getMarkerColor(type) }}
                        />
                        {type}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <CardTitle>{t('recentDetections')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {uniqueTypes.map(type => {
              const typeDetections = filteredDetections.filter(d => d.type === type);
              const avgConfidence = typeDetections.reduce((acc, d) => acc + d.confidence, 0) / typeDetections.length;
              
              return (
                <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: getMarkerColor(type) }}
                    />
                    <span className="font-medium">{type}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{typeDetections.length}</div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round(avgConfidence * 100)}% {t('confidence')}
                    </div>
                  </div>
                </div>
              );
            })}
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
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        addDebugInfo('🔄 Iniciando obtención de API key desde Supabase...');
        const key = await getGoogleMapsApiKey();
        
        if (key) {
          addDebugInfo('✅ API key obtenida exitosamente desde Supabase');
          addDebugInfo(`📝 Longitud de API key: ${key.length} caracteres`);
          addDebugInfo(`🔑 Primeros 20 caracteres: ${key.substring(0, 20)}...`);
          setApiKey(key);
        } else {
          addDebugInfo('❌ No se recibió API key de Supabase');
          setError('No API key received from Supabase');
        }
      } catch (error: any) {
        addDebugInfo(`💥 Error al obtener API key: ${error.message}`);
        addDebugInfo(`🔍 Tipo de error: ${error.constructor.name}`);
        addDebugInfo(`📋 Error completo: ${JSON.stringify(error, null, 2)}`);
        setError(`Error: ${error.message}`);
      } finally {
        addDebugInfo('🏁 Proceso de obtención de API key completado');
        setIsLoading(false);
      }
    };

    fetchApiKey();
  }, []);


  // Debug Panel Component
  const DebugPanel = () => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-orange-600">
          🐛 Panel de Debugging - Google Maps API
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-xs font-medium text-blue-800">Estado</div>
              <div className="text-sm text-blue-700">
                {isLoading ? '⏳ Cargando...' : apiKey ? '✅ Listo' : '❌ Error'}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-xs font-medium text-green-800">API Key</div>
              <div className="text-sm text-green-700">
                {apiKey ? `✅ Presente (${apiKey.length} chars) · Origen: Supabase` : '❌ No disponible'}
              </div>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <div className="text-xs font-medium text-red-800">Error</div>
              <div className="text-sm text-red-700">
                {error || '✅ Sin errores'}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
            <div className="text-xs font-medium text-gray-800 mb-2">Log de Debugging:</div>
            {debugInfo.length === 0 ? (
              <div className="text-xs text-gray-500">Sin logs aún...</div>
            ) : (
              debugInfo.map((log, index) => (
                <div key={index} className="text-xs text-gray-600 font-mono mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return <MapLoadingComponent />;
  }

  if (error || !apiKey) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-red-600 mb-2 text-lg font-semibold">
              ❌ Error cargando Google Maps
            </div>
            <p className="text-red-500 mb-4">
              {error || 'No se pudo obtener la API key'}
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-left">
              <div className="font-medium text-yellow-800 mb-2">Posibles soluciones:</div>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Verificar que la API key esté configurada en Supabase secrets</li>
                <li>• Asegurarte de que la edge function esté desplegada</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    );
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