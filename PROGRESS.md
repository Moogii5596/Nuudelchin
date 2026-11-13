# PROGRESS
Төлөв: явж байна   (явж байна / хүлээгдэж байна / зогсоосон)
Сүүлд шинэчилсэн: 2026-11-13 17:40 (Asia/Ulaanbaatar)
## Дараалал
- [x] docs/architecture.md, docs/milestones.md бичих (TS + Three.js, зөвхөн зуны MVP)
- [x] game/ — Vite + TypeScript + Three.js төсөл (sim: цаг, seed RNG, тохиргоо шалгалт, амьдын жин/үнэ; render: бууцны бүс, мал InstancedMesh, HUD)
- [x] data/*.json — MVP-ийн тоон утгууд (mvp-spec.md-ээс)
- [x] README, docs/15 (D20–D28) шинэчлэх; .gitignore
- [x] tsc, 15 тест, build, хөтчид дэлгэцийн зураг — бүгд амжилттай (Claude-ийн орчинд)
- [ ] 🙋 git init + анхны commit (хэрэглэгчийн зөвшөөрөл: хавтсанд файл устгах эрх хэрэгтэй)
- [ ] M1: sim/state — start.json-оос бүрэн эхлэлийн төлөв
- [ ] M1: systems/pasture.ts — бэлчээрийн тор, ургалт, бууцны доройтол
- [ ] M1: systems/grazing.ts — цэг сонгох, идэх хурд, өдрийн тааз, цангалт
- [ ] M1: systems/animals.ts — өдрийн эцсийн тарга, жин, эрүүл мэнд
- [ ] M1: systems/production, storage, processing — сүү, ноос, муудах, агуулах
- [ ] M1: systems/market, transport — сумын төв, тэрэг
- [ ] M1: tools/balance_sim — стратеги × олон seed, тайлан
## Зогссон цэг
M1 эхэлсэн (Claude-ийн ажлын орчинд /home/claude/repo-д бичиж, тест хийгээд хавтас руу хуулна). M0 дууссан. Дараагийн алхам: M1-ийн эхний даалгавар `game/src/sim/systems/pasture.ts` (docs/milestones.md, Project «Монгол» → docs/mvp-spec.md §7, grazing-livestock.md §3).
Тэмдэглэл: node_modules-ийг Linux орчинд суулгавал Windows-д ажиллахгүй (esbuild/rolldown) — хэрэглэгч Windows дээр `cd game && npm install` хийнэ.
## Лог
- 2026-11-13 17:15 — Хөгжүүлэлтийн бэлтгэл эхлэв (хөдөлгүүр: TypeScript + Three.js шийдвэр).
- 2026-11-13 17:35 — M0 дууссан: architecture.md, milestones.md, game/ төсөл, data/*.json, README, D20–D28.
- 2026-11-13 17:40 — M1 (симуляцын цөм) эхлэв.
