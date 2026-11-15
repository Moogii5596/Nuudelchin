---
title: Давтагдсан алдааны сургамж
type: Log
status: Active
last_updated: 2026-11-15
tags: [lessons]
---

# Давтагдсан алдааны сургамж

Зөвхөн **2 дахь удаагаа** давтагдсан алдааг бичнэ ([[AGENTS]] §8). Бичих хэлбэр: `огноо — алдаа (юу болсон) → дүрэм (дараа нь яах)`.

- 2026-11-15 — vitest-ийг Git Bash-ийн `e:\` (жижиг үсэгтэй) замаас ажиллуулахад бүх тест `describe` дээр «Cannot read properties of undefined (reading 'config')» алдаагаар унасан (vitest хоёр хувь ачаалагдана; S1, S3 хоёуланд давтагдсан) → тест, build-ийг `E:\` том үсэгтэй замаар ажиллуул: PowerShell `Set-Location E:\MoogiiDev\Nuudelchin\game; npx vitest run …`. Мөн өөрийн `vite` dev server-ийг тестийн өмнө зогсоо.
