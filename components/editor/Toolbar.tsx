"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  MousePointer2,
  MapPin,
  Hash,
  Square,
  Circle,
  MoveUpRight,
  Slash,
  Pencil,
  Type,
  Highlighter,
  Droplets,
  StickyNote,
  Eraser,
  Palette,
  Box,
} from "lucide-react";
import type { Tool } from "@/lib/types";
import { TOOLS } from "@/lib/types";
import { PALETTE } from "@/lib/palette";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const ICONS: Record<Tool, LucideIcon> = {
  select: MousePointer2,
  point: MapPin,
  number: Hash,
  rect: Square,
  ellipse: Circle,
  arrow: MoveUpRight,
  line: Slash,
  freehand: Pencil,
  text: Type,
  highlight: Highlighter,
  blur: Droplets,
  comment: StickyNote,
  eraser: Eraser,
};

interface ToolbarProps {
  tool: Tool;
  onToolChange: (t: Tool) => void;
  color: string;
  onColorChange: (c: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (w: number) => void;
  wireframe: boolean;
  onWireframeChange: (v: boolean) => void;
}

export default function Toolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  wireframe,
  onWireframeChange,
}: ToolbarProps) {
  const [colorOpen, setColorOpen] = useState(false);

  return (
    <div className="relative z-20 flex flex-col items-center gap-1 border-r border-border bg-background/80 px-1.5 py-2 backdrop-blur">
      {TOOLS.map((t) => {
        const Icon = ICONS[t.id];
        const active = tool === t.id;
        return (
          <Tooltip key={t.id}>
            <TooltipTrigger
              className={`grid size-9 place-items-center rounded-lg outline-none transition-colors ${
                active
                  ? "bg-accent text-accent-foreground ring-1 ring-ring/40"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              onClick={() => onToolChange(t.id)}
            >
              <Icon className="size-4.5" />
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <span className="font-medium">{t.label}</span>
              <span className="ml-1 text-muted-foreground">— {t.shortcut}</span>
            </TooltipContent>
          </Tooltip>
        );
      })}

      <div className="my-1 h-px w-6 bg-border" />

      {/* color */}
      <div className="relative">
        <Tooltip>
          <TooltipTrigger
            className="grid size-9 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground"
            onClick={() => setColorOpen((v) => !v)}
          >
            <Palette className="size-4.5" />
            <span
              className="absolute bottom-1 right-1 size-2.5 rounded-full ring-1 ring-background"
              style={{ backgroundColor: color }}
            />
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            Color
          </TooltipContent>
        </Tooltip>

        {colorOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setColorOpen(false)} />
            <div className="absolute left-full top-0 z-40 ml-2 w-44 rounded-lg border border-border bg-popover p-2 shadow-lg">
              <div className="grid grid-cols-4 gap-1.5">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    className="size-7 rounded-md ring-1 ring-inset ring-foreground/15"
                    style={{ backgroundColor: c }}
                    onClick={() => {
                      onColorChange(c);
                      setColorOpen(false);
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
                <label className="text-[11px] text-muted-foreground">Width</label>
                <input
                  type="range"
                  min={1}
                  max={16}
                  value={strokeWidth}
                  onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
                  className="w-full accent-foreground"
                />
                <span className="w-5 text-right text-[11px] text-muted-foreground">
                  {strokeWidth}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* wireframe toggle */}
      <Tooltip>
        <TooltipTrigger
          className={`grid size-9 place-items-center rounded-lg outline-none transition-colors ${
            wireframe
              ? "bg-accent text-accent-foreground ring-1 ring-ring/40"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          onClick={() => onWireframeChange(!wireframe)}
        >
          <Box className="size-4.5" />
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          Wireframe mode
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
