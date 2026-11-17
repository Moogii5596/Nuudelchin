---
title: CONTEXT — төслийн нэг хуудсан зураглал
type: Architecture
status: Active
last_updated: 2026-11-16
tags: [context, map, onboarding]
---
# CONTEXT: «Нүүдэлчин» нэг хуудсан зураглал

Ажлын дүрэм → [[AGENTS]]. Баримтын жагсаалт → [[INDEX]]. **Бүтэц, файл, систем өөрчлөгдвөл энэ файлыг тэр дор нь шинэчил.**

## 1. Тоглоом юу вэ
НҮҮДЭЛ: Дөрвөн улирал — монгол нүүдэлчин малчны амьдралын тайван 3D симулятор; тоглоом дуусахгүй ([[mvp-spec]] §10).
- **MVP «Зуслан»:** 1 сум, 4 бууц (Голын бэл `river`, Уулын ар `northSlope`, Уулын өвөр `valley`, Уулын энгэр `southSlope`) + сумын төв; 4 улирал (1 жил = 50 өдөр, зунаас эхэлнэ); шөнөтэй (06:00→06:00).
- Мал (хонь, ямаа, үхэр, адуу) бэлчиж таргална → сүү/ноос цуглуулж, боловсруулж, сумын төвд зарна; туслах, чоно, нохой; бууц сэлгэх; газрын зураг дээр тээвэр.
- Эхлэл бага 4 ханат гэр; том замын тэмдэг: том гэр (5 ханат) + 40 хонин толгой («гэр оронтой болсон» мөч, M6).
- **Одоогийн үе шат:** → `PROGRESS.md` (1 мөр). Үе шатны төлөвлөгөө: `docs/plan/` ([[V]], [[M6]], [[M7]]).

