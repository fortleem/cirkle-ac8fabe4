import { useMemo, useState } from "react";
import { BackgroundFX } from "@/components/wasl/BackgroundFX";
import { Header } from "@/components/wasl/Header";
import { ConversationList } from "@/components/wasl/ConversationList";
import { ChatView } from "@/components/wasl/ChatView";
import { AISuggestions } from "@/components/wasl/AISuggestions";
import { conversations } from "@/components/wasl/data";
import { WaslProvider, useWasl } from "@/components/wasl/state";
import { AuthGate } from "@/components/wasl/AuthGate";
import { PrivacyPanel } from "@/components/wasl/PrivacyPanel";

function WaslApp() {
  const [activeId, setActiveId] = useState("noor");
  const { auth, search } = useWasl();
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) => c.name.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q) || (c.arabic ?? "").includes(q),
    );
  }, [search]);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <BackgroundFX />
      <Header />
      <main className="relative z-10 flex flex-1 overflow-hidden">
        <ConversationList items={filtered} activeId={activeId} onSelect={setActiveId} />
        <ChatView conversationId={activeId} />
        <AISuggestions />
      </main>
      <PrivacyPanel />
      {!auth && <AuthGate />}
    </div>
  );
}

const Index = () => (
  <WaslProvider>
    <WaslApp />
  </WaslProvider>
);

export default Index;
