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
  private scriptsLoaded: boolean = false;

  constructor(config: MLProcessorConfig = { type: 'wasm' }) {
    this.config = config;
  }

  /**
   * Load Edge Impulse WebAssembly scripts (only once)
   */
  private async loadEdgeImpulseScripts(): Promise<void> {
    if (this.scriptsLoaded) {
      return;
    }

    try {
      console.log('Loading Edge Impulse scripts...');
      
      // Configure Module object before loading scripts to set WASM path
      (window as any).Module = {
        locateFile: (path: string) => {
          console.log('locateFile called with:', path);
          // Ensure WASM file is loaded from public directory
          if (path.endsWith('.wasm')) {
            return '/' + path;
          }
          return path;
        }
      };
      
      // Load scripts dynamically in sequence
      await this.loadScript('/edge-impulse-standalone.js');
      console.log('Loaded edge-impulse-standalone.js');
      
      await this.loadScript('/run-impulse.js');
      console.log('Loaded run-impulse.js');

      // Give scripts time to execute and define EdgeImpulseClassifier
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if EdgeImpulseClassifier is available
      console.log('Checking for EdgeImpulseClassifier...');

      // Try to access it from global scope using eval to bypass TypeScript
      try {
        const GlobalEdgeImpulseClassifier = (window as any).EdgeImpulseClassifier || eval('typeof EdgeImpulseClassifier !== "undefined" ? EdgeImpulseClassifier : undefined');
        if (GlobalEdgeImpulseClassifier) {
          console.log('Found EdgeImpulseClassifier in global scope');
          window.EdgeImpulseClassifier = GlobalEdgeImpulseClassifier;
        }
      } catch (e) {
        console.log('Could not access EdgeImpulseClassifier from global scope:', e);
      }

      if (!window.EdgeImpulseClassifier) {
        console.error('Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('edge') || k.toLowerCase().includes('classifier') || k.toLowerCase().includes('module')));
        throw new Error('EdgeImpulseClassifier not found after loading scripts. Check console for script errors.');
      }

      this.scriptsLoaded = true;
      console.log('Edge Impulse scripts loaded successfully');
    } catch (error) {
      console.error('Failed to load Edge Impulse scripts:', error);
      throw error;
    }
  }

  /**
   * Load external script
   */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script already exists
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        console.log(`Script ${src} already exists`);
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = false; // Load scripts in order
      script.onload = () => {
        console.log(`Script ${src} loaded successfully`);
        resolve();
      };
      script.onerror = (error) => {
        console.error(`Failed to load script: ${src}`, error);
        reject(new Error(`Failed to load script: ${src}`));
      };
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
   * Creates a fresh classifier instance for each image
   */
  private async processWithWASM(imageFile: File): Promise<DetectionResult[]> {
    console.log('Starting WASM processing for:', imageFile.name);
    
    // Ensure scripts are loaded
    await this.loadEdgeImpulseScripts();

    // Create a NEW classifier instance for each image to avoid memory issues
    console.log('Creating new classifier instance...');
    const classifier = new window.EdgeImpulseClassifier();
    await classifier.init();
    console.log('Classifier initialized');

    // Get model properties to know expected input size
    console.log('Getting model properties...');
    const properties = classifier.getProperties();
    console.log('Model properties:', properties);
    
    const inputWidth = properties.input_width || 320;
    const inputHeight = properties.input_height || 320;
    console.log(`Input dimensions: ${inputWidth}x${inputHeight}`);

    // Convert image to raw features (RGB pixel array)
    console.log('Converting image to features...');
    const features = await this.imageToFeatures(imageFile, inputWidth, inputHeight);
    console.log(`Features length: ${features.length} (expected: ${inputWidth * inputHeight * 3})`);
    console.log('Feature value range:', Math.min(...features), '-', Math.max(...features));
    console.log('First 50 features:', features.slice(0, 50).join(', '));

    // Run classification with error handling
    console.log('Running classification...');
    let result;
    try {
      result = classifier.classify(features, true); // Enable debug mode
      console.log('Raw classification result:', result);
    } catch (error) {
      console.error('Classification error details:', error);
      console.log('Model info:', classifier.getProjectInfo());
      throw error;
    }

    // Convert Edge Impulse results to our DetectionResult format
    const detections: DetectionResult[] = result.results.map((r: any) => ({
      label: r.label,
      confidence: r.value,
      x: Math.round(r.x || 0),
      y: Math.round(r.y || 0),
      width: Math.round(r.width || 0),
      height: Math.round(r.height || 0),
    }));

    console.log('Formatted detections:', detections);
    console.log(`Found ${detections.length} detections`);

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
        // Pass raw pixel values - WASM module handles normalization internally
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
