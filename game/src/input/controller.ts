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

export type ActionKind = 'shout' | 'scare' | 'call' | 'mount';

export interface ControllerHooks {
  dispatch: (cmd: Command) => CommandResult;
  /** Командын үр дүн (мэдэгдэл, бичиг) */
  onAction: (kind: ActionKind, res: CommandResult) => void;
  onSpeed: (idx: number) => void;
  onToggle: (what: 'heatmap' | 'help' | 'cheatHerd') => void;
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

  constructor(private cfg: GameConfig, private hooks: ControllerHooks) {
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
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
        case 'KeyH':
          this.hooks.onAction('call', this.hooks.dispatch({ type: 'callHorse' }));
          break;
        case 'KeyQ':
          this.scare();
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
          this.hooks.onToggle('cheatHerd');   // туршилт: +50 мал
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

  /** Газар дээр дарсан */
  moveTo(x: number, z: number, run: boolean): void {
    this.target = { x, z, run };
  }

  /** Кадр бүр: малчныг хөдөлгөнө */
  update(dt: number, state: GameState, forward: { x: number; z: number }): void {
    this.shoutCd = Math.max(0, this.shoutCd - dt);
    this.scareCd = Math.max(0, this.scareCd - dt);
    const p = state.player;
    if (p.away) {
      this.target = null;
      return;
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
    if (hd < hr) {
      x = home.x + ((x - home.x) / (hd || 1)) * hr;
      z = home.z + ((z - home.z) / (hd || 1)) * hr;
    }
    // Газрын хязгаар
    const R = Math.hypot(x, z);
    if (R > pl.worldRadius) {
      x *= pl.worldRadius / R;
      z *= pl.worldRadius / R;
    }
    // Голыг явганаар гатлахгүй (мориор гатална)
    const w = this.cfg.camps.camps[state.campId]?.waterShape;
    if (w && w.kind === 'lineZ' && !p.mounted) {
      const rz = riverZ(w, x);
      const b = pl.riverBlockOnFoot;
      if (Math.abs(z - rz) < b) z = rz + (p.z > rz ? b : -b);
    }
    const th = Math.atan2(vx, vz);
    const heading = p.heading + angDiff(th, p.heading) * Math.min(1, dt * 10);
    this.hooks.dispatch({ type: 'movePlayer', x, z, heading });
  }
}
