/**
 * Гар: гөлгөр ханцуй (улирлаар өнгө нь цээжтэй ижил солигдоно), эргүүлсэн нударга, өвлийн үслэг зах, бугуй,
 * алга, 4 хуруу (3 үетэй), эрхий. `curl(c, grip)` — хуруу атгах / уурганы иш тойруулж барих.
 */
import * as THREE from 'three';
import { mix, noOut, ring, type Kit, type Pt } from '../geom';
import { fur, smooth } from '../materials';
import type { CharacterSpec } from '../spec';

export type Curl = (curl: number, grip?: number) => void;
export interface Arm { shoulder: THREE.Group; elbow: THREE.Group; wrist: THREE.Group; curl: Curl }

const PALM: readonly Pt[] = [[0.02, -0.114], [0.047, -0.11], [0.057, -0.092], [0.056, -0.055], [0.046, -0.03], [0.026, -0.014]];
/** [z, үе1, үе2, үе3]: чигчий → долоовор (эрхий талдаа) */
const FINGERS: ReadonlyArray<readonly [number, number, number, number]> = [[-0.039, 0.034, 0.025, 0.022], [-0.013, 0.041, 0.031, 0.025], [0.013, 0.044, 0.034, 0.026], [0.039, 0.041, 0.031, 0.025]];
/** Бариулыг (радиус ~1.6 см) 200° орчим тойрч ороох үе тус бүрийн өнцөг (тооцоолсон) */
const GRIP = [0.107, 1.293, 0.974] as const;

