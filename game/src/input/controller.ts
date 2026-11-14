/**
 * Гар, хулгана → Command (architecture.md §3.1).
 * Малчин бодит цагаар хөдөлнө (тоглоомын хурдаас үл хамаарна): WASD/сум — камерын харсан зүгт,
 * Shift — гүйх, газар дээр дарах — тэр газар руу явах (2 удаа дарвал гүйнэ).
 * Байрлалыг кадр бүр `movePlayer` командаар sim-д өгнө.
 */
import type { GameConfig } from '../sim/config';
import type { GameState } from '../sim/state';
import type { Command, CommandResult } from '../sim/commands';
import { riverZ } from '../sim/terrain';

export type ActionKind = 'shout' | 'scare' | 'call' | 'mount' | 'uurga' | 'pickup' | 'deposit' | 'dog' | 'vehicle';

export interface ControllerHooks {
  dispatch: (cmd: Command) => CommandResult;
  /** Командын үр дүн (мэдэгдэл, бичиг) */
  onAction: (kind: ActionKind, res: CommandResult) => void;
  onSpeed: (idx: number) => void;
  onToggle: (what: 'heatmap' | 'help' | 'cheat' | 'storage' | 'trade' | 'dogs' | 'camps' | 'zones') => void;
  /** Цонх нээлттэй үед удирдлага ажиллахгүй */
  blocked: () => boolean;
  /** Одоогийн төлөв (E товчны үйлдлийг сонгоход) */
  state: () => GameState;
}

