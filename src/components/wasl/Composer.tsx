import { useState } from "react";
import { Mic, Paperclip, Smile, Send, Image as ImageIcon, Sparkles, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWasl, DISAPPEAR_LABELS, type DisappearTimer } from "./state";

interface Props { onSend: (text: string) => void; }

export function Composer({ onSend }: Props) {
  const { settings, setSettings } = useWasl();
  const [value, setValue] = useState("");
  const [recording, setRecording] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);

  const timers: DisappearTimer[] = ["off", "5s", "30s", "1m", "1h", "1d", "1w"];

  const submit = () => {
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <div className="relative px-6 pb-6 pt-3">
      {timerOpen && (
        <div className="absolute bottom-full left-6 mb-2 glass-strong rounded-2xl p-2 border border-white/10 shadow-xl z-10 animate-fade-in">
          <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground px-2 py-1">Disappear after</div>
          <div className="grid grid-cols-4 gap-1 w-[280px]">
            {timers.map((t) => (
              <button
                key={t}
                onClick={() => { setSettings({ disappearing: t }); setTimerOpen(false); }}
                className={cn(
                  "px-2 py-1.5 text-xs rounded-lg transition",
                  settings.disappearing === t ? "bg-neon/20 text-neon" : "hover:bg-white/5 text-muted-foreground",
                )}
              >
                {DISAPPEAR_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="glass-strong rounded-[28px] p-2 pl-3 flex items-end gap-2 border border-white/8 focus-within:border-neon/40 focus-within:shadow-[0_0_30px_hsl(var(--neon)/0.2)] transition">
        <div className="flex items-center gap-1">
          <IconBtn><Paperclip className="h-4 w-4" /></IconBtn>
          <IconBtn><ImageIcon className="h-4 w-4" /></IconBtn>
          <IconBtn><Smile className="h-4 w-4" /></IconBtn>
          <button
            onClick={() => setTimerOpen((o) => !o)}
            className={cn(
              "grid h-9 px-2.5 place-items-center rounded-full text-xs gap-1.5 transition inline-flex",
              settings.disappearing !== "off"
                ? "bg-neon/15 text-neon border border-neon/30"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5",
            )}
            title="Disappearing messages"
          >
            <Timer className="h-3.5 w-3.5" />
            {settings.disappearing !== "off" && <span>{DISAPPEAR_LABELS[settings.disappearing]}</span>}
          </button>
        </div>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
          }}
          rows={1}
          placeholder={settings.typingIndicators ? "Write to Noor…   ·   shift+enter for new line" : "Typing indicators off · shift+enter for new line"}
          className="flex-1 max-h-40 resize-none bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          className="grid h-9 w-9 place-items-center rounded-full text-violet hover:bg-violet/10 transition"
          aria-label="AI compose"
        >
          <Sparkles className="h-4 w-4" />
        </button>
        {value.trim() ? (
          <button
            onClick={submit}
            className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-neon to-violet text-background shadow-[0_0_30px_hsl(var(--neon)/0.45)] hover:scale-105 transition"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        ) : (
          <button
            onMouseDown={() => setRecording(true)}
            onMouseUp={() => setRecording(false)}
            onMouseLeave={() => setRecording(false)}
            className={cn(
              "relative grid h-10 w-10 place-items-center rounded-full transition",
              recording ? "bg-magenta text-background scale-110" : "bg-white/5 text-foreground hover:bg-white/10",
            )}
            aria-label="Hold to record"
          >
            {recording && <span className="absolute inset-0 rounded-full border border-magenta animate-pulse-ring" />}
            <Mic className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-2 text-center text-[10px] uppercase tracking-[0.24em] text-muted-foreground flex items-center justify-center gap-2">
        <span>end-to-end · Olm/Megolm</span>
        {settings.disappearing !== "off" && <span className="text-neon">· disappears in {DISAPPEAR_LABELS[settings.disappearing]}</span>}
        {settings.forwardingConsent && <span>· forwarding requires consent</span>}
      </div>
    </div>
  );
}

function IconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition">
      {children}
    </button>
  );
}