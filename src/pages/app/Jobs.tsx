import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Jobs() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{t('jobQueue')}</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('inferenceJobs')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('jobsPlaceholder')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}