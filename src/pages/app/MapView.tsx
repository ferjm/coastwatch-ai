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

// Enhanced mock data with verification status
const mockDetectionsWithStatus: (MapDetection & { verified: boolean; reviewedAt?: string })[] = [
    {
      id: '1',
      lat: 40.7128,
      lng: -74.0060,
      confidence: 0.95,
      imageUrl: '/placeholder.svg',
      detectedAt: new Date(Date.now() - 3600000),
      description: 'Plástico detectado con alta confianza',
      verified: true,
      reviewedAt: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: '2',
      lat: 40.7589,
      lng: -73.9851,
      confidence: 0.87,
      imageUrl: '/placeholder.svg',
      detectedAt: new Date(Date.now() - 7200000),
      description: 'Plástico identificado en área costera',
      verified: false
    },
    {
      id: '3',
      lat: 40.6892,
      lng: -74.0445,
      confidence: 0.72,
      imageUrl: '/placeholder.svg',
      detectedAt: new Date(Date.now() - 10800000),
      description: 'Fragmento de plástico con confianza media',
      verified: true,
      reviewedAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '4',
      lat: 40.7831,
      lng: -73.9712,
      confidence: 0.91,
      imageUrl: '/placeholder.svg',
      detectedAt: new Date(Date.now() - 14400000),
      description: 'Plástico detectado',
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