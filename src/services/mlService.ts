// ML Service - Abstract interface for plastic detection
// Can be swapped between WASM (browser) and external server

export interface DetectionResult {
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MLProcessorConfig {
  type: 'wasm' | 'server';
  endpoint?: string; // For server mode
}

export class MLService {
  private config: MLProcessorConfig;

  constructor(config: MLProcessorConfig = { type: 'wasm' }) {
    this.config = config;
  }

  /**
   * Process an image and return detection results
   * @param imageFile - The image file to process
   * @returns Array of detection results
   */
  async processImage(imageFile: File): Promise<DetectionResult[]> {
    if (this.config.type === 'wasm') {
      return this.processWithWASM(imageFile);
    } else {
      return this.processWithServer(imageFile);
    }
  }

  /**
   * WASM processing (browser-based)
   * Currently mocked - will be replaced with actual WASM model
   */
  private async processWithWASM(imageFile: File): Promise<DetectionResult[]> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

    // Mock detection results
    const mockDetections: DetectionResult[] = [];
    const hasPlastic = Math.random() > 0.3; // 70% chance of detecting plastic

    if (hasPlastic) {
      const numDetections = Math.floor(Math.random() * 5) + 1;
      
      for (let i = 0; i < numDetections; i++) {
        mockDetections.push({
          label: 'plastic',
          confidence: 0.7 + Math.random() * 0.25, // 0.7 to 0.95
          x: Math.floor(Math.random() * 400),
          y: Math.floor(Math.random() * 300),
          width: Math.floor(Math.random() * 200) + 50,
          height: Math.floor(Math.random() * 200) + 50,
        });
      }
    }

    return mockDetections;
  }

  /**
   * Server-based processing
   * For future use when switching to external server
   */
  private async processWithServer(imageFile: File): Promise<DetectionResult[]> {
    if (!this.config.endpoint) {
      throw new Error('Server endpoint not configured');
    }

    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Server processing failed');
    }

    const result = await response.json();
    return result.detections || [];
  }

  /**
   * Change ML processor type
   */
  setConfig(config: MLProcessorConfig) {
    this.config = config;
  }
}

// Singleton instance
export const mlService = new MLService({ type: 'wasm' });
