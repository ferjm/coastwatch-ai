import type * as GeoJSON from 'geojson';
import { 
  Area, 
  Flight, 
  ImageItem, 
  Detection, 
  ModelInfo, 
  Job, 
  PaginatedResponse, 
  ApiResponse,
  HeatmapBin
} from '@/types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Images
  async presignImage(): Promise<ApiResponse<{ imageId: string; uploadUrl: string }>> {
    return this.request('/images/presign', { method: 'POST' });
  }

  async completeImageUpload(data: {
    imageId: string;
    fileName: string;
    exifLat?: number;
    exifLng?: number;
    altM?: number;
    widthPx: number;
    heightPx: number;
  }): Promise<ApiResponse<ImageItem>> {
    return this.request('/images/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getImages(params: {
    status?: string;
    from?: string;
    to?: string;
    areaId?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<ApiResponse<PaginatedResponse<ImageItem>>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/images?${searchParams.toString()}`);
  }

  // Jobs
  async enqueueInference(data: {
    imageId: string;
    modelId: string;
  }): Promise<ApiResponse<{ jobId: string }>> {
    return this.request('/infer/enqueue', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getJobs(params: {
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<ApiResponse<PaginatedResponse<Job>>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/jobs?${searchParams.toString()}`);
  }

  async getJob(id: string): Promise<ApiResponse<Job>> {
    return this.request(`/jobs/${id}`);
  }

  // Detections
  async getDetections(params: {
    areaId?: string;
    from?: string;
    to?: string;
    class?: string;
    minScore?: number;
    page?: number;
    pageSize?: number;
  } = {}): Promise<ApiResponse<PaginatedResponse<Detection>>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/detections?${searchParams.toString()}`);
  }

  async reviewDetection(
    id: string, 
    data: { reviewerLabel: 'accepted' | 'rejected' }
  ): Promise<ApiResponse<Detection>> {
    return this.request(`/detections/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Areas
  async getAreas(): Promise<ApiResponse<Area[]>> {
    return this.request('/areas');
  }

  async createArea(data: Omit<Area, 'id' | 'createdAt'>): Promise<ApiResponse<Area>> {
    return this.request('/areas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateArea(id: string, data: Partial<Area>): Promise<ApiResponse<Area>> {
    return this.request(`/areas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteArea(id: string): Promise<ApiResponse<void>> {
    return this.request(`/areas/${id}`, { method: 'DELETE' });
  }

  // Flights
  async getFlights(params: {
    areaId?: string;
    from?: string;
    to?: string;
  } = {}): Promise<ApiResponse<Flight[]>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/flights?${searchParams.toString()}`);
  }

  async createFlight(data: Omit<Flight, 'id'>): Promise<ApiResponse<Flight>> {
    return this.request('/flights', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFlight(id: string, data: Partial<Flight>): Promise<ApiResponse<Flight>> {
    return this.request(`/flights/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Models
  async getModels(): Promise<ApiResponse<ModelInfo[]>> {
    return this.request('/models');
  }

  // Heatmap
  async getHeatmap(params: {
    areaId?: string;
    from?: string;
    to?: string;
    bin?: string;
  } = {}): Promise<ApiResponse<HeatmapBin[]>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/heatmap?${searchParams.toString()}`);
  }

  // Export
  async exportGeoJSON(params: {
    areaId?: string;
    from?: string;
    to?: string;
  } = {}): Promise<ApiResponse<GeoJSON.FeatureCollection>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/export/geojson?${searchParams.toString()}`);
  }
}

export const apiClient = new ApiClient();