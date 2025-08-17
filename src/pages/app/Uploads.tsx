import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Uploads() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{t('uploadImages')}</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('uploadArea')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center">
            <p className="text-muted-foreground">{t('uploadPlaceholder')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}