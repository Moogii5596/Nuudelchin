/**
 * Малчныг дагах камер (прототип v1.2): хулганаар чирж эргүүлнэ, дугуйгаар ойртуулна.
 * Чирээгүй товшилтыг onClick-ээр (газар дээр дарж явах) дамжуулна.
 * M4.6: газрын зургийн горимд (mapMode) хулганы баруун товчоор чирэхэд эргүүлнэ, дунд товчоор дээш доош хазайлгана
 * (mapYaw, mapPitch). Зүүн товч — зөвхөн дарах.
 * V4.5 R7: мөргөлдөөн — `solids` (гаднах барилга, гэр) тавигдвал камер тэдгээрт орохгүй, малчин руу зөөлөн ойртоно.
 */
import * as THREE from 'three';
import { clamp } from './util';
import { clipThroughSolids, type CamSolids } from './camclip';

export class FollowCamera {
  readonly camera: THREE.PerspectiveCamera;
  yaw = 0.6;
  pitch = 0.55;
  dist = 18;
  onClick: ((ndcX: number, ndcY: number, double: boolean) => void) | null = null;
  /** Газрын зураг (M4.6) */
  mapMode = false;
  mapYaw = 0;
  mapPitch = 0.95;
  /** Мөргөлдөөний саад (гадаа) — scene.ts кадр бүр тавина; дотор талд null */
  solids: CamSolids | null = null;
  /** Саадаас болж камерын зай хэд хувь үлдсэн (1 = бүтэн) — аажмаар сэргэнэ */
  private clipT = 1;
  private ptr: { x: number; y: number; sx: number; sy: number; id: number; drag: boolean; button: number; touch: boolean } | null = null;
  private lastTap = 0;
  private cameraReady = false;
  private smoothPosition = new THREE.Vector3();
  private smoothTarget = new THREE.Vector3();
  private desiredPosition = new THREE.Vector3();
  private desiredTarget = new THREE.Vector3();
  /** Утас: дэлгэцэн дээрх хуруунууд (хоёр хуруугаар чимхэж томруулна) */
  private touches = new Map<number, { x: number; y: number }>();
  private pinch: number | null = null;
  private span(): number {
    const [a, b] = [...this.touches.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  constructor(dom: HTMLElement, aspect: number) {
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.3, 900);
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    dom.addEventListener('pointerdown', (e) => {
      dom.focus();
      if (e.button === 1) e.preventDefault();   // дунд товчны автомат гүйлгэлтгүй
      dom.setPointerCapture(e.pointerId);
      const touch = e.pointerType === 'touch';
      if (touch) {
        this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.touches.size === 2) {
          // Хоёр дахь хуруу: чимхэх эхэллээ — эхний хурууны дарах үйлдлийг цуцална
          this.pinch = this.span();
          if (this.ptr) this.ptr.drag = true;
          return;
        }
        if (this.touches.size > 2) return;
      }
      this.ptr = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, id: e.pointerId, drag: false, button: e.button, touch };
    });
    dom.addEventListener('pointermove', (e) => {
      if (this.touches.has(e.pointerId)) {
        this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.pinch !== null && this.touches.size >= 2) {
          const s = this.span();
          if (s > 0 && this.pinch > 0) this.dist = clamp(this.dist * (this.pinch / s), 6, 70);
          this.pinch = s;
          return;
        }
      }
      const p = this.ptr;
      if (!p || e.pointerId !== p.id) return;
      if (!p.drag && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > (p.touch ? 12 : 7)) p.drag = true;
      if (p.drag) {
        if (this.mapMode) {
          // Утсанд нэг хуруугаар чирэхэд газрын зургийг эргүүлнэ
          if (p.button === 2 || p.touch) this.mapYaw -= (e.clientX - p.x) * 0.006;
          else if (p.button === 1) this.mapPitch = clamp(this.mapPitch + (e.clientY - p.y) * 0.004, 0.3, 1.45);
        } else {
          this.yaw -= (e.clientX - p.x) * 0.006;
          this.pitch = clamp(this.pitch + (e.clientY - p.y) * 0.004, 0.12, 1.35);
        }
      }
      p.x = e.clientX;
      p.y = e.clientY;
    });
    const lift = (e: PointerEvent): void => {
      this.touches.delete(e.pointerId);
      if (this.touches.size < 2) this.pinch = null;
    };
    dom.addEventListener('pointercancel', (e) => {
      lift(e);
      if (this.ptr?.id === e.pointerId) this.ptr = null;
    });
    dom.addEventListener('pointerup', (e) => {
      lift(e);
      const p = this.ptr;
      if (!p || e.pointerId !== p.id) return;
      this.ptr = null;
      if (p.drag || p.button !== 0) return;
      const now = performance.now();
      const dbl = now - this.lastTap < 320;
      this.lastTap = now;
      const r = dom.getBoundingClientRect();
      this.onClick?.(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1, dbl);
    });
    dom.addEventListener(
      'wheel',
      (e) => {
        this.dist = clamp(this.dist * (1 + e.deltaY * 0.0012), 6, 70);
        e.preventDefault();
      },
      { passive: false },
    );
  }

  /** Камерын харж буй хэвтээ чиглэл (WASD-ийн «урагш») */
  forward(): { x: number; z: number } {
    return { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
  }

  update(tx: number, tz: number, ty: number, heightAt: (x: number, z: number) => number, dt = 1 / 60): void {
    const cx = tx + Math.sin(this.yaw) * Math.cos(this.pitch) * this.dist;
    const cz = tz + Math.cos(this.yaw) * Math.cos(this.pitch) * this.dist;
    let cy = ty + Math.sin(this.pitch) * this.dist;
    cy = Math.max(cy, heightAt(cx, cz) + 1.2);
    this.desiredTarget.set(tx, ty, tz);
    // Мөргөлдөөн: малчин → камер сегментийг саадад тулгана. Ойртох нь хурдан (~0.08 с), холдох нь аажим (~0.4 с)
    let t = 1;
    if (this.solids) t = clipThroughSolids([tx, ty, tz], [cx, cy, cz], this.solids);
    if (!this.cameraReady || dt <= 0 || t < this.clipT) this.clipT = t < this.clipT ? this.clipT + (t - this.clipT) * (this.cameraReady && dt > 0 ? 1 - Math.exp(-dt * 25) : 1) : t;
    else this.clipT += (t - this.clipT) * (1 - Math.exp(-dt * 2.5));
    const k = Math.min(this.clipT, t);                  // зөөлрүүлсэн ч хана руу орохгүй (t-ээс их болохгүй)
    this.desiredPosition.set(tx + (cx - tx) * k, ty + (cy - ty) * k, tz + (cz - tz) * k);
    if (!this.cameraReady || dt <= 0) {
      this.smoothPosition.copy(this.desiredPosition);
      this.smoothTarget.copy(this.desiredTarget);
      this.cameraReady = true;
    } else {
      const blend = 1 - Math.exp(-dt * 10);
      this.smoothPosition.lerp(this.desiredPosition, blend);
      this.smoothTarget.lerp(this.desiredTarget, blend);
    }
    // Гөлгөржүүлэлтийн хоцролт камерыг барилга руу оруулж болох тул эцсийн байрлалыг дахин саадад тулгана
    if (this.solids) {
      const sp = this.smoothPosition, st = this.smoothTarget;
      const k2 = clipThroughSolids([st.x, st.y, st.z], [sp.x, sp.y, sp.z], this.solids);
      if (k2 < 1) sp.set(st.x + (sp.x - st.x) * k2, st.y + (sp.y - st.y) * k2, st.z + (sp.z - st.z) * k2);
    }
    this.camera.position.copy(this.smoothPosition);
    this.camera.lookAt(this.smoothTarget);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
