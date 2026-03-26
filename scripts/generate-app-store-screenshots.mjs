import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const outputRoot = path.join(repoRoot, 'docs', 'app-store-screenshots');

const palette = {
  ocean: '#0F3D56',
  oceanDeep: '#0A2B3D',
  sand: '#F3E7D3',
  coral: '#F26B5B',
  leaf: '#6E8F62',
  sky: '#DCEEF6',
  ink: '#18313F',
  white: '#FFFFFF',
  mist: '#F8F4EC',
};

const screens = [
  {
    slug: '01-trip-planning-is-scattered',
    title: 'Travel planning is all over the place.',
    subtitle: 'Hotels, routes, activities, and notes usually live in different apps.',
    kicker: 'The problem',
    accent: palette.coral,
    themeA: '#FFF2E8',
    themeB: '#FCE0D0',
    mockup: 'cards',
  },
  {
    slug: '02-group-trips-turn-chaotic',
    title: 'Group trips turn chaotic fast.',
    subtitle: "Coordinating stops, vehicles, and plans shouldn't happen in scattered chats.",
    kicker: 'The problem',
    accent: palette.ocean,
    themeA: '#E8F2F7',
    themeB: '#D8E8EF',
    mockup: 'group',
  },
  {
    slug: '03-plan-the-whole-route',
    title: 'Plan the whole route in one flow.',
    subtitle: 'Map your origin, stops, destination, and timing without switching tools.',
    kicker: 'Trip Planner',
    accent: palette.leaf,
    themeA: '#EEF5E8',
    themeB: '#DFE9D7',
    mockup: 'route',
  },
  {
    slug: '04-find-stays-activities-hidden-gems',
    title: 'Find stays, activities, and hidden gems.',
    subtitle: 'Explore local-first recommendations, not just the usual chains.',
    kicker: 'Discovery',
    accent: palette.coral,
    themeA: '#FFF1EC',
    themeB: '#F8DDD5',
    mockup: 'discovery',
  },
  {
    slug: '05-make-smarter-stops',
    title: 'Make smarter stops along the way.',
    subtitle: 'Surface pitstops, essentials, dining, and detours right on your route.',
    kicker: 'Route intelligence',
    accent: palette.ocean,
    themeA: '#EDF6FA',
    themeB: '#DCECF5',
    mockup: 'pitstops',
  },
  {
    slug: '06-reuse-favorites-start-faster',
    title: 'Reuse favorites and start faster.',
    subtitle: 'Save home, pickup points, and must-visit places for one-tap planning.',
    kicker: 'Saved places',
    accent: palette.leaf,
    themeA: '#F3F8EE',
    themeB: '#E2ECD9',
    mockup: 'favorites',
  },
  {
    slug: '07-keep-everyone-on-the-same-plan',
    title: 'Keep everyone on the same plan.',
    subtitle: 'Manage vehicles, assignments, and shared trip details together.',
    kicker: 'Convoy',
    accent: palette.coral,
    themeA: '#FFF3EE',
    themeB: '#F2DDD3',
    mockup: 'convoy',
    trust: 'Planned with MyExplorer',
  },
  {
    slug: '08-your-next-getaway-stays-ready',
    title: 'Your next getaway stays ready.',
    subtitle: 'Save trips, reopen them later, and head out with confidence.',
    kicker: 'Bookings',
    accent: palette.ocean,
    themeA: '#EFF6F8',
    themeB: '#DCEBF0',
    mockup: 'bookings',
  },
];

const platforms = [
  { name: 'ios', width: 2736, height: 1260, orientation: 'landscape' },
  { name: 'android', width: 1080, height: 1920, orientation: 'portrait' },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function wrapText(text, maxLineLength) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLineLength) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
}

function textBlock(lines, x, y, lineHeight, className) {
  return `<text x="${x}" y="${y}" class="${className}">${lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${esc(line)}</tspan>`)
    .join('')}</text>`;
}

function phoneFrame({ x, y, w, h, radius, content }) {
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="#101A22" />
      <rect x="${x + 22}" y="${y + 22}" width="${w - 44}" height="${h - 44}" rx="${Math.max(18, radius - 18)}" fill="${palette.white}" />
      <rect x="${x + w / 2 - 68}" y="${y + 18}" width="136" height="18" rx="9" fill="#101A22" opacity="0.92" />
      <g transform="translate(${x + 22}, ${y + 22})">
        ${content}
      </g>
    </g>
  `;
}

