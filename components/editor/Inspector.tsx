"use client";

import { Bold, Trash2 } from "lucide-react";
import type { CanvasObject } from "@/lib/types";
import { PALETTE } from "@/lib/palette";

interface InspectorProps {
  selected: CanvasObject[];
  onPatch: (id: string, patch: Partial<CanvasObject>) => void;
  onCommit: () => void;
  onDelete: (ids: string[]) => void;
}

export default function Inspector({
  selected,
  onPatch,
  onCommit,
  onDelete,
}: InspectorProps) {
  if (selected.length === 0) return null;
  const obj = selected[0];
  const isText = obj.type === "text";
  const isShape = ["rect", "ellipse", "arrow", "line", "freehand"].includes(obj.type);
  const hasWidth = isShape;
  const isHighlight = obj.type === "highlight";
  const isBlur = obj.type === "blur";

  const patch = (patch: Partial<CanvasObject>) => {
    selected.forEach((o) => onPatch(o.id, patch));
  };

  const colorTarget = isText || obj.type === "point" || isHighlight ? "fill" : "stroke";

  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-popover/95 px-3 py-2 shadow-lg backdrop-blur">
      {/* color swatches */}
      <div className="flex items-center gap-1">
        {PALETTE.map((c) => (
          <button
            key={c}
            className="size-5 rounded-full ring-1 ring-inset ring-foreground/15 transition-transform hover:scale-110"
            style={{ backgroundColor: c }}
            onClick={() => {
              patch({ [colorTarget]: c } as Partial<CanvasObject>);
              onCommit();
            }}
          />
        ))}
      </div>

      {(hasWidth || isText) && <div className="h-5 w-px bg-border" />}

      {hasWidth && (
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
          Width
          <input
            type="range"
            min={1}
            max={16}
            value={obj.strokeWidth ?? 2}
            onChange={(e) => patch({ strokeWidth: Number(e.target.value) })}
            onPointerUp={onCommit}
            className="w-20 accent-foreground"
          />
        </label>
      )}

      {isText && (
        <>
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            Size
            <input
              type="range"
              min={10}
              max={72}
              value={obj.fontSize ?? 16}
              onChange={(e) => patch({ fontSize: Number(e.target.value) })}
              onPointerUp={onCommit}
              className="w-20 accent-foreground"
            />
          </label>
          <button
            className={`grid size-7 place-items-center rounded-md outline-none ${
              obj.fontStyle === "bold"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => {
              patch({ fontStyle: obj.fontStyle === "bold" ? "normal" : "bold" });
              onCommit();
            }}
          >
            <Bold className="size-4" />
          </button>
        </>
      )}

      {isHighlight && (
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
          Opacity
          <input
            type="range"
            min={5}
            max={70}
            value={Math.round((obj.opacity ?? 0.35) * 100)}
            onChange={(e) => patch({ opacity: Number(e.target.value) / 100 })}
            onPointerUp={onCommit}
            className="w-20 accent-foreground"
          />
        </label>
      )}

      {isBlur && (
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
          Blur
          <input
            type="range"
            min={4}
            max={40}
            value={obj.blurRadius ?? 12}
            onChange={(e) => patch({ blurRadius: Number(e.target.value) })}
            onPointerUp={onCommit}
            className="w-20 accent-foreground"
          />
        </label>
      )}

      <div className="h-5 w-px bg-border" />

      <button
        className="grid size-7 place-items-center rounded-md text-muted-foreground outline-none hover:bg-destructive/15 hover:text-destructive"
        onClick={() => onDelete(selected.map((o) => o.id))}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
