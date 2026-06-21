import { describe, it, expect } from 'vitest';
import { normalizeRoboflowResponse, CLOUD_MODEL_ID } from './normalize.ts';

describe('normalizeRoboflowResponse', () => {
  it('convierte centro-px a fracciones esquina-superior-izquierda', () => {
    const out = normalizeRoboflowResponse({
      image: { width: 640, height: 640 },
      predictions: [
        { x: 320, y: 320, width: 64, height: 128, confidence: 0.91, class: 'plastic' },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      label: 'plastic',
      confidence: 0.91,
      x: 0.45,        // (320 - 64/2) / 640
      y: 0.4,         // (320 - 128/2) / 640
      width: 0.1,     // 64 / 640
      height: 0.2,    // 128 / 640
      source: 'cloud',
      model: CLOUD_MODEL_ID,
    });
  });

  it('maneja varias predicciones y dimensiones no cuadradas', () => {
    const out = normalizeRoboflowResponse({
      image: { width: 1024, height: 512 },
      predictions: [
        { x: 512, y: 256, width: 100, height: 50, confidence: 0.6, class: 'plastic' },
        { x: 100, y: 100, width: 20, height: 20, confidence: 0.3, class: 'plastic' },
      ],
    });
    expect(out).toHaveLength(2);
    expect(out[0].x).toBeCloseTo((512 - 50) / 1024, 6);
    expect(out[0].y).toBeCloseTo((256 - 25) / 512, 6);
    expect(out[0].width).toBeCloseTo(100 / 1024, 6);
    expect(out[0].height).toBeCloseTo(50 / 512, 6);
    expect(out[1].label).toBe('plastic');
  });

  it('devuelve [] sin predicciones', () => {
    expect(normalizeRoboflowResponse({ image: { width: 640, height: 640 }, predictions: [] })).toEqual([]);
  });
});
