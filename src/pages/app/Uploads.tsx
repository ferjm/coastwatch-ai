import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUpload, UploadFile } from '@/components/ImageUpload';

export default function Uploads() {
  const { t } = useTranslation();

  const handleFilesAdded = (files: UploadFile[]) => {
    console.log('Files added:', files);
  };

  const handleUploadComplete = (files: UploadFile[]) => {
    console.log('Upload completed:', files);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('uploadImages')}</h1>
      </div>
      
      <ImageUpload 
        onFilesAdded={handleFilesAdded}
        onUploadComplete={handleUploadComplete}
        maxFiles={20}
      />
    </div>
  );
}