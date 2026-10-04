"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Konva from "konva";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CanvasObject, Project, Tool } from "@/lib/types";
import { uid } from "@/lib/types";
import { DEFAULT_COLOR } from "@/lib/palette";
import {
  saveProject,
  getProject,
  deleteProject,
} from "@/lib/storage";
import { generateAiContext } from "@/lib/aiContext";
import {
  getObjectsBBox,
  downloadDataURL,
  dataURLtoBlob,
  applyBlurRegions,
  EXPORT_BG,
} from "@/lib/export";
import { downscaleImage, loadImage } from "@/lib/image";
import CanvasStage from "./CanvasStage";
import Toolbar from "./Toolbar";
import TopBar, { type Mode } from "./TopBar";
import Inspector from "./Inspector";
import AiContextPanel from "./AiContextPanel";
import TextEditor from "./TextEditor";
import { ImagePlus } from "lucide-react";

const TOOL_KEYS: Record<string, Tool> = {
  v: "select",
  p: "point",
  n: "number",
  r: "rect",
  o: "ellipse",
  a: "arrow",
  l: "line",
  d: "freehand",
  t: "text",
  h: "highlight",
  b: "blur",
  c: "comment",
  e: "eraser",
};

export default function Editor({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const stageRef = useRef<Konva.Stage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loaded, setLoaded] = useState(false);
  const [projectIdState, setProjectIdState] = useState(projectId ?? "");
  const [name, setName] = useState("Untitled");
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [wireframe, setWireframe] = useState(false);
  const [mode, setMode] = useState<Mode>("canvas");
  const [zoom, setZoom] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [history, setHistory] = useState<CanvasObject[][]>([]);
  const [future, setFuture] = useState<CanvasObject[][]>([]);
  const pendingSnap = useRef<CanvasObject[] | null>(null);
  const objectsRef = useRef<CanvasObject[]>(objects);

  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);

  // ----- load -----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (projectId) {
        const p = await getProject(projectId);
        if (!cancelled) {
          if (p) {
            setProjectIdState(p.id);
            setName(p.name);
            setObjects(p.objects);
          }
          setLoaded(true);
        }
      } else {
        const id = uid();
        const now = Date.now();
        const p: Project = { id, name: "Untitled", createdAt: now, updatedAt: now, objects: [] };
        await saveProject(p);
        if (!cancelled) {
          setProjectIdState(id);
          setLoaded(true);
          router.replace(`/editor/${id}`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // ----- autosave -----
  useEffect(() => {
    if (!loaded || !projectIdState) return;
    const t = setTimeout(() => {
      saveProject({
        id: projectIdState,
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        objects,
      });
    }, 700);
    return () => clearTimeout(t);
  }, [objects, name, loaded, projectIdState]);

  // ----- history -----
  const commitObjects = useCallback(
    (next: CanvasObject[]) => {
      setHistory((h) => [...h, objects]);
      setFuture([]);
      setObjects(next);
      pendingSnap.current = null;
    },
    [objects],
  );

  const commitPatch = useCallback(
    (id: string, patch: Partial<CanvasObject>) => {
      commitObjects(objects.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    },
    [objects, commitObjects],
  );

  const livePatch = useCallback((id: string, patch: Partial<CanvasObject>) => {
    if (pendingSnap.current === null) pendingSnap.current = objectsRef.current;
    setObjects((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }, []);

  const liveCommit = useCallback(() => {
    if (pendingSnap.current !== null) {
      setHistory((h) => [...h, pendingSnap.current!]);
      setFuture([]);
      pendingSnap.current = null;
    }
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [objects, ...f]);
      setObjects(prev);
      setSelectedIds([]);
      return h.slice(0, -1);
    });
  }, [objects]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setHistory((h) => [...h, objects]);
      setObjects(next);
      setSelectedIds([]);
      return f.slice(1);
    });
  }, [objects]);

  // ----- object ops -----
  const onCreate = useCallback(
    (newObjs: CanvasObject[]) => {
      commitObjects([...objects, ...newObjs]);
    },
    [objects, commitObjects],
  );

  const onDelete = useCallback(
    (ids: string[]) => {
      const toDelete = new Set(ids);
      objects.forEach((o) => {
        if (o.attachedTo && toDelete.has(o.attachedTo)) toDelete.add(o.id);
      });
      commitObjects(objects.filter((o) => !toDelete.has(o.id)));
    },
    [objects, commitObjects],
  );

  const commitText = useCallback(
    (id: string, text: string) => {
      setEditingId(null);
      const obj = objects.find((o) => o.id === id);
      if (!obj) return;
      if (text.trim() === "" && obj.type === "text" && !obj.attachedTo) {
        commitObjects(objects.filter((o) => o.id !== id));
        return;
      }
      commitPatch(id, { text });
    },
    [objects, commitObjects, commitPatch],
  );

  const cancelEdit = useCallback(
    (id: string) => {
      setEditingId(null);
      const obj = objects.find((o) => o.id === id);
      if (obj && !obj.text && obj.type === "text" && !obj.attachedTo) {
        commitObjects(objects.filter((o) => o.id !== id));
      }
    },
    [objects, commitObjects],
  );

  // ----- image input -----
  const addFiles = useCallback(
    async (files: File[] | FileList) => {
      const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (imgs.length === 0) {
        toast.error("Unsupported file type");
        return;
      }
      const created: CanvasObject[] = [];
      let n = 0;
      for (const file of imgs) {
        try {
          const src = await downscaleImage(file);
          const img = await loadImage(src);
          const max = 640;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          created.push({
            id: uid(),
            type: "image",
            src,
            name: file.name.replace(/\.[^.]+$/, ""),
            x: 160 + n * 48,
            y: 120 + n * 48,
            width: w,
            height: h,
          });
          n++;
        } catch {
          toast.error(`Couldn't load ${file.name}`);
        }
      }
      if (created.length) {
        commitObjects([...objects, ...created]);
        setSelectedIds(created.map((c) => c.id));
      }
    },
    [objects, commitObjects],
  );

  // ----- export -----
  const renderExport = useCallback(
    async (mime: "png" | "jpeg", pixelRatio = 2): Promise<string | null> => {
      const stage = stageRef.current;
      if (!stage) return null;
      const box = getObjectsBBox(objects, 40);
      const w = Math.max(1, box.maxX - box.minX);
      const h = Math.max(1, box.maxY - box.minY);
      const old = {
        pos: stage.position(),
        scale: stage.scaleX(),
        size: { w: stage.width(), h: stage.height() },
      };
      stage.size({ width: w, height: h });
      stage.position({ x: -box.minX, y: -box.minY });
      stage.scale({ x: 1, y: 1 });
      stage.draw();
      const url = stage.toDataURL({ pixelRatio, mimeType: "image/png" });
      stage.size({ width: old.size.w, height: old.size.h });
      stage.position(old.pos);
      stage.scale({ x: old.scale, y: old.scale });
      stage.batchDraw();

      const img = await loadImage(url);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * pixelRatio);
      canvas.height = Math.round(h * pixelRatio);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = EXPORT_BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      applyBlurRegions(
        canvas,
        objects.filter((o) => o.type === "blur"),
        { x: box.minX, y: box.minY },
        pixelRatio,
      );
      return canvas.toDataURL(
        mime === "jpeg" ? "image/jpeg" : "image/png",
        mime === "jpeg" ? 0.92 : undefined,
      );
    },
    [objects],
  );

  const exportPng = useCallback(async () => {
    const url = await renderExport("png");
    if (url) downloadDataURL(url, `${slug(name)}.png`);
  }, [renderExport, name]);

  const exportJpg = useCallback(async () => {
    const url = await renderExport("jpeg");
    if (url) downloadDataURL(url, `${slug(name)}.jpg`);
  }, [renderExport, name]);

  const exportJson = useCallback(() => {
    const project: Project = {
      id: projectIdState,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      objects,
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    downloadDataURL(url, `${slug(name)}.point.json`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [projectIdState, name, objects]);

  const copyContext = useCallback(async () => {
    const text = generateAiContext(objects);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Context copied");
    } catch {
      toast.error("Clipboard unavailable");
    }
  }, [objects]);

  const copyForAI = useCallback(async () => {
    const text = generateAiContext(objects);
    try {
      const png = await renderExport("png");
      if (!png) throw new Error("no render");
      const blob = dataURLtoBlob(png);
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob,
            "text/plain": new Blob([text], { type: "text/plain" }),
          }),
        ]);
        toast.success("Image + context copied");
      } catch {
        await navigator.clipboard.writeText(text);
        downloadDataURL(png, `${slug(name)}.png`);
        toast("Image downloaded, context copied");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        toast("Context copied (image unavailable)");
      } catch {
        toast.error("Couldn't copy — try Export");
      }
    }
  }, [objects, renderExport, name]);

  // ----- zoom -----
  const zoomBy = useCallback((factor: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const old = stage.scaleX();
    const ns = Math.min(8, Math.max(0.1, old * factor));
    const cx = stage.width() / 2;
    const cy = stage.height() / 2;
    const wx = (cx - stage.x()) / old;
    const wy = (cy - stage.y()) / old;
    stage.scale({ x: ns, y: ns });
    stage.position({ x: cx - wx * ns, y: cy - wy * ns });
    stage.batchDraw();
    setZoom(ns);
  }, []);

  const zoomFit = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (objects.length === 0) {
      stage.scale({ x: 1, y: 1 });
      stage.position({ x: 0, y: 0 });
      stage.batchDraw();
      setZoom(1);
      return;
    }
    const box = getObjectsBBox(objects, 60);
    const w = box.maxX - box.minX;
    const h = box.maxY - box.minY;
    const scale = Math.min(8, Math.max(0.05, Math.min(stage.width() / w, stage.height() / h)));
    stage.scale({ x: scale, y: scale });
    stage.position({
      x: (stage.width() - w * scale) / 2 - box.minX * scale,
      y: (stage.height() - h * scale) / 2 - box.minY * scale,
    });
    stage.batchDraw();
    setZoom(scale);
  }, [objects]);

  // ----- keyboard -----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable ||
          t.tagName === "SELECT");

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (projectIdState)
          saveProject({ id: projectIdState, name, createdAt: Date.now(), updatedAt: Date.now(), objects });
        toast.success("Saved");
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (selectedIds.length) {
          const clones = objects
            .filter((o) => selectedIds.includes(o.id))
            .map((o) => ({ ...o, id: uid(), x: o.x + 24, y: o.y + 24 }));
          commitObjects([...objects, ...clones]);
        }
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length) {
          e.preventDefault();
          onDelete(selectedIds);
        }
        return;
      }
      const toolKey = TOOL_KEYS[e.key.toLowerCase()];
      if (toolKey) setTool(toolKey);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [redo, undo, projectIdState, name, objects, selectedIds, commitObjects, onDelete]);

  // paste image
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            addFiles([file]);
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  // ----- project ops -----
  const duplicate = useCallback(async () => {
    const id = uid();
    const now = Date.now();
    await saveProject({ id, name: `${name} copy`, createdAt: now, updatedAt: now, objects });
    router.push(`/editor/${id}`);
  }, [name, objects, router]);

  const del = useCallback(async () => {
    if (projectIdState) await deleteProject(projectIdState);
    router.push("/");
  }, [projectIdState, router]);

  const nextNumber = useMemo(
    () =>
      Math.max(
        0,
        ...objects.filter((o) => o.type === "point").map((o) => o.number ?? 0),
      ) + 1,
    [objects],
  );

  const editingObj = editingId ? objects.find((o) => o.id === editingId) : null;
  const selectedObjects = useMemo(
    () => objects.filter((o) => selectedIds.includes(o.id)),
    [objects, selectedIds],
  );

  if (!loaded) {
    return (
      <div className="grid h-screen place-items-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-background text-foreground"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
      }}
    >
      <TopBar
        name={name}
        onRename={setName}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onUndo={undo}
        onRedo={redo}
        zoom={zoom}
        onZoomIn={() => zoomBy(1.2)}
        onZoomOut={() => zoomBy(1 / 1.2)}
        onZoomFit={zoomFit}
        mode={mode}
        onModeChange={setMode}
        onExportPng={exportPng}
        onExportJpg={exportJpg}
        onExportJson={exportJson}
        onCopyForAI={copyForAI}
        onCopyContext={copyContext}
        onHome={() => router.push("/")}
        onNew={() => router.push("/editor")}
        onDuplicate={duplicate}
        onDelete={del}
      />

      <div className="relative flex flex-1 overflow-hidden">
        <Toolbar
          tool={tool}
          onToolChange={setTool}
          color={color}
          onColorChange={setColor}
          strokeWidth={strokeWidth}
          onStrokeWidthChange={setStrokeWidth}
          wireframe={wireframe}
          onWireframeChange={setWireframe}
        />

        <div className="relative flex-1">
          <CanvasStage
            objects={objects}
            tool={tool}
            selectedIds={selectedIds}
            color={color}
            wireframe={wireframe}
            nextNumber={nextNumber}
            strokeWidth={strokeWidth}
            stageRef={stageRef}
            onSelect={setSelectedIds}
            onCreate={onCreate}
            onUpdateCommit={commitPatch}
            onDelete={onDelete}
            onEdit={setEditingId}
            onZoomChange={setZoom}
          />

          {/* empty state */}
          {objects.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
              <div className="flex flex-col items-center gap-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Drop an image here, paste one, or start drawing.
                </p>
                <p className="text-xs text-muted-foreground/70">⌘ / Ctrl + V to paste</p>
                <button
                  className="pointer-events-auto flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-muted"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="size-4" /> Add image
                </button>
              </div>
            </div>
          )}

          {/* drop overlay */}
          {dragging && (
            <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center border-2 border-dashed border-primary bg-primary/5">
              <p className="text-sm text-primary">Drop images</p>
            </div>
          )}

          <Inspector
            selected={selectedObjects}
            onPatch={livePatch}
            onCommit={liveCommit}
            onDelete={onDelete}
          />

          {editingObj && (
            <TextEditor
              obj={editingObj}
              stageRef={stageRef}
              onCommit={commitText}
              onCancel={() => cancelEdit(editingObj.id)}
            />
          )}

          {mode === "ai" && (
            <AiContextPanel
              objects={objects}
              onClose={() => setMode("canvas")}
              onCopyText={async (t) => {
                try {
                  await navigator.clipboard.writeText(t);
                  toast.success("Copied");
                } catch {
                  toast.error("Clipboard unavailable");
                }
              }}
            />
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "point"
  );
}
