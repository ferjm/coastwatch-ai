import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlasticDetectionMap, MapDetection } from '@/components/PlasticDetectionMap';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertTriangle, Filter } from 'lucide-react';

import plasticBeach1 from '@/assets/plastic-beach-1.jpg';
import plasticBeach2 from '@/assets/plastic-beach-2.jpg';
import plasticBeach3 from '@/assets/plastic-beach-3.jpg';

// Enhanced mock data with verification status - Brazilian coastal areas
const mockDetectionsWithStatus: (MapDetection & { verified: boolean; reviewedAt?: string })[] = [
  // Rio de Janeiro - Copacabana
  {
    id: '1',
    lat: -22.9707,
    lng: -43.1823,
    confidence: 0.92,
    imageUrl: plasticBeach1,
    detectedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    description: 'Botellas plásticas detectadas en la arena de Copacabana',
    verified: true,
    reviewedAt: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: '2',
    lat: -22.9715,
    lng: -43.1830,
    confidence: 0.85,
    imageUrl: plasticBeach2,
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
    imageUrl: plasticBeach3,
    detectedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    description: 'Fragmentos de plástico en las aguas cristalinas de Ipanema',
    verified: true,
    reviewedAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: '4',
    lat: -22.9850,
    lng: -43.2105,
    confidence: 0.91,
    imageUrl: plasticBeach1,
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
      imageUrl: plasticBeach2,
      detectedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      description: 'Envases plásticos en la exclusiva Playa de Leblon',
      verified: true,
      reviewedAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: '6',
      lat: -22.9870,
      lng: -43.2230,
      confidence: 0.82,
      imageUrl: plasticBeach3,
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
    verified: true,
    reviewedAt: new Date(Date.now() - 10800000).toISOString()
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
    verified: true,
    reviewedAt: new Date(Date.now() - 14400000).toISOString()
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
    verified: true,
    reviewedAt: new Date(Date.now() - 18000000).toISOString()
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
    verified: true,
    reviewedAt: new Date(Date.now() - 21600000).toISOString()
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
    verified: true,
    reviewedAt: new Date(Date.now() - 25200000).toISOString()
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
    verified: true,
    reviewedAt: new Date(Date.now() - 28800000).toISOString()
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
    verified: true,
    reviewedAt: new Date(Date.now() - 32400000).toISOString()
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
    verified: true,
    reviewedAt: new Date(Date.now() - 36000000).toISOString()
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
    verified: true,
    reviewedAt: new Date(Date.now() - 39600000).toISOString()
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
    verified: true,
    reviewedAt: new Date(Date.now() - 43200000).toISOString()
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
  }
];

export default function MapView() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleDetectionClick = (detection: MapDetection) => {
    const enhancedDetection = mockDetectionsWithStatus.find(d => d.id === detection.id);
    const verificationStatus = enhancedDetection?.verified ? t('verified') : t('pendingReview');
    
    toast({
      title: `Plástico - ${verificationStatus}`,
      description: `${t('confidence')}: ${Math.round(detection.confidence * 100)}% - ${detection.description}`,
    });
  };

  const verifiedCount = mockDetectionsWithStatus.filter(d => d.verified).length;
  const unverifiedCount = mockDetectionsWithStatus.filter(d => !d.verified).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('detectionMap')}</h1>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {t('totalDetections')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockDetectionsWithStatus.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              {t('verified')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{verifiedCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              {t('pendingReview')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unverifiedCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('verificationRate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockDetectionsWithStatus.length > 0 
                ? Math.round((verifiedCount / mockDetectionsWithStatus.length) * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Map */}
      <PlasticDetectionMap 
        detections={mockDetectionsWithStatus}
        onDetectionClick={handleDetectionClick}
      />
    </div>
  );
}