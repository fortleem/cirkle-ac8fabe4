import { useState } from "react";
import { Mic, Paperclip, Smile, Send, Image as ImageIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props { onSend: (text: string) => void; }

export function Composer({ onSend }: Props) {
  const [value, setValue] = useState("");
  const [recording, setRecording] = useState(false);

  const submit = () => {
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <div className="relative px-6 pb-6 pt-3">
      <div className="glass-strong rounded-[28px] p-2 pl-3 flex items-end gap-2 border border-white/8 focus-within:border-neon/40 focus-within:shadow-[0_0_30px_hsl(var(--neon)/0.2)] transition">
        <div className="flex items-center gap-1">
          <IconBtn><Paperclip className="h-4 w-4" /></IconBtn>
          <IconBtn><ImageIcon className="h-4 w-4" /></IconBtn>
          <IconBtn><Smile className="h-4 w-4" /></IconBtn>
        </div>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
          }}
          rows={1}
          placeholder="Write to Noor…   ·   shift+enter for new line"
          className="flex-1 max-h-40 resize-none bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          className="grid h-9 w-9 place-items-center rounded-full text-violet hover:bg-violet/10 transition"
          aria-label="AI compose"
        >
          <Sparkles className="h-4 w-4" />
        </button>
        {value.trim() ? (
          <button
            onClick={submit}
            className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-neon to-violet text-background shadow-[0_0_30px_hsl(var(--neon)/0.45)] hover:scale-105 transition"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        ) : (
          <button
            onMouseDown={() => setRecording(true)}
            onMouseUp={() => setRecording(false)}
            onMouseLeave={() => setRecording(false)}
            className={cn(
              "relative grid h-10 w-10 place-items-center rounded-full transition",
              recording ? "bg-magenta text-background scale-110" : "bg-white/5 text-foreground hover:bg-white/10",
            )}
            aria-label="Hold to record"
          >
            {recording && <span className="absolute inset-0 rounded-full border border-magenta animate-pulse-ring" />}
            <Mic className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-2 text-center text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        end-to-end · synced across your circles
      </div>
    </div>
  );
}

function IconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition">
      {children}
    </button>
  );
}