import { describe, expect, it, vi } from 'vitest';
import { ErrorGuard, describeError, installErrorGuard } from '../src/persist/errorGuard';
import { buildFeedbackUrl, feedbackEnabled } from '../src/feedback';

const flush = async (): Promise<void> => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

function mk(over: Partial<ConstructorParameters<typeof ErrorGuard>[0]> = {}) {
  let t = 1000;
  const save = vi.fn(async () => {});
  const notify = vi.fn();
  const log = vi.fn();
  const g = new ErrorGuard({ save, notify, log, now: () => t, throttleMs: 5000, ...over });
  return { g, save, notify, log, adv: (ms: number) => { t += ms; } };
}

describe('Алдаа барилт (T-12)', () => {
  it('нэг мэдэгдэл, 5 сек дотор давтахгүй, дараа нь дахин; хадгалалт session-д нэг л удаа', async () => {
    const { g, save, notify, log, adv } = mk();
    expect(g.handle(new Error('a'))).toBe(true);
    expect(g.handle(new Error('b'))).toBe(false);
    adv(4000);
    expect(g.handle('c')).toBe(false);
    await flush();
    adv(1500);
    expect(g.handle('d')).toBe(true);
    await flush();
    // Давтагдах алдаа (эвдэрсэн төлөв) сайн хадгалалтыг дарж бичихгүй
    expect(save).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify.mock.calls).toEqual([[true], [true]]);
    expect(log).toHaveBeenCalledTimes(4);   // алдаа бүр console-д
    expect(g.caught).toBe(4);
  });

  it('хадгалалт/мэдэгдэл унавал ч throw хийхгүй', async () => {
    const { g, log } = mk({ save: () => { throw new Error('s'); }, notify: () => { throw new Error('n'); } });
    expect(() => g.handle(new Error('x'))).not.toThrow();
    const r = mk({ save: () => Promise.reject(new Error('rej')) });
    r.g.handle('y');
    await Promise.resolve();
    await Promise.resolve();
    expect(r.log.mock.calls.some((c) => String(c[0]).includes('save'))).toBe(true);
    expect(log).toHaveBeenCalled();
  });

  it('хадгалалт бүтэлгүйтвэл мэдэгдэл «хадгалсангүй» гэнэ (худал «хадгаллаа» биш)', async () => {
    const { g, notify } = mk({ save: () => Promise.reject(new Error('quota')) });
    g.handle('x');
    expect(notify).not.toHaveBeenCalled();   // хадгалалт дуусахыг хүлээнэ
    await flush();
    expect(notify).toHaveBeenCalledWith(false);
  });

  it('давтагдах алдаа console-ийг дүүргэхгүй: цонхонд logPerWindow, үлдсэнийг нэг мөрөөр', () => {
    const { g, log, adv } = mk({ logPerWindow: 3 });
    for (let i = 0; i < 100; i++) g.handle(new Error('frame'));
    expect(log).toHaveBeenCalledTimes(3);
    adv(6000);
    g.handle(new Error('frame'));
    expect(log.mock.calls.some((c) => String(c[0]).includes('97'))).toBe(true);
    expect(g.caught).toBe(101);
  });

  it('feedbackEnabled: харьцангуй, http(s) биш url-д товч нуугдана', () => {
    expect(feedbackEnabled('/feedback')).toBe(false);
    expect(feedbackEnabled('javascript:alert(1)')).toBe(false);
    expect(feedbackEnabled('not a url')).toBe(false);
  });

  it('describeError: Error-ийн stack, string, объект', () => {
    expect(describeError(new Error('boom'))).toContain('boom');
    expect(describeError('s')).toBe('s');
    expect(describeError({ a: 1 })).toBe('{"a":1}');
  });

  it('window-ийн error ба unhandledrejection-д залгагдаж, салгагдана', () => {
    const { g } = mk();
    const map = new Map<string, (e: Event) => void>();
    const win = { addEventListener: (n: string, f: (e: Event) => void) => { map.set(n, f); }, removeEventListener: (n: string) => { map.delete(n); } };
    const off = installErrorGuard(g, win as unknown as EventTarget);
    map.get('error')!({ error: new Error('e') } as unknown as Event);
    map.get('unhandledrejection')!({ reason: 'r' } as unknown as Event);
    expect(g.caught).toBe(2);
    off();
    expect(map.size).toBe(0);
  });
});

describe('Санал илгээх (T-12)', () => {
  it('URL-д v, day, dev залгана; байгаа query хадгална', () => {
    const u = new URL(buildFeedbackUrl('https://forms.example/x?usp=pp', '0.1.0', 42, 'mid'));
    expect(u.searchParams.get('v')).toBe('0.1.0');
    expect(u.searchParams.get('day')).toBe('42');
    expect(u.searchParams.get('dev')).toBe('mid');
    expect(u.searchParams.get('usp')).toBe('pp');
  });
  it('url хоосон бол идэвхгүй', () => {
    expect(feedbackEnabled('')).toBe(false);
    expect(feedbackEnabled('https://a.b')).toBe(true);
  });
});
