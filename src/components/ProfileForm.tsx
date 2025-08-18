import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/auth';
import { AvatarUpload } from './AvatarUpload';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export function ProfileForm() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
      } else {
        // Create profile if it doesn't exist
        const newProfile = {
          id: user.id,
          full_name: null,
          avatar_url: null
        };
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(newProfile);
          
        if (insertError) throw insertError;
        
        setProfile(newProfile);
        setFullName('');
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: t('error'),
        description: t('profileLoadError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName.trim() || null 
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, full_name: fullName.trim() || null } : null);
      
      toast({
        title: t('profileUpdateSuccess'),
        description: t('profileSaved'),
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: t('profileUpdateError'),
        description: error.message || t('profileSaveError'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpdate = (avatarUrl: string) => {
    setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('userProfile')}</CardTitle>
        <CardDescription>{t('profileDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <Label className="text-base font-medium mb-4 block">{t('avatar')}</Label>
            <AvatarUpload 
              currentAvatarUrl={profile?.avatar_url}
              onAvatarUpdate={handleAvatarUpdate}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fullName">{t('fullName')}</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t('fullNamePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('email')}</Label>
            <Input
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-muted-foreground">
              {t('emailCannotChange')}
            </p>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? t('saving') : t('saveProfile')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}