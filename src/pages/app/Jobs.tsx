import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ImageItem } from '@/types';
import { RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';

// Mock data for demonstration
const mockJobs: ImageItem[] = [
  {
    id: '1',
    fileName: 'ocean_plastic_1.jpg',
    widthPx: 1920,
    heightPx: 1080,
    status: 'processing',
    hash: 'hash1',
    uploadedAt: new Date(Date.now() - 300000).toISOString(), // 5 min ago
    thumbUrl: '/placeholder.svg'
  },
  {
    id: '2',
    fileName: 'beach_debris_2.jpg',
    widthPx: 1920,
    heightPx: 1080,
    status: 'queued',
    hash: 'hash2',
    uploadedAt: new Date(Date.now() - 600000).toISOString(), // 10 min ago
    thumbUrl: '/placeholder.svg'
  },
  {
    id: '3',
    fileName: 'plastic_bottles_3.jpg',
    widthPx: 1920,
    heightPx: 1080,
    status: 'processed',
    hash: 'hash3',
    uploadedAt: new Date(Date.now() - 1200000).toISOString(), // 20 min ago
    processedAt: new Date(Date.now() - 60000).toISOString(), // 1 min ago
    thumbUrl: '/placeholder.svg'
  },
  {
    id: '4',
    fileName: 'failed_image.jpg',
    widthPx: 1920,
    heightPx: 1080,
    status: 'failed',
    hash: 'hash4',
    uploadedAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
    thumbUrl: '/placeholder.svg'
  }
];

export default function Jobs() {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<ImageItem[]>(mockJobs);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getStatusIcon = (status: ImageItem['status']) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'processed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: ImageItem['status']) => {
    switch (status) {
      case 'queued':
        return 'secondary';
      case 'processing':
        return 'default';
      case 'processed':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleRetry = (id: string) => {
    setJobs(prev => prev.map(job => 
      job.id === id ? { ...job, status: 'queued' } : job
    ));
  };

  const queuedJobs = jobs.filter(job => job.status === 'queued');
  const processingJobs = jobs.filter(job => job.status === 'processing');
  const processedJobs = jobs.filter(job => job.status === 'processed');
  const failedJobs = jobs.filter(job => job.status === 'failed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('jobQueue')}</h1>
        <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      </div>

      {/* Queue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('queued')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queuedJobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('processing')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processingJobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('processed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processedJobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('failed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{failedJobs.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Job List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('processingQueue')}</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('noJobsInQueue')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <img
                      src={job.thumbUrl}
                      alt={job.fileName}
                      className="h-12 w-12 object-cover rounded"
                    />
                    <div>
                      <p className="font-medium">{job.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.widthPx} × {job.heightPx} • {t('uploaded')} {new Date(job.uploadedAt).toLocaleString()}
                      </p>
                      {job.processedAt && (
                        <p className="text-sm text-muted-foreground">
                          {t('processed')} {new Date(job.processedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {job.status === 'processing' && (
                      <Progress value={Math.random() * 100} className="w-24" />
                    )}
                    
                    <Badge variant={getStatusColor(job.status)} className="flex items-center gap-1">
                      {getStatusIcon(job.status)}
                      {t(job.status)}
                    </Badge>
                    
                    {job.status === 'failed' && (
                      <Button size="sm" variant="outline" onClick={() => handleRetry(job.id)}>
                        {t('retry')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}