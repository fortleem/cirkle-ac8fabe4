import { memo } from "react";

/** Alive ambient background: aurora gradients + floating circles + grid */
export const BackgroundFX = memo(function BackgroundFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--neon)/0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--neon)/0.4) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      {/* floating circles */}
      <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-neon/20 blur-3xl animate-drift" />
      <div className="absolute top-1/3 -right-32 h-[32rem] w-[32rem] rounded-full bg-violet/20 blur-3xl animate-drift [animation-delay:-6s]" />
      <div className="absolute -bottom-40 left-1/3 h-[34rem] w-[34rem] rounded-full bg-magenta/15 blur-3xl animate-drift [animation-delay:-12s]" />
      {/* noise */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  );
});