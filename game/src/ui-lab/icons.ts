/**
 * T-27 UI лаб — шугаман дүрс (emoji үгүй). 24×24, stroke = currentColor.
 */
const P: Record<string, string> = {
  // морины толгой
  horse: '<path d="M7 21l1.5-6L5 12l1-3 6-5 1 2.5 4 2 2 6.5-2.5 1.5-3-3.5-2 1 1.5 7"/><path d="M12 4l-1-2"/><circle cx="12.6" cy="9" r=".6"/>',
  dismount: '<path d="M6 20l1.2-5L4.5 12.5l.8-2.5 5-4 .8 2 3.2 1.6 1.7 5.4-2 1.2-2.5-3-1.7.8 1.2 6"/><path d="M19 5v9m0 0l-3-3m3 3l3-3"/>',
  call: '<path d="M4 13a8 8 0 0 1 8-8"/><path d="M7.5 13A4.5 4.5 0 0 1 12 8.5"/><circle cx="12" cy="13" r="1.2"/><path d="M15 16l5 3m-5-6h6"/>',
  cart: '<path d="M3 7h13v8H3z"/><path d="M16 11h5"/><circle cx="7.5" cy="17.5" r="2.5"/><path d="M7.5 15v5M5 17.5h5"/>',
  door: '<path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M4 21h16"/><circle cx="14.5" cy="12.5" r=".8"/>',
  exit: '<path d="M10 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4"/><path d="M14 8l4 4-4 4M18 12H9"/>',
  hand: '<path d="M8 12V6a1.3 1.3 0 0 1 2.6 0v5m0-6.2a1.3 1.3 0 0 1 2.6 0V11m0-5a1.3 1.3 0 0 1 2.6 0v6m0-3.5a1.3 1.3 0 0 1 2.6 0V15a6 6 0 0 1-6 6h-1a5 5 0 0 1-4.2-2.3L4.4 14a1.4 1.4 0 0 1 2.3-1.6L8 14"/>',
  box: '<path d="M3.5 8L12 4l8.5 4v8L12 20l-8.5-4z"/><path d="M3.5 8L12 12l8.5-4M12 12v8"/>',
  trade: '<circle cx="9" cy="9" r="5"/><path d="M14.5 10.5a5 5 0 1 1-4 4"/><path d="M7.5 9h3M9 7.5v3"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  actions: '<circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="4.5" r="1.6"/><circle cx="18.5" cy="8.3" r="1.6"/><circle cx="18.5" cy="15.7" r="1.6"/><circle cx="12" cy="19.5" r="1.6"/><circle cx="5.5" cy="15.7" r="1.6"/><circle cx="5.5" cy="8.3" r="1.6"/>',
  shout: '<path d="M4 10v4h3l6 4V6l-6 4z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>',
  process: '<path d="M5 10h14l-1.2 8a2 2 0 0 1-2 1.7H8.200a2 2 0 0 1-2-1.700z"/><path d="M3 10h18M9 6.500c0-1.500 1.500-1.500 1.500-3M13.500 6.500c0-1.500 1.500-1.500 1.500-3"/>',
  load: '<path d="M4 12h16v8H4z"/><path d="M12 3v7m0 0l-3-3m3 3l3-3"/>',
  uurga: '<path d="M4 20L17 7"/><path d="M17 7a3 3 0 1 1 3 3c-1.500 0-2.200-.700-3-3z"/>',
  log: '<path d="M6 3h10l3 3v15H6z"/><path d="M9 9h7M9 13h7M9 17h4"/>',
  gallop: '<path d="M5 6l6 6-6 6M13 6l6 6-6 6"/>',
  send: '<path d="M3 12h13m0 0l-4-4m4 4l-4 4"/><path d="M20 5v14"/>',
  skip: '<path d="M5 5l9 7-9 7z"/><path d="M18 5v14"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.500v2.500M12 19v2.500M2.500 12H5M19 12h2.500M5.300 5.300L7 7M17 17l1.700 1.700M5.300 18.700L7 17M17 7l1.700-1.700"/>',
  moon: '<path d="M19 14.500A8 8 0 0 1 9.500 5a7 7 0 1 0 9.500 9.500z"/>',
  herd: '<path d="M6 11a3 3 0 0 1 3-3h5a4 4 0 0 1 4 4v1a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z"/><path d="M6 11L3.500 9.500M8.500 16v3.500M15 16v3.500"/><circle cx="4.300" cy="9" r="1.300"/>',
  zones: '<path d="M12 3l7 3v5.500c0 4.500-3 7.700-7 9.500-4-1.800-7-5-7-9.500V6z"/>',
  people: '<circle cx="8.500" cy="8" r="3"/><path d="M2.500 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.300"/><path d="M16 14.200a5 5 0 0 1 5.500 5.300"/>',
  dog: '<path d="M5 9l2-4 3 3h4l3-3 2 4v6a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5z"/><circle cx="9.500" cy="12.500" r=".700"/><circle cx="14.500" cy="12.500" r=".700"/><path d="M11 16h2"/>',
  camp: '<path d="M3 20L12 5l9 15z"/><path d="M12 20v-6M10 3l2 2 2-2"/>',
  full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  dot: '<circle cx="12" cy="12" r="2.500"/>',
};

export type IconName = keyof typeof P;

export function icon(name: string, size = 24): string {
  return `<svg class="l-ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] ?? P.dot}</svg>`;
}
