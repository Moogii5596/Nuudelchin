/**
 * `animateCharacter(rig, pose)` — аль ч дүрд ажиллах нэг кадрын хөдөлгөөн: алхаа → гүйлт, морь унах, суух,
 * гар өргөх, уурга атгах, нүүр (анивчих, харц, ярих, сэтгэл хөдлөл). Тоо → data/visuals.json herderAnim.
 */
import { visualStyle, type HerderEmotion } from '../style';
import { EMOTIONS, type Emotion } from './face';
import { mix } from './geom';
import type { CharacterRig } from './rig';

/** Нэг кадрын поз: хөдөлгөөн sim-ээс, нүүр үйл явдлаас */
export interface CharacterPose {
  dt: number;
  /** газар дээрх хурд, м/с */
  speed: number;
  mode: 'foot' | 'mounted' | 'seated';
  /** хашгирах/дуудах үед хоёр гараа өргөнө */
  raise: boolean;
  uurga: boolean;
  talk: boolean;
  emotion: HerderEmotion;
  /** mounted: эмээлийн дөрөө — хажуугийн зай (ташаанаас биш, төвөөс), ташаанаас дөрөө хүртэлх доош зай (м). Байвал хөл дөрөөнд хүрнэ */
  seat?: { side: number; drop: number };
}

const HIP_X = 0.15, THIGH = 0.31, SHIN = 0.54;
/** Хөлийг (ташааны эргэлт x, z; өвдөг k) тавьж ташаанаас (tx, ty, tz) цэгт хүргэнэ: тоон Ньютон (3 үл мэдэгдэгч, 3 тэгшитгэл) */
function solveLeg(tx: number, ty: number, tz: number, g: [number, number, number]): [number, number, number] {
  const f = (a: number, b: number, k: number): [number, number, number] => {
    const ux = 0, uy = -THIGH - SHIN * Math.cos(k), uz = -SHIN * Math.sin(k);
    const x1 = ux * Math.cos(b) - uy * Math.sin(b), y1 = ux * Math.sin(b) + uy * Math.cos(b);
    return [x1, y1 * Math.cos(a) - uz * Math.sin(a), y1 * Math.sin(a) + uz * Math.cos(a)];
  };
  let [a, b, k] = g;
  for (let it = 0; it < 8; it++) {
    const f0 = f(a, b, k), e = [tx - f0[0], ty - f0[1], tz - f0[2]], h = 1e-4;
    const J = [f(a + h, b, k), f(a, b + h, k), f(a, b, k + h)].map((q) => [(q[0] - f0[0]) / h, (q[1] - f0[1]) / h, (q[2] - f0[2]) / h]);   // J[j][i] = df_i/dp_j
    const [c0, c1, c2] = J as [number[], number[], number[]];
    const det = c0[0]! * (c1[1]! * c2[2]! - c2[1]! * c1[2]!) - c1[0]! * (c0[1]! * c2[2]! - c2[1]! * c0[2]!) + c2[0]! * (c0[1]! * c1[2]! - c1[1]! * c0[2]!);
    if (Math.abs(det) < 1e-9) break;
    const sol = (col: number): number => {   // Cramer: e = J·d, d[col] ← e
      const M = [c0, c1, c2].map((c) => [...c]);
      M[col] = e;
      return (M[0]![0]! * (M[1]![1]! * M[2]![2]! - M[2]![1]! * M[1]![2]!) - M[1]![0]! * (M[0]![1]! * M[2]![2]! - M[2]![1]! * M[0]![2]!) + M[2]![0]! * (M[0]![1]! * M[1]![2]! - M[1]![1]! * M[0]![2]!)) / det;
    };
    a += Math.max(-0.5, Math.min(0.5, sol(0))); b += Math.max(-0.5, Math.min(0.5, sol(1))); k += Math.max(-0.5, Math.min(0.5, sol(2)));
    k = Math.min(2.4, Math.max(0.05, k));
  }
  return [a, b, k];
}

