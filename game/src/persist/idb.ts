/**
 * IndexedDB хадгалалт (M6.2): 3 слот, слот бүрт A/B хоёр хуулбар. sim/-д хамаарахгүй — зөвхөн `sim/save.ts`-ийн текстийг хадгална.
 *
 * Бичих дүрэм: нэг readwrite гүйлгээнд хоёр хуулбарыг уншаад, ХУУЧИН (эсвэл эвдэрсэн, хоосон) хуулбарыг шинэчилнэ. Гүйлгээ дундаа
 * тасарвал IndexedDB бүхлээр нь буцаана → нөгөө хуулбар бүтэн. Нэмэлт хамгаалалт: мөр бүрт хэмжээ + FNV-1a шалгах нийлбэр, ачаалахад
 * эвдэрсэн хуулбарыг алгасаад нөгөөг авна. Хоёулаа бүтэн бол `seq` том нь.
 */
import { SaveError, deserialize, type SaveMeta } from '../sim/save';
import type { GameConfig } from '../sim/config';
import type { GameState } from '../sim/state';

export const SLOTS = 3;
export const DB_NAME = 'nuudelchin';
const STORE = 'saves';
type Copy = 'A' | 'B';

interface Row {
  id: string;        // `${slot}.${copy}`
  slot: number;
  copy: Copy;
  seq: number;       // слот доторх өсөх дугаар
  savedAt: number;   // Date.now()
  meta: SaveMeta;
  size: number;      // data.length
  check: string;     // fnv1a(data)
  data: string;      // sim/save.ts serialize()
}

export interface SlotInfo {
  slot: number;
  /** Хоёр хуулбар хоёулаа хоосон */
  empty: boolean;
  /** Бичлэг байгаа ч бүтэн хуулбар алга */
  damaged: boolean;
  meta: SaveMeta | null;
  savedAt: number;
  copy: Copy | null;
}

export function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const intact = (r: Row | undefined): r is Row => !!r && typeof r.data === 'string' && r.data.length === r.size && fnv1a(r.data) === r.check;
const req = <T>(r: IDBRequest<T>): Promise<T> => new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });

export interface StoreHooks {
  /** Тест: бичилтийн дунд (put-ийн дараа, commit-ийн өмнө) дуудагдана; throw хийвэл гүйлгээ буцна */
  afterPut?: () => void;
}

export class SaveStore {
  readonly hooks: StoreHooks = {};
  private db: Promise<IDBDatabase> | null = null;

  constructor(private readonly factory: IDBFactory, private readonly name = DB_NAME) {}

