import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileForm } from '@/components/ProfileForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/hooks/use-theme';
import { Monitor, Moon, Sun } from 'lucide-react';

export default function Settings() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: 'light', label: t('lightTheme'), icon: Sun },
    { value: 'dark', label: t('darkTheme'), icon: Moon },
    { value: 'system', label: t('systemTheme'), icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{t('settings')}</h1>
      
      <ProfileForm />
      
      <Card>
        <CardHeader>
          <CardTitle>{t('themeSettings')}</CardTitle>
          <CardDescription>{t('themeDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme-select">{t('appearance')}</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('appearance')} />
              </SelectTrigger>
              <SelectContent>
                {themeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
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