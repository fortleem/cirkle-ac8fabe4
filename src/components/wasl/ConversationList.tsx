import { cn } from "@/lib/utils";
import { Pin, Users, Sparkles, Filter, Plus } from "lucide-react";
import { Avatar } from "./Avatar";
import type { Conversation } from "./data";

interface Props {
  items: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function ConversationList({ items, activeId, onSelect }: Props) {
  const pinned = items.filter(i => i.pinned);
  const rest = items.filter(i => !i.pinned);

  return (
    <aside className="relative flex h-full w-[340px] shrink-0 flex-col glass border-r border-white/5">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <div className="font-display text-lg font-semibold">Conversations</div>
          <div className="text-[11px] text-muted-foreground tracking-wider uppercase">8 active · 3 circles</div>
        </div>
        <button className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-neon to-violet text-background hover:scale-105 transition">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="px-5 flex gap-2 text-xs">
        {["All", "DMs", "Circles", "AI"].map((t, i) => (
          <button
            key={t}
            className={cn(
              "px-3 py-1.5 rounded-full border transition",
              i === 0
                ? "bg-neon/15 border-neon/40 text-neon"
                : "border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20",
            )}
          >
            {t}
          </button>
        ))}
        <button className="ml-auto grid h-7 w-7 place-items-center rounded-full border border-white/10 text-muted-foreground hover:text-foreground">
          <Filter className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto scrollbar-none px-3 pb-4 space-y-1">
        <Section label="Pinned" icon={<Pin className="h-3 w-3" />}>
          {pinned.map(c => (
            <Row key={c.id} c={c} active={c.id === activeId} onClick={() => onSelect(c.id)} />
          ))}
        </Section>
        <Section label="Recent">
          {rest.map(c => (
            <Row key={c.id} c={c} active={c.id === activeId} onClick={() => onSelect(c.id)} />
          ))}
        </Section>
      </div>
    </aside>
  );
}

function Section({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ c, active, onClick }: { c: Conversation; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full rounded-2xl px-3 py-2.5 text-left transition-all",
        active
          ? "bg-gradient-to-r from-neon/15 via-violet/10 to-transparent border border-neon/30 shadow-[0_0_30px_hsl(var(--neon)/0.15)]"
          : "hover:bg-white/[0.04] border border-transparent",
      )}
    >
      {active && (
        <span className="absolute -left-[1px] top-1/2 -translate-y-1/2 h-8 w-[3px] rounded-r-full bg-neon shadow-[0_0_12px_hsl(var(--neon))]" />
      )}
      <div className="flex items-center gap-3">
        <Avatar label={c.avatar} hue={c.hue} presence={c.presence} ring={c.kind === "ai"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-sm">{c.name}</span>
            {c.arabic && <span className="font-arabic text-xs text-muted-foreground">{c.arabic}</span>}
            {c.kind === "circle" && <Users className="h-3 w-3 text-muted-foreground" />}
            {c.kind === "ai" && <Sparkles className="h-3 w-3 text-neon" />}
            <span className="ml-auto text-[10px] text-muted-foreground">{c.time}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn(
              "truncate text-xs",
              c.presence === "typing" ? "text-neon" : "text-muted-foreground",
            )}>
              {c.preview}
            </span>
            {c.unread ? (
              <span className="ml-auto grid min-w-[20px] h-5 place-items-center rounded-full px-1.5 bg-neon text-background text-[10px] font-semibold shadow-[0_0_12px_hsl(var(--neon)/0.6)]">
                {c.unread}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}