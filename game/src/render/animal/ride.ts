/**
 * Унаа морины харагдалт, хэмжээ (render/characters.ts дуудна; цэвэр функц тул тестлэгдэнэ).
 * Морь бууцанд ч, сумын төвд ч харагдана (мориноос буухад буусан газраа зогсож үлдэнэ); газрын зураг дээр 3D-д харагдахгүй.
 */
import { animalLook } from './config';
import { saddleDims } from './shapes';

/** Унаа морийг 3D-д зурах уу: бууц, сумын төв, эсвэл унасан үед (газрын зураг дээр унасан ч 3D харагдахгүй — shown) */
export function horseShown(place: 'camp' | 'sum' | 'map', mounted: boolean, shown: boolean): boolean {
  return shown && (place === 'camp' || place === 'sum' || mounted);
}

/** Морины сэрвээний өндөр: зогсож буй, тарга fat, root масштаб sc; world=false — лабораторийн м (H2 ≈ 1.32), true — тоглоомын м (× species.horse.scale) */
export function horseWithers(fat = 0.6, sc = 1, world = false): number {
  const d = animalLook.species.horse.d, mo = animalLook.species.horse.motion;
  return (d.bodyY + d.body.R * (mo.fatY[0] + mo.fatY[1] * fat) + (d.withers?.h ?? 0)) * sc * (world ? animalLook.species.horse.scale ?? 1 : 1);
}

/** Унасан малчны хөл дөрөөнд: хажуугийн зай, ташаанаас дөрөө хүртэлх доош зай (тоглоомын м; морины масштабтай) */
export function riderSeat(): { side: number; drop: number } {
  const H = animalLook.species.horse, D = saddleDims(H.d), k = H.scale ?? 1;
  return { side: D.side * k, drop: (D.seat - D.stir - 0.006) * k };
}
