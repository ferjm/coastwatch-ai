import { describe, it, expect } from 'vitest';
import { normalizeEdgeDetections } from '../edgeProvider';

describe('normalizeEdgeDetections', () => {
  it('normaliza px de espacio-modelo a fracciones 0–1 y etiqueta source/model', () => {
    const out = normalizeEdgeDetections(
      [{ label: 'plastic', confidence: 0.7, x: 160, y: 80, width: 32, height: 64 }],
      320,
      320,
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      label: 'plastic',
      confidence: 0.7,
      x: 0.5,        // 160/320
      y: 0.25,       // 80/320
      width: 0.1,    // 32/320
      height: 0.2,   // 64/320
      source: 'edge',
      model: 'fomo-320',
    });
  });

  it('recorta valores fuera de [0,1]', () => {
    const out = normalizeEdgeDetections(
      [{ label: 'plastic', confidence: 0.9, x: 330, y: -10, width: 32, height: 32 }],
      320,
      320,
    );
    expect(out[0].x).toBe(1);
    expect(out[0].y).toBe(0);
  });

  it('devuelve [] sin detecciones', () => {
    expect(normalizeEdgeDetections([], 320, 320)).toEqual([]);
  });
});
