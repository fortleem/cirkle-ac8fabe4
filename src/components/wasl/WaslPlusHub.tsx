// Wasl+ hub — surfaces the ported chat features (stories, scheduled, drafts,
// folders, saved, contacts, business spaces, service announcements).
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  X, Sparkles, Clock, FileText, FolderOpen, Star, Bookmark, Users,
  Building2, Megaphone, Loader2, Phone, Lock,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { getMe } from "@/lib/session";

const ME = getMe();

type TabKey =
  | "stories" | "scheduled" | "drafts" | "folders"
  | "saved" | "contacts" | "business" | "alerts";

const TABS: { k: TabKey; l: string; i: any }[] = [
  { k: "stories", l: "Stories", i: Sparkles },
  { k: "scheduled", l: "Scheduled", i: Clock },
  { k: "drafts", l: "Drafts", i: FileText },
  { k: "folders", l: "Folders", i: FolderOpen },
  { k: "saved", l: "Saved", i: Star },
  { k: "contacts", l: "Contacts", i: Users },
  { k: "business", l: "Business", i: Building2 },
  { k: "alerts", l: "Alerts", i: Megaphone },
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

export default function WaslPlusHub({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<TabKey>("stories");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const uid = ME;
    const paths: Record<TabKey, string> = {
      stories: `/wasl-plus/stories?user_id=${uid}`,
      scheduled: `/wasl-plus/scheduled-messages?user_id=${uid}`,
      drafts: `/wasl-plus/drafts?user_id=${uid}`,
      folders: `/wasl-plus/folders?user_id=${uid}`,
      saved: `/wasl-plus/starred?user_id=${uid}`,
      contacts: `/wasl-plus/contacts?user_id=${uid}`,
      business: `/wasl-plus/business?user_id=${uid}`,
      alerts: `/wasl-plus/service-providers/announcements?user_id=${uid}`,
    };
    let cancelled = false;
    setLoading(true);
    apiGet<any>(paths[tab])
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tab]);

  const body = () => {
    if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-secondary" /></div>;
    if (!data) return <Empty label="Nothing to show yet." />;

    if (tab === "stories") {
      const rows = data.stories ?? [];
      if (!rows.length) return <Empty label="No active stories." />;
      return rows.map((s: any) => (
        <Row key={s.id} title={s.caption || s.content || "Story"}
          sub={`${s.media_type} · ${s.view_count ?? 0} views`}
          meta={s.display_name ?? `#${s.user_id}`} />
      ));
    }
    if (tab === "scheduled") {
      const rows = data.scheduled ?? [];
      if (!rows.length) return <Empty label="No scheduled messages." />;
      return rows.map((s: any) => (
        <Row key={s.id} title={s.body} sub={`Room ${s.room_id}`} meta={String(s.send_at ?? "").slice(0, 16)} />
      ));
    }
    if (tab === "drafts") {
      const rows = data.drafts ?? [];
      if (!rows.length) return <Empty label="No saved drafts." />;
      return rows.map((d: any) => (
        <Row key={d.room_id} title={d.body} sub={`Room ${d.room_id}`} meta={String(d.updated_at ?? "").slice(5, 16)} />
      ));
    }
    if (tab === "folders") {
      const rows = data.folders ?? [];
      if (!rows.length) return <Empty label="No chat folders." />;
      return rows.map((f: any) => (
        <Row key={f.id} title={f.name} sub={`${(f.room_ids ?? []).length} conversations`} meta={f.icon} />
      ));
    }
    if (tab === "saved") {
      const rows = data.starred ?? [];
      if (!rows.length) return <Empty label="No starred messages." />;
      return rows.map((s: any) => (
        <Row key={s.message_id} title={s.body ?? s.message_id} sub="Starred message" meta={String(s.starred_at ?? "").slice(5, 16)} />
      ));
    }
    if (tab === "contacts") {
      const rows = data.contacts ?? [];
      if (!rows.length) return <Empty label="No contacts saved." />;
      return rows.map((c: any) => (
        <Row key={c.id} title={c.nickname ?? c.display_name ?? `User ${c.user_id}`} sub={c.phone} meta={c.notes ?? ""} />
      ));
    }
    if (tab === "business") {
      const rows = data.workspaces ?? data.business ?? [];
      if (!rows.length) return <Empty label="No business spaces yet." />;
      return rows.map((b: any) => (
        <Row key={b.id} title={b.name} sub={b.description ?? b.category} meta={b.city ?? ""} />
      ));
    }
    const rows = data.announcements ?? [];
    if (!rows.length) return <Empty label="No service announcements." />;
    return rows.map((a: any) => (
      <Row key={a.id} title={a.title ?? a.body} sub={a.body} meta={String(a.created_at ?? "").slice(5, 16)} />
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xl overflow-y-auto"
    >
      <div className="px-5 pt-6 pb-24 max-w-2xl mx-auto">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-3xl">Wasl+ <span className="text-xs tracking-widest uppercase text-muted-foreground">وصل بلس</span></h2>
            <p className="text-[10px] uppercase tracking-widest text-secondary mt-1 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Encrypted extras
            </p>
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

        <div className="mt-8 glass rounded-2xl p-4 text-xs text-muted-foreground flex items-start gap-2">
          <Phone className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
          Threads, polls, receipt splitting, view-once media, read receipts and app lock are live inside each
          conversation.
        </div>
      </div>
    </motion.div>
  );
}
