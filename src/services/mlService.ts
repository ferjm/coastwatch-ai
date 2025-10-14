// ML Service - Edge Impulse WebAssembly integration for plastic detection
// Can be swapped between WASM (browser) and external server

// Extend window to include Edge Impulse classifier
declare global {
  interface Window {
    EdgeImpulseClassifier?: any;
  }
}

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
  private classifier: any = null;
  private classifierReady: Promise<void> | null = null;

  constructor(config: MLProcessorConfig = { type: 'wasm' }) {
    this.config = config;
    if (config.type === 'wasm') {
      this.classifierReady = this.loadEdgeImpulseClassifier();
    }
  }

  /**
   * Load Edge Impulse WebAssembly classifier
   */
  private async loadEdgeImpulseClassifier(): Promise<void> {
    // Check if scripts are already loaded
    if (window.EdgeImpulseClassifier) {
      this.classifier = new window.EdgeImpulseClassifier();
      await this.classifier.init();
      return;
    }

    // Load scripts dynamically
    await this.loadScript('/edge-impulse-standalone.js');
    await this.loadScript('/run-impulse.js');

    // Wait for the classifier to be available
    let attempts = 0;
    while (!window.EdgeImpulseClassifier && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.EdgeImpulseClassifier) {
      throw new Error('Edge Impulse classifier failed to load');
    }

    this.classifier = new window.EdgeImpulseClassifier();
    await this.classifier.init();
  }

  /**
   * Load external script
   */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script already exists
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
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
   * WASM processing (browser-based) using Edge Impulse
   */
  private async processWithWASM(imageFile: File): Promise<DetectionResult[]> {
    // Ensure classifier is ready
    if (this.classifierReady) {
      await this.classifierReady;
    }

    if (!this.classifier) {
      throw new Error('Edge Impulse classifier not initialized');
    }

    // Get model properties to know expected input size
    const properties = this.classifier.getProperties();
    const inputWidth = properties.input_width || 320;
    const inputHeight = properties.input_height || 320;

    // Convert image to raw features (RGB pixel array)
    const features = await this.imageToFeatures(imageFile, inputWidth, inputHeight);

    // Run classification
    const result = this.classifier.classify(features, false);

    // Convert Edge Impulse results to our DetectionResult format
    const detections: DetectionResult[] = result.results.map((r: any) => ({
      label: r.label,
      confidence: r.value,
      x: Math.round(r.x || 0),
      y: Math.round(r.y || 0),
      width: Math.round(r.width || 0),
      height: Math.round(r.height || 0),
    }));

    return detections;
  }

  /**
   * Convert image file to raw feature array (RGB pixels)
   */
  private async imageToFeatures(imageFile: File, targetWidth: number, targetHeight: number): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      img.onload = () => {
        // Resize image to target dimensions
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Get image data
        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const pixels = imageData.data;

        // Convert to RGB array (remove alpha channel)
        const features: number[] = [];
        for (let i = 0; i < pixels.length; i += 4) {
          features.push(pixels[i]);     // R
          features.push(pixels[i + 1]); // G
          features.push(pixels[i + 2]); // B
        }

        resolve(features);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(imageFile);
    });
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
