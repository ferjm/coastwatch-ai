import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

interface UserWithRole {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function UserManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { session } = useAuthStore();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      // Call edge function to get users with emails
      const response = await fetch(
        `https://sgotsbheftlbtedrmsiw.supabase.co/functions/v1/get-users-with-roles`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const usersData = await response.json();
      setUsers(usersData);
    } catch (error: any) {
      toast({
        title: t('error'),
        description: t('errorLoadingUsers') + ': ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const changeUserRole = async (userId: string, newRole: 'admin' | 'researcher' | 'viewer') => {
    try {
      // Since roles are now mutually exclusive, we update instead of insert
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: t('roleAssignedSuccess'),
        description: `${t('role')} ${t(newRole)} ${t('assignedSuccessfully')}`,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: t('errorAssigningRole') + ': ' + error.message,
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
        return t('administrator');
      case 'researcher':
        return t('researcher');
      case 'viewer':
        return t('viewer');
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
        <h1 className="text-3xl font-bold">{t('userManagement')}</h1>
        <p className="text-muted-foreground">
          {t('manageUsersDescription')}
        </p>
      </div>

      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{user.email}</CardTitle>
                  <CardDescription>
                    {t('lastSignIn')}: {user.last_sign_in_at 
                      ? new Date(user.last_sign_in_at).toLocaleDateString() 
                      : t('never')}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {getRoleLabel(user.role)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Select
                  onValueChange={(role) => changeUserRole(user.id, role as 'admin' | 'researcher' | 'viewer')}
                  value={user.role}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t('assignRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">{t('viewer')}</SelectItem>
                    <SelectItem value="researcher">{t('researcher')}</SelectItem>
                    <SelectItem value="admin">{t('administrator')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('assign')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {users.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">{t('noUsersRegistered')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}