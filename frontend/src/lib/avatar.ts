// Colors + initials from a stable hash of id.

const GRADIENTS: Array<[string, string]> = [
  ["#6366f1", "#a855f7"], // indigo → violet
  ["#0ea5e9", "#22d3ee"], // sky → cyan
  ["#10b981", "#22c55e"], // emerald → green
  ["#f59e0b", "#f97316"], // amber → orange
  ["#f43f5e", "#fb7185"], // rose
  ["#8b5cf6", "#6366f1"], // violet → indigo
  ["#06b6d4", "#3b82f6"], // cyan → blue
];

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i);
  return Math.abs(h);
}

export function avatarGradient(id: string): string {
  const [a, b] = GRADIENTS[hash(id) % GRADIENTS.length];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

// Accent per objective id (nav, bars).
const ACCENTS = [
  "#6366f1", // indigo
  "#a855f7", // violet
  "#38bdf8", // sky
  "#14b8a6", // teal
  "#10b981", // emerald
  "#f59e0b", // amber
  "#f43f5e", // rose
  "#d946ef", // fuchsia
];
export function accentColor(id: string): string {
  return ACCENTS[hash(id) % ACCENTS.length];
}

export function initials(displayOrId: string): string {
  const t = displayOrId.replace(/^user_/, "").trim();
  if (!t) return "?";
  const parts = t.split(/[\s_-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
