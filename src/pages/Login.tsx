import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/hooks/use-toast';
import { Play } from 'lucide-react';
import heroVideoFrame from '@/assets/hero-video-frame.jpg';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password);
      toast({
        title: 'Bienvenido',
        description: 'Has iniciado sesión correctamente.',
      });
      navigate('/app/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error de autenticación',
        description: error.message || 'Credenciales incorrectas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      toast({
        title: 'Error de autenticación',
        description: error.message || 'Error al conectar con Google',
        variant: 'destructive',
      });
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Marketing Video */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-ocean-600 to-primary-600">
        <div className="absolute inset-0">
          <img 
            src={heroVideoFrame} 
            alt="Coastal plastic detection" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ocean-900/20 to-primary-900/20" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="mb-8">
            <Play className="w-16 h-16 text-white/80 mb-4" />
            <h1 className="text-4xl font-bold mb-4">
              Detección Inteligente de Plásticos Costeros
            </h1>
            <p className="text-lg text-white/90 mb-6">
              Utilizamos inteligencia artificial y análisis de imágenes de dron para identificar 
              y mapear residuos plásticos en zonas costeras con precisión.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-accent rounded-full" />
              <span>Análisis automatizado con IA</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-success rounded-full" />
              <span>Mapas de calor georreferenciados</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-warning rounded-full" />
              <span>Sistema de revisión humana</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-ocean-50 to-primary-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary-700">PlasticWatch</CardTitle>
            <CardDescription>Accede a tu cuenta para continuar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button 
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              variant="outline"
              className="w-full"
            >
              {googleLoading ? 'Conectando...' : 'Continuar con Google'}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">O continúa con</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
            
            <div className="text-center space-y-2">
              <Link 
                to="/register" 
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                ¿No tienes cuenta? Regístrate
              </Link>
              <br />
              <Link 
                to="/reset-password" 
                className="text-sm text-neutral-500 hover:text-neutral-600"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}