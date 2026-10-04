"use client";

import { useState } from "react";
import {
  Undo2,
  Redo2,
  Minus,
  Plus,
  Maximize,
  Download,
  Sparkles,
  ChevronDown,
  Home,
  FilePlus2,
  CopyPlus,
  Trash2,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

export type Mode = "canvas" | "ai";

interface TopBarProps {
  name: string;
  onRename: (name: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  onExportPng: () => void;
  onExportJpg: () => void;
  onExportJson: () => void;
  onCopyForAI: () => void;
  onCopyContext: () => void;
  onHome: () => void;
  onNew: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export default function TopBar(p: TopBarProps) {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(p.name);

  const commitName = () => {
    setEditingName(false);
    if (draftName.trim()) p.onRename(draftName.trim());
  };

  const iconBtn =
    "grid size-8 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground disabled:opacity-35 disabled:pointer-events-none";

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-border bg-background/90 px-2 backdrop-blur">
      {/* left */}
      <button className={iconBtn} onClick={p.onHome} title="Home">
        <Home className="size-4" />
      </button>
      <div className="flex items-baseline gap-1.5">
        <span className="ml-1 text-sm font-semibold tracking-tight">Point</span>
        <span className="text-muted-foreground">/</span>
        {editingName ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") setEditingName(false);
            }}
            className="w-40 rounded border border-border bg-transparent px-1 text-sm outline-none"
          />
        ) : (
          <button
            className="max-w-48 truncate text-sm text-muted-foreground hover:text-foreground"
            onClick={() => {
              setDraftName(p.name);
              setEditingName(true);
            }}
            title="Rename"
          >
            {p.name}
          </button>
        )}
      </div>

      {/* center mode toggle */}
      <div className="mx-auto flex items-center rounded-lg border border-border p-0.5">
        {(["canvas", "ai"] as Mode[]).map((m) => (
          <button
            key={m}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              p.mode === m
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => p.onModeChange(m)}
          >
            {m === "canvas" ? "Canvas" : "AI Context"}
          </button>
        ))}
      </div>

      {/* right */}
      <div className="ml-auto flex items-center gap-0.5">
        <button className={iconBtn} onClick={p.onUndo} disabled={!p.canUndo} title="Undo (⌘Z)">
          <Undo2 className="size-4" />
        </button>
        <button className={iconBtn} onClick={p.onRedo} disabled={!p.canRedo} title="Redo (⌘⇧Z)">
          <Redo2 className="size-4" />
        </button>

        <div className="mx-1 h-5 w-px bg-border" />

        <button className={iconBtn} onClick={p.onZoomOut} title="Zoom out">
          <Minus className="size-4" />
        </button>
        <span className="w-11 text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(p.zoom * 100)}%
        </span>
        <button className={iconBtn} onClick={p.onZoomIn} title="Zoom in">
          <Plus className="size-4" />
        </button>
        <button className={iconBtn} onClick={p.onZoomFit} title="Fit to screen">
          <Maximize className="size-4" />
        </button>

        <div className="mx-1 h-5 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-8 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground">
            <Download className="size-4" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Export</DropdownMenuLabel>
              <DropdownMenuItem onClick={p.onExportPng}>PNG image</DropdownMenuItem>
              <DropdownMenuItem onClick={p.onExportJpg}>JPG image</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={p.onExportJson}>Project file (.json)</DropdownMenuItem>
              <DropdownMenuItem onClick={p.onCopyContext}>Copy context (text)</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          className="ml-1 flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          onClick={p.onCopyForAI}
        >
          <Sparkles className="size-4" />
          <span className="hidden sm:inline">Copy for AI</span>
          <span className="sm:hidden">Copy</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="grid size-8 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground">
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={p.onNew}>
              <FilePlus2 className="size-4" /> New canvas
            </DropdownMenuItem>
            <DropdownMenuItem onClick={p.onDuplicate}>
              <CopyPlus className="size-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={p.onDelete}>
              <Trash2 className="size-4" /> Delete project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
