/**
 * Шошгын атлас: олон бичигтэй самбарыг нэг canvas текстур, нэг mesh (1 draw call) болгоно. Самбар бүр өөрийн хэмжээ,
 * байрлал, чиглэлтэй; бичгийг дараа нь солих боломжтой (`setText` — UV-г өөр нүд рүү заана, жишээ нь «ЗАРНА» → «ТАНЫХ»).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface LabelStyle { text: string; bg: string; fg: string }

const CW = 512, CH = 128, COLS = 4;

function drawCell(c: CanvasRenderingContext2D, x: number, y: number, s: LabelStyle): void {
  c.fillStyle = s.bg;
  c.fillRect(x, y, CW, CH);
  c.strokeStyle = s.fg;
  c.lineWidth = 8;
  c.strokeRect(x + 6, y + 6, CW - 12, CH - 12);
  c.fillStyle = s.fg;
  const size = s.text.length > 14 ? 46 : s.text.length > 9 ? 58 : 70;
  c.font = `bold ${size}px system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(s.text, x + CW / 2, y + 68);
}

export class LabelAtlas {
  private cells: LabelStyle[] = [];
  private cellOf = new Map<string, number>();
  private quads: { cell: number; geo: THREE.BufferGeometry }[] = [];
  private uv: THREE.BufferAttribute | null = null;
  private rows = 1;

  /** Бичгийн нүд (давхардвал нэг нүд) */
  cell(s: LabelStyle): number {
    const key = `${s.text}|${s.bg}|${s.fg}`;
    let i = this.cellOf.get(key);
    if (i === undefined) { i = this.cells.length; this.cells.push(s); this.cellOf.set(key, i); }
    return i;
  }

  /** Самбар нэмнэ (w×h м, төв нь x,y,z, yaw — хэвтээ эргэлт); буцаах нь самбарын дугаар */
  add(s: LabelStyle, w: number, h: number, x: number, y: number, z: number, yaw: number): number {
    const geo = new THREE.PlaneGeometry(w, h);
    geo.rotateY(yaw);
    geo.translate(x, y, z);
    this.quads.push({ cell: this.cell(s), geo });
    return this.quads.length - 1;
  }

  build(): THREE.Mesh | null {
    if (!this.quads.length) return null;
    this.rows = Math.ceil(this.cells.length / COLS);
    const cv = document.createElement('canvas');
    cv.width = CW * COLS;
    cv.height = CH * this.rows;
    const c = cv.getContext('2d')!;
    this.cells.forEach((s, i) => drawCell(c, (i % COLS) * CW, Math.floor(i / COLS) * CH, s));
    const geometry = mergeGeometries(this.quads.map((q) => q.geo), false)!;
    this.quads.forEach((q) => q.geo.dispose());
    this.uv = geometry.attributes.uv as THREE.BufferAttribute;
    this.quads.forEach((q, i) => this.setCell(i, q.cell));
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }));
    mesh.name = 'labels';
    return mesh;
  }

  /** Самбарын бичгийг солино (build-ийн дараа) */
  setText(quad: number, s: LabelStyle): void {
    const cell = this.cellOf.get(`${s.text}|${s.bg}|${s.fg}`);
    if (cell === undefined) throw new Error(`LabelAtlas: "${s.text}" нүд урьдчилан бүртгэгдээгүй (cell())`);
    if (this.quads[quad]!.cell !== cell) this.setCell(quad, cell);
  }

  private setCell(quad: number, cell: number): void {
    const uv = this.uv!, col = cell % COLS, row = Math.floor(cell / COLS), W = CW * COLS, H = CH * this.rows;
    // PlaneGeometry-ийн орой: (0,1) (1,1) (0,0) (1,0); 1 px дотогш — хөрш нүд нэвчихгүй
    const u0 = (col * CW + 1) / W, u1 = ((col + 1) * CW - 1) / W, v0 = 1 - ((row + 1) * CH - 1) / H, v1 = 1 - (row * CH + 1) / H;
    const o = quad * 4;
    uv.setXY(o, u0, v1); uv.setXY(o + 1, u1, v1); uv.setXY(o + 2, u0, v0); uv.setXY(o + 3, u1, v0);
    uv.needsUpdate = true;
    this.quads[quad]!.cell = cell;
  }
}
