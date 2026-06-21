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

  it('normaliza una respuesta REAL de coastal-plastic-5m/6 (clase plastic-waste, 5280x3956)', () => {
    // Fixture capturado de roboflow-inference-server self-hosted (2026-06-21).
    const out = normalizeRoboflowResponse({
      image: { width: 5280, height: 3956 },
      predictions: [
        { x: 3134, y: 3473, width: 252, height: 240, confidence: 0.8411073684692383, class: 'plastic-waste' },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe('plastic-waste');
    expect(out[0].source).toBe('cloud');
    expect(out[0].x).toBeCloseTo((3134 - 252 / 2) / 5280, 6);
    expect(out[0].y).toBeCloseTo((3473 - 240 / 2) / 3956, 6);
    expect(out[0].width).toBeCloseTo(252 / 5280, 6);
    expect(out[0].height).toBeCloseTo(240 / 3956, 6);
    // todas las coordenadas deben quedar en [0,1]
    for (const k of ['x', 'y', 'width', 'height'] as const) {
      expect(out[0][k]).toBeGreaterThanOrEqual(0);
      expect(out[0][k]).toBeLessThanOrEqual(1);
    }
  });

  it('devuelve [] sin predicciones', () => {
    expect(normalizeRoboflowResponse({ image: { width: 640, height: 640 }, predictions: [] })).toEqual([]);
  });
});