/** sx: -1 зүүн, 1 баруун; bend — тохойн анхны нугалаа (сөрөг = урагш) */
export function buildArm(spec: CharacterSpec, kit: Kit, sx: number, bend: number, sleeveMat: THREE.Material, cuffMat: THREE.Material): Arm {
  const sash = smooth(spec.sash.color);
  const shoulder = new THREE.Group();
  shoulder.position.set(sx * 0.325, 1.6, 0);
  shoulder.rotation.z = sx * 0.06;                                          // гар биеэс бага зэрэг зайтай унжина
  kit.sball(0.118, sleeveMat, 0, -0.01, 0, shoulder).scale.set(1.0, 0.95, 1.08);       // мөр: ханцуйтай нэг цул
  kit.cyl(0.118, 0.104, 0.32, sleeveMat, 0, -0.16, 0, shoulder);               // ханцуй мөрөндөө өргөн, тохой руугаа нарийсна
  const elbow = new THREE.Group();
  elbow.position.y = -0.32;
  elbow.rotation.x = bend;
  shoulder.add(elbow);
  kit.sball(0.104, sleeveMat, 0, 0, 0, elbow);
  kit.cyl(0.1, 0.112, 0.28, sleeveMat, 0, -0.14, 0, elbow);      // урт, сул ханцуй
  kit.cyl(0.117, 0.121, 0.12, cuffMat, 0, -0.265, 0, elbow);     // эргүүлсэн нударга
  noOut(kit.cyl(0.12, 0.12, 0.01, sash, 0, -0.204, 0, elbow));   // нударганы дээд хөвөө
  noOut(kit.cyl(0.124, 0.124, 0.01, sash, 0, -0.322, 0, elbow)); // нударганы доод хөвөө
  const winterCuff = new THREE.Group();                          // өвөл л харагдах ханцуйны үслэг зах
  winterCuff.name = 'body:winter';
  elbow.add(winterCuff);
  kit.fluff(ring(0, -0.325, 0, 0.125, 'y', 24), 0.036, fur(spec.deel.furTrim), winterCuff, 31 + sx);
  const wrist = new THREE.Group();
  wrist.position.y = -0.3;
  elbow.add(wrist);
  const skinM = smooth(spec.skin.base), nailM = smooth(spec.skin.nail);
  kit.sball(0.032, skinM, 0, -0.015, 0, wrist).scale.set(0.75, 1, 1.3);                // бугуй
  // Алга: булан нь дугуйрсан, бугуй талдаа нарийн, хурууны уг талдаа өргөн
  kit.lathe(PALM, 1, skinM, 0, 0, 0, wrist, { capBottom: true, rows: 12 }).scale.x = 0.4;
  const fingers: Array<{ joints: THREE.Group[]; k: number }> = [];
  FINGERS.forEach(([fz, ...lens], n) => {
    const joints: THREE.Group[] = [];
    let parent: THREE.Group = wrist, y = -0.108, r = 0.0155;
    for (const len of lens) {
      const jt = new THREE.Group();
      jt.position.set(0, y, parent === wrist ? fz : 0);
      parent.add(jt);
      noOut(kit.sball(r, skinM, 0, 0, 0, jt));                                          // үений товгор
      noOut(kit.cyl(r, r * 0.9, len, skinM, 0, -len / 2, 0, jt));
      joints.push(jt);
      parent = jt; y = -len; r *= 0.9;
    }
    noOut(kit.sball(r, skinM, 0, y, 0, parent));                                        // хурууны үзүүр
    noOut(kit.sball(r * 0.85, nailM, sx * r * 0.7, y * 0.55, 0, parent)).scale.set(0.3, 1.2, 0.9);   // хумс (гарын ар талд)
    noOut(kit.sball(0.0155, skinM, sx * 0.004, -0.106, fz, wrist)).scale.set(0.8, 1, 1);             // гарын ар талын үений товгор
    fingers.push({ joints, k: 1.15 - n * 0.1 });                                    // чигчий илүү нугарна
  });
  noOut(kit.sball(0.028, skinM, -sx * 0.01, -0.062, -0.03, wrist)).scale.set(0.6, 1.5, 0.9);    // алганы чигчий талын зөөлөвч
  // Эрхий: алганы яс (булчинтай), уг үе, үзүүр үе (өргөн, хавтгай зөөлөвч, хумстай)
  const thumbBase = new THREE.Group();
  thumbBase.position.set(-sx * 0.01, -0.035, 0.04);
  wrist.add(thumbBase);
  noOut(kit.sball(0.021, skinM, 0, 0, 0, thumbBase));
  noOut(kit.cyl(0.021, 0.019, 0.042, skinM, 0, -0.021, 0, thumbBase));
  noOut(kit.sball(0.027, skinM, -sx * 0.008, -0.02, -0.006, thumbBase)).scale.set(0.8, 1.35, 1);   // эрхийн булчин: алгатай нийлнэ
  const thumb = new THREE.Group();
  thumb.position.y = -0.042;
  thumbBase.add(thumb);
  noOut(kit.sball(0.0188, skinM, 0, 0, 0, thumb));
  noOut(kit.cyl(0.0182, 0.0168, 0.032, skinM, 0, -0.016, 0, thumb));
  const thumbTip = new THREE.Group();
  thumbTip.position.y = -0.032;
  thumb.add(thumbTip);
  noOut(kit.sball(0.017, skinM, 0, 0, 0, thumbTip));
  noOut(kit.cyl(0.0165, 0.0155, 0.022, skinM, 0, -0.011, 0, thumbTip)).scale.set(0.88, 1, 1.12);   // үзүүр рүүгээ хавтгайрна
  noOut(kit.sball(0.0158, skinM, 0, -0.023, 0, thumbTip)).scale.set(0.85, 1, 1.12);                // бөөрөнхий, өргөн үзүүр
  noOut(kit.sball(0.0125, nailM, sx * 0.0085, -0.02, 0.004, thumbTip)).scale.set(0.35, 1.2, 1);     // хумс
  /**
   * c = 0 тэнийсэн … 1.3 нударга. grip = 0..1: уурганы ишийг тойруулж атгасан байрлал руу шилжинэ —
   * эрхий долоовор хурууны хажууд, бариулыг хуруунуудын эсрэг талаас хөндлөн тойрно.
   */
  const curl: Curl = (c, grip = 0) => {
    for (const { joints, k } of fingers) {
      joints[0]!.rotation.z = -sx * mix(c * 0.8 * k, GRIP[0], grip);
      joints[1]!.rotation.z = -sx * mix(c * 1.0 * k, GRIP[1], grip);
      joints[2]!.rotation.z = -sx * mix(c * 0.7 * k, GRIP[2], grip);
    }
    thumbBase.position.set(-sx * mix(0.01, 0.025, grip), mix(-0.035, -0.05, grip), mix(0.04, 0.058, grip));
    thumbBase.rotation.x = mix(-0.55, 0, grip);
    thumbBase.rotation.z = -sx * mix(0.1 + c * 0.25, 0.303, grip);
    thumb.rotation.x = mix(0.22, 0, grip);
    thumb.rotation.z = -sx * mix(c * 0.3, 0.422, grip);
    thumbTip.rotation.z = -sx * mix(c * 0.45, -0.822, grip);
  };
  curl(0.35);
  return { shoulder, elbow, wrist, curl };
}
