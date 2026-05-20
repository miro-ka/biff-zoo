export type ThemeName = 'dark' | 'light';

export interface Palette {
  // surface
  bg: string;          // page background
  surface: string;     // cards, banners
  surface2: string;    // raised panel
  border: string;      // 1px borders
  borderStrong: string;
  text: string;
  textDim: string;
  textMuted: string;
  // accents
  accent: string;      // primary blue — links, ẋ-nullcline, "I", active
  warn: string;        // amber — saddle, current value, trajectory
  error: string;       // red — unstable
  success: string;     // green — stable
  pink: string;        // ẏ-nullcline
  // plot internals
  plotBg: string;
  gridLine: string;
  axisLine: string;
  axisLabel: string;
  vectorField: string; // semi-transparent
  thresholdLine: string;
  ficurveLine: string; // F–I curve color
  // RGB triplets for rgba() use (no leading 'rgb', no parens)
  warnRgb: string;     // trajectory trails
  accentRgb: string;
}

const dark: Palette = {
  bg: '#0a0b0f',
  surface: '#14181f',
  surface2: '#181a20',
  border: '#2a2e36',
  borderStrong: '#3a3f48',
  text: '#e4e6ea',
  textDim: '#9aa3b2',
  textMuted: '#5a626e',
  accent: '#6ec3ff',
  warn: '#ffd76b',
  error: '#ff8a8a',
  success: '#7dd87d',
  pink: '#ff7eb0',
  plotBg: '#0c0e13',
  gridLine: '#22262d',
  axisLine: '#3a3a3a',
  axisLabel: '#9aa3b2',
  vectorField: 'rgba(140,150,170,0.35)',
  thresholdLine: '#3a3a3a',
  ficurveLine: '#6ec3ff',
  warnRgb: '255,215,107',
  accentRgb: '110,195,255',
};

const light: Palette = {
  bg: '#f7f8fa',
  surface: '#ffffff',
  surface2: '#f3f4f7',
  border: '#dde1e8',
  borderStrong: '#c0c5cf',
  text: '#1a1d24',
  textDim: '#5a6270',
  textMuted: '#8a93a0',
  accent: '#1564b8',
  warn: '#a67324',
  error: '#c43a3a',
  success: '#2f8a44',
  pink: '#b53574',
  plotBg: '#ffffff',
  gridLine: '#eaedf2',
  axisLine: '#a8aeb8',
  axisLabel: '#5a6270',
  vectorField: 'rgba(70,80,100,0.30)',
  thresholdLine: '#c0c5cf',
  ficurveLine: '#1564b8',
  warnRgb: '166,115,36',
  accentRgb: '21,100,184',
};

const palettes: Record<ThemeName, Palette> = { dark, light };

function loadInitial(): ThemeName {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('biff-zoo:theme');
    if (stored === 'light' || stored === 'dark') return stored;
  }
  return 'light';
}

const initial = loadInitial();
export const theme = $state<{ name: ThemeName; colors: Palette }>({
  name: initial,
  colors: palettes[initial],
});

export function setTheme(name: ThemeName): void {
  theme.name = name;
  theme.colors = palettes[name];
  if (typeof document !== 'undefined') document.body.setAttribute('data-theme', name);
  try { localStorage.setItem('biff-zoo:theme', name); } catch {}
}

export function toggleTheme(): void {
  setTheme(theme.name === 'dark' ? 'light' : 'dark');
}

export function applyInitialTheme(): void {
  if (typeof document !== 'undefined') document.body.setAttribute('data-theme', theme.name);
}
