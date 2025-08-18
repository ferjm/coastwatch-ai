import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileForm } from '@/components/ProfileForm';

export default function Settings() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{t('settings')}</h1>
      
      <ProfileForm />
      
      <Card>
        <CardHeader>
          <CardTitle>{t('systemConfiguration')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('configPlaceholder')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}