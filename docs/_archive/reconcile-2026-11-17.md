---
title: Баримт ба бодит ажлын зөрүүний тайлан (2026-11-17)
type: Log
status: Draft
last_updated: 2026-11-17
tags: [reconcile, audit, docs]
---
# Баримт ↔ код зөрүүний тайлан (READ-ONLY, засвар хийгээгүй)

Арга: `git log main` (151 commit), `docs/plan/{V,M6,M7,LEAD,playtest}.md`, `milestones.md`, `mvp-spec.md` §10/§12, `PROGRESS.md`-ийн нээлттэй мөрүүдийг код (`game/src`, `data/`, `tools/`), `CHANGELOG.md`, `decisions.md`, `CONTEXT/CODEMAP`-тай тулгав. Ангилал: **A** хийгдсэн ч нээлттэй · **B** хэсэгчлэн · **C** баримт зөрсөн · **D** үнэхээр нээлттэй.
Нотолгоо: коммит hash, файл. «grep 0» = `game/src`-д олдсонгүй.

## 1. Нээлттэй мөрийн тулгалт

| Мөр | Баримт | Бодит нотолгоо | Анг. | Засах санал |
|---|---|---|---|---|
| M6 «feat/sleep салбар нэгтгэгдээгүй» | `M6.md` Нээлттэй ажил | `39e53e2 merge: feat/sleep`, `eef6f70`; `git branch` дээр feat/sleep алга; `sleep.ts`, `sleepPanel.ts`, `data/sleep.json` кодонд; CHANGELOG-д 3 дурдалт | **A** | M6.md-ийн мөрийг устга/✅ eef6f70, 39e53e2 |
| LEAD §4.10 «feat/sleep нэгтгэгдээгүй» | `LEAD.md` §4 | дээрхтэй адил; LEAD §2 (wave 2) ч унтахыг дурдаагүй | **A** | §4.10-д «нэгтгэгдсэн 39e53e2» гэж засах |
| LEAD §4.1–4.3 «хүлээж буй шийдвэр» (гэрийн үнэ, олон гэрийн дүрэм, хоосон байшин) | `LEAD.md` §4 | §4.1–4.2 → `fd2d28a` (M6.13 олон гэр, 50% буцаалт), `1633092`; §4.3 → S4 `house-interiors.json` хоосон/тавилгатай А,Б (`4e126dd`). playtest.md:83,97 дээр л 🧑 үнэлгээ үлдсэн | **A** | §4.1–4.3-ыг «хэрэгжсэн, үнэлгээ playtest-д» гэж хураа |
| LEAD §4.6 «CAMP_ONLY → same-scene» (морь дуудах) | `LEAD.md` §4.6 (ШИЙДСЭН) | `game/src/sim/commands.ts:103` CAMP_ONLY хэвээр, `p.away` шалгана (:117); `git log --grep=callHorse` хоосон; decisions.md-д 0 дурдалт | **D** (+**C**) | Шийдвэр гарсан ч код/decisions-д алга → S3-д даалгавар болго эсвэл «хийгээгүй»-г LEAD-д тэмдэглэ; decisions-д нэг мөр |
| LEAD §4.5 малчин 1.44 / мал scale буцаах | `LEAD.md` §4.5 (ШИЙДСЭН) | `0fa3736` (characters.json scale 0.70, horse scale 1) — хэрэгжсэн | **A** | §4.5 дэх «S1-д даалгасан»-ыг ✅ 0fa3736 болго |
| V «V3.5 туслахын гэр/майхан» | `V.md` (worktree-д `[x]` болгосон, **commit хийгдээгүй**) | `a65d51c`, `1f65fd8`; `0fbebc3` (feat/gertent, лабын зэрэгцүүлсэн харагдац) | **A** | working-tree-ийн засвар зөв; commit-д ор. Анхаар: 0fbebc3 нь `main`-д ороогүй (feat/gertent) |
| V «V4.5 herder.html лаб — давалгааны төгсгөлд» | `V.md` | `tools/character-lab/herder.html` 1435 мөр, `8a55224`-д орсон; R1–R7 кодонд (`80f07b0`…`bafcefd`, `1a64b60`) | **B** | Файл байгаа тул мөрийг «лаб ✅ 8a55224, батлах» болгож эсвэл устга; «давалгааны төгсгөл» нь дууссан |
| V «V3.5 🙋 шөнийн PointLight (цэнгэлдэх, бөхийн дэвжээ), эргэдэг хүрд» | `V.md` | `civic.ts:245,276` buildStadium/buildWrestle emissive; `PointLight` зөвхөн `interior.ts`; `civic.ts:147` `spinDir` цэг байгаа ч эргэлт grep 0 | **D** | Нээлттэй хэвээр, зөв |
| V «V5.1 bloom/LUT/AA/AO» | `V.md` | `scene.ts:98` antialias, ACES tonemap; EffectComposer/bloom grep 0; M.2/M.3 хэмжилт хийгдээгүй | **D** | Зөв |
| V «V5.4 улирлын шилжилт» | `V.md` | `setLook` улирлаар шууд солигдоно; шилжилт grep 0 | **D** | Зөв |
| V «V5.2 фонт, хээ, лого» | `V.md`, playtest:38 | `index.html:19` Noto Sans; лого grep 0 | **D** | Зөв; V-7 шийдвэр хэрэглэгчийнх |
| V «V6.2 дэлгүүр, цайны газрын дотор тал» | `V.md` | `interiors.json:182,214` өрөө + spots (counter, shelf, rack, table_1..4) **байгаа**, гэвч `publicInterior` түлхүүргүй → тавилгын загвар (`render/building/publicInterior.ts`) оруулаагүй. `milk` (`36fb041`), ЗДТГ/банк, сургууль, дуган ✅ | **B** | «spots тодорхойлогдсон, загвар лабораторид батлагдаагүй» гэж тодруул |
| V «V6.3 NPC inside → spot (дэлгүүр, цайны газар)» | `V.md` | `npcs.json` `in:shop_1_4`, `in:teahouse` (:111,:141) түүхий координат (`inside`)-тай; spot-руу холбоогүй | **D** | V6.2-ын загварын дараа |
| V «Тэнцвэр 🙋 `--seeds 12` хийгээгүй» | `V.md`, M6.md M6.6 | `47a70c7`, `fded9da`, `c1d1e12` дараа `--seeds 12` гүйлт git/архивт алга; LEAD §4.11 «чухал биш» | **D** | Зөв; V.md + M6.md-д давхар бичигдсэн → нэг газар (M6.6)-д үлдээ |
| M6.4 Vercel+Upstash, утсаар D4 | `M6.md` | `7c3c391` код ✅; `game/vercel.json` (`df8ed21`); deploy/push хийгдээгүй (origin/main дээр хоцрогдсон) | **D** (🧑) | Зөв |
| M6.9 HA5 алхах/давхих дүрслэл; HA4 зам зурах | `M6.md` | grep 0 | **D** | Зөв |
| M6.9 «утсанд товшсон газар руу малчин явах (одоо moveTo)» | `M6.md` | `main.ts:420` `pickGround` → `controller.moveTo` ажиллаж байна (`053fc08`, `88a53ef` утасны удирдлага) | **B/A** | Мөрийг «товшиж явах ✅; HA4/HA5 нээлттэй» гэж хуваа |
| M6.12 ченжийн машин 3D, жолоочийн 3D «хотоос гарах» | `M6.md` | `render/sumcenter.ts`-д trader grep 0; зөвхөн `worldmap.ts`, `panels.ts` | **D** | Зөв |
| M6.8 «render үлдсэн → M7 M7.3» | `M6.md` | M7.3 нь «~~Тээвэр, мал байшин мөргөх~~ → M6.8» гэж буцаасан | **C** | Тойрог лавлагаа. Нэг эзэмшигч сонго (M6.8 эсвэл M7.3) |
| M6.5 ёслол 🛖🔥 emoji | `M6.md` | `panels.ts:286-291` | **D** (🙋) | Зөв |
| Жолооч 🙋 түлш хүрэхгүй үед явна | `M6.md` | `travel.ts:269-270` түлш хасна; `autotrip.ts`-д түлшний шалгалт grep 0 | **D** | Зөв |
| M7.1 Анхан шатны заавар, өвөө/эмээ, 📖 Малчны тэмдэглэл | `M7.md` ⏳ | `sim/systems/advisor.ts`, `render/ui/journal.ts` **байхгүй**. Оршил 3 дэлгэц ✅ (`1781178`, i18n `intro.*`). `sim/systems/journal.ts` нь M7.1-ийн «Малчны тэмдэглэл» **биш**, 📜 мэдэгдэл/тайлангийн лог (`a29bb79`) | **D** + **C** | M7.1-д «journal.ts нэр давхцсан (📜 лог ≠ 📖 тэмдэглэл)» гэж тэмдэглэ |
| M7.2 grazing хурдасгах (1000 мал < 50 мс) | `M7.md` | `grazing.ts`-д кэш grep 0; `perf.perf.test.ts` байгаа (`398c394`) | **D** | Зөв |
| M7.3 `audio/bus.ts` | `M7.md` | `game/src/audio/` байхгүй | **D** | Зөв |
| M7.4 `window.onerror`, санал илгээх | `M7.md` | `main.ts`-д grep 0 (зөвхөн `idb.ts` IDB onerror) | **D** | Зөв |
| M7.5–M7.7 | `M7.md` | эхлээгүй | **D** | Зөв |
| milestones.md M6, M7 мөр | `milestones.md` | төлөв баганад «✅/🟡» алга, тайлбар хэвээр; M6 sim/UI блокууд кодонд | **C** | M6-д «🟡 код бэлэн, гар шалгалт хүлээгдэж байна» нэм (үе шат дуусахад л шинэчлэх дүрэм — зөвхөн анхаарууллаа) |
| playtest.md:80 «Хамаатны айлд унтах» | `playtest.md` | merge ✅ | **A** (агентын хэсэг) | 🧑-ийн мөр хэвээр; «агент шалгаагүй» эсэхийг тодруул |
| mvp-spec §12 «M0–M5.5… 125 тест, V3–V5 хэсэгчлэн» | `mvp-spec.md:458` | 51 тестийн файл; M6.1–M6.13, V4.5/4.6/6.x кодонд | **C** | §12-г товчилж `[[milestones]]` руу заа |

