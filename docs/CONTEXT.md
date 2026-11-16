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
- Эхлэл бага 4 ханат гэр; том замын тэмдэг: том гэр (5 ханат) + 40 хонин толгой («гэр оронтой болсон» мөч, M6).
- **Одоогийн үе шат:** → `PROGRESS.md` (1 мөр). Үе шатны төлөвлөгөө: `docs/plan/` ([[V]], [[M6]], [[M7]]).

## 2. Стек ба командууд
TypeScript, Three.js 0.187, Vite, Vitest, Node 20+. Бүх npm команд `game/` дотроос:
| Юу | Команд |
|---|---|
| Хөгжүүлэх | `npm run dev` → http://localhost:5173 (`?herd=300` — 300 мал, `?stats` — FPS/draw call, `?shot=1..7` — хөрөг цэг) |
| Тест | `npx vitest run tests/<file> --reporter=dot` (явцад), `npm test` (блок төгсгөлд; хугацаа хэмждэг `*.perf.test.ts` орохгүй) |
| Гүйцэтгэлийн тест | `npm run test:perf` (`tests/perf.perf.test.ts`: 300 мал/өдөр < 300 мс, 30 өдөр < 5 сек; `vitest.perf.config.ts`) — нэг агент ажиллаж байхад, тусад нь |
| Build | `npm run build` (`tsc --noEmit && vite build` → `game/dist/`) |
| Тэнцвэр | `npm run balance -- --seeds 4 --days 220` (`--only Дунд,Үлддэг`, `--wolves.attack.enabled 0`, `--<json.зам> <утга>`) |
Удирдлага: WASD/сум, Space «Хөөе», E түүх/агуулах, B агуулах, T сумын төв, M нүүх, K нохой, Z бүс, F морь, V тээвэр, Tab газрын зураг, G дулааны зураг, P зургийн горим, ❓ цэс (FPS), ` cheat цэс.

## 3. Файлын зураглал (`game/src/`)
### sim/ — Three.js, DOM-гүй (тест, тэнцвэрийн бот ашиглана)
| Файл | Үүрэг |
|---|---|
| `sim.ts` | Үндсэн давталт: 1 алхам = 1 тоглоомын минут; `DayReport`, `SimEvent`. Sim-д GameState-ээс гадуур төлөв хадгалахгүй (M6.1): өдрийн эхний мөнгө `state.dayStartMoney`, малын нэгдэх төв `state.flockCenters`, RNG `state.rngState` (команд бүрийн дараа шинэчлэгдэнэ) |
| `state.ts` | `GameState`, `createInitialState`, `SAVE_VERSION` (13), `MIGRATIONS` (хувилбар бүрийн шилжүүлэх алхам), `migrateState`, төрлүүд (Animal, Batch, Place, FleetVehicle) |
| `save.ts` | M6.1 хадгалалтын цөм (DOM-гүй): `serialize`/`deserialize` (задлах → хувилбар → migrate → `validateState`), `SaveError`, `saveMeta`. Шинэ талбар нэмбэл `SAVE_VERSION`++ ба `MIGRATIONS`; `tests/save.test.ts` нуугдмал төлөвийг барина. Хадгалах газар (IndexedDB) — M6.2 |
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
| `systems/town.ts` | V3.4 сумын төвийн амьдрал: хашаа байшин (авах, түрээс), дуганд хандив → нэр хүнд, ЗДТГ-ын малын зээл, банкны барьцаат зээл, хамаатан (бэлэг, айлчлал, зуны хүүхэд, өвлийн өвс); `townDaily/Monthly/Season` |
| `systems/sumtown.ts` | V3.3 сумын төв: `data/sumcenter.json`-ийн төрөл, хаалганы цэг (`sumDoors`, `doorPoint`), дэлгүүрийн үүрэг (`nearTradeDoor`, `orderAllowed`), машин худалдааны зогсоол (`lotSlots`), 3D-ийн хязгаар (`worldLimit`), газрын өндөр (`sumHeight`) |
| `systems/buildingSize.ts` | V3.5 сумын төвийн барилгын хэмжээ, хаалга (Three.js-гүй): `data/buildings.json` `town`-ийн лабораторийн барилгын хэмжээ, үүд (`entryFootprint`, `labDoorPoint` — `sumtown.doorPoint` дуудна), хашаа байшин (`houseFootprint`, `houseSlot`, `plotHouseLab` — `plotHouse`). `tests/buildings.test.ts` нь render-ийн геометртэй тэнцүүг шалгана |
| `systems/houseLayout.ts` | V3.5/V6.2 хашаа байшингийн дотор тал (Three.js-гүй): `houseRoom(key)` — алхах талбай (гол өрөө + амбаар + хаалганы завсар), саад (`data/house-interiors.json` — лабораторийн makeInterior-ээс `cd game && npm run houses`-оор үүснэ), орох/гарах/лангуу. `interior.ts roomSpec` (`house` өрөө), `clampToRoom` (`walk`) ашиглана |
| `systems/npc.ts` | V6.3 сумын төвийн NPC (Three.js-гүй): `data/npcs.json`-ийн төрөл, `npcAt(cfg, npc, day, minute)` — цаг, өдөр, seed-ийн цэвэр функц (хуваарь, барилгыг тойрсон A* зам, зуны амралт, away), `awayBuildings`, `relativeAtBuilding` (хамаатан худалдагч дэлгүүрт — `nearTownDoor`), `npcConfigErrors`. Төлөв хадгалахгүй |
| `systems/interior.ts` | V6.1 орж болдог барилга: `player.interior` (өрөөний координат), орох/гарах/дотор хөдлөх (enter/exit/moveInterior); хаалганы цэг sumtown-оос; `data/interiors.json` |
| `msg.ts` | M6.7b хэрэглэгчид харагдах мессеж: `Msg { key, params }`, `m(key, params)`, `raw(text)` (хөгжүүлэгч/туршилтын цэс). sim i18n импортлохгүй; `CommandResult.msg`, `TownEvent.msg`, `DOG_ORDER_NAME` нь Msg. UI `tm()` (i18n/msg.ts) → `t(key, params)`; түлхүүр `sim.*` (mn.json, en.json) |
| `systems/milestones.ts` | M6.5 замын тэмдэг: `checkMilestones` (өдрийн 20:00, нэг тэмдэг нэг л удаа → `state.milestones.reached`, ёслол `ceremony`), `Stats` (`state.stats`: орлого/зардал/төл/нүүдэл/өдөр бүрийн мөнгө, хонин толгой), `nextStage`/`seasonGoal` (HUD), `validateMilestones`. Тоо `data/milestones.json`; `SimEvent 'milestone'`, команд `ackCeremony`, `setShowMilestones`. UI: `panels.ts` (milestones, ceremony), HUD, цэс |
| `systems/difficulty.ts` | M6.10 тайван тохиргоо: `Difficulty`, `clampDifficulty`, `defaultDifficulty`, шалгагч. Утга `state.settings.difficulty`; `setDifficulty` команд; wolves.ts (дайралт, өлсөх, барих), night.ts (сүү, ноос), helpers.ts (отрын чоно) уншина. Хүрээ нь `data/difficulty.json` |
| `systems/gerLayout.ts` | V3.5/V6.2 гэрийн дотор тавилгын байрлал, хаалганы цэг (Three.js-гүй): `gerDoorOffset`, `gerLadder` (хэмжээний шат), `gerUpgradePrice` (томсгох үнэ), `gerRadiusFor` (бүс, алхах цагираг), `gerBoxes`/`gerBlockers`, `placeOnWall`, `pushOutOfBox`. `render/ger/gerInterior.ts` ба `systems/interior.ts` (`roomSpec` — гэр төрлийн өрөө) хуваалцана. Тоо нь `data/ger.json` |
### render/ — Three.js; GameState-ийг зөвхөн уншина
| Файл | Үүрэг |
|---|---|
| `scene.ts` | `GameView`: үндсэн дүр зураг, гэрэл, тэнгэр, улирал, бүх view-г холбоно |
| `terrain.ts` | Бууцны газар, ус, мод, чулуу, өвс, бэлчээрийн өнгө (том — мужаар нээ) |
| `animals.ts` · `characters.ts` · `staff.ts` | Мал (render/animal/ дуудаж — sim-ийн төлөв → `Placed`) · тоглогч (character/), унаа морь (эмээлд малчин, хөл дөрөөнд), чоно, нохой (render/animal/) · туслахууд (character/, roles; морьтой нь render/animal/), байр `makeDwelling` (ger/: айлын/туслахын гэр — `makeGer`, ганц биеийн — отрын, адуучных — адуучны `makeTent`) |
| `character/` | Хүний дүрийн нэг кодын сан (V4.5, [[character-design]] §4): `spec.ts` (data/characters.json — preset, арьс, бие галбир, царай, үс, өмсгөл, туслахын `roles`, `crowd`), `rig.ts` (`buildCharacter`, `dressCharacter`), `animate.ts` (`animateCharacter`), `parts/head.ts`, `parts/torso.ts`, `parts/arm.ts`, `parts/leg.ts`, `parts/hats.ts`, `face.ts` (зурмал нүүр, NPC атлас), `materials.ts`, `geom.ts`, `bake.ts` (SkinnedMesh; `bakeStatic` — хөдөлгөөнгүй объектуудыг материалаар нэгтгэх: олон хүн, хэвтээ нохой, уул, гэр), `crowd.ts` (сумын олон хүн: ойрын бүрэн `makeCrowdParts`, холын 1 draw call-ийн `makeCrowdFar`), `talk.ts` (R7 ярилцлага: sumcenter → тоглогч зуучлагч, сэтгэл хөдлөлийн дараалал). `lab.ts`, `labShots.ts` — `game/lab.html` (dev) |
| `animal/` | V4.6 бүх мал (хонь, ямаа, үхэр, адуу, нохой, чоно) — лабораторийн баталсан загвар, нэг төрөл = нэг модуль (`sheep.ts`, `goat.ts`, `cow.ts`, `horse.ts`, `dog.ts`, `wolf.ts`; `model.ts` `createModel`). `config.ts` (data/animals-look.json шалгагч, `animalLook`), `geo.ts` (бие, хүзүү, сүүл, хормой, тэмдэг), `shapes.ts` (дэл, адууны/үхрийн/сэвсгэр сүүл, сэмж, дэлэн, хүзүүний үс, монгол эмээл), `legs.ts` (нийтлэг хоёр үетэй хөл), `head.ts` (толгой, эвэр, чих), `pose.ts` (араг `Rig`, `poseAnimal`: зогсох, алхах, бэлчих, хэвтэх, бут зулгаах; адуу — хатирах, давхих; нохой, чоно — гүйх, сэм дөхөх, хуцах, улих, барих; `gaitFor`), `lod.ts` (`buildParts`: хөнгөн ба дэлгэрэнгүй InstancedMesh, нэг материал), `far.ts` (алс мал: бүх хэсэг ГАНЦ geometry, зогсох/бэлчих/хэвтэх 3 байрлалын morph, төрөл бүр 1 draw call), `view.ts` (`ModelAnimals`: ойрын N дэлгэрэнгүй → хөнгөн → far; `placedOf` sim-ийн Animal-аас), `ride.ts` (унаа морины харагдалт, `riderSeat`), `static.ts` (`bakeAnimal`: хөдөлгөөнгүй мал ганц Mesh — сумын нохой, газрын зургийн морь). Хөгжүүлэлтийн хуудас: `game/animal-preview.html` + `src/animalPreview.ts` (/animal-preview.html?sp=horse&action=gallop&speed=7.5) |
| `npcs.ts` | V6.3 NPC-ийн дүрслэл (`NpcView`): гадаа — ойрын K амьд дүр (чанараар 4/3/2), бусад холын 1 mesh; дотор — өрөөний байрлалд; ярилцлага (хамгийн ойр, `i18n/npcStrings` 3 мөр, DOM шугам); «Айлд явсан» шошго. `sumcenter.ts` эзэмшиж, `interior.ts placeNpcs` дуудна |
| `interior.ts` | V6.1 барилгын дотор тал (гэр: `buildGer`, хашаа байшин: `buildHouse` — `building/interior.ts`) — ороход үүсгэж, гарахад чөлөөлөх жижиг дүр зураг (шал, хана, хаалга, гэрэл); GameState-ийг зөвхөн уншина |
| `building/` | V3.5 барилгын сан (лабораторийн баталсан, `tools/character-lab/buildings/`): `config.ts` (data/buildings.json шалгагч, `BUILDING_CONFIG`, `TOWN`), `core.ts` (атлас canvas, wallQuad/slab/panel), `houses.ts` (хашаа байшин A/B/C, жорлон, амбаар, саравч, хүлэмж, нохойн үүр), `shops.ts` (дэлгүүр, сүү/ноос, машин, колонк, ноосны агуулах), `civic.ts` (олон нийтийн барилга, дуган, малын зах, тоглоомын, бөхийн талбай), `yard.ts` (банзан хашаа, `makePlot`), `interior.ts` (V6.1 хашаа байшингийн дотор тал: `makeInterior` — А, Б (хоосон), Б тавилгатай (толин тусгал), В), `interiorData.ts` (саад, E цэг, NPC-ийн байр → data/house-interiors.json), `index.ts` (`makeBuilding`, `makePlot`, `appendAt`, `makeBuildingMaterials` — нэг материал + бэхэн хүрээ), `town.ts` (`TownBuilder` — улирал бүрт нэг Geo). Геометрийн файлууд `@ts-nocheck`, лабораторийн кодыг өөрчлөлтгүй хуулсан. Гэр — `ger/` |
| `ger/` | Гэр, майхны загвар (V3.5/V6.2, лабораторийн баталсан): `config.ts` (data/ger.json шалгагч, `GER`, `TENT`), `geo.ts` (Geo угсрагч), `atlas.ts` (хаалга, дотор талын canvas атлас), `ger.ts` (`makeGer` — гадна; helper = `GER.helper` тохиргоо), `tent.ts` (`makeTent`), `gerInterior.ts` (`makeGerInterior` — дотор тал, тавилга). `terrain.ts` бууцны гэр/майхныг, `interior.ts` гэрийн өрөөг ашиглана. Гэр ≤ 3 draw call, ≤ 1500 гурвалжин |
| `items.ts` · `vehicles.ts` · `zones.ts` | Газрын бүтээгдэхүүн · тэрэг/машин · хамгаалалтын бүс |
| `sumcenter.ts` (V3.5: `buildTown` — барилгын нэг mesh улирлаар, шөнийн гэрэл) · `labelAtlas.ts` · `sumlayout.ts` (барилга, айлын хашаа → `building/` `TownBuilder`; хуучин хайрцаг зөвхөн лабораторийн бус барилгад) · `worldmap.ts` | Сумын төвийн view (шошго — нэг атлас, тойрог — нэг mesh, оршин суугч — `crowd.nearR` LOD, хэвтээ нохой — нэгтгэсэн, айлын гэр — `sumlayout` `gers` байрлалаар `makeGer` → нэг mesh, улирлаар, худалдаанд байгаа машин; draw call high ≈ 84) · олон бичигтэй самбарыг 1 текстур, 1 mesh болгох `LabelAtlas` · `data/sumcenter.json`-ийг low-poly merged mesh болгох бүтээгч (V3.3 Могод сум) · газрын зураг (дээрээс харсан) |
| `camera.ts` · `camclip.ts` · `style.ts` · `util.ts` | Дагах камер · камерын мөргөлдөөн (барилга/гэрийн хайрцаг, цилиндр; цэвэр) · `data/visuals.json`-ийн шалгалт, `visualStyle` · туслах |
| `ui/panels.ts` · `ui/names.ts` | Бүх цонх: агуулах, тайлан, Худалдаачин, нүүх, нохой, туслах · нэрс, форматлагч |
| `ui/menu.ts` · `ui/menu.css` | M6.3 эхлэлийн дэлгэц (▶ Үргэлжлүүлэх, 🆕 Шинэ, 📂 Слот, 📄 Файл, ⚙, 📲, 📥 Код — M6.4 идэвхгүй), шинэ тоглоом (слот + тайван тохиргоо), оршил (3 дэлгэц), тоглоомын цэс (❓/Esc/F1). Өөр тоглоом (шинэ, өөр слот, файл) эхлэхэд `Intent`-ийг sessionStorage-д бичиж хуудас дахин ачаалж `main.ts boot()` уншина; «Үргэлжлүүлэх» дахин ачаалахгүй |
### Бусад
| Файл | Үүрэг |
|---|---|
| `main.ts` | Эхлэл: тохиргоо, sim, render, input холбох; HUD, ❓ цэс, тоглоомын давталт. M6.2: `boot()`: Intent (шинэ/слот) эсвэл хамгийн сүүлийн слот + эхлэлийн дэлгэц (туршилтын URL параметртэй бол цэсгүй), `Autosave`, `MenuUI` холбоно; цагийн хурд = `settings.difficulty.timeSpeed` |
| `persist/idb.ts` | M6.2 IndexedDB: `SaveStore` — 3 слот, A/B хуулбар (нэг гүйлгээнд хуучныг нь шинэчилнэ, нийлбэр шалгана), `list`/`load`/`latest`/`remove`, `requestPersistence()` |
| `persist/autosave.ts` | `Autosave` (request → алхмуудын дараа flush; hidden/manual шууд), `attachSimEvents` (dayReport 20:00, leftToMap, arrived), `attachPageEvents` (visibilitychange, pagehide) |
| `i18n/msg.ts` | `tm(msg)`: sim-ийн `Msg` → одоогийн хэлээр бичиг (параметр дотор Msg, жагсаалт → таслалаар) |
| `persist/transfer.ts` · `persist/transferCode.ts` | M6.4 шилжүүлэх код — клиент: `createTransfer` (POST → 8 тэмдэгт `K7M2-9QXA`), `redeemTransfer` (GET → state), `TransferError.kind` (offline, network, not_configured, rate_limited, too_large, not_found, bad_code, bad_file, server); нийтлэг код/хязгаар (`MAX_BYTES` 700 KB gzip, TTL 24 ц). Сервер: `game/api/transfer.ts` (Vercel Function, Web handler `GET`/`POST`, `createHandlers({store})` — тестэд Redis-гүй) + `game/api/_redis.ts` (`Store`, `UpstashStore`, env `UPSTASH_REDIS_REST_URL/TOKEN` эсвэл `KV_REST_API_*`). `sw-template.js` /api/*-г кэшлэхгүй |
| `persist/file.ts` | `.nuudel` gzip экспорт/импорт: `exportBytes`/`importBytes`, `downloadFile`/`readFile` (UI — M6.3) |
| `input/controller.ts` · `touch.ts` | Гар/хулгана → Command · утасны джойстик, товчнууд |
| `device.ts` · `pwa.ts` | Чанар `low/mid/high`, мэдрэгч илрүүлэх · PWA суулгах, service worker |
| `i18n/i18n.ts`, `mn.json`, `en.json` | Текстийн түлхүүр; `en.json` бүрэн биш (M6.7) |
| `i18n/npcStrings.ts`, `npc.mn.json`, `npc.en.json` | V6.3 NPC-ийн үг: `npc.<id>.1–3`, `npc.away` (`npcLine`, `npcText`; нэгдсэн хүснэгтээс тусдаа) |
`game/tests/` (20 тестийн файл + `helpers.ts` дундын): нэрээр — animals, breeding, clock, config, dogs, grazing, herder, herds, night, pasture, products, rng, seasons, sim, wolves; `characters.test.ts` = дүрийн сан (characters.json, угсралт, npc, crowd, туслах), `staff.test.ts` = туслахууд, `trip.test.ts` = тээвэр/арилжаа, `style.test.ts` = visuals.json, `sumtown.test.ts` = сумын төв (дэлгүүрийн үүрэг, машин худалдаа, орох зам), `town.test.ts` = байшин, хандив, зээл, хамаатан, `playthrough.test.ts` = бүтэн тоглолт, `docs.test.ts` = баримт/CODEMAP/холбоосын нийцэл. `camps`, `cheats`, `processing`, `production` системд тусдаа тест байхгүй (playthrough/sim/products-оор дам). `tools/balance_sim/run.ts`: стратеги Идэвхтэй, Дунд, Залхуу, Үлддэг, Менежер × олон seed, тайлан `last_report.md`. Бусад: `game/index.html`, `vite.config.ts`, `sw-template.js` (PWA), `public/` (дүрс).

## 4. `data/*.json` → аль файл хэрэглэдэг
`sim/config.ts` бүгдийг ачаална (`loadConfig`, `validateConfig`); `visuals.json` → `render/style.ts` (`visualStyle`) → animals, scene, sumcenter, terrain, worldmap; `characters.json` → `render/character/spec.ts` (хүний бүх дүр). Түлхүүрийг хэн ашигладгийг хүснэгтээр биш грепээр ол (хуучирдаггүй): `grep -rln 'cfg\.camps' game/src`, `grep -rn 'cfg\.camps\.' game/src/sim/systems/wolves.ts`. JSON түлхүүр: `time seasons animals pasture products processing storage economy vehicles worldmap sumcenter town helpers wolves dogs camps start player interiors visuals` (`difficulty`, `interiors` = `data/interiors.json`, V6.1; `data/difficulty.json` — гулсуурын хүрээ, анхдагч (M6.10); `data/ger.json` (гэр, майхны загвар, тавилга — V3.5/V6.2) → `render/ger/config.ts` (`GER`, `TENT`) ба `sim/config.ts` (`cfg.ger` — хаалганы цэг, дотор саад); `sumcenter` = `data/sumcenter.json`, сумын төвийн 3D байршил — V3.3; `town` = `data/town.json`, сумын төвийн амьдрал — V3.4).

## 5. Архитектурын дүрэм ([[architecture]])
- **sim/render салгах:** `sim/` Three.js, DOM, `window` импортлохгүй. `render/` зөвхөн GameState уншина, логик бичихгүй.
- **Command:** тоглогчийн бүх үйлдэл `Command` → `applyCommand`. Бот, тест ч ингэнэ.
- **Тогтмол алхам, seed:** 1 алхам = 1 тоглоомын минут; нэг seed → ижил тоглолт; `sim/`-д `Math.random()` үгүй (render-ийн `VisualRng` sim-д нөлөөлөхгүй).
- **Өгөгдөл:** тоон утга зөвхөн `data/*.json`; `config.ts` шалгана.
- **Хадгалалт (M6):** `GameState` энгийн JSON; `SAVE_VERSION` + `migrate`; модульд нуугдсан төлөв үлдээхгүй.
- **i18n (M6.7):** текст `i18n/mn.json`/`en.json` түлхүүрээр (`t('түлхүүр', {var})`); UI кодод (`main.ts`, `render/ui/*`, `input/*`, `device.ts`, `pwa.ts`, `render/worldmap.ts`) кирилл string literal байхгүй — `tests/i18n.test.ts` барина (хөгжүүлэгчийн `Error`, `// i18n-skip` үл хамаарна). Анхдагч хэл = хадгалсан сонголт, үгүй бол хөтчийн хэл; хэл солих = хадгалаад дахин ачаалах (модулийн түвшний нэрс ачаалах үед тогтдог). Англи хэлэнд Монгол нэр томьёо (khoni, buuts, aaruul, tarag, urum, otor) тайлбартай үлдэнэ. `sim/` мессеж (M6.7b): `m('sim.*', {…})` → UI `tm()`; sim/-д кирилл литерал зөвхөн DEV файлд (config, save, autotrip, cheats, difficulty — `tests/i18n.test.ts` DEV_FILES) ба `e.push`/`return [` шалгагчид. Үлдсэн: `data/*.json` дахь Монгол нэрс (тээврийн нэр г.м.).
- **Гүйцэтгэл:** 300 мал 60 FPS (компьютер), утас `low` 30+ FPS; draw call `low` ≤ 120, `mid` ≤ 150, `high` ≤ 200; 1000 мал sim 1 өдөр зорилт < 50 мс (одоо ~200–300). Хэмжих: `?stats`.

## 6. Баримтын давуу эрх (зөрчилдвөл дээд нь хүчинтэй)
1. [[mvp-spec]] (MVP-ийн дүрэм) — 2. `docs/plan/` (одоогийн төлөвлөгөө), [[architecture]], [[milestones]] — 3. үе шатын тэмдэглэл: [[night-transport]], [[world-map-mvp]], [[helpers-m5]], [[seasons-camps]] — 4. [[grazing-livestock]], [[water-horses-transport]], [[visuals-plan]] — 5. `docs/v1/` (V1+ дизайн), `docs/_archive/` (түүх, зөвхөн лавлагаа).
Шийдвэрийн түүх → [[decisions]]; дууссан ажил → [[CHANGELOG]]; гараар шалгах → [[playtest]].

## 7. Нээлттэй асуултууд
Байхгүй — MVP-ийн хүрээ хаагдсан (2026-11-15, [[decisions]] §0, §13). Гараар шалгах, туршилтаар тааруулах зүйлс → [[playtest]]. Тоон түр утгууд [[mvp-spec]] §5.1, §6.3, §8.

## 8. Баримтын хэсгийн индекс (мөрийн муж)
Кодын функц/классын мөр болон бусад баримтын `##` мужийг `grep -n '<түлхүүр>' docs/CODEMAP.md`-ээр ол. Доорх блок автомат:
<!-- codemap:start -->
_Автомат (`cd game && npm run codemap`), гараар бүү засаарай. Хэсгийн мөрийн муж: `sed -n 'a,bp' <файл>`._
- `docs/mvp-spec.md`: §0 Хэрэглэгчийн шийдвэрийн түүх 17–22 · §1 Хүрээ 23–50 · §2 Цаг 51–69 · §3 Эхлэл 70–103 · §4 Бүтээгдэхүүн: мал үлдээнэ, ма… 104–152 · §5 Үнэ, тээвэр ба сумын төв 153–209 · §6 Туслах малчид 210–252 · §7 Бэлчээр, бууц сэлгэх, доройтол 253–294 · §8 Чоно 295–332 · §9 Төллөлт ба нас 333–348 · §10 Тоглоомын зорилго ба замын тэ… 349–424 · §11 Прототипоос хасагдах, өөрчлөг… 425–447 · §12 Хөгжүүлэлтийн явц 448–453 · §13 Нээлттэй шийдвэр байхгүй 454–458 · Эх сурвалж 459–462
- `docs/visuals-plan.md`: §1 Зорилго 19–31 · §2 Зарчим 32–40 · §3 Хэв маяг 41–96 · §4 Одоо байгаа зүйл 97–109 · §5 Үе шатууд 110–215 · §6 Чанарын түвшин 216–233 · §7 Хэмжилт 234–257 · §8 Хойшлогдох 258–261 · §9 Шийдвэрүүд 262–274 · §10–11 Хэрэгжүүлэлтийн тэмдэглэл ба … 275–277
<!-- codemap:end -->
