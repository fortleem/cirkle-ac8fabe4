import { cn } from "@/lib/utils";

interface Props {
  label: string;
  hue: number;
  size?: number;
  presence?: "online" | "away" | "offline" | "typing";
  ring?: boolean;
  className?: string;
}

export function Avatar({ label, hue, size = 44, presence, ring, className }: Props) {
  const dot =
    presence === "online" ? "bg-online" :
    presence === "away" ? "bg-away" :
    presence === "typing" ? "bg-neon" : "bg-muted-foreground";
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      {ring && (
        <span
          className="absolute -inset-[3px] rounded-full opacity-80"
          style={{ background: `conic-gradient(from 0deg, hsl(${hue} 90% 60%), hsl(${(hue+90)%360} 90% 60%), hsl(${hue} 90% 60%))` }}
        />
      )}
      <div
        className="relative grid h-full w-full place-items-center rounded-full font-display font-semibold text-background"
        style={{
          background: `linear-gradient(135deg, hsl(${hue} 95% 65%), hsl(${(hue+40)%360} 90% 55%))`,
          fontSize: size * 0.42,
          boxShadow: `0 8px 24px hsl(${hue} 80% 30% / 0.45)`,
        }}
      >
        <span className="drop-shadow-sm">{label}</span>
      </div>
      {presence && (
        <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background", dot, presence === "online" && "shadow-[0_0_12px_hsl(var(--online))]")} />
      )}
    </div>
  );
}