import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlasticDetectionMap, MapDetection } from '@/components/PlasticDetectionMap';
import { useToast } from '@/hooks/use-toast';

export default function MapView() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleDetectionClick = (detection: MapDetection) => {
    toast({
      title: detection.type,
      description: `${t('confidence')}: ${Math.round(detection.confidence * 100)}% - ${detection.description}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('detectionMap')}</h1>
      </div>
      
      <PlasticDetectionMap 
        onDetectionClick={handleDetectionClick}
      />
    </div>
  );
}