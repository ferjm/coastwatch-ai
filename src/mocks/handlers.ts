import { http, HttpResponse } from 'msw';
import { 
  mockAreas, 
  mockFlights, 
  mockImages, 
  mockDetections, 
  mockModels, 
  mockJobs, 
  createUUID,
  generateRandomDetections
} from './fixtures';
import { 
  Area, 
  Flight, 
  ImageItem, 
  Detection, 
  ModelInfo, 
  Job, 
  PaginatedResponse, 
  ApiResponse 
} from '@/types';

// In-memory stores (reset on refresh)
let areas = [...mockAreas];
let flights = [...mockFlights];
let images = [...mockImages];
let detections = [...mockDetections];
let models = [...mockModels];
let jobs = [...mockJobs];

// Helper functions
const delay = () => new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 300));

const paginate = <T>(data: T[], page: number = 1, pageSize: number = 10): PaginatedResponse<T> => {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedData = data.slice(start, end);
  
  return {
    data: paginatedData,
    total: data.length,
    page,
    pageSize,
    totalPages: Math.ceil(data.length / pageSize)
  };
};

export const handlers = [
  // Images endpoints
  http.post('/api/images/presign', async () => {
    await delay();
    const imageId = createUUID();
    return HttpResponse.json({
      success: true,
      data: {
        imageId,
        uploadUrl: `/api/images/${imageId}/upload`
      }
    });
  }),

  http.post('/api/images/complete', async ({ request }) => {
    await delay();
    const body = await request.json() as {
      imageId: string;
      fileName: string;
      exifLat?: number;
      exifLng?: number;
      altM?: number;
      widthPx: number;
      heightPx: number;
    };

    const newImage: ImageItem = {
      id: body.imageId,
      fileName: body.fileName,
      capturedAt: new Date().toISOString(),
      exifLat: body.exifLat,
      exifLng: body.exifLng,
      altM: body.altM,
      widthPx: body.widthPx,
      heightPx: body.heightPx,
      status: 'uploaded',
      hash: `sha256:${Math.random().toString(36).substring(7)}`,
      thumbUrl: `/api/images/${body.imageId}/thumb`,
      gcsUri: `gs://ecos-images/${body.imageId}.jpg`,
      uploadedAt: new Date().toISOString()
    };

    images.push(newImage);

    return HttpResponse.json({
      success: true,
      data: newImage
    });
  }),

  http.get('/api/images', async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const status = url.searchParams.get('status');

    let filteredImages = images;
    if (status) {
      filteredImages = images.filter(img => img.status === status);
    }

    return HttpResponse.json({
      success: true,
      data: paginate(filteredImages, page, pageSize)
    });
  }),

  // Inference/Jobs endpoints
  http.post('/api/infer/enqueue', async ({ request }) => {
    await delay();
    const body = await request.json() as {
      imageId: string;
      modelId: string;
    };

    const newJob: Job = {
      id: createUUID(),
      imageId: body.imageId,
      modelId: body.modelId,
      status: 'queued'
    };

    jobs.push(newJob);

    // Update image status
    const imageIndex = images.findIndex(img => img.id === body.imageId);
    if (imageIndex !== -1) {
      images[imageIndex] = { ...images[imageIndex], status: 'queued' };
    }

    // Simulate job processing
    setTimeout(() => {
      const jobIndex = jobs.findIndex(j => j.id === newJob.id);
      if (jobIndex !== -1) {
        jobs[jobIndex] = {
          ...jobs[jobIndex],
          status: 'processing',
          startedAt: new Date().toISOString()
        };

        // Update image status
        const imgIndex = images.findIndex(img => img.id === body.imageId);
        if (imgIndex !== -1) {
          images[imgIndex] = { ...images[imgIndex], status: 'processing' };
        }

        // Complete job after another delay
        setTimeout(() => {
          const finalJobIndex = jobs.findIndex(j => j.id === newJob.id);
          if (finalJobIndex !== -1) {
            jobs[finalJobIndex] = {
              ...jobs[finalJobIndex],
              status: 'done',
              finishedAt: new Date().toISOString()
            };

            // Update image status and generate detections
            const finalImgIndex = images.findIndex(img => img.id === body.imageId);
            if (finalImgIndex !== -1) {
              images[finalImgIndex] = { ...images[finalImgIndex], status: 'processed', processedAt: new Date().toISOString() };
              
              // Generate random detections for this image
              const newDetections = generateRandomDetections(body.imageId);
              detections.push(...newDetections);
            }
          }
        }, 2000 + Math.random() * 3000); // 2-5 seconds processing time
      }
    }, 500 + Math.random() * 1000); // 0.5-1.5 seconds queue time

    return HttpResponse.json({
      success: true,
      data: { jobId: newJob.id }
    });
  }),

  http.get('/api/jobs', async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const status = url.searchParams.get('status');

    let filteredJobs = jobs;
    if (status) {
      filteredJobs = jobs.filter(job => job.status === status);
    }

    return HttpResponse.json({
      success: true,
      data: paginate(filteredJobs, page, pageSize)
    });
  }),

  http.get('/api/jobs/:id', async ({ params }) => {
    await delay();
    const job = jobs.find(j => j.id === params.id);
    
    if (!job) {
      return HttpResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: job
    });
  }),

  // Detections endpoints
  http.get('/api/detections', async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const minScore = parseFloat(url.searchParams.get('minScore') || '0');
    const classFilter = url.searchParams.get('class');

    let filteredDetections = detections.filter(det => det.score >= minScore);
    
    if (classFilter) {
      filteredDetections = filteredDetections.filter(det => det.class === classFilter);
    }

    return HttpResponse.json({
      success: true,
      data: paginate(filteredDetections, page, pageSize)
    });
  }),

  http.post('/api/detections/:id/review', async ({ params, request }) => {
    await delay();
    const body = await request.json() as {
      reviewerLabel: 'accepted' | 'rejected';
    };

    const detectionIndex = detections.findIndex(det => det.id === params.id);
    
    if (detectionIndex === -1) {
      return HttpResponse.json(
        { success: false, error: 'Detection not found' },
        { status: 404 }
      );
    }

    detections[detectionIndex] = {
      ...detections[detectionIndex],
      reviewerLabel: body.reviewerLabel,
      reviewerId: 'current-user-id', // In real app, get from auth
      reviewedAt: new Date().toISOString()
    };

    return HttpResponse.json({
      success: true,
      data: detections[detectionIndex]
    });
  }),

  // Areas endpoints
  http.get('/api/areas', async () => {
    await delay();
    return HttpResponse.json({
      success: true,
      data: areas
    });
  }),

  http.post('/api/areas', async ({ request }) => {
    await delay();
    const body = await request.json() as Omit<Area, 'id' | 'createdAt'>;

    const newArea: Area = {
      id: createUUID(),
      ...body,
      createdAt: new Date().toISOString()
    };

    areas.push(newArea);

    return HttpResponse.json({
      success: true,
      data: newArea
    });
  }),

  http.put('/api/areas/:id', async ({ params, request }) => {
    await delay();
    const body = await request.json() as Partial<Area>;
    const areaIndex = areas.findIndex(area => area.id === params.id);

    if (areaIndex === -1) {
      return HttpResponse.json(
        { success: false, error: 'Area not found' },
        { status: 404 }
      );
    }

    areas[areaIndex] = { ...areas[areaIndex], ...body };

    return HttpResponse.json({
      success: true,
      data: areas[areaIndex]
    });
  }),

  http.delete('/api/areas/:id', async ({ params }) => {
    await delay();
    const areaIndex = areas.findIndex(area => area.id === params.id);

    if (areaIndex === -1) {
      return HttpResponse.json(
        { success: false, error: 'Area not found' },
        { status: 404 }
      );
    }

    areas.splice(areaIndex, 1);

    return HttpResponse.json({
      success: true,
      message: 'Area deleted successfully'
    });
  }),

  // Flights endpoints
  http.get('/api/flights', async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const areaId = url.searchParams.get('areaId');

    let filteredFlights = flights;
    if (areaId) {
      filteredFlights = flights.filter(flight => flight.areaId === areaId);
    }

    return HttpResponse.json({
      success: true,
      data: filteredFlights
    });
  }),

  http.post('/api/flights', async ({ request }) => {
    await delay();
    const body = await request.json() as Omit<Flight, 'id'>;

    const newFlight: Flight = {
      id: createUUID(),
      ...body
    };

    flights.push(newFlight);

    return HttpResponse.json({
      success: true,
      data: newFlight
    });
  }),

  http.put('/api/flights/:id', async ({ params, request }) => {
    await delay();
    const body = await request.json() as Partial<Flight>;
    const flightIndex = flights.findIndex(flight => flight.id === params.id);

    if (flightIndex === -1) {
      return HttpResponse.json(
        { success: false, error: 'Flight not found' },
        { status: 404 }
      );
    }

    flights[flightIndex] = { ...flights[flightIndex], ...body };

    return HttpResponse.json({
      success: true,
      data: flights[flightIndex]
    });
  }),

  // Models endpoints
  http.get('/api/models', async () => {
    await delay();
    return HttpResponse.json({
      success: true,
      data: models
    });
  }),

  // Heatmap endpoint
  http.get('/api/heatmap', async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const bin = url.searchParams.get('bin') || 'hex100m';

    // Generate mock heatmap data
    const heatmapData = [
      {
        id: 'hex-1',
        geom: {
          type: 'Polygon' as const,
          coordinates: [[
            [3.1500, 42.2500],
            [3.1600, 42.2500],
            [3.1600, 42.2600],
            [3.1500, 42.2600],
            [3.1500, 42.2500]
          ]]
        },
        count: 12,
        density: 0.8
      },
      {
        id: 'hex-2',
        geom: {
          type: 'Polygon' as const,
          coordinates: [[
            [3.1600, 42.2500],
            [3.1700, 42.2500],
            [3.1700, 42.2600],
            [3.1600, 42.2600],
            [3.1600, 42.2500]
          ]]
        },
        count: 8,
        density: 0.5
      }
    ];

    return HttpResponse.json({
      success: true,
      data: heatmapData
    });
  }),

  // Export endpoint
  http.get('/api/export/geojson', async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    
    // Apply filters based on query params
    let filteredDetections = detections;
    
    const geojson = {
      type: 'FeatureCollection' as const,
      features: filteredDetections
        .filter(det => det.geomPoint)
        .map(det => ({
          type: 'Feature' as const,
          geometry: det.geomPoint!,
          properties: {
            id: det.id,
            class: det.class,
            score: det.score,
            reviewerLabel: det.reviewerLabel,
            reviewedAt: det.reviewedAt
          }
        }))
    };

    return HttpResponse.json({
      success: true,
      data: geojson
    });
  })
];