import { formatDistanceToNowStrict } from "date-fns";

export function compactNumber(n: number, opts: { unit?: string | null } = {}): string {
  const unit = opts.unit ?? "";
  const abs = Math.abs(n);
  let formatted: string;
  if (abs >= 1_000_000) formatted = `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  else if (abs >= 1_000) formatted = `${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  else if (Number.isInteger(n)) formatted = n.toString();
  else formatted = n.toLocaleString(undefined, { maximumFractionDigits: 1 });

  if (unit === "USD") return `$${formatted}`;
  if (unit === "%") return `${formatted}%`;
  return unit ? `${formatted} ${unit}` : formatted;
}

export function relativeTime(iso: string | Date): string {
  try {
    return formatDistanceToNowStrict(typeof iso === "string" ? new Date(iso) : iso, {
      addSuffix: true,
    });
  } catch {
    return "";
  }
}

export function pct(n: number, digits = 0): string {
  return `${n.toFixed(digits)}%`;
}
