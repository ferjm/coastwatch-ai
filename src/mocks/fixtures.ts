import { UUID, Area, Flight, ImageItem, Detection, ModelInfo, Job, User } from '@/types';

export const createUUID = (): UUID => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'admin@ecos.com',
    name: 'Admin User',
    role: 'admin'
  },
  {
    id: 'user-2',
    email: 'reviewer@ecos.com',
    name: 'Reviewer User',
    role: 'reviewer'
  }
];

export const mockAreas: Area[] = [
  {
    id: 'area-1',
    name: 'Costa Brava Norte',
    geomPolygon: {
      type: 'Polygon',
      coordinates: [[
        [3.1500, 42.2500],
        [3.2000, 42.2500],
        [3.2000, 42.3000],
        [3.1500, 42.3000],
        [3.1500, 42.2500]
      ]]
    },
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'area-2',
    name: 'Playa de Castelldefels',
    geomPolygon: {
      type: 'Polygon',
      coordinates: [[
        [1.9500, 41.2600],
        [2.0000, 41.2600],
        [2.0000, 41.2900],
        [1.9500, 41.2900],
        [1.9500, 41.2600]
      ]]
    },
    createdAt: '2024-01-20T14:30:00Z'
  }
];

export const mockFlights: Flight[] = [
  {
    id: 'flight-1',
    areaId: 'area-1',
    date: '2024-01-25T09:00:00Z',
    uavModel: 'DJI Mavic Air 2S',
    notes: 'Vuelo matutino con buenas condiciones meteorológicas'
  },
  {
    id: 'flight-2',
    areaId: 'area-2',
    date: '2024-01-26T15:30:00Z',
    uavModel: 'DJI Mini 3 Pro',
    notes: 'Vuelo vespertino, algo de viento del este'
  }
];

export const mockModels: ModelInfo[] = [
  {
    id: 'model-1',
    name: 'PlasticNet',
    version: 'v2.1.0',
    metrics: {
      mAP50: 0.847,
      mAP5095: 0.623,
      precision: 0.891,
      recall: 0.784
    },
    createdAt: '2024-01-10T12:00:00Z'
  },
  {
    id: 'model-2',
    name: 'WasteDetector',
    version: 'v1.3.2',
    metrics: {
      mAP50: 0.812,
      mAP5095: 0.598,
      precision: 0.856,
      recall: 0.751
    },
    createdAt: '2024-01-05T16:00:00Z'
  }
];

export const mockImages: ImageItem[] = [
  {
    id: 'img-1',
    flightId: 'flight-1',
    fileName: 'IMG_0001.jpg',
    capturedAt: '2024-01-25T09:15:00Z',
    exifLat: 42.2650,
    exifLng: 3.1750,
    altM: 120,
    widthPx: 4000,
    heightPx: 3000,
    status: 'processed',
    hash: 'sha256:abc123...',
    thumbUrl: '/api/images/img-1/thumb',
    gcsUri: 'gs://ecos-images/img-1.jpg',
    uploadedAt: '2024-01-25T09:00:00Z',
    processedAt: '2024-01-25T09:15:00Z'
  },
  {
    id: 'img-2',
    flightId: 'flight-1',
    fileName: 'IMG_0002.jpg',
    capturedAt: '2024-01-25T09:16:00Z',
    exifLat: 42.2655,
    exifLng: 3.1755,
    altM: 115,
    widthPx: 4000,
    heightPx: 3000,
    status: 'processing',
    hash: 'sha256:def456...',
    thumbUrl: '/api/images/img-2/thumb',
    gcsUri: 'gs://ecos-images/img-2.jpg',
    uploadedAt: '2024-01-25T09:05:00Z'
  }
];

export const mockDetections: Detection[] = [
  {
    id: 'det-1',
    imageId: 'img-1',
    score: 0.924,
    bbox: { x: 1200, y: 800, w: 150, h: 200 },
    geomPoint: {
      type: 'Point',
      coordinates: [3.1752, 42.2651]
    },
    uncertaintyM: 2.5,
    reviewerLabel: 'accepted',
    reviewerId: 'user-2',
    reviewedAt: '2024-01-25T14:30:00Z',
    verified: true
  },
  {
    id: 'det-2',
    imageId: 'img-1',
    score: 0.856,
    bbox: { x: 2000, y: 1200, w: 300, h: 180 },
    geomPoint: {
      type: 'Point',
      coordinates: [3.1754, 42.2653]
    },
    uncertaintyM: 3.1,
    reviewerLabel: 'pending',
    verified: false
  },
  {
    id: 'det-3',
    imageId: 'img-1',
    score: 0.743,
    bbox: { x: 800, y: 600, w: 80, h: 120 },
    geomPoint: {
      type: 'Point',
      coordinates: [3.1749, 42.2649]
    },
    uncertaintyM: 4.2,
    reviewerLabel: 'rejected',
    reviewerId: 'user-2',
    reviewedAt: '2024-01-25T14:32:00Z',
    verified: false
  }
];

export const mockJobs: Job[] = [
  {
    id: 'job-1',
    imageId: 'img-1',
    modelId: 'model-1',
    status: 'done',
    startedAt: '2024-01-25T10:00:00Z',
    finishedAt: '2024-01-25T10:03:00Z'
  },
  {
    id: 'job-2',
    imageId: 'img-2',
    modelId: 'model-1',
    status: 'processing',
    startedAt: '2024-01-26T10:00:00Z'
  }
];

export const generateRandomDetections = (imageId: UUID, count: number = Math.floor(Math.random() * 5) + 1): Detection[] => {
  const detections: Detection[] = [];

  for (let i = 0; i < count; i++) {
    detections.push({
      id: createUUID(),
      imageId,
      score: 0.6 + Math.random() * 0.35, // 0.6 to 0.95
      bbox: {
        x: Math.floor(Math.random() * 3000),
        y: Math.floor(Math.random() * 2000),
        w: 50 + Math.floor(Math.random() * 300),
        h: 50 + Math.floor(Math.random() * 300)
      },
      geomPoint: {
        type: 'Point',
        coordinates: [
          3.15 + Math.random() * 0.05, // Random longitude
          42.25 + Math.random() * 0.05  // Random latitude
        ]
      },
      uncertaintyM: 1 + Math.random() * 5,
      reviewerLabel: 'pending',
      verified: false
    });
  }

  return detections;
};