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
- Мал (хонь, ямаа, үхэр, адуу) бэлчиж таргална, сүү/ноос газарт унана → цуглуулж, боловсруулж, сумын төвийн дэлгүүрүүдэд зарна (V3.3: сүү/ноос хүлээн авах цэг, Малын зах, машин худалдаа г.м.); туслах малчин хөлсөлнө; чоно, нохой; бууц сэлгэнэ; газрын зураг дээр тэрэг/машин жолооно.
- Том замын тэмдэг: гэр + 40 хонин толгой («гэр оронтой болсон» мөч, M6).
- **Одоогийн үе шат:** → `PROGRESS.md` (1 мөр). Үе шатны төлөвлөгөө: `docs/plan/` ([[V]], [[M6]], [[M7]]).

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
| `systems/wolves.ts` | Үүр, өлсгөлөн, үржил, дайралт, хамгаалалтын бүс, нохойн тулаан |
| `systems/helpers.ts` | Туслах малчин: хөлслөх, цалин, үүрэг (малчин/адуучин/жолооч/хүүхэд), отор |
| `systems/seasons.ts` · `camps.ts` | Улирал, цас, өвс, хүйтэн, боодол өвс · бууц сэлгэх |
| `systems/travel.ts` · `trip.ts` | Газрын зураг, тээвэр, ачаа, арилжаа · Худалдаачин, үнэ, тээврийн туслах |
| `systems/cheats.ts` | ` цэсийн туршилтын үйлдлүүд |
| `systems/sumtown.ts` | V3.3 сумын төв: `data/sumcenter.json`-ийн төрөл, хаалганы цэг (`sumDoors`, `doorPoint`), дэлгүүрийн үүрэг (`nearTradeDoor`, `orderAllowed`), машин худалдааны зогсоол (`lotSlots`), 3D-ийн хязгаар (`worldLimit`), газрын өндөр (`sumHeight`) |
### render/ — Three.js; GameState-ийг зөвхөн уншина
| Файл | Үүрэг |
|---|---|
| `scene.ts` | `GameView`: үндсэн дүр зураг, гэрэл, тэнгэр, улирал, бүх view-г холбоно |
| `terrain.ts` | Бууцны газар, ус, мод, чулуу, өвс, бэлчээрийн өнгө (том — мужаар нээ) |
| `animals.ts` · `characters.ts` · `staff.ts` | Мал (InstancedMesh) · малчин, морь, чоно, нохой · туслахууд, айлын гэр |
| `items.ts` · `vehicles.ts` · `zones.ts` | Газрын бүтээгдэхүүн · тэрэг/машин · хамгаалалтын бүс |
| `sumcenter.ts` · `sumlayout.ts` · `worldmap.ts` | Сумын төвийн view (шошго, тойрог, оршин суугч, нохой, худалдаанд байгаа машин) · `data/sumcenter.json`-ийг low-poly merged mesh болгох бүтээгч (V3.3 Могод сум) · газрын зураг (дээрээс харсан) |
| `camera.ts` · `style.ts` · `util.ts` | Дагах камер · `data/visuals.json`-ийн шалгалт, `visualStyle` · туслах |
| `ui/panels.ts` · `ui/names.ts` | Бүх цонх: агуулах, тайлан, Худалдаачин, нүүх, нохой, туслах · нэрс, форматлагч |
### Бусад
| Файл | Үүрэг |
|---|---|
| `main.ts` | Эхлэл: тохиргоо, sim, render, input холбох; HUD, ❓ цэс, тоглоомын давталт |
| `input/controller.ts` · `touch.ts` | Гар/хулгана → Command · утасны джойстик, товчнууд |
| `device.ts` · `pwa.ts` | Чанар `low/mid/high`, мэдрэгч илрүүлэх · PWA суулгах, service worker |
| `i18n/i18n.ts`, `mn.json`, `en.json` | Текстийн түлхүүр; `en.json` бүрэн биш (M6.7) |
`game/tests/` (20 тестийн файл + `helpers.ts` дундын): нэрээр — animals, breeding, clock, config, dogs, grazing, herder, herds, night, pasture, products, rng, seasons, sim, wolves; `staff.test.ts` = туслахууд, `trip.test.ts` = тээвэр/арилжаа, `style.test.ts` = visuals.json, `sumtown.test.ts` = сумын төв (дэлгүүрийн үүрэг, машин худалдаа, орох зам), `playthrough.test.ts` = бүтэн тоглолт, `docs.test.ts` = баримт/CODEMAP/холбоосын нийцэл. `camps`, `cheats`, `processing`, `production` системд тусдаа тест байхгүй (playthrough/sim/products-оор дам). `tools/balance_sim/run.ts`: стратеги Идэвхтэй, Дунд, Залхуу, Үлддэг, Менежер × олон seed, тайлан `last_report.md`. Бусад: `game/index.html`, `vite.config.ts`, `sw-template.js` (PWA), `public/` (дүрс).

## 4. `data/*.json` → аль файл хэрэглэдэг
`sim/config.ts` бүгдийг ачаална (`loadConfig`, `validateConfig`); `visuals.json` → `render/style.ts` (`visualStyle`) → animals, scene, sumcenter, terrain, worldmap. Түлхүүрийг хэн ашигладгийг хүснэгтээр биш грепээр ол (хуучирдаггүй): `grep -rln 'cfg\.camps' game/src`, `grep -rn 'cfg\.camps\.' game/src/sim/systems/wolves.ts`. JSON түлхүүр: `time seasons animals pasture products processing storage economy vehicles worldmap sumcenter helpers wolves dogs camps start player visuals` (`sumcenter` = `data/sumcenter.json`, сумын төвийн 3D байршил — V3.3).

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

## 8. Баримтын хэсгийн индекс (мөрийн муж)
Кодын функц/классын мөр болон бусад баримтын `##` мужийг `grep -n '<түлхүүр>' docs/CODEMAP.md`-ээр ол. Доорх блок автомат:
<!-- codemap:start -->
_Автомат (`cd game && npm run codemap`), гараар бүү засаарай. Хэсгийн мөрийн муж: `sed -n 'a,bp' <файл>`._
- `docs/mvp-spec.md`: §0 Хэрэглэгчийн шийдвэрийн түүх 17–22 · §1 Хүрээ 23–48 · §2 Цаг 49–67 · §3 Эхлэл 68–91 · §4 Бүтээгдэхүүн: мал үлдээнэ, ма… 92–140 · §5 Үнэ, тээвэр ба сумын төв 141–197 · §6 Туслах малчид 198–240 · §7 Бэлчээр, бууц сэлгэх, доройтол 241–282 · §8 Чоно 283–320 · §9 Төллөлт ба нас 321–336 · §10 Тоглоомын зорилго ба замын тэ… 337–412 · §11 Прототипоос хасагдах, өөрчлөг… 413–435 · §12 Хөгжүүлэлтийн явц 436–441 · §13 Нээлттэй шийдвэрүүд 442–446 · Эх сурвалж 447–450
- `docs/visuals-plan.md`: §1 Зорилго 19–31 · §2 Зарчим 32–40 · §3 Хэв маяг 41–96 · §4 Одоо байгаа зүйл 97–109 · §5 Үе шатууд 110–215 · §6 Чанарын түвшин 216–233 · §7 Хэмжилт 234–257 · §8 Хойшлогдох 258–261 · §9 Шийдвэрүүд 262–274 · §10–11 Хэрэгжүүлэлтийн тэмдэглэл ба … 275–277
<!-- codemap:end -->
