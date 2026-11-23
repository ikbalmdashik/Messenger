"use client";

import React, { useMemo, useState } from "react";

import { Plus } from "lucide-react";

/**
 * Small built-in emoji set for custom reactions.
 * Anything else can be typed or pasted below it.
 */
const CATEGORIES: { id: string; label: string; icon: string; emojis: string[] }[] = [
  {
    id: "smileys",
    label: "Smileys",
    icon: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃",
      "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😋",
      "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐",
      "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "😌", "😔",
      "😪", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🥵", "🥶", "🥴",
      "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐", "😕", "😟", "🙁",
      "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥",
      "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱",
      "😤", "😡", "😠", "🤬", "😈", "💀", "💩", "🤡", "👻", "👽",
    ],
  },
  {
    id: "gestures",
    label: "People",
    icon: "👍",
    emojis: [
      "👍", "👎", "👌", "🤌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈",
      "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "👏",
      "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💪", "🦾", "🫶", "🫡",
      "👀", "🧠", "🫀", "👶", "🧑", "👩", "👨", "🧓", "🙋", "🤷",
      "🤦", "🙇", "💃", "🕺", "🏃", "🧘",
    ],
  },
  {
    id: "hearts",
    label: "Symbols",
    icon: "❤️",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💯", "💢",
      "💥", "💫", "💦", "💨", "🔥", "✨", "⭐", "🌟", "⚡", "✅",
      "❌", "❓", "❗", "‼️", "⚠️", "🚫", "💤", "🎵", "➕", "🆗",
    ],
  },
  {
    id: "nature",
    label: "Nature & food",
    icon: "🌸",
    emojis: [
      "🐶", "🐱", "🐭", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁",
      "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🦄", "🐝", "🦋",
      "🌸", "🌹", "🌻", "🌈", "☀️", "🌙", "☁️", "❄️", "🌊", "🍀",
      "🍎", "🍕", "🍔", "🍟", "🌮", "🍣", "🍩", "🍪", "🎂", "🍫",
      "🍿", "☕", "🍵", "🍺", "🥂", "🍷",
    ],
  },
  {
    id: "activities",
    label: "Activities & objects",
    icon: "🎉",
    emojis: [
      "🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "⚽", "🏀", "🏏", "🎮",
      "🎯", "🎲", "🎸", "🎧", "🎬", "📸", "💡", "📌", "📎", "✏️",
      "📚", "💻", "📱", "⏰", "💰", "🚀", "✈️", "🚗", "🏠", "🗿",
    ],
  },
];

/**
 * True for one emoji (incl. flags, keycaps, skin
 * tones and ZWJ sequences), false for text. Matches
 * the server's check.
 */
export const isSingleEmoji = (value: string) => {
  const text = value.trim();

  if (!text || text.length > 16) {
    return false;
  }

  const onlyEmoji =
    /^(?:[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Component}‍️⃣])+$/u.test(
      text,
    ) &&
    /[\p{Extended_Pictographic}\p{Regional_Indicator}⃣]/u.test(text);

  if (!onlyEmoji) {
    return false;
  }

  // One grapheme where the browser can tell.
  try {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });

    return [...segmenter.segment(text)].length === 1;
  } catch {
    return true;
  }
};

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onPick }) => {
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [custom, setCustom] = useState("");

  const category = useMemo(
    () => CATEGORIES.find((item) => item.id === categoryId) ?? CATEGORIES[0],
    [categoryId],
  );

  const customValid = isSingleEmoji(custom);

  const submitCustom = () => {
    if (customValid) {
      onPick(custom.trim());
      setCustom("");
    }
  };

  return (
    <div
      className="w-72 max-w-[80vw]"
      onClick={(event) => event.stopPropagation()}
    >
      {/* CATEGORY TABS */}

      <div className="flex gap-0.5 border-b border-[var(--gray-a4)] pb-1">
        {CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.label}
            aria-label={item.label}
            aria-pressed={item.id === categoryId}
            onClick={() => setCategoryId(item.id)}
            className={`flex-1 cursor-pointer rounded-md py-1 text-base leading-none transition-colors ${
              item.id === categoryId
                ? "bg-[var(--accent-a4)]"
                : "hover:bg-[var(--gray-a3)]"
            }`}
          >
            {item.icon}
          </button>
        ))}
      </div>

      {/* GRID */}

      <div className="mt-1 text-[11px] font-medium text-[var(--gray-a11)]">
        {category.label}
      </div>

      <div className="grid max-h-44 grid-cols-8 gap-0.5 overflow-y-auto py-1">
        {category.emojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            type="button"
            aria-label={`React ${emoji}`}
            onClick={() => onPick(emoji)}
            className="flex h-8 cursor-pointer items-center justify-center rounded-md text-xl leading-none transition-transform hover:scale-110 hover:bg-[var(--gray-a3)]"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* CUSTOM */}

      <form
        className="mt-1 flex items-center gap-1 border-t border-[var(--gray-a4)] pt-2"
        onSubmit={(event) => {
          event.preventDefault();
          submitCustom();
        }}
      >
        <input
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          placeholder="Type or paste any emoji"
          aria-label="Custom emoji"
          className="h-8 min-w-0 flex-1 rounded-md border border-[var(--gray-a6)] bg-transparent px-2 text-sm outline-none focus:border-[var(--accent-8)]"
        />

        <button
          type="submit"
          disabled={!customValid}
          aria-label="React with custom emoji"
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md bg-[var(--accent-9)] text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {customValid ? (
            <span className="text-base leading-none">{custom.trim()}</span>
          ) : (
            <Plus size={16} />
          )}
        </button>
      </form>

      {custom.trim() !== "" && !customValid && (
        <div className="mt-1 text-[11px] text-[var(--red-11)]">
          Enter a single emoji.
        </div>
      )}
    </div>
  );
};

export default EmojiPicker;
