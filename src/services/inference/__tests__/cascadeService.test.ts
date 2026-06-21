import { describe, it, expect, vi } from 'vitest';

// Mock browser-only deps so the pure buildCascadeResult can run in node env
vi.mock('../edgeProvider', () => ({ runEdgeInference: vi.fn() }));
vi.mock('../cloudProvider', () => ({ runCloudInference: vi.fn() }));

import { buildCascadeResult } from '../cascadeService';
import type { TieredDetection } from '../../detectionMapper';

const edgeDet = (n: number): TieredDetection[] =>
  Array.from({ length: n }, (_, i) => ({
    label: 'plastic', confidence: 0.6, x: 0.1 * i, y: 0.1, width: 0.05, height: 0.05,
    source: 'edge' as const, model: 'fomo-320',
  }));
const cloudDet = (n: number): TieredDetection[] =>
  Array.from({ length: n }, (_, i) => ({
    label: 'plastic-waste', confidence: 0.8, x: 0.2 * i, y: 0.2, width: 0.05, height: 0.05,
    source: 'cloud' as const, model: 'rfdetr-medium-v6',
  }));

describe('buildCascadeResult', () => {
  it('concatena edge+cloud y cuenta cada nivel', () => {
    const r = buildCascadeResult(edgeDet(2), cloudDet(3));
    expect(r.detections).toHaveLength(5);
    expect(r.edgeCount).toBe(2);
    expect(r.cloudCount).toBe(3);
  });

  it('screeningWouldEscalate = true si el edge detectó algo', () => {
    expect(buildCascadeResult(edgeDet(1), cloudDet(0)).screeningWouldEscalate).toBe(true);
  });

  it('screeningWouldEscalate = false si el edge no detectó nada', () => {
    expect(buildCascadeResult(edgeDet(0), cloudDet(4)).screeningWouldEscalate).toBe(false);
  });
});
