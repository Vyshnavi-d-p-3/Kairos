import clsx from "clsx";
import { avatarGradient, initials } from "@/lib/avatar";

const sizeMap: Record<string, string> = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
};

export default function Avatar({
  id,
  name,
  size = "md",
  ring,
}: {
  id: string;
  name?: string | null;
  size?: keyof typeof sizeMap;
  ring?: boolean;
}) {
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-soft",
        sizeMap[size],
        ring && "ring-2 ring-bg-1",
      )}
      style={{ background: avatarGradient(id) }}
      title={name || id}
    >
      {initials(name || id)}
    </span>
  );
}