  /** Хөтөч IndexedDB дэмжиж, нээж болох эсэх (private горимд боломжгүй байж болно) */
  static available(): boolean {
    try { return typeof indexedDB !== 'undefined' && indexedDB !== null; } catch { return false; }
  }

  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise((ok, no) => {
      const r = this.factory.open(this.name, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore(STORE, { keyPath: 'id' }); };
      r.onsuccess = () => ok(r.result);
      r.onerror = () => no(r.error ?? new Error('IndexedDB нээгдсэнгүй'));
      r.onblocked = () => no(new Error('IndexedDB блоклогдсон'));
    });
    this.db.catch(() => { this.db = null; });
    return this.db;
  }

  close(): void {
    void this.db?.then((d) => d.close());
    this.db = null;
  }

  /** Слотод бичнэ: хуучин хуулбарыг шинэчилнэ. Амжилттай бол бичсэн хуулбарын мэдээлэл */
  async write(slot: number, text: string, meta: SaveMeta, now = Date.now()): Promise<{ copy: Copy; seq: number }> {
    checkSlot(slot);
    const db = await this.open();
    return new Promise((ok, no) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.onerror = () => no(tx.error);
      tx.onabort = () => no(tx.error ?? new Error('хадгалалт цуцлагдлаа'));
      const st = tx.objectStore(STORE);
      const fail = (e: unknown): void => { try { tx.abort(); } catch { /* аль хэдийн */ } no(e); };
      // Гүйлгээ идэвхтэй байх хугацаанд зөвхөн request-ийн callback-аар дамжина (Promise-ийн микротаск найдваргүй хөтөчид)
      const ga = st.get(`${slot}.A`);
      ga.onerror = () => fail(ga.error);
      ga.onsuccess = () => {
        const gb = st.get(`${slot}.B`);
        gb.onerror = () => fail(gb.error);
        gb.onsuccess = () => {
          const ra = ga.result as Row | undefined, rb = gb.result as Row | undefined;
          const okA = intact(ra), okB = intact(rb);
          const top = Math.max(okA ? ra.seq : 0, okB ? rb.seq : 0);
          // Эвдэрсэн/хоосон хуулбарыг түрүүлж солино; хоёул бүтэн бол хуучныг нь
          const copy: Copy = !okA ? 'A' : !okB ? 'B' : ra.seq <= rb.seq ? 'A' : 'B';
          const seq = top + 1;
          const row: Row = { id: `${slot}.${copy}`, slot, copy, seq, savedAt: now, meta, size: text.length, check: fnv1a(text), data: text };
          st.put(row);
          try {
            this.hooks.afterPut?.();
          } catch (e) {
            fail(e);
            return;
          }
          tx.oncomplete = () => ok({ copy, seq });
        };
      };
    });
  }

  private async rows(slot: number): Promise<Row[]> {
    const db = await this.open();
    const st = db.transaction(STORE, 'readonly').objectStore(STORE);
    const [a, b] = await Promise.all([req(st.get(`${slot}.A`)), req(st.get(`${slot}.B`))]);
    return [a as Row | undefined, b as Row | undefined].filter((r): r is Row => !!r);
  }

  /** 3 слотын товч мэдээлэл (парслахгүй — шалгах нийлбэр л шалгана) */
  async list(): Promise<SlotInfo[]> {
    const out: SlotInfo[] = [];
    for (let slot = 1; slot <= SLOTS; slot++) {
      const rows = await this.rows(slot);
      const good = rows.filter(intact).sort((x, y) => y.seq - x.seq)[0];
      out.push(good
        ? { slot, empty: false, damaged: false, meta: good.meta, savedAt: good.savedAt, copy: good.copy }
        : { slot, empty: rows.length === 0, damaged: rows.length > 0, meta: null, savedAt: 0, copy: null });
    }
    return out;
  }

  /**
   * Слотыг ачаална: seq-ээр буурах дарааллаар бүтэн (шалгах нийлбэр + `deserialize`) хуулбарыг авна. Хоёул муу бол SaveError,
   * хоосон бол null.
   */
  async load(cfg: GameConfig, slot: number): Promise<GameState | null> {
    checkSlot(slot);
    const rows = (await this.rows(slot)).sort((x, y) => y.seq - x.seq);
    if (rows.length === 0) return null;
    const problems: string[] = [];
    for (const r of rows) {
      if (!intact(r)) { problems.push(`${(r as Row).id}: шалгах нийлбэр таарахгүй`); continue; }
      try {
        return deserialize(cfg, r.data);
      } catch (e) {
        problems.push(`${r.id}: ${(e as Error).message.split('\n')[0]}`);
      }
    }
    throw new SaveError(`слот ${slot}-ийн хоёр хуулбар хоёул эвдэрсэн`, problems);
  }

  /** Хамгийн сүүлд хадгалсан бүтэн слот (эхлэхэд «үргэлжлүүлэх»). Эвдэрсэн слотыг алгасна */
  async latest(cfg: GameConfig): Promise<{ slot: number; state: GameState; savedAt: number } | null> {
    const infos = (await this.list()).filter((i) => !i.empty && !i.damaged).sort((x, y) => y.savedAt - x.savedAt);
    for (const i of infos) {
      try {
        const state = await this.load(cfg, i.slot);
        if (state) return { slot: i.slot, state, savedAt: i.savedAt };
      } catch { /* дараагийн слот */ }
    }
    return null;
  }

  async remove(slot: number): Promise<void> {
    checkSlot(slot);
    const db = await this.open();
    await new Promise<void>((ok, no) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(`${slot}.A`);
      tx.objectStore(STORE).delete(`${slot}.B`);
      tx.oncomplete = () => ok();
      tx.onerror = tx.onabort = () => no(tx.error);
    });
  }
}

function checkSlot(slot: number): void {
  if (!Number.isInteger(slot) || slot < 1 || slot > SLOTS) throw new RangeError(`слот 1…${SLOTS} байх ёстой (${slot})`);
}

/** Хөтчөөс хадгалалтыг цэвэрлэгдэхгүй байхыг хүснэ (нэг удаа). Дэмжихгүй бол false */
export async function requestPersistence(): Promise<boolean> {
  try {
    const s = typeof navigator !== 'undefined' ? navigator.storage : undefined;
    if (!s?.persist) return false;
    if (await s.persisted?.()) return true;
    return await s.persist();
  } catch {
    return false;
  }
}
