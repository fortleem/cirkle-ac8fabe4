export type Presence = "online" | "away" | "offline" | "typing";

export interface Conversation {
  id: string;
  name: string;
  arabic?: string;
  avatar: string; // initials or emoji
  hue: number; // for avatar gradient
  preview: string;
  time: string;
  unread?: number;
  presence: Presence;
  pinned?: boolean;
  kind: "dm" | "circle" | "ai";
  members?: number;
}

export interface Reaction { emoji: string; count: number; mine?: boolean }

export interface Message {
  id: string;
  author: "me" | string;
  text?: string;
  time: string;
  reactions?: Reaction[];
  kind?: "text" | "voice" | "image" | "attachment" | "system";
  voice?: { duration: string; waveform: number[] };
  image?: { src: string; w: number; h: number; alt: string };
  attachment?: { name: string; size: string; ext: string };
  replyTo?: { author: string; text: string };
}

export const conversations: Conversation[] = [
  { id: "ai", name: "Wasl AI", arabic: "وصل", avatar: "✦", hue: 184, preview: "Drafted 3 replies for you ↗", time: "now", presence: "online", pinned: true, kind: "ai" },
  { id: "noor", name: "Noor Al-Hashemi", arabic: "نور", avatar: "N", hue: 268, preview: "Typing…", time: "2m", unread: 2, presence: "typing", pinned: true, kind: "dm" },
  { id: "circle-design", name: "Dawayer Design", arabic: "دواير", avatar: "◐", hue: 200, preview: "Yusuf: shipped the orb motion ✨", time: "12m", unread: 7, presence: "online", kind: "circle", members: 24 },
  { id: "layla", name: "Layla Mansour", arabic: "ليلى", avatar: "L", hue: 320, preview: "voice message · 0:42", time: "1h", presence: "away", kind: "dm" },
  { id: "omar", name: "Omar Khaled", arabic: "عمر", avatar: "O", hue: 160, preview: "Sent the contract draft.pdf", time: "3h", presence: "offline", kind: "dm" },
  { id: "founders", name: "Founders Circle", arabic: "المؤسسون", avatar: "◉", hue: 28, preview: "Rania: dinner Thursday?", time: "5h", unread: 1, presence: "online", kind: "circle", members: 8 },
  { id: "sara", name: "Sara Adel", arabic: "سارة", avatar: "S", hue: 240, preview: "haha okay see you tomorrow", time: "Yd", presence: "offline", kind: "dm" },
  { id: "calligraphy", name: "Calligraphy Lab", arabic: "الخط", avatar: "✺", hue: 60, preview: "New piece dropped — قلب", time: "Mon", presence: "online", kind: "circle", members: 142 },
];

export const messagesFor: Record<string, Message[]> = {
  noor: [
    { id: "m1", author: "noor", text: "habibi did you see the new Circle build?", time: "10:42", kind: "text" },
    { id: "m2", author: "noor", text: "the orb motion is unreal 🌀", time: "10:42", kind: "text", reactions: [{ emoji: "🔥", count: 3, mine: true }] },
    { id: "m3", author: "me", text: "shipping the Wasl module now. wait till you see the bubbles.", time: "10:44", kind: "text" },
    { id: "m4", author: "noor", time: "10:45", kind: "voice", voice: { duration: "0:14", waveform: [.2,.5,.7,.4,.8,.6,.3,.9,.5,.7,.4,.6,.8,.5,.3,.6,.7,.4,.5,.3,.8,.6,.4,.7,.5,.3,.6,.4,.5,.7] } },
    { id: "m5", author: "me", text: "اللي شفته أحلى بكتير 😎", time: "10:46", kind: "text", reactions: [{ emoji: "💎", count: 1 }, { emoji: "✨", count: 2, mine: true }] },
    { id: "m6", author: "noor", text: "send a preview when ready", time: "10:47", kind: "text", replyTo: { author: "me", text: "shipping the Wasl module now." } },
  ],
};

export const aiSuggestions = [
  "Send a quick preview link",
  "Reply: \"on it — give me 5 mins\"",
  "Summarize last 20 messages",
  "Translate to Arabic",
];