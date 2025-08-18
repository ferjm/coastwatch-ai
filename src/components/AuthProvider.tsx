import { ReactNode, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/integrations/supabase/client';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setSession, setLoading, fetchUserRoles } = useAuthStore();

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Fetch user roles after authentication changes
      if (session?.user) {
        setTimeout(() => {
          fetchUserRoles();
        }, 0);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        setTimeout(() => {
          fetchUserRoles();
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setSession, setLoading, fetchUserRoles]);

  return <>{children}</>;
}