const TAU = Math.PI * 2;
const sstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Буцаах утга — алхам бүрийн биеийн дэвхцэлт (м); дуудагч root.position.y дээр нэмнэ */
export function animateCharacter(H: CharacterRig, p: CharacterPose): number {
  const cfg = visualStyle.herderAnim;
  const a = H.anim, dt = p.dt;
  const [leg0, leg1] = H.legs, [knee0, knee1] = H.knees, [arm0, arm1] = H.arms, [elb0, elb1] = H.elbows, [wr0, wr1] = H.wrists;
  const onFoot = p.mode === 'foot';
  // Кадр бүрийн шуугиантай хурдыг EMA-аар зөөлрүүлж, hysteresis-ээр алхаа/зогсолтыг шийдэж, gait жинг зөөлөн (damping) өөрчилнэ
  a.speed += ((onFoot ? p.speed : 0) - a.speed) * Math.min(1, dt * cfg.speedSmooth);
  if (a.speed < cfg.deadzone) a.speed = 0;
  if (!onFoot) { a.moving = false; a.gait = 0; a.speed = 0; }
  else if (!a.moving && a.speed > cfg.moveMin) a.moving = true;
  else if (a.moving && a.speed < cfg.moveStop) a.moving = false;
  const moving = a.moving;
  a.gait += ((moving ? 1 : 0) - a.gait) * Math.min(1, dt * cfg.gaitRate);
  if (a.gait < 0.01 && !moving) a.gait = 0;
  const mv = a.gait;
  a.run += ((moving ? sstep(cfg.runFrom, cfg.runFull, a.speed) : 0) - a.run) * Math.min(1, dt * 5);
  const run = a.run;
  a.time += dt;
  if (mv > 0) a.phase += dt * a.speed * mix(cfg.strideWalk, cfg.strideRun, run);
  const t = a.time, phase = a.phase;
  const sw = Math.sin(phase) * mix(0.7, 1.1, run) * mv;
  const f = Math.sin(phase);

  // --- Хөл: 0..π тулах үе, π..2π савлах үе ---
  const legPose = (u0: number): { thigh: number; knee: number } => {
    const u = ((u0 % TAU) + TAU) % TAU;
    const swing = u > Math.PI ? (u - Math.PI) / Math.PI : 0;
    const wThigh = -Math.cos(u) * 0.7;
    const wKnee = Math.max(0, -Math.sin(u)) * 0.9;
    const rThigh = -Math.cos(u) * 1.0 - 0.2 - 0.3 * Math.sin(Math.PI * swing);
    const rKnee = u <= Math.PI ? 0.22 + 0.3 * Math.sin(u) - 0.12 * (u / Math.PI) : 0.1 + 1.85 * Math.sin(Math.PI * Math.pow(swing, 0.72));
    return { thigh: mix(wThigh, rThigh, run), knee: mix(wKnee, rKnee, run) };
  };
  const L0 = legPose(phase + Math.PI / 2), L1 = legPose(phase + Math.PI * 1.5);
  leg0.rotation.set(L0.thigh * mv, 0, 0);
  leg1.rotation.set(L1.thigh * mv, 0, 0);
  knee0.rotation.x = L0.knee * mv;
  knee1.rotation.x = L1.knee * mv;

  // --- Гар: хөлийн эсрэг савлана ---
  const armPose = (fwd: number, fwdLag: number): { shoulder: number; elbowRun: number; inward: number } => ({
    shoulder: mix(-fwd * 0.56, fwd > 0 ? -fwd * 0.8 : -fwd * 0.95, run),
    elbowRun: -1.5 - 0.42 * Math.max(0, fwdLag) + 0.32 * Math.max(0, -fwdLag),
    inward: 0.38 * Math.max(0, fwd) * run,
  });
  const lag = Math.sin(phase - 0.45);
  const A0 = armPose(f, lag), A1 = armPose(-f, -lag);
  arm0.rotation.x = A0.shoulder * mv;
  arm1.rotation.x = A1.shoulder * mv;
  arm0.rotation.y = A0.inward * mv;
  arm1.rotation.y = -A1.inward * mv;
  const idleEl = (1 - mv) * Math.sin(t * 1.1) * 0.06;
  const walkEl = (rest: number, fwd: number): number => rest * (1 - 0.6 * Math.max(0, -fwd)) - Math.max(0, fwd) * 0.8;
  elb0.rotation.x = mix(walkEl(H.elbowRest[0], f), A0.elbowRun, run) + idleEl;
  elb1.rotation.x = mix(walkEl(H.elbowRest[1], -f), A1.elbowRun, run) - idleEl;

  // --- Хүзүү, амьсгал, бэлхүүс ---
  const lean = mv * mix(0.07, 0.3, run);
  H.neck.rotation.y = Math.sin(t * 0.45) * 0.3 * (1 - run);
  H.neck.rotation.x = Math.sin(t * 0.3 + 1) * 0.07 * (1 - run) - lean * 0.55 * run;
  const b = Math.sin(t * mix(1.6, 5, run)) * mix(1, 1.6, run);
  for (const body of H.bodies) body.scale.set((1 + b * 0.015) * H.build, 1, (1 + b * 0.035) * H.build);
  arm0.position.y = arm1.position.y = H.armY + b * 0.012;
  H.neck.position.y = H.neckY + b * 0.012;
  H.waist.rotation.y = sw * 0.22 + (1 - mv) * Math.sin(t * 0.5) * 0.14;
  H.waist.rotation.x = lean;
  H.waist.rotation.z = (1 - mv) * Math.sin(t * 0.8) * 0.03;

  // --- Хуруу, бугуй ---
  const relaxed = 0.35 + Math.sin(t * 0.9) * 0.08;
  let curl0 = mix(relaxed, 1.3, run), curl1 = curl0;
  const wk = 1 - run, hold = p.uurga ? 0.4 : 1;
  wr0.rotation.x = Math.sin(t * 2.1) * 0.3 * wk;
  wr1.rotation.x = Math.sin(t * 2.1 + 1) * 0.3 * wk * hold;
  wr1.rotation.z = Math.sin(t * 1.3) * 0.15 * wk * hold;

  // --- Морь унасан / тэрэг дээр суусан / гар өргөсөн ---
  if (p.mode === 'mounted') {
    if (p.seat) {   // хөл дөрөөнд: (x ташаа −0.15 / +0.15) → дөрөө (∓side)
      for (const [leg, knee, sg] of [[leg0, knee0, -1], [leg1, knee1, 1]] as const) {
        const [ax, bz, k] = solveLeg(sg * (p.seat.side / H.k - HIP_X), -p.seat.drop / H.k, 0.03, [-0.8, sg * 0.4, 1.3]);
        leg.rotation.set(ax, 0, bz); knee.rotation.x = k;
      }
    } else {
      leg0.rotation.set(-0.9, 0, -0.5);
      leg1.rotation.set(-0.9, 0, 0.5);
      knee0.rotation.x = knee1.rotation.x = 0.9;
    }
    arm0.rotation.set(-0.45, 0, arm0.rotation.z);
    arm1.rotation.set(-0.45, 0, arm1.rotation.z);
    elb0.rotation.x = elb1.rotation.x = -0.85;   // жолоо барьсан
    H.waist.rotation.set(0.06, 0, 0);
    wr0.rotation.x = wr1.rotation.x = 0;
    curl0 = curl1 = 1.2;
  } else if (p.mode === 'seated') {
    leg0.rotation.set(-1.4, 0, 0);
    leg1.rotation.set(-1.4, 0, 0);
    knee0.rotation.x = knee1.rotation.x = 1.35;
    arm0.rotation.set(-0.5, 0, arm0.rotation.z);
    arm1.rotation.set(-0.5, 0, arm1.rotation.z);
    elb0.rotation.x = elb1.rotation.x = -0.7;
    H.waist.rotation.set(0, 0, 0);
  }
  if (p.raise) {
    arm0.rotation.x = arm1.rotation.x = -2.6;
    arm0.rotation.y = arm1.rotation.y = 0;
    elb0.rotation.x = elb1.rotation.x = -0.2;
    curl0 = 0.15;
  }
  H.curls[0](curl0);
  H.curls[1](curl1, p.uurga ? 1 : 0);

  // --- Нүүр: анивчих, харц, ярих, сэтгэл хөдлөл (зөөлөн шилжинэ) ---
  a.blinkT -= dt;
  if (a.blinkT <= 0) { a.blinkP = 0; a.blinkT = 2.2 + Math.random() * 3; }
  if (a.blinkP < 1) a.blinkP = Math.min(1, a.blinkP + dt / 0.16);
  const blink = Math.sin(a.blinkP * Math.PI);
  const gaze = Math.sin(t * 0.45) * 0.9 * (1 - run);
  const mouth = p.talk ? Math.abs(Math.sin(t * 9)) * (0.45 + 0.55 * Math.abs(Math.sin(t * 2.3))) : 0;
  const target = EMOTIONS[p.emotion];
  for (const k of Object.keys(a.emo) as Array<keyof Emotion>) a.emo[k] += (target[k] - a.emo[k]) * Math.min(1, dt * 8);
  H.face.paint({ blink, gaze, mouth, emo: a.emo });

  return Math.abs(Math.sin(phase)) * mix(0.02, 0.1, run) * H.k * mv;
}