## 2. Баримтын хоорондын зөрүү (C)

1. **Хоёр CHANGELOG:** `docs/CHANGELOG.md` нь **0 байт** (tracked, `babb547`-д үүссэн), жинхэнэ нь root `CHANGELOG.md` (61K). `[[CHANGELOG]]` холбоос, INDEX:71 «(root)» хоёрдмол. → docs/CHANGELOG.md-ийг устга (хэрэглэгчийн зөвшөөрлөөр, AGENTS §11) эсвэл root-ыг л тодорхойл.
2. **CHANGELOG хоцорсон:** сүүлийн бичлэг «2026-11-16 wave 1» (`CHANGELOG.md:12`). Wave 2 (`a29bb79`, `9ac3f54`, `2cba3a2`, `c1d1e12`, `fded9da`, `47a70c7`, `8d94ea9`, `a0b524c`, `faa6f61`, `060d4c7`, `f81c7f8`…) тэнд **0** дурдалт. M6.1–M6.13, V4.6/V6.x-ийн ихэнх нь зөвхөн архивын `M6-log`/`V-log`-д (AGENTS §8: «нэг мөрөөр CHANGELOG»).
3. **V.md «Зогссон цэг» хуучин:** «2026-11-16 wave 1» гэж эхэлнэ, PROGRESS «wave 2 нэгтгэгдсэн» гэнэ; `V.md` frontmatter `last_updated: 2026-11-16`. «Сүүлийн өөрчлөлт» мөр wave 2-г дурдсан тул хагас шинэчлэгдсэн.
4. **PROGRESS/LEAD ≠ git:** «wave 2 нэгтгэгдсэн, push хүлээгдэж байна» — `main` HEAD `884789b`, харин одоогийн салбар `feat/gertent` (0fbebc3) `main`-д ороогүй; `origin/main`-тай хэчнээн commit зөрж буйг (push хийгдээгүй) PROGRESS дурдаагүй. Мөн `claude/*` гурван remote салбар (docs-startup-cost…, driver-sum-center…, mobile-hud-controls…) — эхний хоёр нэгтгэгдсэн эсэхийг (`a0b524c`, `6bed033` нь main-д) баримт хэлээгүй.
5. **CONTEXT/CODEMAP:** `.ts` файлууд (sleep, shops, sumwalk, journal, trader, ownGers, gerLayout, homeLights, camclip, labelAtlas) CODEMAP-д бүгд бий ✅. Харин CONTEXT нь `data/sleep.json`, `shops.json`, `difficulty.json`, `trader.json`-ыг нэрээр нь дурдаагүй (0 hit), мөн утасны хөвөгч джойстик (`f81c7f8`), `primaryAction`→`.prime` шийдвэр CONTEXT-д алга. (AGENTS §2: бүтэц өөрчлөгдвөл CONTEXT шинэчилнэ.) Дахин баталгаажуулахад `npm run codemap` + `docs.test.ts`.
6. **decisions.md** `2026-11-17` мөр (джойстик) бий. Алга: LEAD §4.6 (морь дуудах same-scene), LEAD §4.7 milk 7×6 м (decisions «Бусад»-д хэсэгчлэн), wave-2 «лог/мэдэгдлийн самбар», «жолооч ачаа ачих/илгээх (E)», «нүүх ÷3» (`47a70c7`, дуртгал «Тэнцвэр»-т л). Банкны зээл, цалин, тэнцвэрийн шийдвэр ✅.
7. **LEAD.md** гарчиг «2026-11-16 15:00», frontmatter `last_updated 2026-11-17`: §2 «нэгтгэгдсэн wave 2» ба §4.10 «нэгтгэгдээгүй» нэг файлд зөрдөг.
8. **V.md uncommitted засвар** (`git diff`): V3.5 мөрийг `[x]` болгосон — commit хийгдээгүй, `0fbebc3` (docs-гүй lab commit)-тэй хамт гарна.

