import { describe, it, expect, vi, beforeEach } from 'vitest';

// Captura las llamadas encadenadas al query builder de supabase para poder hacer aserciones.
const calls: { table: string; op: string; args: any[][] }[] = [];

function makeBuilder(table: string, op: string) {
  const record = { table, op, args: [] as any[][] };
  calls.push(record);
  const builder: any = {
    eq: (...a: any[]) => { record.args.push(['eq', ...a]); return builder; },
    lt: (...a: any[]) => { record.args.push(['lt', ...a]); return builder; },
    order: (...a: any[]) => { record.args.push(['order', ...a]); return builder; },
    limit: () => Promise.resolve({ data: [], error: null }),
    select: (...a: any[]) => { record.args.push(['select', ...a]); return builder; },
    then: (res: any) => res({ data: [], error: null }),
  };
  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      update: () => makeBuilder(table, 'update'),
      select: () => makeBuilder(table, 'select'),
      delete: () => makeBuilder(table, 'delete'),
    }),
    storage: { from: () => ({ download: vi.fn() }) },
  },
}));

vi.mock('../cascadeService', () => ({ runCascade: vi.fn() }));
vi.mock('../imageService', () => ({
  saveDetections: vi.fn(), saveCascadeMeta: vi.fn(), updateImageStatus: vi.fn(),
}));

import { drainQueue, STALE_PROCESSING_MS } from '../inferenceWorker';

describe('recoverOrphans (vía drainQueue)', () => {
  beforeEach(() => { calls.length = 0; });

  it('solo re-encola imágenes en processing con updated_at más viejo que el lease', async () => {
    await drainQueue();

    const recover = calls.find(c => c.table === 'images' && c.op === 'update');
    expect(recover, 'recoverOrphans debe hacer un UPDATE sobre images').toBeTruthy();

    const eqStatus = recover!.args.find(a => a[0] === 'eq' && a[1] === 'status');
    expect(eqStatus?.[2]).toBe('processing');

    // La clave del fix anti-doble-inserción: filtra por updated_at < cutoff (no re-encola en vuelo).
    const ltUpdated = recover!.args.find(a => a[0] === 'lt' && a[1] === 'updated_at');
    expect(ltUpdated, 'debe filtrar por updated_at < cutoff').toBeTruthy();

    const cutoff = new Date(ltUpdated![2]).getTime();
    const now = Date.now();
    // El cutoff debe estar ~STALE_PROCESSING_MS en el pasado (margen de 5 s por el tiempo de test).
    expect(now - cutoff).toBeGreaterThanOrEqual(STALE_PROCESSING_MS - 5000);
    expect(now - cutoff).toBeLessThanOrEqual(STALE_PROCESSING_MS + 5000);
  });
});
