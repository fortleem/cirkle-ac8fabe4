import { useState } from "react";
import { Mail, Send, Smartphone, Shield, ArrowRight, Loader2 } from "lucide-react";
import { AIOrb } from "./AIOrb";
import { useWasl, type AuthMethod } from "./state";
import { cn } from "@/lib/utils";

export function AuthGate() {
  const { setAuth } = useWasl();
  const [method, setMethod] = useState<AuthMethod>(null);
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"pick" | "identify" | "verify" | "loading">("pick");

  const methods: { id: NonNullable<AuthMethod>; icon: React.ReactNode; title: string; sub: string; cost: string }[] = [
    { id: "email", icon: <Mail className="h-5 w-5" />, title: "Email", sub: "Self-hosted Mailcow · 6-digit code", cost: "Free" },
    { id: "telegram", icon: <Send className="h-5 w-5" />, title: "Telegram", sub: "@CircleAuthBot verifies instantly", cost: "Free" },
    { id: "sms", icon: <Smartphone className="h-5 w-5" />, title: "Carrier SMS", sub: "OTP via your mobile carrier", cost: "Carrier rate" },
  ];

  const submitIdentity = () => {
    if (!identifier.trim()) return;
    setStage("loading");
    setTimeout(() => setStage("verify"), 700);
  };
  const verify = () => {
    if (code.length < 4) return;
    setStage("loading");
    setTimeout(() => setAuth(method), 800);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-xl animate-fade-in">
      <div className="relative w-[440px] max-w-[92vw] glass-strong rounded-3xl p-8 border border-white/10 shadow-[0_30px_120px_hsl(var(--neon)/0.25)]">
        <div className="flex items-center gap-3 mb-6">
          <AIOrb size={44} />
          <div>
            <div className="font-display text-xl font-semibold flex items-baseline gap-2">
              Wasl <span className="font-arabic neon-text text-lg">وصل</span>
            </div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Connect · zero cost auth</div>
          </div>
        </div>

        {stage === "pick" && (
          <>
            <div className="text-sm text-muted-foreground mb-4">Choose a verification method. CIRKLE never stores card numbers or billing details.</div>
            <div className="space-y-2">
              {methods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setMethod(m.id); setStage("identify"); }}
                  className={cn(
                    "group w-full flex items-center gap-4 rounded-2xl px-4 py-3.5 border border-white/8",
                    "hover:border-neon/40 hover:bg-neon/5 transition text-left",
                  )}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-neon">{m.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{m.title}</div>
                    <div className="text-[11px] text-muted-foreground">{m.sub}</div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-online">{m.cost}</span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition text-neon" />
                </button>
              ))}
            </div>
          </>
        )}

        {stage === "identify" && (
          <div className="space-y-4 animate-message-in">
            <div className="text-sm">Enter your {method === "sms" ? "phone number" : method === "telegram" ? "Telegram handle" : "email"}</div>
            <input
              autoFocus
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitIdentity()}
              placeholder={method === "sms" ? "+20 100 000 0000" : method === "telegram" ? "@yourhandle" : "you@example.com"}
              className="w-full glass rounded-2xl px-4 py-3 text-sm outline-none border border-white/8 focus:border-neon/40"
            />
            <button onClick={submitIdentity} className="w-full rounded-2xl py-3 bg-gradient-to-r from-neon to-violet text-background font-medium hover:scale-[1.01] transition">
              Send code
            </button>
          </div>
        )}

        {stage === "verify" && (
          <div className="space-y-4 animate-message-in">
            <div className="text-sm">We sent a 6-digit code to <span className="text-neon">{identifier}</span></div>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && verify()}
              placeholder="• • • • • •"
              className="w-full glass rounded-2xl px-4 py-4 text-center text-2xl tracking-[0.5em] font-display outline-none border border-white/8 focus:border-neon/40"
            />
            <button onClick={verify} className="w-full rounded-2xl py-3 bg-gradient-to-r from-neon to-violet text-background font-medium hover:scale-[1.01] transition">
              Enter Wasl
            </button>
          </div>
        )}

        {stage === "loading" && (
          <div className="grid place-items-center py-10 text-neon"><Loader2 className="h-6 w-6 animate-spin" /></div>
        )}

        <div className="mt-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          <Shield className="h-3 w-3 text-online" /> End-to-end encrypted · Matrix / Olm · Data stays on device
        </div>
      </div>
    </div>
  );
}