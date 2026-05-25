import { useState } from "react";
import { BackgroundFX } from "@/components/wasl/BackgroundFX";
import { Header } from "@/components/wasl/Header";
import { ConversationList } from "@/components/wasl/ConversationList";
import { ChatView } from "@/components/wasl/ChatView";
import { AISuggestions } from "@/components/wasl/AISuggestions";
import { conversations } from "@/components/wasl/data";

const Index = () => {
  const [activeId, setActiveId] = useState("noor");
  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <BackgroundFX />
      <Header />
      <main className="relative z-10 flex flex-1 overflow-hidden">
        <ConversationList items={conversations} activeId={activeId} onSelect={setActiveId} />
        <ChatView conversationId={activeId} />
        <AISuggestions />
      </main>
    </div>
  );
};

export default Index;
