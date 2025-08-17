import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  es: {
    translation: {
      // Common
      "appName": "PlasticWatch by ECOS",
      "loading": "Cargando...",
      "save": "Guardar",
      "cancel": "Cancelar",
      "delete": "Eliminar",
      "edit": "Editar",
      "view": "Ver",
      "back": "Volver",
      "next": "Siguiente",
      "previous": "Anterior",
      "search": "Buscar",
      "filter": "Filtrar",
      "refresh": "Actualizar",
      
      // Auth
      "login": "Iniciar Sesión",
      "register": "Registrarse",
      "logout": "Cerrar Sesión",
      "email": "Email",
      "password": "Contraseña",
      "confirmPassword": "Confirmar Contraseña",
      "forgotPassword": "¿Olvidaste tu contraseña?",
      "signInWithGoogle": "Continuar con Google",
      "signInWithEmail": "O continúa con",
      "signInSubtitle": "Accede a tu cuenta para continuar",
      "noAccount": "¿No tienes cuenta? Regístrate",
      "hasAccount": "¿Ya tienes cuenta? Inicia sesión",
      "signingIn": "Iniciando sesión...",
      "connecting": "Conectando...",
      "welcome": "Bienvenido",
      "signInSuccess": "Has iniciado sesión correctamente.",
      "authError": "Error de autenticación",
      "invalidCredentials": "Credenciales incorrectas",
      "googleAuthError": "Error al conectar con Google",
      "sessionClosed": "Sesión cerrada",
      "signOutSuccess": "Has cerrado sesión correctamente.",
      "signOutError": "Error al cerrar sesión",
      
      // Marketing
      "heroTitle": "Detección Inteligente de Plásticos Costeros",
      "heroDescription": "Utilizamos inteligencia artificial y análisis de imágenes de dron para identificar y mapear residuos plásticos en zonas costeras con precisión.",
      "feature1": "Análisis automatizado con IA",
      "feature2": "Mapas de calor georreferenciados", 
      "feature3": "Sistema de revisión humana",
      
      // Navigation
      "dashboard": "Dashboard",
      "uploads": "Subidas",
      "map": "Mapa",
      "review": "Revisión",
      "areas": "Áreas",
      "flights": "Vuelos",
      "models": "Modelos",
      "jobs": "Trabajos",
      "settings": "Configuración",
    }
  },
  en: {
    translation: {
      // Common
      "appName": "PlasticWatch by ECOS",
      "loading": "Loading...",
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Delete",
      "edit": "Edit",
      "view": "View",
      "back": "Back",
      "next": "Next",
      "previous": "Previous",
      "search": "Search",
      "filter": "Filter",
      "refresh": "Refresh",
      
      // Auth
      "login": "Sign In",
      "register": "Sign Up",
      "logout": "Sign Out",
      "email": "Email",
      "password": "Password",
      "confirmPassword": "Confirm Password",
      "forgotPassword": "Forgot your password?",
      "signInWithGoogle": "Continue with Google",
      "signInWithEmail": "Or continue with",
      "signInSubtitle": "Sign in to your account to continue",
      "noAccount": "Don't have an account? Sign up",
      "hasAccount": "Already have an account? Sign in",
      "signingIn": "Signing in...",
      "connecting": "Connecting...",
      "welcome": "Welcome",
      "signInSuccess": "You have successfully signed in.",
      "authError": "Authentication error",
      "invalidCredentials": "Invalid credentials",
      "googleAuthError": "Error connecting with Google",
      "sessionClosed": "Session closed",
      "signOutSuccess": "You have successfully signed out.",
      "signOutError": "Error signing out",
      
      // Marketing
      "heroTitle": "Smart Coastal Plastic Detection",
      "heroDescription": "We use artificial intelligence and drone image analysis to identify and map plastic waste in coastal areas with precision.",
      "feature1": "AI-powered automated analysis",
      "feature2": "Georeferenced heat maps",
      "feature3": "Human review system",
      
      // Navigation
      "dashboard": "Dashboard",
      "uploads": "Uploads",
      "map": "Map",
      "review": "Review",
      "areas": "Areas",
      "flights": "Flights",
      "models": "Models",
      "jobs": "Jobs",
      "settings": "Settings",
    }
  },
  pt: {
    translation: {
      // Common
      "appName": "PlasticWatch by ECOS",
      "loading": "Carregando...",
      "save": "Salvar",
      "cancel": "Cancelar",
      "delete": "Excluir",
      "edit": "Editar",
      "view": "Ver",
      "back": "Voltar",
      "next": "Próximo",
      "previous": "Anterior",
      "search": "Pesquisar",
      "filter": "Filtrar",
      "refresh": "Atualizar",
      
      // Auth
      "login": "Entrar",
      "register": "Cadastrar",
      "logout": "Sair",
      "email": "Email",
      "password": "Senha",
      "confirmPassword": "Confirmar Senha",
      "forgotPassword": "Esqueceu sua senha?",
      "signInWithGoogle": "Continuar com Google",
      "signInWithEmail": "Ou continue com",
      "signInSubtitle": "Entre em sua conta para continuar",
      "noAccount": "Não tem uma conta? Cadastre-se",
      "hasAccount": "Já tem uma conta? Entre",
      "signingIn": "Entrando...",
      "connecting": "Conectando...",
      "welcome": "Bem-vindo",
      "signInSuccess": "Você entrou com sucesso.",
      "authError": "Erro de autenticação",
      "invalidCredentials": "Credenciais inválidas",
      "googleAuthError": "Erro ao conectar com Google",
      "sessionClosed": "Sessão encerrada",
      "signOutSuccess": "Você saiu com sucesso.",
      "signOutError": "Erro ao sair",
      
      // Marketing
      "heroTitle": "Detecção Inteligente de Plásticos Costeiros",
      "heroDescription": "Usamos inteligência artificial e análise de imagens de drone para identificar e mapear resíduos plásticos em áreas costeiras com precisão.",
      "feature1": "Análise automatizada com IA",
      "feature2": "Mapas de calor georreferenciados",
      "feature3": "Sistema de revisão humana",
      
      // Navigation
      "dashboard": "Dashboard",
      "uploads": "Uploads",
      "map": "Mapa",
      "review": "Revisão",
      "areas": "Áreas",
      "flights": "Voos",
      "models": "Modelos",
      "jobs": "Trabalhos",
      "settings": "Configurações",
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es',
    debug: false,
    
    interpolation: {
      escapeValue: false,
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
    }
  });

export default i18n;