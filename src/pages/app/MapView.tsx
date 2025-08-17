import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MapView() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{t('detectionMap')}</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('geospatialView')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">{t('mapsPlaceholder')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}