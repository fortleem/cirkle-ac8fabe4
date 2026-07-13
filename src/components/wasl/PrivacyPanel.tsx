import { Ghost, Camera, Forward, Timer, Keyboard, Wifi, WifiOff, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWasl, DISAPPEAR_LABELS, type DisappearTimer } from "./state";

export function PrivacyPanel() {
  const { privacyOpen, setPrivacyOpen, settings, setSettings } = useWasl();
  if (!privacyOpen) return null;

  const timers: DisappearTimer[] = ["off", "5s", "30s", "1m", "1h", "1d", "1w"];

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-background/60 backdrop-blur-md animate-fade-in" onClick={() => setPrivacyOpen(false)}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-[420px] max-w-full glass-strong border-l border-white/10 flex flex-col animate-slide-in-right"
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-neon/30 to-violet/30 text-neon">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display font-semibold">Privacy & Presence</div>
            <div className="text-[11px] text-muted-foreground">All settings stored on-device</div>
          </div>
          <button onClick={() => setPrivacyOpen(false)} className="ml-auto grid h-9 w-9 place-items-center rounded-full hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-none px-6 py-5 space-y-3">
          <Toggle
            icon={<Ghost className="h-4 w-4" />}
            title="Ghost Mode"
            sub="Appear offline to everyone except trusted contacts"
            value={settings.ghostMode}
            onChange={(v) => setSettings({ ghostMode: v })}
          />
          <Toggle
            icon={<Camera className="h-4 w-4" />}
            title="Screenshot Protection"
            sub="FLAG_SECURE + watermark on blocked captures"
            value={settings.screenshotProtection}
            onChange={(v) => setSettings({ screenshotProtection: v })}
          />
          <Toggle
            icon={<Forward className="h-4 w-4" />}
            title="Forwarding Consent"
            sub="Recipients must request signed approval to forward your messages"
            value={settings.forwardingConsent}
            onChange={(v) => setSettings({ forwardingConsent: v })}
          />
          <Toggle
            icon={<Keyboard className="h-4 w-4" />}
            title="Typing Indicators"
            sub="Broadcast when you're composing a message"
            value={settings.typingIndicators}
            onChange={(v) => setSettings({ typingIndicators: v })}
          />
          <Toggle
            icon={settings.meshOffline ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
            title="Local Mesh Offline"
            sub="Route messages over Bluetooth/Wi-Fi Direct when no internet"
            value={settings.meshOffline}
            onChange={(v) => setSettings({ meshOffline: v })}
          />

          <div className="glass rounded-2xl p-4 mt-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-3">
              <Timer className="h-3.5 w-3.5" /> Disappearing Messages
            </div>
            <div className="flex flex-wrap gap-2">
              {timers.map((t) => (
                <button
                  key={t}
                  onClick={() => setSettings({ disappearing: t })}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-full border transition",
                    settings.disappearing === t
                      ? "bg-neon/15 border-neon/50 text-neon shadow-[0_0_18px_hsl(var(--neon)/0.35)]"
                      : "border-white/10 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {DISAPPEAR_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground">
              Applied via Matrix message retention policy.
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/5 text-[10px] uppercase tracking-[0.24em] text-muted-foreground flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-online shadow-[0_0_8px_hsl(var(--online))]" />
          E2EE · Olm/Megolm · zero server storage
        </div>
      </div>
    </div>
  );
}

function Toggle({
  icon, title, sub, value, onChange,
}: { icon: React.ReactNode; title: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="w-full flex items-center gap-4 rounded-2xl p-4 glass border border-white/8 hover:border-neon/30 transition text-left"
    >
      <span className={cn("grid h-9 w-9 place-items-center rounded-xl", value ? "bg-neon/15 text-neon" : "bg-white/5 text-muted-foreground")}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-[11px] text-muted-foreground truncate">{sub}</div>
      </div>
      <span className={cn(
        "relative h-6 w-11 rounded-full transition",
        value ? "bg-gradient-to-r from-neon to-violet" : "bg-white/10",
      )}>
        <span className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-background transition-all shadow",
          value ? "left-[22px]" : "left-0.5",
        )} />
      </span>
    </button>
  );
}