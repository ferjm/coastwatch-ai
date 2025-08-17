import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Flights() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{t('flightManagement')}</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('droneFlights')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('flightsPlaceholder')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}