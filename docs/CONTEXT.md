---
title: CONTEXT — төслийн нэг хуудсан зураглал
type: Architecture
status: Active
last_updated: 2026-11-15
tags: [context, map, onboarding]
---
# CONTEXT: «Нүүдэлчин» нэг хуудсан зураглал

Ажлын дүрэм → [[AGENTS]]. Баримтын жагсаалт → [[INDEX]]. **Бүтэц, файл, систем өөрчлөгдвөл энэ файлыг тэр дор нь шинэчил.**

## 1. Тоглоом юу вэ
НҮҮДЭЛ: Дөрвөн улирал — монгол нүүдэлчин малчны амьдралын тайван 3D симулятор (cozy sim); тоглоом дуусахгүй, цагийн хязгааргүй ([[mvp-spec]] §10).
- **MVP «Зуслан»:** 1 сум, 4 бууц (Голын бэл `river`, Уулын ар `northSlope`, Уулын өвөр `valley`, Уулын энгэр `southSlope`) + сумын төв; 4 улирал (1 жил = 50 өдөр, зунаас эхэлнэ); шөнөтэй (06:00→06:00).
- Мал (хонь, ямаа, үхэр, адуу) бэлчиж таргална, сүү/ноос газарт унана → цуглуулж, боловсруулж, Худалдаачинд зарна; туслах малчин хөлсөлнө; чоно, нохой; бууц сэлгэнэ; газрын зураг дээр тэрэг/машин жолооно.
- Том замын тэмдэг: гэр + 40 хонин толгой («гэр оронтой болсон» мөч, M6).
- **Одоогийн үе шат:** V0–V5 дүрслэл → [[V]]. Дараа нь [[M6]] (хадгалалт), [[M7]] (туршилт). Код: M0–M5.5, B ✅, 125 тест.