## 3. Plan/CHANGELOG/decisions-д тусгагдаагүй commit-ууд (шинэ feature/шийдвэр)

| Commit | Юу | Хаана тусгагдсан |
|---|---|---|
| `8d94ea9` winter night fog far<near | алдаа засвар | CHANGELOG 0, V-log ? — нэг мөр хэрэгтэй |
| `0f788c2`/`a503ed7` айлын гэрэл, утаа, хаалга биеэр түлхэгдэнэ | feature | CHANGELOG wave 1-д ✅ (`gateOpenSec`, homeLights) |
| `4c7b69c`, `1023016` тоглогч зогсохдоо сэгсрэхгүй | засвар | CHANGELOG «зогсолтын анимаци» ✅ |
| `a29bb79`/`9ac3f54`/`2cba3a2` лог самбар, шүүлттэй мэдэгдэл, өдрийн тайлангийн «яагаад ноос алга» | feature | зөвхөн V-log төгсгөл (V.md «Сүүлийн өөрчлөлт»); CHANGELOG, decisions-д алга |
| `faa6f61`/`060d4c7`/`a0b524c` жолооч ачаа ачих/илгээх (E), 9am аялал засвар | feature | LEAD §2-д л; CHANGELOG/decisions алга |
| `e53027a`/`3c84c04`/`88a53ef`/`053fc08` утасны HUD, «ачих»/«боловсруулах» товч | feature | decisions 11-17 (джойстик) нь зөвхөн джойстикийн хэсэг; бусад контекстуал товч CHANGELOG/CONTEXT-д алга |
| `47a70c7` нүүх хугацаа ÷3 | тэнцвэр | decisions «Тэнцвэр»-т хэсэгчлэн; CHANGELOG алга |
| `fded9da` банкны өдөр бүрийн төлбөр, зээлийн дүн сонгогч, хурдан ноос/ноолуур | feature | decisions ✅ (банк); ноос/ноолуур ×2 нь V-log:297-д л |
| `dca7e7f` анхдагч хэл АНГЛИ | шийдвэр | LEAD §1 ✅; `decisions.md`-д `dca7e7f` grep шалга — wave-1 «Бусад» мөрт байж болзошгүй |
| `a5fb92e` M6.12 ченж (4–8 хоног, 3 төрөл) | feature | decisions 2 дурдалт ✅, CHANGELOG 0 |
| `b69e80d` M6.11 өдөр 5.5 мин | шийдвэр | decisions 1 ✅, CHANGELOG 0 |

