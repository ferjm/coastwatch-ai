import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, UserPlus } from 'lucide-react';

interface UserWithRoles {
  id: string;
  email: string;
  roles: string[];
}

export default function UserManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      // Fetch all user roles with user emails
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .order('role');

      if (error) throw error;

      // Group roles by user_id
      const userRolesMap = new Map<string, string[]>();
      data?.forEach(({ user_id, role }) => {
        if (!userRolesMap.has(user_id)) {
          userRolesMap.set(user_id, []);
        }
        userRolesMap.get(user_id)?.push(role);
      });

      // Get user emails from auth.users (via edge function if needed)
      // For now, we'll use the user_id as email placeholder
      const usersWithRoles: UserWithRoles[] = Array.from(userRolesMap.entries()).map(
        ([userId, roles]) => ({
          id: userId,
          email: `Usuario ${userId.slice(0, 8)}...`, // Simplified for demo
          roles,
        })
      );

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async (userId: string, role: 'admin' | 'researcher' | 'viewer') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role } as any)
        .select();

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: `Rol ${role} asignado correctamente`,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'No se pudo asignar el rol: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const removeRole = async (userId: string, role: 'admin' | 'researcher' | 'viewer') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: `Rol ${role} removido correctamente`,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'No se pudo remover el rol: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'researcher':
        return 'default';
      case 'viewer':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'researcher':
        return 'Investigador';
      case 'viewer':
        return 'Visualizador';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
        <p className="text-muted-foreground">
          Administra los roles y permisos de los usuarios del sistema
        </p>
      </div>

      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{user.email}</CardTitle>
                  <CardDescription>ID: {user.id}</CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {user.roles.map((role) => (
                    <div key={role} className="flex items-center gap-1">
                      <Badge variant={getRoleBadgeVariant(role)}>
                        {getRoleLabel(role)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRole(user.id, role as 'admin' | 'researcher' | 'viewer')}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Select
                  onValueChange={(role) => assignRole(user.id, role as 'admin' | 'researcher' | 'viewer')}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Asignar rol..." />
                  </SelectTrigger>
                  <SelectContent>
                    {!user.roles.includes('viewer') && (
                      <SelectItem value="viewer">Visualizador</SelectItem>
                    )}
                    {!user.roles.includes('researcher') && (
                      <SelectItem value="researcher">Investigador</SelectItem>
                    )}
                    {!user.roles.includes('admin') && (
                      <SelectItem value="admin">Administrador</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Asignar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {users.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No hay usuarios registrados</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}