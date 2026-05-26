export const emojiIcons = {
  app: "🧾",
  project: "✨",
  archive: "🗂️",
  budget: "💎",
  image: "🖼️",
  text: "✍️",
  table: "📊",
  status: "🌱",
  deploy: "🚀",
} as const;

export type EmojiIconName = keyof typeof emojiIcons;

export function EmojiIcon({ name, label }: { name: EmojiIconName; label?: string }) {
  return (
    <span aria-label={label} role={label ? "img" : undefined} className="emoji-icon">
      {emojiIcons[name]}
    </span>
  );
}
