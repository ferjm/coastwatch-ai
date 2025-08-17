import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/hooks/use-toast';
import coastalHeroImage from '@/assets/coastal-hero-image.jpg';
import { LanguageSelector } from '@/components/LanguageSelector';

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signInWithGoogle, user } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/app/dashboard');
    }
  }, [user, navigate]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Temporary bypass - go directly to dashboard
    setTimeout(() => {
      toast({
        title: t('welcome'),
        description: t('signInSuccess'),
      });
      navigate('/app/dashboard');
      setLoading(false);
    }, 500);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    
    // Temporary bypass - go directly to dashboard
    setTimeout(() => {
      toast({
        title: t('welcome'),
        description: t('signInSuccess'),
      });
      navigate('/app/dashboard');
      setGoogleLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex">
      {/* Language selector */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>
      
      {/* Left side - Marketing Video */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-600 to-secondary-600">
        <div className="absolute inset-0">
          <img 
            src={coastalHeroImage} 
            alt="Coastal plastic detection"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ocean-900/20 to-primary-900/20" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
              {t('heroTitle')}
            </h1>
            <p className="text-lg text-white/90 mb-6">
              {t('heroDescription')}
            </p>
            
            <div className="space-y-3 text-white/90">
              <p>✓ {t('feature1')}</p>
              <p>✓ {t('feature2')}</p>
              <p>✓ {t('feature3')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-neutral-50 to-secondary-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">{t('appName')}</CardTitle>
            <CardDescription>{t('signInSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button 
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              variant="outline"
              className="w-full"
            >
              {googleLoading ? t('connecting') : t('signInWithGoogle')}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">{t('signInWithEmail')}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('signingIn') : t('login')}
              </Button>
            </form>
            
            <div className="text-center space-y-2">
              <Link 
                to="/register" 
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                {t('noAccount')}
              </Link>
              <br />
              <Link 
                to="/reset-password" 
                className="text-sm text-neutral-500 hover:text-neutral-600"
              >
                {t('forgotPassword')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}