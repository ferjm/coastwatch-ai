import { describe, it, expect } from 'vitest';
import { aggregateDashboardStats, pointCountForSource, type ImageAgg } from '../analyticsService';

const img = (o: Partial<ImageAgg>): ImageAgg => ({
  status: 'processed', uploadedAt: '2026-06-20T10:00:00Z', edgeCount: 0, cloudCount: 0,
  screeningWouldEscalate: null, ...o,
});

describe('aggregateDashboardStats', () => {
  it('cuenta imágenes, detecciones por nivel e imágenes con plástico', () => {
    const s = aggregateDashboardStats([
      img({ status: 'processed', edgeCount: 0, cloudCount: 5, screeningWouldEscalate: false, capturedAt: '2026-06-20T10:00:00Z' }),
      img({ status: 'processed', edgeCount: 2, cloudCount: 3, screeningWouldEscalate: true, capturedAt: '2026-06-20T12:00:00Z' }),
      img({ status: 'uploaded', edgeCount: 0, cloudCount: 0, screeningWouldEscalate: null }),
    ]);
    expect(s.totalImages).toBe(3);
    expect(s.processedImages).toBe(2);
    expect(s.edgeDetections).toBe(2);
    expect(s.cloudDetections).toBe(8);
    expect(s.imagesWithPlastic).toBe(2);        // dos imágenes con >0 detecciones
    expect(s.escalationRate).toBe(50);          // 1 de 2 con flag no-nulo escaló
    expect(s.bySource).toEqual([
      { name: 'Edge', count: 2, color: '#EC4899' },
      { name: 'Cloud', count: 8, color: '#06B6D4' },
    ]);
    expect(s.timeline).toEqual([{ date: '2026-06-20', detections: 10 }]); // 5+3+2 ese día
  });

  it('maneja lista vacía', () => {
    const s = aggregateDashboardStats([]);
    expect(s.totalImages).toBe(0);
    expect(s.escalationRate).toBe(0);
    expect(s.timeline).toEqual([]);
    expect(s.avgEdgeMs).toBeNull();
    expect(s.avgCloudMs).toBeNull();
  });

  it('promedia las latencias por nivel sobre las imágenes con medición', () => {
    const s = aggregateDashboardStats([
      img({ edgeMs: 300, cloudMs: 3000 }),
      img({ edgeMs: 200, cloudMs: 5000 }),
      img({ edgeMs: undefined, cloudMs: null }), // sin medición: se ignora en la media
    ]);
    expect(s.avgEdgeMs).toBe(250);    // (300+200)/2
    expect(s.avgCloudMs).toBe(4000);  // (3000+5000)/2
  });
});

describe('pointCountForSource', () => {
  const p = { id: '1', lat: 0, lng: 0, fileName: 'a', edgeCount: 2, cloudCount: 5, thumbnailPath: null };
  it('devuelve el conteo según el filtro', () => {
    expect(pointCountForSource(p, 'edge')).toBe(2);
    expect(pointCountForSource(p, 'cloud')).toBe(5);
    expect(pointCountForSource(p, 'both')).toBe(7);
  });
});
