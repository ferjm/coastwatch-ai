export type UUID = string;

export type Area = {
  id: UUID;
  name: string;
  geomPolygon: GeoJSON.Polygon; // WGS84
  createdAt: string;
};

export type Flight = {
  id: UUID;
  areaId: UUID;
  date: string; // ISO
  uavModel: string;
  notes?: string;
};

export type ImageItem = {
  id: UUID;
  flightId?: UUID;
  gcsUri?: string; // mock storage path
  fileName: string;
  capturedAt?: string;
  exifLat?: number;
  exifLng?: number;
  altM?: number;
  widthPx: number;
  heightPx: number;
  status: 'uploaded' | 'queued' | 'processing' | 'processed' | 'reviewed' | 'failed';
  hash: string;
  thumbUrl?: string;
  uploadedAt: string;
  processedAt?: string;
  reviewedAt?: string;
};

export type Detection = {
  id: UUID;
  imageId: UUID;
  score: number; // 0..1
  bbox: { x: number; y: number; w: number; h: number }; // pixels
  geomPoint?: GeoJSON.Point; // opcional en mock
  uncertaintyM?: number;
  reviewerLabel?: 'accepted' | 'rejected' | 'pending';
  reviewerId?: UUID;
  reviewedAt?: string;
  verified: boolean;
};

export type ModelInfo = {
  id: UUID;
  name: string;
  version: string;
  metrics: { 
    mAP50?: number; 
    mAP5095?: number; 
    precision?: number; 
    recall?: number; 
  };
  createdAt: string;
};

export type Job = {
  id: UUID;
  imageId: UUID;
  modelId: UUID;
  status: 'queued' | 'processing' | 'done' | 'failed';
  startedAt?: string;
  finishedAt?: string;
  error?: string;
};

export type HeatmapBin = {
  id: string;
  geom: GeoJSON.Polygon;
  count: number;
  density: number;
};

export type User = {
  id: UUID;
  email: string;
  name?: string;
  role: 'admin' | 'reviewer' | 'operator';
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};