const angDiff = (a: number, b: number): number => {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

export class PlayerController {
  private keys = new Set<string>();
  private target: { x: number; z: number; run: boolean } | null = null;
  private shoutCd = 0;
  private scareCd = 0;
  /** Жолоодож буй тээврийн хурд (м/с, урагш +) */
  vSpeed = 0;

  constructor(private cfg: GameConfig, private hooks: ControllerHooks) {
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (this.hooks.blocked()) return;
      this.keys.add(e.code);
      if (e.repeat) return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.shout();
          break;
        case 'KeyF':
          this.hooks.onAction('mount', this.hooks.dispatch({ type: 'toggleMount' }));
          break;
        case 'KeyU':
          this.hooks.onAction('uurga', this.hooks.dispatch({ type: 'toggleUurga' }));
          break;
        case 'KeyH':
          this.hooks.onAction('call', this.hooks.dispatch({ type: 'callHorse' }));
          break;
        case 'KeyQ':
          this.scare();
          break;
        case 'KeyE':
          if (this.hooks.state().player.place === 'sum') this.hooks.onToggle('trade');
          else this.useAction(true);
          break;
        case 'KeyV':
          this.vSpeed = 0;
          this.hooks.onAction('vehicle', this.hooks.dispatch({ type: 'toggleVehicle' }));
          break;
        case 'KeyB':
          this.hooks.onToggle('storage');
          break;
        case 'KeyT':
          this.hooks.onToggle('trade');
          break;
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
          this.hooks.onSpeed(Number(e.code.slice(-1)) - 1);
          break;
        case 'KeyG':
          this.hooks.onToggle('heatmap');
          break;
        case 'Backquote':
          this.hooks.onToggle('cheat');   // туршилтын цэс
          break;
        case 'KeyK':
          this.hooks.onToggle('dogs');
          break;
        case 'KeyM':
          this.hooks.onToggle('camps');
          break;
        case 'KeyZ':
          this.hooks.onToggle('zones');
          break;
        case 'KeyN':
          // Шүгэлдэх: бүх нохой намайг дага
          this.hooks.onAction('dog', this.hooks.dispatch({ type: 'dogOrder', dog: 'all', order: 'follow' }));
          break;
        case 'F1':
        case 'Slash':
          e.preventDefault();
          this.hooks.onToggle('help');
          break;
      }
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  private shout(): void {
    if (this.shoutCd > 0) return;
    this.shoutCd = this.cfg.player.shout.cooldownSec;
    this.hooks.onAction('shout', this.hooks.dispatch({ type: 'shout' }));
  }

  private scare(): void {
    if (this.scareCd > 0) return;
    this.scareCd = this.cfg.player.scareCooldownSec;
    this.hooks.onAction('scare', this.hooks.dispatch({ type: 'scareWolves' }));
  }

  private autoT = 0;

  /**
   * E (эсвэл автоматаар): агуулахын дэргэд гартаа юм байвал хийнэ, үгүй бол ойрын бүтээгдэхүүнийг түүнэ.
   * manual=false үед зөвхөн амжилттай бол мэдэгдэнэ.
   */
  private useAction(manual: boolean): void {
    const st = this.hooks.state();
    const p = st.player;
    if (p.away || p.driving) return;
    const home = this.cfg.camps.home;
    const atStore = Math.hypot(p.x - home.x, p.z - home.z) <= home.storageRadius;
    if (atStore && p.carry.length) {
      const r = this.hooks.dispatch({ type: 'deposit' });
      if (manual || r.ok || r.msg === 'Агуулах дүүрсэн') this.hooks.onAction('deposit', r);
      if (!manual && !r.ok) this.autoT = 4; // дүүрсэн бол дахин дахин мэдэгдэхгүй
      return;
    }
    const R = this.cfg.products.pickupRadius;
    const near = st.items.some((it) => Math.hypot(it.x - p.x, it.z - p.z) <= R);
    if (!near) {
      if (manual) this.hooks.onAction('pickup', { ok: false, msg: atStore ? 'Гарт юм алга' : 'Ойролцоо бүтээгдэхүүн алга' });
      return;
    }
    const carried = p.carry.reduce((t, c) => t + c.amount, 0);
    if (!manual && carried >= this.cfg.products.carryUnits - 1e-9) return;
    const r = this.hooks.dispatch({ type: 'pickup', ids: 'nearby' });
    if (manual || r.ok) this.hooks.onAction('pickup', r);
  }

  /** Газар дээр дарсан */
  moveTo(x: number, z: number, run: boolean): void {
    this.target = { x, z, run };
  }

  /** Кадр бүр: малчныг хөдөлгөнө */
  update(dt: number, state: GameState, forward: { x: number; z: number }): void {
    this.shoutCd = Math.max(0, this.shoutCd - dt);
    this.scareCd = Math.max(0, this.scareCd - dt);
    const p = state.player;
    if (p.place === 'map' || state.move) {
      this.target = null;
      return;
    }
    if (p.driving) {
      this.target = null;
      this.drive(dt, state);
      return;
    }
    // Алхаж явахад ойрын бүтээгдэхүүнийг автоматаар түүж, агуулахын дэргэд хийнэ
    if (p.place === 'camp') {
      this.autoT -= dt;
      if (this.autoT <= 0) {
        this.autoT = 0.2;
        this.useAction(false);
      }
    }
    const k = this.keys;
    let iz = 0, ix = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) iz += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) iz -= 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) ix -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) ix += 1;
    let vx = 0, vz = 0;
    let run = k.has('ShiftLeft') || k.has('ShiftRight');
    if (ix || iz) {
      this.target = null;
      const rx = -forward.z, rz = forward.x;   // баруун тал
      vx = forward.x * iz + rx * ix;
      vz = forward.z * iz + rz * ix;
    } else if (this.target) {
      vx = this.target.x - p.x;
      vz = this.target.z - p.z;
      run = run || this.target.run;
      if (Math.hypot(vx, vz) < 0.5) {
        this.target = null;
        vx = vz = 0;
      }
    }
    const l = Math.hypot(vx, vz);
    if (l === 0) return;
    const pl = this.cfg.player;
    const speed = p.mounted ? (run ? pl.mountedRunSpeed : pl.mountedSpeed) : run ? pl.runSpeed : pl.walkSpeed;
    let x = p.x + (vx / l) * speed * dt;
    let z = p.z + (vz / l) * speed * dt;

    // Майхан/гэрийг тойрно
    const home = this.cfg.camps.home;
    const hr = (state.home === 'ger' ? home.gerRadius : home.tentRadius) + (p.mounted ? 0.8 : 0.3);
    const hd = Math.hypot(x - home.x, z - home.z);
    if (p.place === 'camp' && hd < hr) {
      x = home.x + ((x - home.x) / (hd || 1)) * hr;
      z = home.z + ((z - home.z) / (hd || 1)) * hr;
    }
    // Газрын хязгаар. Морьтой хүрвэл газрын зураг руу гарна (sim — movePlayer)
    const R = Math.hypot(x, z);
    if (R > pl.worldRadius) {
      x *= pl.worldRadius / R;
      z *= pl.worldRadius / R;
    }
    // Голыг явганаар гатлахгүй (мориор гатална)
    const w = this.cfg.camps.camps[state.campId]?.waterShape;
    if (p.place === 'camp' && w && w.kind === 'lineZ' && !p.mounted) {
      const rz = riverZ(w, x);
      const b = pl.riverBlockOnFoot;
      if (Math.abs(z - rz) < b) z = rz + (p.z > rz ? b : -b);
    }
    const th = Math.atan2(vx, vz);
    const heading = p.heading + angDiff(th, p.heading) * Math.min(1, dt * 10);
    this.hooks.dispatch({ type: 'movePlayer', x, z, heading });
  }

  /**
   * Тэрэг/машин жолоодох (M4.6): W/S — урагш/хойш (тоормос), A/D — эргэх. Бодит цагаар.
   * 3D-ийн хязгаарт хүрвэл sim газрын зураг руу гаргана.
   */
  private drive(dt: number, state: GameState): void {
    const p = state.player;
    const spec = this.cfg.vehicles[p.driving!];
    const k = this.keys;
    const thr = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const steer = (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) - (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0);
    const max = spec.driveSpeed;
    const accel = spec.truck ? 5 : 3, brake = 9;
    let v = this.vSpeed;
    if (thr > 0) v += (v < 0 ? brake : accel) * dt;
    else if (thr < 0) v -= (v > 0 ? brake : accel) * dt;
    else v -= Math.sign(v) * Math.min(Math.abs(v), 2.5 * dt);
    v = Math.max(-3, Math.min(max, v));
    const turn = steer * (spec.truck ? 0.9 : 1.3) * Math.min(1, Math.abs(v) / 3) * Math.sign(v);
    let heading = p.heading + turn * dt;
    let x = p.x + Math.sin(heading) * v * dt;
    let z = p.z + Math.cos(heading) * v * dt;
    // Майхан/гэрийг мөргөхгүй
    if (p.place === 'camp') {
      const home = this.cfg.camps.home;
      const hr = (state.home === 'ger' ? home.gerRadius : home.tentRadius) + 2.5;
      const hd = Math.hypot(x - home.x, z - home.z);
      if (hd < hr) {
        x = home.x + ((x - home.x) / (hd || 1)) * hr;
        z = home.z + ((z - home.z) / (hd || 1)) * hr;
        v *= 0.3;
      }
    }
    if (heading > Math.PI) heading -= Math.PI * 2;
    if (heading < -Math.PI) heading += Math.PI * 2;
    this.vSpeed = v;
    if (Math.abs(v) < 1e-3 && !thr) return;
    this.hooks.dispatch({ type: 'driveVehicle', x, z, heading });
  }
}
