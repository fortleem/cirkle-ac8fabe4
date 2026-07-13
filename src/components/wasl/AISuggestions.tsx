import { useState } from "react";
import { Sparkles, Languages, FileText, Mic2, Wand2, X, Brain, Search, CheckCircle2 } from "lucide-react";
import { AIOrb } from "./AIOrb";
import { aiSuggestions } from "./data";
import { AI_PROVIDERS } from "./state";
import { cn } from "@/lib/utils";

interface Props { onClose?: () => void; }

export function AISuggestions({ onClose }: Props) {
  const [tool, setTool] = useState<string | null>(null);

  return (
    <aside className="relative hidden xl:flex h-full w-[320px] shrink-0 flex-col glass border-l border-white/5 animate-slide-in-right">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <AIOrb size={36} />
        <div>
          <div className="font-display font-semibold flex items-center gap-2">
            Wasl AI <span className="font-arabic text-xs neon-text">وصل</span>
          </div>
          <div className="text-[11px] text-muted-foreground">5-provider consensus · on-device PMB</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto grid h-8 w-8 place-items-center rounded-full hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="px-5 py-4 space-y-4 overflow-y-auto scrollbar-none">
        <Card title="Cross-provider consensus" icon={<Brain className="h-3.5 w-3.5" />}>
          <div className="flex flex-wrap gap-1.5">
            {AI_PROVIDERS.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] border border-white/10 bg-white/[0.03]"
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${p.hue} 90% 60%)`, boxShadow: `0 0 8px hsl(${p.hue} 90% 60%)` }} />
                {p.name}
              </span>
            ))}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-online">
            <CheckCircle2 className="h-3 w-3" /> 5/5 agree · confidence 0.94
          </div>
        </Card>

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
            <Tool icon={<Languages className="h-4 w-4" />} label="Translate" active={tool==="translate"} onClick={() => setTool(tool==="translate"?null:"translate")} />
            <Tool icon={<Mic2 className="h-4 w-4" />} label="Transcribe" active={tool==="transcribe"} onClick={() => setTool(tool==="transcribe"?null:"transcribe")} />
            <Tool icon={<FileText className="h-4 w-4" />} label="Summarize" active={tool==="summarize"} onClick={() => setTool(tool==="summarize"?null:"summarize")} />
            <Tool icon={<Sparkles className="h-4 w-4" />} label="Refine tone" active={tool==="refine"} onClick={() => setTool(tool==="refine"?null:"refine")} />
            <Tool icon={<Search className="h-4 w-4" />} label="Full-text search" active={tool==="search"} onClick={() => setTool(tool==="search"?null:"search")} />
            <Tool icon={<Brain className="h-4 w-4" />} label="Save to PMB" active={tool==="pmb"} onClick={() => setTool(tool==="pmb"?null:"pmb")} />
          </div>
          {tool && (
            <div className="mt-3 rounded-xl border border-neon/30 bg-neon/5 px-3 py-2 text-[11px] text-neon flex items-center gap-2 animate-fade-in">
              <span className="h-1.5 w-1.5 rounded-full bg-neon animate-pulse" />
              {tool === "translate" && "Translating to Arabic via Universal Translation Layer…"}
              {tool === "summarize" && "Summarizing last 20 messages via CRIE…"}
              {tool === "transcribe" && "Transcribing voice notes on-device…"}
              {tool === "refine" && "Refining tone with 5-provider consensus…"}
              {tool === "search" && "Full-text search index ready. Type in header search."}
              {tool === "pmb" && "Persisted to Personal Memory Brain (Phase 2)."}
            </div>
          )}
        </Card>

        <Card title="Personal Memory Brain" icon={<Brain className="h-3.5 w-3.5" />}>
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground">142 memories</span> from this chat · privacy level <span className="text-violet">private</span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full w-[68%] bg-gradient-to-r from-neon to-violet" />
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

function Tool({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl border px-3 py-3 text-xs transition",
        active ? "border-neon/60 bg-neon/10 text-neon shadow-[0_0_18px_hsl(var(--neon)/0.25)]"
               : "border-white/8 hover:border-neon/40 hover:bg-neon/5",
      )}
    >
      <span className={active ? "text-neon" : "text-neon"}>{icon}</span>
      {label}
    </button>
  );
}