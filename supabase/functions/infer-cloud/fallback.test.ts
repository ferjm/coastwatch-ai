import { describe, it, expect, vi } from 'vitest';
import { inferWithFallback, SERVERLESS_HOST } from './fallback.ts';

const HF = 'https://x.hf.space';
const url = (h: string) => `${h}/m`;
const ok = () => new Response('{}', { status: 200 });

describe('inferWithFallback', () => {
  it('usa el host primario si responde bien', async () => {
    const f = vi.fn().mockResolvedValue(ok());
    const r = await inferWithFallback(HF, url, {}, f);
    expect(r.fellBack).toBe(false);
    expect(r.host).toBe(HF);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('cae a serverless si el primario da 503', async () => {
    const f = vi.fn().mockResolvedValueOnce(new Response('x', { status: 503 })).mockResolvedValueOnce(ok());
    const r = await inferWithFallback(HF, url, {}, f);
    expect(r.fellBack).toBe(true);
    expect(f.mock.calls[1][0]).toBe(url(SERVERLESS_HOST));
  });

  it('cae a serverless si el primario lanza error de red', async () => {
    const f = vi.fn().mockRejectedValueOnce(new TypeError('fail')).mockResolvedValueOnce(ok());
    const r = await inferWithFallback(HF, url, {}, f);
    expect(r.fellBack).toBe(true);
  });

  it('no reintenta ante un 4xx', async () => {
    const f = vi.fn().mockResolvedValue(new Response('bad', { status: 400 }));
    const r = await inferWithFallback(HF, url, {}, f);
    expect(r.fellBack).toBe(false);
    expect(r.resp.status).toBe(400);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('sin self-host va directo a serverless', async () => {
    const f = vi.fn().mockResolvedValue(ok());
    const r = await inferWithFallback(SERVERLESS_HOST, url, {}, f);
    expect(r.fellBack).toBe(false);
    expect(f).toHaveBeenCalledTimes(1);
  });
});
