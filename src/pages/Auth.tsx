import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/hooks/use-toast';
import { LanguageSelector } from '@/components/LanguageSelector';

export default function Auth() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle, user } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/app/dashboard');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password);
      toast({
        title: t('signInSuccess'),
        description: t('welcome'),
      });
      navigate('/app/dashboard');
    } catch (error: any) {
      toast({
        title: t('authError'),
        description: error.message || t('invalidCredentials'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: t('authError'),
        description: t('passwordsDontMatch'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password);
      toast({
        title: t('registrationSuccess'),
        description: t('checkEmailConfirm'),
      });
      // Don't navigate immediately, user needs to confirm email
    } catch (error: any) {
      toast({
        title: t('registrationError'),
        description: error.message || t('accountCreationError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      toast({
        title: t('authError'),
        description: error.message || t('googleAuthError'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero/Marketing */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-ocean-50 to-primary-50 p-12 items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold text-primary-700 mb-6">
            Proyecto ECOS
          </h1>
          <p className="text-lg text-primary-600 mb-8">
            Sistema avanzado de detección y análisis de contaminación plástica marina
          </p>
          <div className="grid grid-cols-1 gap-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              <span className="text-primary-700">Análisis con IA</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              <span className="text-primary-700">Mapas interactivos</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              <span className="text-primary-700">Monitoreo en tiempo real</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-end">
            <LanguageSelector />
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t('login')}</TabsTrigger>
              <TabsTrigger value="register">{t('register')}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold text-primary-700">
                    {t('welcomeAuth')}
                  </CardTitle>
                  <CardDescription>
                    {t('signInDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">{t('email')}</Label>
                      <Input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('emailPlaceholder')}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">{t('password')}</Label>
                      <Input
                        id="login-password"
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

                  <div className="mt-4">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          {t('orContinueWith')}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      type="button"
                      className="w-full mt-4"
                      onClick={handleGoogleSignIn}
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Google
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold text-primary-700">
                    {t('createAccountTitle')}
                  </CardTitle>
                  <CardDescription>
                    {t('createAccountDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-email">{t('email')}</Label>
                      <Input
                        id="register-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('emailPlaceholder')}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">{t('password')}</Label>
                      <Input
                        id="register-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">{t('confirmPassword')}</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? t('creatingAccount') : t('createAccount')}
                    </Button>
                  </form>
                  
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    {t('newUsersRegisterAs')} <strong>{t('viewer')}</strong> {t('byDefault')}
                    {t('adminCanAssign')}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <Link 
              to="/" 
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              {t('backToHome')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}