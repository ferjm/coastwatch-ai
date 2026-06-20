import { describe, it, expect } from 'vitest';
import { buildDetectionRows, toEdgeDetections, EDGE_MODEL_ID } from '../detectionMapper';

describe('buildDetectionRows', () => {
  it('mapea detecciones a filas con source y model', () => {
    const rows = buildDetectionRows('img-1', [
      { label: 'plastic', confidence: 0.9, x: 0.1, y: 0.2, width: 0.3, height: 0.4, source: 'edge', model: 'fomo-320' },
    ]);
    expect(rows).toEqual([
      { image_id: 'img-1', label: 'plastic', confidence: 0.9, x: 0.1, y: 0.2, width: 0.3, height: 0.4, source: 'edge', model: 'fomo-320' },
    ]);
  });

  it('devuelve array vacío sin detecciones', () => {
    expect(buildDetectionRows('img-1', [])).toEqual([]);
  });

  it('pone model a null cuando falta', () => {
    const rows = buildDetectionRows('img-1', [
      { label: 'plastic', confidence: 0.5, x: 0, y: 0, width: 1, height: 1, source: 'cloud' },
    ]);
    expect(rows[0].model).toBeNull();
  });
});

describe('toEdgeDetections', () => {
  it('etiqueta como edge con el modelo por defecto', () => {
    const out = toEdgeDetections([
      { label: 'plastic', confidence: 0.7, x: 10, y: 20, width: 30, height: 40 },
    ]);
    expect(out).toEqual([
      { label: 'plastic', confidence: 0.7, x: 10, y: 20, width: 30, height: 40, source: 'edge', model: EDGE_MODEL_ID },
    ]);
  });
});
