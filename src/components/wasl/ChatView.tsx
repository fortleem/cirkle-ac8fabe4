import { useEffect, useMemo, useRef, useState } from "react";
import { Phone, Video, Search, MoreHorizontal, Pin, Sparkles } from "lucide-react";
import { Avatar } from "./Avatar";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";
import { conversations, messagesFor, type Message } from "./data";

interface Props { conversationId: string; }

export function ChatView({ conversationId }: Props) {
  const convo = useMemo(() => conversations.find(c => c.id === conversationId)!, [conversationId]);
  const initial = messagesFor[conversationId] ?? messagesFor.noor;
  const [messages, setMessages] = useState<Message[]>(initial);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(messagesFor[conversationId] ?? messagesFor.noor);
  }, [conversationId]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = (text: string) => {
    setMessages(prev => [...prev, { id: String(Date.now()), author: "me", text, time: "now", kind: "text" }]);
  };

  return (
    <section className="relative flex h-full flex-1 flex-col">
      {/* chat header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 glass">
        <Avatar label={convo.avatar} hue={convo.hue} presence={convo.presence} ring={convo.kind === "ai"} size={44} />
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold">{convo.name}</span>
            {convo.arabic && <span className="font-arabic text-sm text-muted-foreground">{convo.arabic}</span>}
            <Pin className="h-3 w-3 text-neon" />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {convo.presence === "typing" ? (
              <span className="text-neon flex items-center gap-1.5">
                <TypingDots /> typing…
              </span>
            ) : convo.presence === "online" ? (
              <span className="text-online">online · last active just now</span>
            ) : (
              <span>last seen recently</span>
            )}
            {convo.kind === "circle" && convo.members && <span>· {convo.members} members</span>}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <HeaderBtn><Sparkles className="h-4 w-4 text-neon" /></HeaderBtn>
          <HeaderBtn><Search className="h-4 w-4" /></HeaderBtn>
          <HeaderBtn><Phone className="h-4 w-4" /></HeaderBtn>
          <HeaderBtn><Video className="h-4 w-4" /></HeaderBtn>
          <HeaderBtn><MoreHorizontal className="h-4 w-4" /></HeaderBtn>
        </div>
      </div>

      {/* messages */}
      <div ref={scrollerRef} className="relative flex-1 overflow-y-auto scrollbar-none px-6 py-6 space-y-4">
        <DayDivider label="Today" />
        {messages.map(m => (
          <MessageBubble key={m.id} msg={m} mine={m.author === "me"} />
        ))}
        {convo.presence === "typing" && (
          <div className="flex items-center gap-2 animate-fade-in">
            <Avatar label={convo.avatar} hue={convo.hue} size={28} />
            <div className="glass rounded-2xl rounded-bl-md px-3 py-2.5">
              <TypingDots />
            </div>
          </div>
        )}
      </div>

      <Composer onSend={handleSend} />
    </section>
  );
}

function HeaderBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5 transition">
      {children}
    </button>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="relative flex items-center justify-center py-2">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <span className="mx-3 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{label}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-neon animate-typing-bounce" />
      <span className="h-1.5 w-1.5 rounded-full bg-neon animate-typing-bounce [animation-delay:.15s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-neon animate-typing-bounce [animation-delay:.3s]" />
    </span>
  );
}