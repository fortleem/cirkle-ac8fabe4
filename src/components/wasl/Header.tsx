import { Bell, Search, Sparkles, ShieldCheck, Ghost, Wifi, WifiOff } from "lucide-react";
import { AIOrb } from "./AIOrb";
import { useWasl } from "./state";
import { cn } from "@/lib/utils";

export function Header() {
  const { settings, setSettings, setPrivacyOpen, search, setSearch } = useWasl();
  return (
    <header className="relative z-20 flex items-center gap-4 px-6 py-4 glass-strong border-b border-white/5">
      <div className="flex items-center gap-3">
        <AIOrb size={40} />
        <div className="leading-tight">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl font-semibold tracking-tight">Wasl</span>
            <span className="font-arabic text-xl neon-text">وصل</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            <span className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              settings.ghostMode ? "bg-muted-foreground" : "bg-online shadow-[0_0_8px_hsl(var(--online))]",
            )} />
            {settings.ghostMode ? "Ghost · invisible" : settings.meshOffline ? "Mesh · offline relay" : "Circle · live"}
          </div>
        </div>
      </div>

      <div className="mx-auto hidden md:flex items-center gap-2 glass rounded-full px-4 py-2 w-[420px]">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search people, circles, messages…"
          className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground outline-none"
        />
        <kbd className="hidden sm:inline-flex items-center rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘K</kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => setSettings({ meshOffline: !settings.meshOffline })}
          title="Local mesh"
          className={cn(
            "grid h-10 w-10 place-items-center rounded-full glass transition",
            settings.meshOffline ? "border-magenta/50 text-magenta" : "hover:border-neon/40",
          )}
        >
          {settings.meshOffline ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
        </button>
        <button
          onClick={() => setSettings({ ghostMode: !settings.ghostMode })}
          title="Ghost mode"
          className={cn(
            "grid h-10 w-10 place-items-center rounded-full glass transition",
            settings.ghostMode ? "border-violet/50 text-violet" : "hover:border-neon/40",
          )}
        >
          <Ghost className="h-4 w-4" />
        </button>
        <button className="group relative grid h-10 w-10 place-items-center rounded-full glass hover:border-neon/40 transition">
          <Sparkles className="h-4 w-4 text-neon" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-magenta shadow-[0_0_8px_hsl(var(--magenta))]" />
        </button>
        <button className="grid h-10 w-10 place-items-center rounded-full glass hover:border-neon/40 transition">
          <Bell className="h-4 w-4" />
        </button>
        <button
          onClick={() => setPrivacyOpen(true)}
          title="Privacy & presence"
          className="grid h-10 w-10 place-items-center rounded-full glass hover:border-neon/40 transition"
        >
          <ShieldCheck className="h-4 w-4" />
        </button>
        <div className="ml-1 hidden sm:flex items-center gap-2 glass rounded-full pl-1 pr-3 py-1">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-neon to-violet text-background font-semibold text-sm">Y</div>
          <div className="leading-tight">
            <div className="text-xs font-medium">Yusuf</div>
            <div className={cn("text-[10px]", settings.ghostMode ? "text-muted-foreground" : "text-online")}>
              {settings.ghostMode ? "invisible" : "online · focus"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}