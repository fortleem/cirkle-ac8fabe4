import { cn } from "@/lib/utils";
import { Check, CheckCheck, Play, Reply } from "lucide-react";
import type { Message } from "./data";

interface Props { msg: Message; mine: boolean; }

export function MessageBubble({ msg, mine }: Props) {
  return (
    <div className={cn("group flex w-full animate-message-in", mine ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[78%] flex-col gap-1", mine ? "items-end" : "items-start")}>
        {msg.replyTo && (
          <div className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-1.5 text-[11px] border border-white/5 bg-white/[0.03]",
            mine ? "rounded-br-sm" : "rounded-bl-sm",
          )}>
            <Reply className="h-3 w-3 text-neon" />
            <span className="text-muted-foreground">replying to</span>
            <span className="text-foreground/80 truncate max-w-[200px]">{msg.replyTo.text}</span>
          </div>
        )}

        <div className={cn(
          "relative px-4 py-2.5 text-[14px] leading-relaxed shadow-sm",
          mine
            ? "text-background rounded-3xl rounded-br-md"
            : "bg-bubble-them text-foreground rounded-3xl rounded-bl-md border border-white/5",
        )}
          style={mine ? {
            background: "var(--gradient-bubble-me)",
            boxShadow: "0 8px 30px hsl(var(--neon) / 0.25)",
          } : undefined}
        >
          {msg.kind === "voice" && msg.voice && <VoiceNote duration={msg.voice.duration} waveform={msg.voice.waveform} mine={mine} />}
          {msg.text && <span>{msg.text}</span>}

          <span className={cn(
            "ml-2 inline-flex items-center gap-1 text-[10px] align-middle",
            mine ? "text-background/70" : "text-muted-foreground",
          )}>
            {msg.time}
            {mine && <CheckCheck className="h-3 w-3" />}
          </span>
        </div>

        {msg.reactions && msg.reactions.length > 0 && (
          <div className={cn("flex gap-1 -mt-1.5", mine ? "mr-2" : "ml-2")}>
            {msg.reactions.map((r, i) => (
              <span key={i} className={cn(
                "px-2 py-0.5 rounded-full text-[11px] glass border",
                r.mine ? "border-neon/40 text-neon" : "border-white/10 text-foreground/80",
              )}>
                {r.emoji} {r.count}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VoiceNote({ duration, waveform, mine }: { duration: string; waveform: number[]; mine: boolean }) {
  return (
    <div className="flex items-center gap-3 min-w-[220px] py-1">
      <button className={cn(
        "grid h-9 w-9 place-items-center rounded-full",
        mine ? "bg-background/20" : "bg-neon/15 text-neon",
      )}>
        <Play className="h-4 w-4" fill="currentColor" />
      </button>
      <div className="flex flex-1 items-center gap-[2px] h-8">
        {waveform.map((v, i) => (
          <span
            key={i}
            className={cn("w-[3px] rounded-full", mine ? "bg-background/70" : "bg-neon/70")}
            style={{
              height: `${Math.max(10, v * 100)}%`,
              animation: `voice-wave 1s ease-in-out ${i * 0.04}s infinite`,
            }}
          />
        ))}
      </div>
      <span className={cn("text-[11px] tabular-nums", mine ? "text-background/80" : "text-muted-foreground")}>{duration}</span>
    </div>
  );
}