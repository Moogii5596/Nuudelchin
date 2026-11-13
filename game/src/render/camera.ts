/**
 * Малчныг дагах камер (прототип v1.2): хулганаар чирж эргүүлнэ, дугуйгаар ойртуулна.
 * Чирээгүй товшилтыг onClick-ээр (газар дээр дарж явах) дамжуулна.
 */
import * as THREE from 'three';
import { clamp } from './util';

export class FollowCamera {
  readonly camera: THREE.PerspectiveCamera;
  yaw = 0.6;
  pitch = 0.55;
  dist = 18;
  onClick: ((ndcX: number, ndcY: number, double: boolean) => void) | null = null;
  private ptr: { x: number; y: number; sx: number; sy: number; id: number; drag: boolean } | null = null;
  private lastTap = 0;

  constructor(dom: HTMLElement, aspect: number) {
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.3, 900);
    dom.addEventListener('pointerdown', (e) => {
      dom.focus();
      this.ptr = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, id: e.pointerId, drag: false };
      dom.setPointerCapture(e.pointerId);
    });
    dom.addEventListener('pointermove', (e) => {
      const p = this.ptr;
      if (!p || e.pointerId !== p.id) return;
      if (!p.drag && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 7) p.drag = true;
      if (p.drag) {
        this.yaw -= (e.clientX - p.x) * 0.006;
        this.pitch = clamp(this.pitch + (e.clientY - p.y) * 0.004, 0.12, 1.35);
      }
      p.x = e.clientX;
      p.y = e.clientY;
    });
    dom.addEventListener('pointerup', (e) => {
      const p = this.ptr;
      if (!p || e.pointerId !== p.id) return;
      this.ptr = null;
      if (p.drag) return;
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

  update(tx: number, tz: number, ty: number, heightAt: (x: number, z: number) => number): void {
    const cx = tx + Math.sin(this.yaw) * Math.cos(this.pitch) * this.dist;
    const cz = tz + Math.cos(this.yaw) * Math.cos(this.pitch) * this.dist;
    let cy = ty + Math.sin(this.pitch) * this.dist;
    cy = Math.max(cy, heightAt(cx, cz) + 1.2);
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(tx, ty, tz);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
