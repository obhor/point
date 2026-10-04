"use client";

import { Copy, Check, X, Sparkles } from "lucide-react";
import { useState } from "react";
import type { CanvasObject } from "@/lib/types";
import { generateAiContext } from "@/lib/aiContext";

interface AiContextPanelProps {
  objects: CanvasObject[];
  onClose: () => void;
  onCopyText: (text: string) => void;
}

export default function AiContextPanel({ objects, onClose, onCopyText }: AiContextPanelProps) {
  const [copied, setCopied] = useState(false);
  const text = generateAiContext(objects);

  const copy = async () => {
    await onCopyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="absolute inset-y-0 right-0 z-20 flex w-80 flex-col border-l border-border bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="size-4 text-primary" />
          AI Context
        </div>
        <button
          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
      </div>

      <pre className="flex-1 overflow-y-auto whitespace-pre-wrap break-words px-3 py-3 font-sans text-[13px] leading-relaxed text-foreground/90">
        {text}
      </pre>

      <div className="border-t border-border p-2">
        <button
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          onClick={copy}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy context"}
        </button>
      </div>
    </div>
  );
}
