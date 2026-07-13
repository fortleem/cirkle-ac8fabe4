import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type DisappearTimer = "off" | "5s" | "30s" | "1m" | "1h" | "1d" | "1w";
export type AuthMethod = "email" | "telegram" | "sms" | null;

export interface WaslSettings {
  ghostMode: boolean;
  screenshotProtection: boolean;
  forwardingConsent: boolean;
  typingIndicators: boolean;
  disappearing: DisappearTimer;
  meshOffline: boolean;
}

interface Ctx {
  settings: WaslSettings;
  setSettings: (patch: Partial<WaslSettings>) => void;
  auth: AuthMethod;
  setAuth: (m: AuthMethod) => void;
  search: string;
  setSearch: (s: string) => void;
  privacyOpen: boolean;
  setPrivacyOpen: (b: boolean) => void;
  aiPanelOpen: boolean;
  setAiPanelOpen: (b: boolean) => void;
}

const WaslCtx = createContext<Ctx | null>(null);

export function WaslProvider({ children }: { children: ReactNode }) {
  const [settings, setState] = useState<WaslSettings>({
    ghostMode: false,
    screenshotProtection: true,
    forwardingConsent: true,
    typingIndicators: true,
    disappearing: "off",
    meshOffline: false,
  });
  const [auth, setAuth] = useState<AuthMethod>(null);
  const [search, setSearch] = useState("");
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);

  const value = useMemo<Ctx>(() => ({
    settings,
    setSettings: (patch) => setState((s) => ({ ...s, ...patch })),
    auth, setAuth, search, setSearch, privacyOpen, setPrivacyOpen, aiPanelOpen, setAiPanelOpen,
  }), [settings, auth, search, privacyOpen, aiPanelOpen]);

  return <WaslCtx.Provider value={value}>{children}</WaslCtx.Provider>;
}

export function useWasl() {
  const ctx = useContext(WaslCtx);
  if (!ctx) throw new Error("useWasl must be used inside WaslProvider");
  return ctx;
}

export const DISAPPEAR_LABELS: Record<DisappearTimer, string> = {
  off: "Off",
  "5s": "5 seconds",
  "30s": "30 seconds",
  "1m": "1 minute",
  "1h": "1 hour",
  "1d": "1 day",
  "1w": "1 week",
};

export const AI_PROVIDERS = [
  { id: "groq", name: "Groq", hue: 20 },
  { id: "gemini", name: "Gemini", hue: 200 },
  { id: "openai", name: "OpenAI", hue: 150 },
  { id: "hf", name: "HuggingFace", hue: 40 },
  { id: "zai", name: "ZAI", hue: 280 },
] as const;