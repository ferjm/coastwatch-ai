import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

export function RootRedirect() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is authenticated, redirect to app map
  if (user) {
    return <Navigate to="/app/map" replace />;
  }

  // If user is not authenticated, redirect to auth page
  return <Navigate to="/auth" replace />;
}