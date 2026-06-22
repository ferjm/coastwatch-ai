import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { InviteUserDialog } from '@/components/InviteUserDialog';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [roleChanges, setRoleChanges] = useState<Record<string, string>>({});

  const fetchUsers = async () => {
    try {
      // Call edge function to get users with emails using supabase client
      const { data, error } = await supabase.functions.invoke('get-users-with-roles');

      if (error) {
        throw error;
      }

      setUsers(data || []);
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

  // Filtered users based on search and role filter
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const handleRoleChange = (userId: string, newRole: string) => {
    setRoleChanges(prev => ({ ...prev, [userId]: newRole }));
  };

  const hasRoleChanged = (userId: string) => {
    return roleChanges[userId] && roleChanges[userId] !== users.find(u => u.id === userId)?.role;
  };

  const assignRole = async (userId: string) => {
    const newRole = roleChanges[userId];
    if (!newRole) return;
    
    try {
      await changeUserRole(userId, newRole as 'admin' | 'researcher' | 'viewer');
      setRoleChanges(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    } catch (error) {
      // Error handling is already in changeUserRole
    }
  };

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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('userManagement')}</h1>
          <p className="text-muted-foreground">
            {t('manageUsersDescription')}
          </p>
        </div>
        <InviteUserDialog onInvited={fetchUsers} />
      </div>

      {/* Search and Filter Controls */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t('searchUsers')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t('filterByRole')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allRoles')}</SelectItem>
                <SelectItem value="admin">{t('administrator')}</SelectItem>
                <SelectItem value="researcher">{t('researcher')}</SelectItem>
                <SelectItem value="viewer">{t('viewer')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt="Avatar" 
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold text-sm">
                          {user.full_name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {user.full_name || user.email}
                  </CardTitle>
                  <CardDescription>
                    {user.full_name && <div>Email: {user.email}</div>}
                    {t('lastSignIn')}: {user.last_sign_in_at 
                      ? new Date(user.last_sign_in_at).toLocaleDateString() 
                      : t('never')}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getRoleBadgeVariant(roleChanges[user.id] || user.role)}>
                    {getRoleLabel(roleChanges[user.id] || user.role)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Select
                  onValueChange={(role) => handleRoleChange(user.id, role)}
                  value={roleChanges[user.id] || user.role}
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
                {hasRoleChanged(user.id) && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => assignRole(user.id)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t('assign')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm || roleFilter !== 'all' 
                  ? t('noUsersFound') 
                  : t('noUsersRegistered')
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}