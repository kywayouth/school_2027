// Original line drawings, embedded directly in the page. No fonts, sprite URLs,
// network assets or third-party icon packages are required.
const PATHS=Object.freeze({
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18M7 15h3m4 0h3m-10 3h3"/>',
  book:'<path d="M12 6v15M12 6C9 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 2Z"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  heart:'<path d="M12 21 3.8 13a5.5 5.5 0 0 1 7.8-7.8l.4.4.4-.4a5.5 5.5 0 0 1 7.8 7.8Z"/>',
  phone:'<path d="m8 3 2 5-3 2c1.5 3 3 4.5 6 6l2-3 5 2v4c0 1.2-1 2-2.2 2C9.8 20.5 3.5 14.2 3 6.2 3 5 3.8 4 5 4Z"/>',
  sliders:'<path d="M3 6h4m4 0h10M3 12h10m4 0h4M3 18h2m4 0h12"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="7" cy="18" r="2"/>',
  pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.2"/>',
  search:'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
  refresh:'<path d="M20 9a8 8 0 0 0-14-4L3 8m0-5v5h5M4 15a8 8 0 0 0 14 4l3-3m-5 0h5v5"/>',
  'arrow-left':'<path d="M20 12H4m6-6-6 6 6 6"/>',
  'arrow-right':'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  'arrow-up-right':'<path d="M6 18 18 6M6 6h12v12"/>',
  x:'<path d="m6 6 12 12M6 18 18 6"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',
  users:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3"/>',
  mountain:'<path d="m2 21 8-17 5 10 3-6 4 13ZM7 10l3 2 2-3m2 12h8"/>',
  rocket:'<path d="M9 15c-2-4 3-11 12-12 0 9-7 14-11 12ZM9 8H5l-3 6 6-1m8 2v4l-6 3 1-6M7 17c-3-1-4 2-4 4 2 0 5-1 4-4Z"/><circle cx="16" cy="8" r="2"/>',
  sprout:'<path d="M12 21v-9M12 16C5 17 3 13 3 8c6 0 9 3 9 8Zm0-4c0-6 3-9 9-9 0 6-3 9-9 9ZM7 21h10"/>',
  waves:'<path d="M2 6c3-4 7 4 10 0s7 4 10 0M2 12c3-4 7 4 10 0s7 4 10 0M2 18c3-4 7 4 10 0s7 4 10 0"/>',
  leaf:'<path d="M5 18C-1 7 11 3 21 3c0 10-4 22-16 15ZM3 21 16 8m-8 8v-5m0 5h5"/>',
  waterbird:'<path d="M3 13c3 0 4 2 8 2h1V7a3 3 0 0 1 6 0v2l4 1-4 1v3c0 3-3 5-7 5-4 0-7-2-8-6Zm4 1c1 3 4 3 6 1M2 22c2-1 4 1 6 0s4 1 6 0 4 1 8 0M16 7h.01"/>',
});

export const FACILITY_ICONS=Object.freeze({central:'users',pyeongchang:'mountain',space:'rocket',bio:'sprout',marine:'waves',future:'leaf',ecology:'waterbird'});

export function icon(name){
  if(!Object.hasOwn(PATHS,name))throw new Error(`Unknown icon: ${name}`);
  // Icons supplement visible text; screen readers should read each label once.
  return `<svg class="icon" data-icon-name="${name}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
}
