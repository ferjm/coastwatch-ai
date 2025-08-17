import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileImage, CheckCircle, AlertCircle } from 'lucide-react';

export interface UploadFile {
  id: string;
  file: File;
  preview: string;
  status: 'ready' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

interface ImageUploadProps {
  onFilesAdded?: (files: UploadFile[]) => void;
  onUploadComplete?: (files: UploadFile[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
}

export function ImageUpload({ 
  onFilesAdded, 
  onUploadComplete, 
  maxFiles = 50,
  maxFileSize = 50 * 1024 * 1024 // 50MB
}: ImageUploadProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    rejectedFiles.forEach(({ file, errors }) => {
      errors.forEach((error: any) => {
        let message = t('uploadError');
        if (error.code === 'file-too-large') {
          message = t('fileTooLarge');
        } else if (error.code === 'file-invalid-type') {
          message = t('invalidFileType');
        }
        toast({
          title: t('error'),
          description: `${file.name}: ${message}`,
          variant: 'destructive',
        });
      });
    });

    // Process accepted files
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: 'ready',
      progress: 0,
    }));

    setUploadFiles(prev => [...prev, ...newFiles]);
    onFilesAdded?.(newFiles);
  }, [onFilesAdded, t, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.tiff', '.webp']
    },
    maxFiles: maxFiles - uploadFiles.length,
    maxSize: maxFileSize,
    disabled: isUploading
  });

  const removeFile = (id: string) => {
    setUploadFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const clearAll = () => {
    uploadFiles.forEach(file => URL.revokeObjectURL(file.preview));
    setUploadFiles([]);
  };

  const simulateUpload = async () => {
    setIsUploading(true);
    
    try {
      // Simulate upload process for each file
      for (const file of uploadFiles) {
        if (file.status === 'ready') {
          // Update status to uploading
          setUploadFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, status: 'uploading' } : f
          ));

          // Simulate progress
          for (let progress = 0; progress <= 100; progress += 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            setUploadFiles(prev => prev.map(f => 
              f.id === file.id ? { ...f, progress } : f
            ));
          }

          // Mark as completed
          setUploadFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, status: 'completed', progress: 100 } : f
          ));
        }
      }

      toast({
        title: t('uploadSuccess'),
        description: t('processingImages'),
      });

      onUploadComplete?.(uploadFiles);
    } catch (error) {
      toast({
        title: t('uploadError'),
        description: t('uploadError'),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalSize = uploadFiles.reduce((acc, file) => acc + file.file.size, 0);
  const readyFiles = uploadFiles.filter(f => f.status === 'ready').length;

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {isDragActive ? t('dragDropImages') : t('dragDropImages')}
            </h3>
            <p className="text-muted-foreground mb-4">{t('orClickToSelect')}</p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{t('supportedFormats')}</p>
              <p>{t('maxFileSize')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {uploadFiles.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{t('uploadedImages')}</h3>
                <p className="text-sm text-muted-foreground">
                  {uploadFiles.length} {t('filesSelected')} • {t('totalSize')}: {formatFileSize(totalSize)}
                </p>
              </div>
              <div className="flex gap-2">
                {readyFiles > 0 && (
                  <Button onClick={simulateUpload} disabled={isUploading}>
                    {isUploading ? t('uploading') : t('startUpload')}
                  </Button>
                )}
                <Button variant="outline" onClick={clearAll} disabled={isUploading}>
                  {t('clearAll')}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploadFiles.map((uploadFile) => (
                <div key={uploadFile.id} className="border rounded-lg p-3">
                  {/* Image Preview */}
                  <div className="aspect-video mb-3 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={uploadFile.preview}
                      alt={uploadFile.file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* File Info */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {uploadFile.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(uploadFile.file.size)}
                        </p>
                      </div>
                      {uploadFile.status === 'ready' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(uploadFile.id)}
                          className="ml-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {uploadFile.status === 'ready' && (
                        <Badge variant="secondary">
                          <FileImage className="h-3 w-3 mr-1" />
                          {t('ready')}
                        </Badge>
                      )}
                      {uploadFile.status === 'uploading' && (
                        <Badge variant="default">
                          <Upload className="h-3 w-3 mr-1" />
                          {t('uploading')}
                        </Badge>
                      )}
                      {uploadFile.status === 'completed' && (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {t('completed')}
                        </Badge>
                      )}
                      {uploadFile.status === 'error' && (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {t('error')}
                        </Badge>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {(uploadFile.status === 'uploading' || uploadFile.status === 'completed') && (
                      <Progress value={uploadFile.progress} className="h-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}