## 2. Стек ба командууд
TypeScript, Three.js 0.187, Vite, Vitest, Node 20+. Бүх npm команд `game/` дотроос:
| Юу | Команд |
|---|---|
| Хөгжүүлэх | `npm run dev` → http://localhost:5173 (`?herd=300`, `?stats` — FPS/draw call, `?shot=1..7`, `?q=low`) |
| Тест | `npx vitest run tests/<file> --reporter=dot` (явцад), `npm test` (блок төгсгөлд; `*.perf.test.ts` орохгүй) |
| Гүйцэтгэл | `npm run test:perf` (300 мал/өдөр < 300 мс) — ганц агент ажиллаж байхад |
| Build | `npm run build` (`tsc --noEmit && vite build` → `game/dist/`) |
| Тэнцвэр | `npm run balance -- --seeds 4 --days 220` (`--only Дунд,Үлддэг`, `--<json.зам> <утга>`) |
Удирдлага (гар): WASD, Space, E, B, T, M, K, Z, F, V, Tab, G, P, ❓ цэс, ` cheat цэс — тайлбар `docs/_archive/CONTEXT-files.md` §2.

## 3. Файлын зураглал (`game/src/`)
1 мөр = 1 хавтас; мөрийн муж → `docs/CODEMAP.md`. Шинэ файлын нэрийг энд нэм (`tests/docs.test.ts` шалгана). Хуучин хүснэгт: `docs/_archive/CONTEXT-files.md`.
### sim/ — Three.js, DOM-гүй (тест, тэнцвэрийн бот ашиглана)
- `sim/` цөм: `state.ts`, `commands.ts` (Command → `applyCommand`), `sim.ts`, `clock.ts`, `rng.ts`, `config.ts` (`loadConfig`, `validateConfig`), `save.ts`, `terrain.ts`, `autotrip.ts`, `msg.ts`.
- `sim/systems/` мал, бэлчээр: `animals.ts`, `herds.ts`, `grazing.ts`, `pasture.ts`, `breeding.ts`, `herding.ts`, `safety.ts`, `herder.ts`, `dogs.ts`, `wolves.ts`, `night.ts`, `seasons.ts`; бүтээгдэхүүн: `production.ts`, `processing.ts`, `storage.ts`; бууц, гэр: `camps.ts`, `ownGers.ts`, `gerLayout.ts`, `sleep.ts`; туслах, тээвэр: `helpers.ts`, `trip.ts`, `travel.ts`, `mapTraffic.ts`, `trader.ts`; сумын төв: `sumtown.ts`, `shops.ts`, `town.ts`, `npc.ts`, `sumwalk.ts`, `interior.ts`, `buildingSize.ts`, `houseLayout.ts`, `publicLayout.ts`; бусад: `milestones.ts`, `difficulty.ts`, `journal.ts`, `cheats.ts`.
### render/ — Three.js; GameState-ийг зөвхөн уншина
- `render/` дэлгэц: `scene.ts`, `terrain.ts`, `style.ts`, `camera.ts`, `camclip.ts`, `util.ts`; объект: `animals.ts`, `characters.ts`, `staff.ts`, `npcs.ts`, `vehicles.ts`, `items.ts`, `zones.ts`; сумын төв, зураг: `sumcenter.ts`, `sumlayout.ts`, `homeLights.ts`, `labelAtlas.ts`, `interior.ts`, `worldmap.ts`.
- `render/animal/` малын загвар (төрөл бүр нэг модуль): `sheep.ts`, `goat.ts`, `cow.ts`, `horse.ts`, `dog.ts`, `wolf.ts`; дундын: `config.ts`, `geo.ts`, `shapes.ts`, `legs.ts`, `head.ts`, `pose.ts`, `model.ts`, `lod.ts`, `far.ts`, `view.ts`, `ride.ts`, `static.ts`.
- `render/building/` сумын төвийн барилга: `index.ts`, `core.ts`, `civic.ts`, `shops.ts`, `houses.ts`, `yard.ts`, `town.ts`, `config.ts`, `interior.ts`, `interiorData.ts`, `publicInterior.ts`.
- `render/character/` хүний дүрийн сан: `spec.ts`, `materials.ts`, `geom.ts`, `face.ts`, `bake.ts`, `rig.ts`, `animate.ts`, `crowd.ts`, `talk.ts`, `lab.ts`, `labShots.ts` (dev); `parts/`: `head.ts`, `torso.ts`, `arm.ts`, `leg.ts`, `hats.ts`.
- `render/ger/` гэр, майхан: `ger.ts`, `tent.ts`, `gerInterior.ts`, `config.ts`, `geo.ts`, `atlas.ts`.
- `render/ui/` цонх, HUD: `panels.ts`, `menu.ts`, `timebar.ts`, `sleepPanel.ts`, `names.ts`, `panelCtx.ts` (дундын контекст), `panelHerd.ts`, `panelReport.ts`, `panelStorage.ts`, `panelTown.ts`, `panelTrade.ts` (panels.ts-ээс хуваагдсан цонхнууд), `errorBanner.ts` (алдааны туг).
### Бусад
- `src/` үндэс: `main.ts`, `device.ts` (чанар low/mid/high), `pwa.ts`, `animalPreview.ts` (dev), `feedback.ts` (санал илгээх линк, `data/feedback.json`).
- `input/`: `controller.ts` (`moveTo` — товшиж явах), `touch.ts` (утасны хөвөгч джойстик, контекстуал `.prime` гол товч; салбарын `primaryAction` хаясан — [[decisions]] 2026-11-17), `skip.ts`.
- `persist/`: `idb.ts`, `autosave.ts`, `file.ts`, `transfer.ts`, `transferCode.ts` (шилжүүлэх код; сервер `api/transfer.ts`), `errorGuard.ts` (`window.onerror` → алдаа барих, хадгалалт).
- `audio/`: `bus.ts` (дууны суваг, суурь), `watch.ts`.
- `i18n/`: `i18n.ts`, `msg.ts`, `npcStrings.ts`; `mn.json`, `en.json`, `npc.mn.json`, `npc.en.json`.
- `game/tests/<сэдэв>.test.ts` (дундын `helpers.ts`); `tools/`: `codemap.ts`, `balance_sim/run.ts`, `character-lab/`, `shots/`.

## 4. `data/*.json` → аль файл хэрэглэдэг
`sim/config.ts` бүгдийг ачаална (`loadConfig`, `validateConfig`). Render шууд уншдаг: `visuals.json` → `render/style.ts`; `characters.json` → `render/character/spec.ts`; `ger.json`, `buildings.json`, `house-interiors.json`, `animals-look.json` → тухайн хавтасны `config.ts`. Түлхүүрийг хэн ашигладгийг грепээр: `grep -rln 'cfg\.camps' game/src`. Жагсаалт: `ls data`. Сүүлд нэмэгдсэн: `sleep.json` → `sim/systems/sleep.ts` (хамаатны айлд унтах, сэрэх цонх 04:00–10:00); `shops.json` → `sim/systems/shops.ts` (`isOpen`, дэлгүүр 09–19, цайны газар 08–21); `difficulty.json` → `sim/systems/difficulty.ts` (тайван тохиргооны гулсуурууд); `trader.json` → `sim/systems/trader.ts` (явуулын худалдаачин).

## 5. Архитектурын дүрэм ([[architecture]])
- **sim/render салгах:** `sim/` Three.js, DOM, `window` импортлохгүй. `render/` зөвхөн GameState уншина, логик бичихгүй.
- **Command:** тоглогчийн бүх үйлдэл `Command` → `applyCommand`. Бот, тест ч ингэнэ.
- **Тогтмол алхам, seed:** 1 алхам = 1 тоглоомын минут; нэг seed → ижил тоглолт; `sim/`-д `Math.random()` үгүй (render-ийн `VisualRng` sim-д нөлөөлөхгүй).
- **Өгөгдөл:** тоон утга зөвхөн `data/*.json`; `config.ts` шалгана.
- **Хадгалалт (M6):** `GameState` энгийн JSON; `SAVE_VERSION` + `migrate`; модульд нуугдсан төлөв үлдээхгүй.
- **i18n (M6.7):** текст `i18n/mn.json`/`en.json` түлхүүрээр (`t('түлхүүр', {var})`); UI кодод кирилл literal байхгүй, `sim/` мессеж `m('sim.*', {…})` — `tests/i18n.test.ts` барина. Анхдагч хэл = хадгалсан сонголт, үгүй бол англи; хэл солих = хадгалаад дахин ачаалах. Англид Монгол нэр томьёо (khoni, buuts, otor) тайлбартай үлдэнэ.
- **Гүйцэтгэл:** 300 мал 60 FPS (компьютер), утас `low` 30+ FPS; draw call утас/`low` ≤ 120, `mid` ≤ 150, `high` ≤ 200; 1000 мал sim 1 өдөр зорилт < 50 мс (одоо ~200–300). Хэмжих: `?stats`.

## 6. Баримтын давуу эрх (зөрчилдвөл дээд нь хүчинтэй)
[[decisions]] (хожмынх нь өмнөхөө орлоно) > `docs/plan/` > [[mvp-spec]] > бусад ([[architecture]], [[milestones]], [[visuals-plan]], үе шатын тэмдэглэл). `docs/v1/`, `docs/_archive/` — зөвхөн лавлагаа.
Нээлттэй асуулт, шийдвэрийн түүх → [[decisions]]; дууссан ажил → [[CHANGELOG]]; гараар шалгах → [[playtest]].

## 7. Баримтын хэсгийн индекс (мөрийн муж)
`mvp-spec`, `visuals-plan`-ийн хэсгийн муж (автомат блок); бусад нь `grep -n '<түлхүүр>' docs/CODEMAP.md`.
<!-- codemap:start -->
_Автомат (`cd game && npm run codemap`), гараар бүү засаарай. Хэсгийн мөрийн муж: `sed -n 'a,bp' <файл>`._
- `docs/mvp-spec.md`: §0 Хэрэглэгчийн шийдвэрийн түүх 17–24 · §1 Хүрээ 25–52 · §2 Цаг 53–71 · §3 Эхлэл 72–111 · §4 Бүтээгдэхүүн: мал үлдээнэ, ма… 112–160 · §5 Үнэ, тээвэр ба сумын төв 161–217 · §6 Туслах малчид 218–260 · §7 Бэлчээр, бууц сэлгэх, доройтол 261–302 · §8 Чоно 303–340 · §9 Төллөлт ба нас 341–356 · §10 Тоглоомын зорилго ба замын тэ… 357–432 · §11 Прототипоос хасагдах, өөрчлөг… 433–455 · §12 Хөгжүүлэлтийн явц 456–461 · §13 Нээлттэй шийдвэр байхгүй 462–466 · Эх сурвалж 467–470
- `docs/visuals-plan.md`: §1 Зорилго 19–31 · §2 Зарчим 32–40 · §3 Хэв маяг 41–96 · §4 Одоо байгаа зүйл 97–109 · §5 Үе шатууд 110–215 · §6 Чанарын түвшин 216–233 · §7 Хэмжилт 234–257 · §8 Хойшлогдох 258–261 · §9 Шийдвэрүүд 262–274 · §10–11 Хэрэгжүүлэлтийн тэмдэглэл ба … 275–277
<!-- codemap:end -->
