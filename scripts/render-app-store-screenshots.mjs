import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const outputRoot = path.join(repoRoot, 'docs', 'app-store-screenshots');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'myexplorer-screens-'));

const fonts = {
  bold: '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  regular: '/System/Library/Fonts/Supplemental/Arial.ttf',
};

const screens = [
  {
    slug: '01-trip-planning-is-scattered',
    title: 'Travel planning is all over the place.',
    subtitle: 'Hotels, routes, activities, and notes usually live in different apps.',
    kicker: 'The problem',
    accent: 'F26B5B',
    bg: 'FFF2E8',
    uiHeader: 'Explore',
    cards: [
      ['Stay', 'Beach house', 'El Nido, Palawan', 'F7D9C8'],
      ['Trip', 'Island hopping', 'Full-day activity', 'D9EAF2'],
      ['Notes', 'Saved notes', 'Packing, timing, pickup', 'E7ECD7'],
    ],
  },
  {
    slug: '02-group-trips-turn-chaotic',
    title: 'Group trips turn chaotic fast.',
    subtitle: "Coordinating stops, vehicles, and plans shouldn't happen in scattered chats.",
    kicker: 'The problem',
    accent: '0F3D56',
    bg: 'E8F2F7',
    uiHeader: 'Trip Planner',
    cards: [
      ['Crew', 'Vehicle A', '3 assigned', 'E0EDF4'],
      ['Crew', 'Vehicle B', '1 assigned', 'E7EEDB'],
      ['Route', 'Pickup -> Coffee -> Check-in', 'Everyone sees the same plan', 'F6F3EE'],
    ],
  },
  {
    slug: '03-plan-the-whole-route',
    title: 'Plan the whole route in one flow.',
    subtitle: 'Map your origin, stops, destination, and timing without switching tools.',
    kicker: 'Trip Planner',
    accent: '6E8F62',
    bg: 'EEF5E8',
    uiHeader: 'Trip Planner',
    cards: [
      ['Stop', 'Origin', 'Start from current location', 'F7E2D7'],
      ['Stop', 'Lunch stop', 'Timed into the route', 'E0EDF4'],
      ['Stop', 'Destination', 'Arrival and distance ready', 'E7EEDB'],
    ],
  },
  {
    slug: '04-find-stays-activities-hidden-gems',
    title: 'Find stays, activities, and hidden gems.',
    subtitle: 'Explore local-first recommendations, not just the usual chains.',
    kicker: 'Discovery',
    accent: 'F26B5B',
    bg: 'FFF1EC',
    uiHeader: 'Explore',
    cards: [
      ['Stay', 'The Lind Boracay', 'Top rated stay', 'F4D7CC'],
      ['Activity', 'Island hopping', 'Full day in El Nido', 'DDEBF4'],
      ['Story', 'Traveler stories', 'Planned with MyExplorer', 'EFF4E7'],
    ],
  },
  {
    slug: '05-make-smarter-stops',
    title: 'Make smarter stops along the way.',
    subtitle: 'Surface pitstops, essentials, dining, and detours right on your route.',
    kicker: 'Route intelligence',
    accent: '0F3D56',
    bg: 'EDF6FA',
    uiHeader: 'Route Recommendations',
    cards: [
      ['Detour', 'Coffee + rest stop', '18 minutes ahead', 'F8E3D7'],
      ['Essential', 'Fuel and supplies', 'Near your current leg', 'E8EFE0'],
      ['Pick', 'Scenic lunch spot', 'Fits your route timing', 'EFF5F7'],
    ],
  },
  {
    slug: '06-reuse-favorites-start-faster',
    title: 'Reuse favorites and start faster.',
    subtitle: 'Save home, pickup points, and must-visit places for one-tap planning.',
    kicker: 'Saved places',
    accent: '6E8F62',
    bg: 'F3F8EE',
    uiHeader: 'Saved Places',
    cards: [
      ['Saved', 'Home', 'Quezon City', 'F7E2D7'],
      ['Saved', 'Pickup point', 'Makati', 'E1EEF4'],
      ['Saved', 'Family resort', 'Batangas', 'EFF5E8'],
    ],
  },
  {
    slug: '07-keep-everyone-on-the-same-plan',
    title: 'Keep everyone on the same plan.',
    subtitle: 'Manage vehicles, assignments, and shared trip details together.',
    kicker: 'Convoy',
    accent: 'F26B5B',
    bg: 'FFF3EE',
    uiHeader: 'Convoy',
    trust: 'Planned with MyExplorer',
    cards: [
      ['Crew', '2 vehicles', '6 travelers', 'E0EDF4'],
      ['Crew', '4 assigned', '2 seats open', 'E7EEDB'],
      ['Shared', 'Assignments stay aligned', 'Stops and rides update together', 'F6F3EE'],
    ],
  },
  {
    slug: '08-your-next-getaway-stays-ready',
    title: 'Your next getaway stays ready.',
    subtitle: 'Save trips, reopen them later, and head out with confidence.',
    kicker: 'Bookings',
    accent: '0F3D56',
    bg: 'EFF6F8',
    uiHeader: 'Bookings',
    cards: [
      ['Trip', 'La Union weekend', 'Saved yesterday', 'DCECF2'],
      ['Trip', 'Bohol family trip', 'Reopen and continue', 'F7E3D9'],
      ['Ready', 'Ready when you are', 'Stops and routes stay saved', 'E5ECD8'],
    ],
  },
];

