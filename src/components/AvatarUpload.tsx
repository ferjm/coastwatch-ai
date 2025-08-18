import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/auth';
import { Camera, Loader2 } from 'lucide-react';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  onAvatarUpdate: (url: string) => void;
}

export function AvatarUpload({ currentAvatarUrl, onAvatarUpdate }: AvatarUploadProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadAvatar = async (file: File) => {
    if (!user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload image to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update user profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onAvatarUpdate(data.publicUrl);
      
      toast({
        title: t('uploadSuccess'),
        description: t('avatarUpdated'),
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: t('uploadError'),
        description: error.message || t('avatarUploadError'),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('fileTooLarge'),
        description: t('avatarMaxSize'),
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('invalidFileType'),
        description: t('avatarImageOnly'),
        variant: 'destructive',
      });
      return;
    }

    uploadAvatar(file);
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200">
          {currentAvatarUrl ? (
            <img 
              src={currentAvatarUrl} 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
          onClick={handleCameraClick}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">
          {t('avatarUploadDescription')}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('avatarRequirements')}
        </p>
      </div>
    </div>
  );
}