## 2. Стек ба командууд
TypeScript, Three.js 0.187, Vite, Vitest, Node 20+. Бүх npm команд `game/` дотроос:
| Юу | Команд |
|---|---|
| Хөгжүүлэх | `npm run dev` → http://localhost:5173 (`?herd=300` — 300 мал, `?stats` — FPS/draw call, `?shot=1..7` — хөрөг цэг) |
| Тест | `npx vitest run tests/<file> --reporter=dot` (явцад), `npm test` (блок төгсгөлд) |
| Build | `npm run build` (`tsc --noEmit && vite build` → `game/dist/`) |
| Тэнцвэр | `npm run balance -- --seeds 4 --days 220` (`--only Дунд,Үлддэг`, `--wolves.attack.enabled 0`, `--<json.зам> <утга>`) |
Удирдлага: WASD/сум, Space «Хөөе», E түүх/агуулах, B агуулах, T сумын төв, M нүүх, K нохой, Z бүс, F морь, V тээвэр, Tab газрын зураг, G дулааны зураг, P зургийн горим, ❓ цэс (FPS), ` cheat цэс.

## 3. Файлын зураглал (`game/src/`)
### sim/ — Three.js, DOM-гүй (тест, тэнцвэрийн бот ашиглана)
| Файл | Үүрэг |
|---|---|
| `sim.ts` | Үндсэн давталт: 1 алхам = 1 тоглоомын минут; `DayReport`, `SimEvent` |
| `state.ts` | `GameState`, `createInitialState`, `SAVE_VERSION`, төрлүүд (Animal, Batch, Place, FleetVehicle) |
| `config.ts` | `data/*.json` ачаалж шалгана (`loadConfig`, `validateConfig`), тохиргооны төрлүүд |
| `clock.ts` · `rng.ts` | Цаг, үе (өдөр/орой/шөнө) · seed-тэй RNG (mulberry32; `Math.random()` хориотой) |
| `commands.ts` | `Command` union, `applyCommand` — тоглогч ба бот sim-ийг зөвхөн эндээс өөрчилнө |
| `terrain.ts` | `heightAt`, гол, `waterLevel` — sim, render хоёр хуваалцсан цэвэр функц |
| `autotrip.ts` | Автомат аялал (ачих → газрын зураг → Худалдаачин → буцах); бот, тест, жолооч |
| `systems/pasture.ts` | Бэлчээрийн тор: ургалт, доройтол, чанар |
| `systems/grazing.ts` · `herds.ts` | Малын цэг сонголт, идэх хурд, цангалт · сүргийн шийдвэр (кластер, ус/бэлчээр) |
| `systems/animals.ts` · `breeding.ts` | Бие, жин, үнэ, хонин толгой, өдрийн тарга · төллөлт (улирлаар) |
| `systems/production.ts` · `storage.ts` · `processing.ts` | Газрын бүтээгдэхүүн муудах · агуулах · тогоо/сепаратор/эсгий |
| `systems/night.ts` | Хотлох, унтах, өглөөний сүү/ноос |
| `systems/herder.ts` · `dogs.ts` | Малчин, морь, «Хөөе», уурга · нохой ба командууд |
| `systems/wolves.ts` | Үүр, өлсгөлөн, үржил, дайралт, хамгаалалтын бүс, нохойн тулаан (644 мөр) |
| `systems/helpers.ts` | Туслах малчин: хөлслөх, цалин, үүрэг (малчин/адуучин/жолооч/хүүхэд), отор (882 мөр) |
| `systems/seasons.ts` · `camps.ts` | Улирал, цас, өвс, хүйтэн, боодол өвс · бууц сэлгэх |
| `systems/travel.ts` · `trip.ts` | Газрын зураг, тээвэр, ачаа, арилжаа · Худалдаачин, үнэ, тээврийн туслах |
| `systems/cheats.ts` | ` цэсийн туршилтын үйлдлүүд |
### render/ — Three.js; GameState-ийг зөвхөн уншина
| Файл | Үүрэг |
|---|---|
| `scene.ts` | `GameView`: үндсэн дүр зураг, гэрэл, тэнгэр, улирал, бүх view-г холбоно |
| `terrain.ts` | Бууцны газар, ус, мод, чулуу, өвс, бэлчээрийн өнгө (1378 мөр — мужаар нээ) |
| `animals.ts` · `characters.ts` · `staff.ts` | Мал (InstancedMesh) · малчин, морь, чоно, нохой · туслахууд, айлын гэр |
| `items.ts` · `vehicles.ts` · `zones.ts` | Газрын бүтээгдэхүүн · тэрэг/машин · хамгаалалтын бүс |
| `sumcenter.ts` · `worldmap.ts` | Сумын төв 3D (Худалдаачин, Цайны газар) · газрын зураг (дээрээс харсан) |
| `camera.ts` · `style.ts` · `util.ts` | Дагах камер · `data/visuals.json`-ийн шалгалт, `visualStyle` · туслах |
| `ui/panels.ts` · `ui/names.ts` | Бүх цонх: агуулах, тайлан, Худалдаачин, нүүх, нохой, туслах (1011 мөр) · нэрс, форматлагч |
### Бусад
| Файл | Үүрэг |
|---|---|
| `main.ts` | Эхлэл: тохиргоо, sim, render, input холбох; HUD, ❓ цэс, тоглоомын давталт |
| `input/controller.ts` · `touch.ts` | Гар/хулгана → Command · утасны джойстик, товчнууд |
| `device.ts` · `pwa.ts` | Чанар `low/mid/high`, мэдрэгч илрүүлэх · PWA суулгах, service worker |
| `i18n/i18n.ts`, `mn.json`, `en.json` | Текстийн түлхүүр; `en.json` бүрэн биш (M6.7) |
`game/tests/` (19 тестийн файл + `helpers.ts` дундын, 125 тест): нэрээр — animals, breeding, clock, config, dogs, grazing, herder, herds, night, pasture, products, rng, seasons, sim, wolves; `staff.test.ts` = туслахууд, `trip.test.ts` = тээвэр/арилжаа, `style.test.ts` = visuals.json, `playthrough.test.ts` = бүтэн тоглолт. `camps`, `cheats`, `processing`, `production` системд тусдаа тест байхгүй (playthrough/sim/products-оор дам). `tools/balance_sim/run.ts`: стратеги Идэвхтэй, Дунд, Залхуу, Үлддэг, Менежер × олон seed, тайлан `last_report.md`. Бусад: `game/index.html`, `vite.config.ts`, `sw-template.js` (PWA), `public/` (дүрс).

## 4. `data/*.json` → аль файл хэрэглэдэг
`sim/config.ts` бүгдийг ачаална (`visuals.json` — `render/style.ts`). Доор `cfg.<түлхүүр>`-ийг шууд ашигладаг файлууд (грепээр шалгасан); шинэчлэхдээ `grep -rln "cfg\.<түлхүүр>\b" game/src`.
| JSON | sim/ | render/, input/, main |
|---|---|---|
| `time` | animals, grazing, helpers, herds, night, production, seasons, sim, wolves | main, panels |
| `seasons` | helpers, seasons, travel, trip | main, panels |
| `animals` | animals, breeding, grazing, helpers, herds, seasons, sim, travel, trip, wolves | animals, names, panels |
| `pasture` | grazing, helpers, herds, pasture, seasons, sim | terrain, panels |
| `products` | commands, helpers, night, production, storage, travel, trip | controller, main, items, panels |
| `processing` | processing, trip | — |
| `storage` | storage, trip | panels |
| `economy` | breeding, sim, trip | panels |
| `vehicles` | camps, commands, helpers, travel, trip | controller, touch, main, panels |
| `worldmap` | autotrip, camps, helpers, travel | main, sumcenter, panels, worldmap |
| `helpers` | helpers, trip | panels |
| `wolves` | cheats, dogs, grazing, wolves | panels |
| `dogs` | cheats, dogs, sim, trip | panels |
| `camps` | autotrip, camps, cheats, commands, dogs, grazing, helpers, herds, night, pasture, seasons, travel, trip, wolves | controller, main, scene, terrain, panels, vehicles |
| `start` | — | — |
| `player` | commands, herder, herds, travel | controller, main |
| `visuals` | — | `render/style.ts` → animals, scene, sumcenter, terrain, worldmap |

## 5. Архитектурын дүрэм ([[architecture]])
- **sim/render салгах:** `sim/` Three.js, DOM, `window` импортлохгүй. `render/` зөвхөн GameState уншина, логик бичихгүй.
- **Command:** тоглогчийн бүх үйлдэл `Command` → `applyCommand`. Бот, тест ч ингэнэ.
- **Тогтмол алхам, seed:** 1 алхам = 1 тоглоомын минут; нэг seed → ижил тоглолт; `sim/`-д `Math.random()` үгүй (render-ийн `VisualRng` sim-д нөлөөлөхгүй).
- **Өгөгдөл:** тоон утга зөвхөн `data/*.json`; `config.ts` шалгана.
- **Хадгалалт (M6):** `GameState` энгийн JSON; `SAVE_VERSION` + `migrate`; модульд нуугдсан төлөв үлдээхгүй.
- **i18n:** текст `i18n/mn.json`/`en.json` түлхүүрээр; кодод шууд монгол мөр бичихгүй (одоо `panels.ts`, `main.ts`-д үлдсэн — M6.7).
- **Гүйцэтгэл:** 300 мал 60 FPS (компьютер), утас `low` 30+ FPS; draw call `low` ≤ 120, `mid` ≤ 150, `high` ≤ 200; 1000 мал sim 1 өдөр зорилт < 50 мс (одоо ~200–300). Хэмжих: `?stats`.

## 6. Баримтын давуу эрх (зөрчилдвөл дээд нь хүчинтэй)
1. [[mvp-spec]] (MVP-ийн дүрэм) — 2. `docs/plan/` (одоогийн төлөвлөгөө), [[architecture]], [[milestones]] — 3. үе шатын тэмдэглэл: [[night-transport]], [[world-map-mvp]], [[helpers-m5]], [[seasons-camps]] — 4. [[grazing-livestock]], [[water-horses-transport]], [[visuals-plan]] — 5. `docs/v1/` (V1+ дизайн), `docs/_archive/` (түүх, зөвхөн лавлагаа).
Шийдвэрийн түүх → [[decisions]]; дууссан ажил → [[CHANGELOG]]; гараар шалгах → [[playtest]].

## 7. Нээлттэй асуултууд
Бүгд [[decisions]] §13–15-д (🙋 түр утгууд, баримтын зөрүү). Гараар шалгах зүйлс → [[playtest]]. Тоон түр утгууд [[mvp-spec]] §5.1, §6.3, §8.
