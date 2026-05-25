import { Sparkles, Languages, FileText, Mic2, Wand2, X } from "lucide-react";
import { AIOrb } from "./AIOrb";
import { aiSuggestions } from "./data";

interface Props { onClose?: () => void; }

export function AISuggestions({ onClose }: Props) {
  return (
    <aside className="relative hidden xl:flex h-full w-[320px] shrink-0 flex-col glass border-l border-white/5 animate-slide-in-right">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <AIOrb size={36} />
        <div>
          <div className="font-display font-semibold flex items-center gap-2">
            Wasl AI <span className="font-arabic text-xs neon-text">وصل</span>
          </div>
          <div className="text-[11px] text-muted-foreground">listening to this conversation</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto grid h-8 w-8 place-items-center rounded-full hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="px-5 py-4 space-y-4 overflow-y-auto scrollbar-none">
        <Card title="Smart replies" icon={<Wand2 className="h-3.5 w-3.5" />}>
          <div className="space-y-2">
            {aiSuggestions.map((s, i) => (
              <button
                key={i}
                className="w-full text-left text-sm rounded-2xl px-3 py-2.5 border border-white/8 hover:border-neon/40 hover:bg-neon/5 transition"
              >
                {s}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Conversation pulse" icon={<Sparkles className="h-3.5 w-3.5" />}>
          <div className="space-y-3">
            <Stat label="Sentiment" value="Warm · playful" tone="online" />
            <Stat label="Open threads" value="2" tone="neon" />
            <Stat label="Action items" value="Send preview link" tone="violet" />
          </div>
        </Card>

        <Card title="Quick tools" icon={<FileText className="h-3.5 w-3.5" />}>
          <div className="grid grid-cols-2 gap-2">
            <Tool icon={<Languages className="h-4 w-4" />} label="Translate" />
            <Tool icon={<Mic2 className="h-4 w-4" />} label="Transcribe" />
            <Tool icon={<FileText className="h-4 w-4" />} label="Summarize" />
            <Tool icon={<Sparkles className="h-4 w-4" />} label="Refine tone" />
          </div>
        </Card>
      </div>

      <div className="mt-auto px-5 py-4 border-t border-white/5">
        <div className="glass rounded-2xl p-3 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-online shadow-[0_0_8px_hsl(var(--online))]" />
          <div className="text-xs text-muted-foreground">
            Private to you · never shared with others in this Circle
          </div>
        </div>
      </div>
    </aside>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass-strong rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        {icon}{title}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "online" | "neon" | "violet" }) {
  const c = tone === "online" ? "text-online" : tone === "neon" ? "text-neon" : "text-violet";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={c}>{value}</span>
    </div>
  );
}

function Tool({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex flex-col items-start gap-2 rounded-xl border border-white/8 px-3 py-3 text-sm hover:border-neon/40 hover:bg-neon/5 transition">
      <span className="text-neon">{icon}</span>
      {label}
    </button>
  );
}