function uiHeader(innerWidth, title) {
  return `
    <rect x="0" y="0" width="${innerWidth}" height="88" fill="${palette.oceanDeep}" />
    <circle cx="48" cy="44" r="14" fill="${palette.sand}" opacity="0.9" />
    <text x="84" y="53" font-size="30" font-weight="700" fill="${palette.white}" font-family="Arial, sans-serif">${esc(title)}</text>
  `;
}

function card(x, y, w, h, fill, title, subtitle, badge) {
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="28" fill="${fill}" />
      <rect x="${x + 24}" y="${y + 24}" width="${w - 48}" height="${Math.max(120, h * 0.45)}" rx="24" fill="${palette.white}" opacity="0.55" />
      ${badge ? `<rect x="${x + 24}" y="${y + 28}" width="120" height="34" rx="17" fill="${palette.white}" />
      <text x="${x + 84}" y="${y + 51}" text-anchor="middle" font-size="18" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">${esc(badge)}</text>` : ''}
      <text x="${x + 24}" y="${y + h - 72}" font-size="28" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">${esc(title)}</text>
      <text x="${x + 24}" y="${y + h - 38}" font-size="20" fill="${palette.ink}" opacity="0.78" font-family="Arial, sans-serif">${esc(subtitle)}</text>
    </g>
  `;
}

function mockupContent(kind, innerWidth, innerHeight, accent) {
  if (kind === 'cards') {
    return `
      ${uiHeader(innerWidth, 'Explore')}
      ${card(34, 118, innerWidth - 68, 276, '#F7D9C8', 'Beach house', 'El Nido, Palawan', 'Stay')}
      ${card(34, 418, innerWidth - 68, 236, '#D9EAF2', 'Island hopping', 'Full-day activity', 'Trip')}
      ${card(34, 676, innerWidth - 68, innerHeight - 710, '#E7ECD7', 'Saved notes', 'Packing, timings, pickup', 'Notes')}
    `;
  }

  if (kind === 'group') {
    return `
      ${uiHeader(innerWidth, 'Trip Planner')}
      <rect x="34" y="126" width="${innerWidth - 68}" height="154" rx="28" fill="#E6EFF4" />
      <text x="64" y="184" font-size="28" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">Manila to La Union</text>
      <text x="64" y="224" font-size="20" fill="${palette.ink}" opacity="0.75" font-family="Arial, sans-serif">4 travelers • 2 vehicles • 5 stops</text>
      <rect x="34" y="308" width="${(innerWidth - 86) / 2}" height="230" rx="26" fill="#F7E4D9" />
      <rect x="${52 + (innerWidth - 86) / 2}" y="308" width="${(innerWidth - 86) / 2}" height="230" rx="26" fill="#E1EAD8" />
      <text x="64" y="360" font-size="24" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">Vehicle A</text>
      <text x="64" y="396" font-size="18" fill="${palette.ink}" opacity="0.72" font-family="Arial, sans-serif">3 assigned</text>
      <text x="${82 + (innerWidth - 86) / 2}" y="360" font-size="24" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">Vehicle B</text>
      <text x="${82 + (innerWidth - 86) / 2}" y="396" font-size="18" fill="${palette.ink}" opacity="0.72" font-family="Arial, sans-serif">1 assigned</text>
      <rect x="34" y="568" width="${innerWidth - 68}" height="${innerHeight - 602}" rx="28" fill="#F7F3ED" />
      <line x1="94" y1="632" x2="94" y2="${innerHeight - 80}" stroke="${accent}" stroke-width="8" stroke-linecap="round" />
      <circle cx="94" cy="652" r="14" fill="${palette.coral}" />
      <circle cx="94" cy="764" r="14" fill="${palette.ocean}" />
      <circle cx="94" cy="876" r="14" fill="${palette.leaf}" />
      <text x="134" y="660" font-size="22" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">Pickup</text>
      <text x="134" y="772" font-size="22" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">Coffee stop</text>
      <text x="134" y="884" font-size="22" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">Check-in</text>
    `;
  }

  if (kind === 'route') {
    return `
      ${uiHeader(innerWidth, 'Trip Planner')}
      <rect x="30" y="118" width="${innerWidth * 0.54}" height="${innerHeight - 148}" rx="32" fill="#F7F3EE" />
      <line x1="88" y1="204" x2="88" y2="${innerHeight - 116}" stroke="${accent}" stroke-width="8" stroke-linecap="round" />
      <circle cx="88" cy="228" r="16" fill="${palette.coral}" />
      <circle cx="88" cy="416" r="16" fill="${palette.ocean}" />
      <circle cx="88" cy="604" r="16" fill="${palette.leaf}" />
      <circle cx="88" cy="792" r="16" fill="${palette.coral}" />
      <text x="132" y="236" font-size="24" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">Origin</text>
      <text x="132" y="424" font-size="24" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">Lunch stop</text>
      <text x="132" y="612" font-size="24" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">Scenic view</text>
      <text x="132" y="800" font-size="24" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">Destination</text>
      <rect x="${innerWidth * 0.58}" y="118" width="${innerWidth * 0.36}" height="${innerHeight - 148}" rx="32" fill="#DDECF2" />
      <path d="M ${innerWidth * 0.64} ${innerHeight * 0.78} C ${innerWidth * 0.72} ${innerHeight * 0.64}, ${innerWidth * 0.68} ${innerHeight * 0.42}, ${innerWidth * 0.84} ${innerHeight * 0.24}" fill="none" stroke="${accent}" stroke-width="12" stroke-linecap="round" />
      <circle cx="${innerWidth * 0.64}" cy="${innerHeight * 0.78}" r="16" fill="${palette.coral}" />
      <circle cx="${innerWidth * 0.84}" cy="${innerHeight * 0.24}" r="16" fill="${palette.leaf}" />
    `;
  }

  if (kind === 'discovery') {
    return `
      ${uiHeader(innerWidth, 'Explore')}
      ${card(34, 118, innerWidth - 68, 260, '#F4D7CC', 'The Lind Boracay', 'Top rated stay', 'Stay')}
      ${card(34, 404, innerWidth - 68, 240, '#DDEBF4', 'Island hopping', 'Full day in El Nido', 'Activity')}
      <rect x="34" y="670" width="${innerWidth - 68}" height="${innerHeight - 704}" rx="30" fill="#EFF4E7" />
      <text x="66" y="726" font-size="26" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">Traveler stories</text>
      <circle cx="94" cy="792" r="28" fill="${palette.coral}" opacity="0.78" />
      <text x="138" y="800" font-size="20" fill="${palette.ink}" opacity="0.8" font-family="Arial, sans-serif">"Perfect 5-day itinerary."</text>
    `;
  }

  if (kind === 'pitstops') {
    return `
      ${uiHeader(innerWidth, 'Route Recommendations')}
      <rect x="34" y="118" width="${innerWidth - 68}" height="228" rx="28" fill="#E1EEF5" />
      <path d="M 94 270 C ${innerWidth * 0.28} 210, ${innerWidth * 0.48} 280, ${innerWidth - 110} 182" fill="none" stroke="${accent}" stroke-width="10" stroke-linecap="round" />
      <circle cx="94" cy="270" r="14" fill="${palette.coral}" />
      <circle cx="${innerWidth * 0.52}" cy="252" r="14" fill="${palette.ocean}" />
      <circle cx="${innerWidth - 110}" cy="182" r="14" fill="${palette.leaf}" />
      ${card(34, 376, innerWidth - 68, 188, '#F8E3D7', 'Coffee + rest stop', '18 minutes ahead', 'Detour')}
      ${card(34, 590, innerWidth - 68, 188, '#E8EFE0', 'Fuel and supplies', 'Near your current leg', 'Essential')}
      ${card(34, 804, innerWidth - 68, innerHeight - 838, '#EFF5F7', 'Scenic lunch spot', 'Fits your route timing', 'Pick')}
    `;
  }

  if (kind === 'favorites') {
    return `
      ${uiHeader(innerWidth, 'Saved Places')}
      <rect x="34" y="118" width="${innerWidth - 68}" height="168" rx="28" fill="#E8EFE0" />
      <text x="74" y="184" font-size="24" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">Current location</text>
      <text x="74" y="220" font-size="18" fill="${palette.ink}" opacity="0.75" font-family="Arial, sans-serif">Use as trip origin</text>
      ${card(34, 312, innerWidth - 68, 172, '#F7E2D7', 'Home', 'Quezon City', 'Saved')}
      ${card(34, 510, innerWidth - 68, 172, '#E1EEF4', 'Pickup point', 'Makati', 'Saved')}
      ${card(34, 708, innerWidth - 68, innerHeight - 742, '#EFF5E8', 'Family resort', 'Batangas', 'Saved')}
    `;
  }

  if (kind === 'convoy') {
    return `
      ${uiHeader(innerWidth, 'Convoy')}
      <rect x="34" y="118" width="${innerWidth - 68}" height="140" rx="28" fill="#F9E6DC" />
      <text x="72" y="174" font-size="24" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">Planned with MyExplorer</text>
      <text x="72" y="212" font-size="18" fill="${palette.ink}" opacity="0.76" font-family="Arial, sans-serif">Trip details stay aligned across the crew</text>
      <rect x="34" y="286" width="${(innerWidth - 86) / 2}" height="238" rx="28" fill="#E0EDF4" />
      <rect x="${52 + (innerWidth - 86) / 2}" y="286" width="${(innerWidth - 86) / 2}" height="238" rx="28" fill="#E7EEDB" />
      <text x="66" y="350" font-size="22" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">2 vehicles</text>
      <text x="66" y="388" font-size="18" fill="${palette.ink}" opacity="0.74" font-family="Arial, sans-serif">6 travelers</text>
      <text x="${74 + (innerWidth - 86) / 2}" y="350" font-size="22" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">4 assigned</text>
      <text x="${74 + (innerWidth - 86) / 2}" y="388" font-size="18" fill="${palette.ink}" opacity="0.74" font-family="Arial, sans-serif">2 seats open</text>
      <rect x="34" y="552" width="${innerWidth - 68}" height="${innerHeight - 586}" rx="28" fill="#F6F3EE" />
      <text x="72" y="618" font-size="24" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">Shared assignments</text>
      <text x="72" y="664" font-size="18" fill="${palette.ink}" opacity="0.72" font-family="Arial, sans-serif">Everyone sees the same plan, stops, and ride setup.</text>
    `;
  }

  return `
    ${uiHeader(innerWidth, 'Bookings')}
    ${card(34, 118, innerWidth - 68, 214, '#DCECF2', 'La Union weekend', 'Saved yesterday', 'Trip')}
    ${card(34, 360, innerWidth - 68, 214, '#F7E3D9', 'Bohol family trip', 'Reopen and continue', 'Trip')}
    ${card(34, 602, innerWidth - 68, innerHeight - 636, '#E5ECD8', 'Ready when you are', 'Stops, routes, and convoy details stay saved', 'Ready')}
  `;
}

function makeLandscapeSvg(screen, platform) {
  const { width, height } = platform;
  const titleLines = wrapText(screen.title, 24);
  const subtitleLines = wrapText(screen.subtitle, 38);
  const leftX = 180;
  const topY = 200;
  const phoneW = 820;
  const phoneH = 1020;
  const phoneX = width - phoneW - 220;
  const phoneY = 120;

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${screen.themeA}" />
        <stop offset="100%" stop-color="${screen.themeB}" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="32" stdDeviation="30" flood-color="#19303D" flood-opacity="0.16" />
      </filter>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)" />
    <circle cx="2380" cy="1080" r="360" fill="${screen.accent}" opacity="0.10" />
    <circle cx="320" cy="1060" r="260" fill="${palette.white}" opacity="0.28" />
    <path d="M 0 920 C 400 820, 720 1080, 1120 960 S 1900 760, 2736 980 L 2736 1260 L 0 1260 Z" fill="${palette.white}" opacity="0.22" />
    <g filter="url(#shadow)">
      ${phoneFrame({
        x: phoneX,
        y: phoneY,
        w: phoneW,
        h: phoneH,
        radius: 92,
        content: mockupContent(screen.mockup, phoneW - 44, phoneH - 44, screen.accent),
      })}
    </g>
    <rect x="${leftX}" y="${topY - 58}" width="190" height="42" rx="21" fill="${screen.accent}" opacity="0.15" />
    <text x="${leftX + 95}" y="${topY - 29}" text-anchor="middle" font-size="24" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">${esc(screen.kicker)}</text>
    ${textBlock(titleLines, leftX, topY + 80, 88, 'title')}
    ${textBlock(subtitleLines, leftX, topY + 360, 48, 'subtitle')}
    ${screen.trust ? `<rect x="${leftX}" y="748" width="310" height="54" rx="27" fill="${palette.white}" opacity="0.94" />
    <text x="${leftX + 155}" y="783" text-anchor="middle" font-size="24" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">${esc(screen.trust)}</text>` : ''}
    <text x="${leftX}" y="960" font-size="28" font-weight="700" fill="${palette.ink}" opacity="0.88" font-family="Arial, sans-serif">MyExplorer</text>
    <text x="${leftX}" y="1004" font-size="22" fill="${palette.ink}" opacity="0.68" font-family="Arial, sans-serif">Trip planning, discovery, and saved routes in one place</text>
    <style>
      .title { font: 700 72px Arial, sans-serif; fill: ${palette.ink}; }
      .subtitle { font: 400 34px Arial, sans-serif; fill: ${palette.ink}; opacity: 0.8; }
    </style>
  </svg>
  `;
}

function makePortraitSvg(screen, platform) {
  const { width, height } = platform;
  const titleLines = wrapText(screen.title, 18);
  const subtitleLines = wrapText(screen.subtitle, 26);
  const phoneW = 820;
  const phoneH = 1180;
  const phoneX = (width - phoneW) / 2;
  const phoneY = 520;

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${screen.themeA}" />
        <stop offset="100%" stop-color="${screen.themeB}" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="28" stdDeviation="28" flood-color="#19303D" flood-opacity="0.18" />
      </filter>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)" />
    <circle cx="870" cy="1680" r="230" fill="${screen.accent}" opacity="0.12" />
    <circle cx="180" cy="1600" r="180" fill="${palette.white}" opacity="0.24" />
    <path d="M 0 1380 C 230 1300, 390 1470, 560 1410 S 860 1260, 1080 1360 L 1080 1920 L 0 1920 Z" fill="${palette.white}" opacity="0.20" />
    <rect x="86" y="118" width="210" height="48" rx="24" fill="${screen.accent}" opacity="0.16" />
    <text x="191" y="150" text-anchor="middle" font-size="24" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">${esc(screen.kicker)}</text>
    ${textBlock(titleLines, 86, 254, 74, 'title')}
    ${textBlock(subtitleLines, 86, 470, 40, 'subtitle')}
    ${screen.trust ? `<rect x="86" y="360" width="306" height="48" rx="24" fill="${palette.white}" opacity="0.94" />
    <text x="239" y="391" text-anchor="middle" font-size="22" font-weight="700" fill="${palette.ink}" font-family="Arial, sans-serif">${esc(screen.trust)}</text>` : ''}
    <g filter="url(#shadow)">
      ${phoneFrame({
        x: phoneX,
        y: phoneY,
        w: phoneW,
        h: phoneH,
        radius: 96,
        content: mockupContent(screen.mockup, phoneW - 44, phoneH - 44, screen.accent),
      })}
    </g>
    <text x="86" y="1780" font-size="28" font-weight="700" fill="${palette.ink}" opacity="0.88" font-family="Arial, sans-serif">MyExplorer</text>
    <text x="86" y="1822" font-size="22" fill="${palette.ink}" opacity="0.68" font-family="Arial, sans-serif">Trip planning, discovery, and saved routes in one place</text>
    <style>
      .title { font: 700 60px Arial, sans-serif; fill: ${palette.ink}; }
      .subtitle { font: 400 28px Arial, sans-serif; fill: ${palette.ink}; opacity: 0.82; }
    </style>
  </svg>
  `;
}

for (const platform of platforms) {
  const platformDir = path.join(outputRoot, platform.name);
  ensureDir(platformDir);

  for (const screen of screens) {
    const svg = platform.orientation === 'landscape'
      ? makeLandscapeSvg(screen, platform)
      : makePortraitSvg(screen, platform);

    const svgPath = path.join(platformDir, `${screen.slug}.svg`);
    fs.writeFileSync(svgPath, svg);
  }
}

console.log(`Generated SVG screenshots in ${outputRoot}`);