(Ихэнх нь «CHANGELOG-д алга»; decisions-д огт тусгагдаагүй гол шийдвэр: LEAD §4.6 морь дуудах.)

## 4. Тоо

| Ангилал | Тоо |
|---|---|
| A (хийгдсэн ч нээлттэй) | 6 (feat/sleep ×2, LEAD §4.1–3, §4.5, V3.5, playtest:80) |
| B (хэсэгчлэн) | 3 (herder.html, V6.2 дэлгүүр/цайны газар spots, M6.9 товшиж явах) |
| C (баримт зөрсөн) | 11 (§1: M6.8↔M7.3, milestones, mvp-spec §12; §2: 8 зүйл) |
| D (үнэхээр нээлттэй) | 19 (§1-ийн D/D? мөрүүд, callHorse, M7.1 ба journal нэрийн давхцлыг оруулаад) |

(Мөр бүрийг үндсэн ангиллаар нэг удаа тоолов; «A+C», «D+C» мөрийг D/A-д тоолсон.)

## 5. Хамгийн чухал 5 зөрүү

1. `M6.md` + `LEAD.md` §4.10: «feat/sleep нэгтгэгдээгүй» — харин `39e53e2`-д нэгтгэгдсэн (давтан хийх эрсдэл).
2. `docs/CHANGELOG.md` 0 байт vs root `CHANGELOG.md`; root нь wave 2 болон M6-ийн ихэнхийг агуулаагүй.
3. LEAD §4.6 «морь дуудах same-scene» шийдвэр кодонд (`commands.ts:103,117`) болон decisions-д алга.
4. `V.md`: V4.5 `herder.html` аль хэдийн (8a55224) бий; V3.5 `[x]` нь commit хийгдээгүй; Зогссон цэг wave 1.
5. M6.8 ↔ M7.3 «тээвэр/мал байшин мөргөх» тойрог шилжүүлэг; M7.1 `journal.ts` нэр 📜 лог (хийгдсэн) vs 📖 тэмдэглэл (хийгдээгүй).

## 6. Хязгаар
Лавлагааны `main` лог 151 commit (250 биш). Playtest.md-ийн 🙋/🧑 мөр (~100) хэрэглэгчийн гар шалгалт тул нэг бүрчлэн тулгаагүй; агентаар шалгаж болох нь зөвхөн :80 (унтах). `herder.html`-ийн агуулгыг (R1–R7-тай нийцэх) нээж баталгаажуулаагүй. Хэрэглэгчийн дэлгэц, GPU, утасны шалгалтыг хийгээгүй.
