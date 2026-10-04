export type Tool =
  | "select"
  | "point"
  | "number"
  | "rect"
  | "ellipse"
  | "arrow"
  | "line"
  | "freehand"
  | "text"
  | "highlight"
  | "blur"
  | "comment"
  | "eraser";

export type ObjectType =
  | "image"
  | "point"
  | "rect"
  | "ellipse"
  | "arrow"
  | "line"
  | "freehand"
  | "text"
  | "highlight"
  | "blur";

export type Align = "left" | "center" | "right";

export interface CanvasObject {
  id: string;
  type: ObjectType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  dash?: number[];
  // image
  src?: string;
  name?: string;
  // text
  text?: string;
  fontSize?: number;
  fontStyle?: string;
  align?: Align;
  background?: string;
  // text / point linkage
  attachedTo?: string;
  // point marker
  number?: number;
  lineCap?: string;
  // arrow / line / freehand
  points?: number[];
  pointerLength?: number;
  pointerWidth?: number;
  tension?: number;
  // freehand smoothing hint
  closed?: boolean;
  // highlight
  highlightOpacity?: number;
  // blur
  blurRadius?: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  objects: CanvasObject[];
}

export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  objectCount: number;
  thumbnail?: string;
}

export interface ToolDef {
  id: Tool;
  label: string;
  shortcut: string;
  icon: string; // lucide icon name, resolved in Toolbar
}

export const TOOLS: ToolDef[] = [
  { id: "select", label: "Select", shortcut: "V", icon: "mouse-pointer-2" },
  { id: "point", label: "Point", shortcut: "P", icon: "map-pin" },
  { id: "number", label: "Number", shortcut: "N", icon: "hash" },
  { id: "rect", label: "Rectangle", shortcut: "R", icon: "square" },
  { id: "ellipse", label: "Ellipse", shortcut: "O", icon: "circle" },
  { id: "arrow", label: "Arrow", shortcut: "A", icon: "move-up-right" },
  { id: "line", label: "Line", shortcut: "L", icon: "slash" },
  { id: "freehand", label: "Draw", shortcut: "D", icon: "pencil" },
  { id: "text", label: "Text", shortcut: "T", icon: "type" },
  { id: "highlight", label: "Highlight", shortcut: "H", icon: "highlighter" },
  { id: "blur", label: "Blur", shortcut: "B", icon: "blur" },
  { id: "comment", label: "Comment", shortcut: "C", icon: "sticky-note" },
  { id: "eraser", label: "Erase", shortcut: "E", icon: "eraser" },
];

export function isShapeTool(tool: Tool): boolean {
  return ["rect", "ellipse", "arrow", "line", "freehand", "highlight", "blur"].includes(tool);
}

export function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}
