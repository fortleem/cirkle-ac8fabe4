// Mashahd+ hub — surfaces the ported video features (playlists, continue
// watching, personalised feeds, clips, studio, premium, AI tools).
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  X, ListVideo, PlayCircle, Sparkles, Scissors, BarChart3, Crown,
  Loader2, Wand2, Send,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { getMe } from "@/lib/session";

const ME = getMe();

type TabKey = "playlists" | "continue" | "foryou" | "clips" | "studio" | "premium" | "ai";

const TABS: { k: TabKey; l: string; i: any }[] = [
  { k: "playlists", l: "Playlists", i: ListVideo },
  { k: "continue", l: "Continue", i: PlayCircle },
  { k: "foryou", l: "For you", i: Sparkles },
  { k: "clips", l: "Clips", i: Scissors },
  { k: "studio", l: "Studio", i: BarChart3 },
  { k: "premium", l: "Premium", i: Crown },
  { k: "ai", l: "AI tools", i: Wand2 },
];

function Row({ title, sub, meta }: { title: string; sub?: string; meta?: string }) {
  return (
    <div className="glass rounded-2xl px-4 py-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        {sub && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{sub}</p>}
      </div>
      {meta && <span className="text-[10px] font-mono text-muted-foreground shrink-0">{meta}</span>}
    </div>
  );
}
function Empty({ label }: { label: string }) {
  return <p className="text-xs text-muted-foreground text-center py-10">{label}</p>;
}

function AITools() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string | null>(null);

  async function ask() {
    if (!q.trim()) return;
    setBusy(true); setOut(null);
    try {
      const r = await apiPost<any>("/ai/advanced-search", { query: q, user_id: ME.id });
      setOut(typeof r?.answer === "string" ? r.answer : JSON.stringify(r, null, 2));
    } catch (e: any) {
      setOut("Could not reach the AI service right now.");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="glass rounded-full px-4 py-2.5 flex items-center gap-3">
        <Wand2 className="w-4 h-4 text-secondary" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Ask about anything across the video library"
          className="bg-transparent flex-1 outline-none text-sm"
        />
        <button onClick={ask} disabled={busy} className="text-secondary disabled:opacity-40">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      {out && <div className="glass rounded-2xl p-4 text-xs whitespace-pre-wrap leading-relaxed">{out}</div>}
      <p className="text-[11px] text-muted-foreground">
        Also available per video: summaries, auto chapters, transcripts, translation and in-video search.
      </p>
    </div>
  );
}

export default function MashahdPlusHub({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<TabKey>("playlists");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (tab === "ai") { setLoading(false); return; }
    const uid = ME.id;
    const paths: Record<Exclude<TabKey, "ai">, string> = {
      playlists: `/mashahd/playlists?user_id=${uid}`,
      continue: `/mashahd/continue-watching?user_id=${uid}`,
      foryou: `/mashahd/feed/for-you?user_id=${uid}`,
      clips: `/mashahd/clips?user_id=${uid}`,
      studio: `/mashahd/analytics?user_id=${uid}`,
      premium: `/mashahd/premium?user_id=${uid}`,
    };
    let cancelled = false;
    setLoading(true);
    apiGet<any>(paths[tab as Exclude<TabKey, "ai">])
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tab]);

  const body = () => {
    if (tab === "ai") return <AITools />;
    if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-secondary" /></div>;
    if (!data) return <Empty label="Nothing to show yet." />;

    if (tab === "playlists") {
      const rows = data.playlists ?? [];
      if (!rows.length) return <Empty label="No playlists yet." />;
      return rows.map((p: any) => (
        <Row key={p.id} title={p.title} sub={p.description} meta={`${p.item_count ?? 0} videos`} />
      ));
    }
    if (tab === "continue") {
      const rows = data.continue_watching ?? [];
      if (!rows.length) return <Empty label="Nothing in progress — start a video." />;
      return rows.map((c: any) => (
        <Row key={`${c.video_id}`} title={c.title ?? `Video ${c.video_id}`}
          sub={`${Math.round(((c.position_sec ?? 0) / Math.max(1, c.duration_sec ?? 1)) * 100)}% watched`}
          meta={String(c.updated_at ?? "").slice(5, 16)} />
      ));
    }
    if (tab === "foryou") {
      const rows = data.videos ?? [];
      if (!rows.length) return <Empty label="No recommendations yet." />;
      return rows.map((v: any) => (
        <Row key={v.id} title={v.title} sub={v.description} meta={`${v.views ?? 0} views`} />
      ));
    }
    if (tab === "clips") {
      const rows = data.clips ?? [];
      if (!rows.length) return <Empty label="No clips created yet." />;
      return rows.map((c: any) => (
        <Row key={c.id} title={c.title ?? "Clip"} sub={`${c.start_sec ?? 0}s → ${c.end_sec ?? 0}s`} meta={`${c.views ?? 0} views`} />
      ));
    }
    if (tab === "studio") {
      const a = data.analytics ?? {};
      return (
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: "Views", v: a.total_views ?? 0 },
            { l: "Likes", v: a.total_likes ?? 0 },
            { l: "Videos", v: a.video_count ?? 0 },
          ].map((s) => (
            <div key={s.l} className="glass rounded-2xl p-4 text-center">
              <p className="font-display text-2xl">{Number(s.v).toLocaleString()}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{s.l}</p>
            </div>
          ))}
        </div>
      );
    }
    const tiers = data.tiers ?? [];
    const sub = data.subscription;
    return (
      <div className="space-y-2">
        {sub && <Row title={`Active: ${sub.tier_id}`} sub={`Status ${sub.status}`} />}
        {tiers.length === 0 ? <Empty label="No tiers configured." /> :
          tiers.map((t: any) => (
            <Row key={t.id} title={t.name}
              sub={(() => { try { return (JSON.parse(t.perks_json ?? "[]") as string[]).join(" · "); } catch { return t.perks_json; } })()}
              meta={`${((t.price_minor ?? 0) / 100).toFixed(2)} ${t.currency ?? ""}`} />
          ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xl overflow-y-auto"
    >
      <div className="px-5 pt-6 pb-24 max-w-2xl mx-auto">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-3xl">Mashahd+ <span className="text-xs tracking-widest uppercase text-muted-foreground">مشاهد بلس</span></h2>
            <p className="text-[10px] uppercase tracking-widest text-secondary mt-1">Library · Studio · AI</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full glass flex items-center justify-center" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 mt-5 overflow-x-auto scrollbar-hide">
          {TABS.map(({ k, l, i: Icon }) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`gold-stroke whitespace-nowrap text-xs transition ${
                tab === k ? "bg-gradient-to-br from-secondary/30 to-primary/15 ring-1 ring-secondary/60" : "hover:bg-card/60"
              }`}
            >
              <Icon className="w-3 h-3" /> {l}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-2">{body()}</div>
      </div>
    </motion.div>
  );
}
