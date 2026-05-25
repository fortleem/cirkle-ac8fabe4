import { cn } from "@/lib/utils";

interface AIOrbProps {
  size?: number;
  className?: string;
  pulsing?: boolean;
}

export function AIOrb({ size = 36, className, pulsing = true }: AIOrbProps) {
  return (
    <div
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {pulsing && (
        <span className="absolute inset-0 rounded-full border border-neon/40 animate-pulse-ring" />
      )}
      <span
        className="absolute inset-0 rounded-full animate-spin-slow"
        style={{ background: "var(--gradient-orb)", filter: "blur(2px)" }}
      />
      <span
        className="absolute inset-[3px] rounded-full bg-background/80 backdrop-blur"
        style={{ boxShadow: "var(--shadow-orb)" }}
      />
      <span
        className="relative h-[40%] w-[40%] rounded-full"
        style={{ background: "radial-gradient(circle at 30% 30%, hsl(var(--neon-glow)), hsl(var(--violet)))" }}
      />
    </div>
  );
}