const platforms = [
  { name: 'ios', width: 2736, height: 1260, landscape: true },
  { name: 'android', width: 1080, height: 1920, landscape: false },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function wrap(text, length) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (trial.length <= length) {
      current = trial;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.join('\n');
}

function esc(value) {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll(':', '\\:')
    .replaceAll("'", "\\'")
    .replaceAll(',', '\\,')
    .replaceAll('[', '\\[')
    .replaceAll(']', '\\]')
    .replaceAll('%', '\\%');
}

function writeTextFile(name, content) {
  const filePath = path.join(tempRoot, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

function drawText({ file, font, size, color, x, y, lineSpacing = 12, alpha = 1 }) {
  return `drawtext=fontfile='${esc(font)}':textfile='${esc(file)}':fontcolor=${color}@${alpha}:fontsize=${size}:x=${x}:y=${y}:line_spacing=${lineSpacing}`;
}

function drawBox(x, y, w, h, color, alpha = 1) {
  return `drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=${color}@${alpha}:t=fill`;
}

function buildLandscape(screen, platform) {
  const titleFile = writeTextFile(`${screen.slug}-${platform.name}-title.txt`, wrap(screen.title, 24));
  const subtitleFile = writeTextFile(`${screen.slug}-${platform.name}-subtitle.txt`, wrap(screen.subtitle, 40));
  const kickerFile = writeTextFile(`${screen.slug}-${platform.name}-kicker.txt`, screen.kicker);
  const brandFile = writeTextFile(`${screen.slug}-${platform.name}-brand.txt`, 'MyExplorer');
  const taglineFile = writeTextFile(`${screen.slug}-${platform.name}-tagline.txt`, 'Trip planning, discovery, and saved routes in one place');
  const trustFile = screen.trust ? writeTextFile(`${screen.slug}-${platform.name}-trust.txt`, screen.trust) : null;

  const phone = { x: 1700, y: 120, w: 820, h: 1020 };
  const inner = { x: phone.x + 22, y: phone.y + 22, w: phone.w - 44, h: phone.h - 44 };
  const filters = [
    drawBox(0, 0, platform.width, platform.height, screen.bg),
    drawBox(0, 920, platform.width, 340, 'FFFFFF', 0.18),
    drawBox(2200, 860, 420, 420, screen.accent, 0.08),
    drawBox(160, 146, 214, 48, screen.accent, 0.16),
    drawText({ file: kickerFile, font: fonts.bold, size: 24, color: '18313F', x: 200, y: 156 }),
    drawText({ file: titleFile, font: fonts.bold, size: 74, color: '18313F', x: 180, y: 250, lineSpacing: 18 }),
    drawText({ file: subtitleFile, font: fonts.regular, size: 34, color: '18313F', x: 182, y: 540, lineSpacing: 14, alpha: 0.82 }),
  ];

  if (trustFile) {
    filters.push(drawBox(180, 760, 350, 58, 'FFFFFF', 0.94));
    filters.push(drawText({ file: trustFile, font: fonts.bold, size: 24, color: '18313F', x: 214, y: 775 }));
  }

  filters.push(
    drawText({ file: brandFile, font: fonts.bold, size: 30, color: '18313F', x: 180, y: 980 }),
    drawText({ file: taglineFile, font: fonts.regular, size: 22, color: '18313F', x: 180, y: 1020, alpha: 0.7 }),
    drawBox(phone.x, phone.y, phone.w, phone.h, '101A22'),
    drawBox(inner.x, inner.y, inner.w, inner.h, 'FFFFFF'),
    drawBox(inner.x, inner.y, inner.w, 88, '0A2B3D'),
  );

  const uiHeaderFile = writeTextFile(`${screen.slug}-${platform.name}-uiheader.txt`, screen.uiHeader);
  filters.push(drawText({ file: uiHeaderFile, font: fonts.bold, size: 30, color: 'FFFFFF', x: inner.x + 82, y: inner.y + 24 }));
  filters.push(drawBox(inner.x + inner.w / 2 - 68, phone.y + 18, 136, 18, '101A22', 0.92));

  let cardY = inner.y + 118;
  for (let index = 0; index < screen.cards.length; index += 1) {
    const [badge, title, subtitle, fill] = screen.cards[index];
    const badgeFile = writeTextFile(`${screen.slug}-${platform.name}-badge-${index}.txt`, badge);
    const titleCardFile = writeTextFile(`${screen.slug}-${platform.name}-card-title-${index}.txt`, title);
    const subtitleCardFile = writeTextFile(`${screen.slug}-${platform.name}-card-subtitle-${index}.txt`, subtitle);
    const cardH = index === 2 ? 248 : 226;
    filters.push(
      drawBox(inner.x + 34, cardY, inner.w - 68, cardH, fill),
      drawBox(inner.x + 58, cardY + 26, 122, 34, 'FFFFFF', 0.92),
      drawText({ file: badgeFile, font: fonts.bold, size: 18, color: '18313F', x: inner.x + 85, y: cardY + 34 }),
      drawText({ file: titleCardFile, font: fonts.bold, size: 28, color: '18313F', x: inner.x + 58, y: cardY + 126 }),
      drawText({ file: subtitleCardFile, font: fonts.regular, size: 20, color: '18313F', x: inner.x + 58, y: cardY + 164, alpha: 0.78 }),
    );
    cardY += cardH + 24;
  }

  return filters.join(',');
}

function buildPortrait(screen, platform) {
  const titleFile = writeTextFile(`${screen.slug}-${platform.name}-title.txt`, wrap(screen.title, 18));
  const subtitleFile = writeTextFile(`${screen.slug}-${platform.name}-subtitle.txt`, wrap(screen.subtitle, 27));
  const kickerFile = writeTextFile(`${screen.slug}-${platform.name}-kicker.txt`, screen.kicker);
  const brandFile = writeTextFile(`${screen.slug}-${platform.name}-brand.txt`, 'MyExplorer');
  const taglineFile = writeTextFile(`${screen.slug}-${platform.name}-tagline.txt`, 'Trip planning, discovery, and saved routes in one place');
  const trustFile = screen.trust ? writeTextFile(`${screen.slug}-${platform.name}-trust.txt`, screen.trust) : null;

  const phone = { x: 130, y: 520, w: 820, h: 1180 };
  const inner = { x: phone.x + 22, y: phone.y + 22, w: phone.w - 44, h: phone.h - 44 };
  const filters = [
    drawBox(0, 0, platform.width, platform.height, screen.bg),
    drawBox(0, 1380, platform.width, 540, 'FFFFFF', 0.18),
    drawBox(800, 1480, 240, 240, screen.accent, 0.1),
    drawBox(86, 118, 228, 48, screen.accent, 0.16),
    drawText({ file: kickerFile, font: fonts.bold, size: 24, color: '18313F', x: 122, y: 128 }),
    drawText({ file: titleFile, font: fonts.bold, size: 60, color: '18313F', x: 86, y: 240, lineSpacing: 14 }),
    drawText({ file: subtitleFile, font: fonts.regular, size: 28, color: '18313F', x: 86, y: 452, lineSpacing: 10, alpha: 0.82 }),
  ];

  if (trustFile) {
    filters.push(drawBox(86, 372, 320, 48, 'FFFFFF', 0.94));
    filters.push(drawText({ file: trustFile, font: fonts.bold, size: 22, color: '18313F', x: 114, y: 382 }));
  }

  filters.push(
    drawBox(phone.x, phone.y, phone.w, phone.h, '101A22'),
    drawBox(inner.x, inner.y, inner.w, inner.h, 'FFFFFF'),
    drawBox(inner.x, inner.y, inner.w, 88, '0A2B3D'),
  );

  const uiHeaderFile = writeTextFile(`${screen.slug}-${platform.name}-uiheader.txt`, screen.uiHeader);
  filters.push(drawText({ file: uiHeaderFile, font: fonts.bold, size: 30, color: 'FFFFFF', x: inner.x + 82, y: inner.y + 24 }));
  filters.push(drawBox(inner.x + inner.w / 2 - 68, phone.y + 18, 136, 18, '101A22', 0.92));

  let cardY = inner.y + 118;
  for (let index = 0; index < screen.cards.length; index += 1) {
    const [badge, title, subtitle, fill] = screen.cards[index];
    const badgeFile = writeTextFile(`${screen.slug}-${platform.name}-badge-${index}.txt`, badge);
    const titleCardFile = writeTextFile(`${screen.slug}-${platform.name}-card-title-${index}.txt`, title);
    const subtitleCardFile = writeTextFile(`${screen.slug}-${platform.name}-card-subtitle-${index}.txt`, subtitle);
    const cardH = index === 2 ? 278 : 208;
    filters.push(
      drawBox(inner.x + 34, cardY, inner.w - 68, cardH, fill),
      drawBox(inner.x + 58, cardY + 26, 122, 34, 'FFFFFF', 0.92),
      drawText({ file: badgeFile, font: fonts.bold, size: 18, color: '18313F', x: inner.x + 85, y: cardY + 34 }),
      drawText({ file: titleCardFile, font: fonts.bold, size: 28, color: '18313F', x: inner.x + 58, y: cardY + 124 }),
      drawText({ file: subtitleCardFile, font: fonts.regular, size: 20, color: '18313F', x: inner.x + 58, y: cardY + 164, alpha: 0.78 }),
    );
    cardY += cardH + 26;
  }

  filters.push(
    drawText({ file: brandFile, font: fonts.bold, size: 28, color: '18313F', x: 86, y: 1778 }),
    drawText({ file: taglineFile, font: fonts.regular, size: 22, color: '18313F', x: 86, y: 1818, alpha: 0.7 }),
  );

  return filters.join(',');
}

for (const platform of platforms) {
  ensureDir(path.join(outputRoot, platform.name));
  for (const screen of screens) {
    const outputPath = path.join(outputRoot, platform.name, `${screen.slug}.png`);
    const filter = platform.landscape ? buildLandscape(screen, platform) : buildPortrait(screen, platform);
    const args = [
      '-y',
      '-f', 'lavfi',
      '-i', `color=c=black:s=${platform.width}x${platform.height}:d=1`,
      '-frames:v', '1',
      '-vf', filter,
      outputPath,
    ];

    const result = spawnSync('ffmpeg', args, { stdio: 'inherit' });
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}

console.log(`Rendered PNG screenshots in ${outputRoot}`);
