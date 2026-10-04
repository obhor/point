"use client";

import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import {
  Stage,
  Layer,
  Rect,
  Ellipse,
  Circle,
  Group,
  Arrow,
  Line,
  Text,
  Image as KonvaImage,
  Transformer,
} from "react-konva";
import type { CanvasObject, Tool } from "@/lib/types";
import { isShapeTool, uid } from "@/lib/types";
import { FONT_STACK } from "@/lib/palette";
import { numToChar } from "@/lib/aiContext";

interface StageSize {
  width: number;
  height: number;
}

interface CanvasStageProps {
  objects: CanvasObject[];
  tool: Tool;
  selectedIds: string[];
  color: string;
  wireframe: boolean;
  nextNumber: number;
  strokeWidth: number;
  stageRef: React.MutableRefObject<Konva.Stage | null>;
  onSelect: (ids: string[]) => void;
  onCreate: (objects: CanvasObject[]) => void;
  onUpdateCommit: (id: string, patch: Partial<CanvasObject>) => void;
  onDelete: (ids: string[]) => void;
  onEdit: (id: string) => void;
  onZoomChange: (zoom: number) => void;
}

function resizableType(type: CanvasObject["type"]): boolean {
  return ["image", "rect", "ellipse", "highlight", "blur"].includes(type);
}

export default function CanvasStage({
  objects,
  tool,
  selectedIds,
  color,
  wireframe,
  nextNumber,
  strokeWidth,
  stageRef,
  onSelect,
  onCreate,
  onUpdateCommit,
  onDelete,
  onEdit,
  onZoomChange,
}: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [size, setSize] = useState<StageSize>({ width: 800, height: 600 });
  const [draft, setDraft] = useState<CanvasObject | null>(null);
  const drawStart = useRef<{ x: number; y: number } | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [panning, setPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const nodeRefs = useRef<Map<string, Konva.Node>>(new Map());
  const [drawing, setDrawing] = useState(false);

  // measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // space key tracking
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        if (!isTypingTarget(e.target)) e.preventDefault();
        setSpaceDown(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // attach transformer to selection
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const nodes = selectedIds
      .map((id) => nodeRefs.current.get(id))
      .filter(Boolean) as Konva.Node[];
    tr.nodes(nodes);
    const allResizable =
      nodes.length > 0 &&
      nodes.every((n) => {
        const o = objects.find((ob) => ob.id === n.id());
        return o ? resizableType(o.type) : false;
      });
    tr.enabledAnchors(allResizable ? undefined : []);
    tr.rotateEnabled(allResizable);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, objects]);

  const relPos = () => {
    const stage = stageRef.current;
    return stage ? stage.getRelativePointerPosition() : null;
  };

  const strokeFor = () => (wireframe ? "#6b7280" : color);

  // ----- drawing -----
  const startDraw = () => {
    const p = relPos();
    if (!p) return;
    drawStart.current = { x: p.x, y: p.y };
    setDrawing(true);
    if (tool === "freehand") {
      setDraft({
        id: uid(),
        type: "freehand",
        points: [p.x, p.y, p.x, p.y],
        x: 0,
        y: 0,
        stroke: strokeFor(),
        strokeWidth: Math.max(2, strokeWidth),
        tension: 0.5,
        lineCap: "round",
      });
    } else if (tool === "arrow") {
      setDraft({
        id: uid(),
        type: "arrow",
        points: [p.x, p.y, p.x, p.y],
        x: 0,
        y: 0,
        stroke: strokeFor(),
        strokeWidth,
        pointerLength: 12,
        pointerWidth: 9,
      });
    } else if (tool === "line") {
      setDraft({
        id: uid(),
        type: "line",
        points: [p.x, p.y, p.x, p.y],
        x: 0,
        y: 0,
        stroke: strokeFor(),
        strokeWidth,
      });
    } else if (tool === "rect" || tool === "highlight" || tool === "blur") {
      setDraft({
        id: uid(),
        type: tool === "rect" ? "rect" : tool === "highlight" ? "highlight" : "blur",
        x: p.x,
        y: p.y,
        width: 0,
        height: 0,
        stroke: tool === "highlight" ? undefined : strokeFor(),
        strokeWidth,
        fill: tool === "highlight" ? color : undefined,
        opacity: tool === "highlight" ? 0.35 : undefined,
        blurRadius: tool === "blur" ? 12 : undefined,
        dash: wireframe ? [6, 4] : undefined,
      });
    } else if (tool === "ellipse") {
      setDraft({
        id: uid(),
        type: "ellipse",
        x: p.x,
        y: p.y,
        width: 0,
        height: 0,
        stroke: strokeFor(),
        strokeWidth,
        dash: wireframe ? [6, 4] : undefined,
      });
    }
  };

  const moveDraw = () => {
    if (!drawing || !draft || !drawStart.current) return;
    const p = relPos();
    if (!p) return;
    const s = drawStart.current;
    if (draft.type === "freehand") {
      const pts = draft.points ? [...draft.points, p.x, p.y] : [p.x, p.y];
      setDraft({ ...draft, points: pts });
    } else if (draft.type === "arrow" || draft.type === "line") {
      setDraft({ ...draft, points: [s.x, s.y, p.x, p.y] });
    } else {
      const x = Math.min(s.x, p.x);
      const y = Math.min(s.y, p.y);
      const width = Math.abs(p.x - s.x);
      const height = Math.abs(p.y - s.y);
      setDraft({ ...draft, x, y, width, height });
    }
  };

  const endDraw = () => {
    if (!drawing || !draft) {
      setDrawing(false);
      return;
    }
    const finalize = { ...draft };
    // discard zero-size shapes
    if (
      (finalize.type === "rect" ||
        finalize.type === "ellipse" ||
        finalize.type === "highlight" ||
        finalize.type === "blur") &&
      (finalize.width ?? 0) < 3 &&
      (finalize.height ?? 0) < 3
    ) {
      setDraft(null);
      setDrawing(false);
      return;
    }
    if (
      finalize.type === "freehand" &&
      finalize.points &&
      finalize.points.length < 4
    ) {
      setDraft(null);
      setDrawing(false);
      return;
    }
    onCreate([finalize]);
    setDraft(null);
    setDrawing(false);
    drawStart.current = null;
  };

  // ----- pointer handlers -----
  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const isPan =
      spaceDown || e.evt.button === 1 || e.evt.button === 2;
    if (isPan) {
      setPanning(true);
      panStart.current = stageRef.current
        ? { x: e.evt.clientX, y: e.evt.clientY }
        : null;
      return;
    }
    if (e.evt.button !== 0) return;

    if (tool === "select") {
      const clickedEmpty = e.target === e.target.getStage();
      if (clickedEmpty) onSelect([]);
      return;
    }
    if (tool === "eraser") {
      const node = e.target;
      if (node && node !== e.target.getStage() && node.id()) {
        onDelete([node.id()]);
      }
      return;
    }
    if (isShapeTool(tool)) {
      startDraw();
      return;
    }
    // point / number / text / comment are click-to-place
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (panning && panStart.current) {
      const stage = stageRef.current;
      if (!stage) return;
      const dx = e.evt.clientX - panStart.current.x;
      const dy = e.evt.clientY - panStart.current.y;
      panStart.current = { x: e.evt.clientX, y: e.evt.clientY };
      stage.position({ x: stage.x() + dx, y: stage.y() + dy });
      stage.batchDraw();
      return;
    }
    moveDraw();
  };

  const handleStageMouseUp = () => {
    if (panning) {
      setPanning(false);
      return;
    }
    if (drawing) {
      endDraw();
      return;
    }
  };

  const handleStageClick = () => {
    const p = relPos();
    if (!p) return;
    if (tool === "point" || tool === "number") {
      const markerId = uid();
      const labelId = uid();
      const marker: CanvasObject = {
        id: markerId,
        type: "point",
        x: p.x,
        y: p.y,
        number: nextNumber,
        fill: strokeFor(),
        stroke: "#ffffff",
        strokeWidth: 1.5,
      };
      const label: CanvasObject = {
        id: labelId,
        type: "text",
        x: p.x + 22,
        y: p.y - 11,
        text: "",
        fontSize: 16,
        fill: "#ffffff",
        align: "left",
        attachedTo: markerId,
      };
      onCreate([marker, label]);
      onSelect([markerId]);
      onEdit(labelId);
    } else if (tool === "text") {
      const id = uid();
      onCreate([
        {
          id,
          type: "text",
          x: p.x,
          y: p.y,
          text: "",
          fontSize: 20,
          fill: wireframe ? "#6b7280" : "#ffffff",
          align: "left",
        },
      ]);
      onSelect([id]);
      onEdit(id);
    } else if (tool === "comment") {
      const id = uid();
      onCreate([
        {
          id,
          type: "text",
          x: p.x,
          y: p.y,
          text: "",
          fontSize: 15,
          fill: "#facc15",
          fontStyle: "italic",
          align: "left",
        },
      ]);
      onSelect([id]);
      onEdit(id);
    }
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const zooming = e.evt.ctrlKey || e.evt.metaKey;
    if (zooming) {
      const factor = 1.1;
      const newScale =
        direction > 0 ? oldScale * factor : oldScale / factor;
      stage.scale({ x: newScale, y: newScale });
      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };
      stage.position(newPos);
      onZoomChange(newScale);
    } else {
      // plain scroll pans vertically/horizontally
      stage.position({
        x: stage.x() - e.evt.deltaX,
        y: stage.y() - e.evt.deltaY,
      });
    }
    stage.batchDraw();
  };

  const registerNode = (id: string) => (node: Konva.Node | null) => {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  };

  const handleDragEnd =
    (id: string) => (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      if (node.className === "Arrow" || node.className === "Line") {
        const obj = objects.find((o) => o.id === id);
        const dx = node.x();
        const dy = node.y();
        node.position({ x: 0, y: 0 });
        if (obj?.points) {
          const pts = obj.points.map((v, i) => (i % 2 === 0 ? v + dx : v + dy));
          onUpdateCommit(id, { points: pts });
        }
      } else {
        onUpdateCommit(id, { x: node.x(), y: node.y() });
      }
    };

  const handleTransformEnd =
    (id: string) => (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target as Konva.Shape;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      onUpdateCommit(id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(5, (node.width() ?? 0) * scaleX),
        height: Math.max(5, (node.height() ?? 0) * scaleY),
        rotation: node.rotation(),
      });
    };

  const commonEvents = (o: CanvasObject) => ({
    id: o.id,
    ref: registerNode(o.id),
    draggable: tool === "select",
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (tool !== "select") return;
      e.cancelBubble = true;
      if (e.evt.shiftKey) {
        onSelect(selectedIds.includes(o.id) ? selectedIds.filter((x) => x !== o.id) : [...selectedIds, o.id]);
      } else {
        onSelect([o.id]);
      }
    },
    onTap: (e: Konva.KonvaEventObject<TouchEvent>) => {
      if (tool !== "select") return;
      e.cancelBubble = true;
      onSelect([o.id]);
    },
    onDragEnd: handleDragEnd(o.id),
    onTransformEnd: handleTransformEnd(o.id),
    onDblClick: () => {
      if (o.type === "text" || o.type === "point" || o.type === "arrow") {
        onEdit(o.id);
      }
    },
  });

  const textProps = (o: CanvasObject) => ({
    text: o.text ?? "",
    fontSize: o.fontSize ?? 16,
    fontStyle: o.fontStyle ?? "normal",
    fill: o.fill ?? "#ffffff",
    align: o.align ?? "left",
    fontFamily: FONT_STACK,
    lineHeight: 1.3,
  });

  const renderObject = (o: CanvasObject) => {
    const ev = commonEvents(o);
    switch (o.type) {
      case "image":
        return <KonvaImageElement key={o.id} obj={o} events={ev} />;
      case "rect":
        return (
          <Rect
            key={o.id}
            {...ev}
            x={o.x}
            y={o.y}
            width={o.width}
            height={o.height}
            stroke={o.stroke}
            strokeWidth={o.strokeWidth ?? 2}
            dash={o.dash}
            fill={o.fill}
          />
        );
      case "ellipse":
        return (
          <Ellipse
            key={o.id}
            {...ev}
            x={o.x}
            y={o.y}
            width={o.width}
            height={o.height}
            stroke={o.stroke}
            strokeWidth={o.strokeWidth ?? 2}
            dash={o.dash}
            fill={o.fill}
          />
        );
      case "highlight":
        return (
          <Rect
            key={o.id}
            {...ev}
            x={o.x}
            y={o.y}
            width={o.width}
            height={o.height}
            fill={o.fill}
            opacity={o.opacity ?? 0.35}
            stroke={undefined}
          />
        );
      case "blur":
        return (
          <Rect
            key={o.id}
            {...ev}
            x={o.x}
            y={o.y}
            width={o.width}
            height={o.height}
            fill="rgba(255,255,255,0.12)"
            stroke="#94a3b8"
            strokeWidth={1}
            dash={[5, 4]}
            cornerRadius={3}
          />
        );
      case "arrow":
        return (
          <Arrow
            key={o.id}
            {...ev}
            points={o.points}
            stroke={o.stroke}
            strokeWidth={o.strokeWidth ?? 2}
            pointerLength={o.pointerLength ?? 12}
            pointerWidth={o.pointerWidth ?? 9}
          />
        );
      case "line":
        return (
          <Line
            key={o.id}
            {...ev}
            points={o.points}
            stroke={o.stroke}
            strokeWidth={o.strokeWidth ?? 2}
            lineCap="round"
          />
        );
      case "freehand":
        return (
          <Line
            key={o.id}
            {...ev}
            points={o.points}
            stroke={o.stroke}
            strokeWidth={o.strokeWidth ?? 3}
            tension={o.tension ?? 0.5}
            lineCap="round"
            lineJoin="round"
          />
        );
      case "point": {
        const num = o.number ?? 0;
        return (
          <Group key={o.id} {...ev} x={o.x} y={o.y}>
            <Circle
              radius={13}
              fill={o.fill ?? "#ff4d4d"}
              stroke={o.stroke ?? "#ffffff"}
              strokeWidth={1.5}
              shadowColor="rgba(0,0,0,0.4)"
              shadowBlur={4}
              shadowOffsetY={1}
              listening={false}
            />
            <Text
              text={numToChar(num)}
              fontSize={13}
              fontStyle="bold"
              fill="#ffffff"
              fontFamily={FONT_STACK}
              align="center"
              verticalAlign="middle"
              width={26}
              height={26}
              x={-13}
              y={-13}
              listening={false}
            />
          </Group>
        );
      }
      case "text":
        return <Text key={o.id} {...ev} x={o.x} y={o.y} {...textProps(o)} />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{
        backgroundImage: "radial-gradient(circle, #262626 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        backgroundColor: "#141414",
        cursor:
          spaceDown || panning
            ? "grabbing"
            : tool === "select"
              ? "default"
              : tool === "eraser"
                ? "cell"
                : "crosshair",
      }}
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onClick={handleStageClick}
        onWheel={handleWheel}
        onDblClick={() => {
          if (tool === "select") onSelect([]);
        }}
      >
        <Layer>
          {objects.map(renderObject)}
          {draft && renderDraft(draft)}
          <Transformer
            ref={trRef}
            rotateEnabled
            borderStroke="#4c9aff"
            anchorStroke="#4c9aff"
            anchorFill="#141414"
            anchorSize={8}
            boundBoxFunc={(oldBox, newBox) =>
              Math.abs(newBox.width) < 4 || Math.abs(newBox.height) < 4
                ? oldBox
                : newBox
            }
          />
        </Layer>
      </Stage>
    </div>
  );
}

function renderDraft(d: CanvasObject) {
  switch (d.type) {
    case "rect":
      return (
        <Rect
          key="draft"
          x={d.x}
          y={d.y}
          width={d.width}
          height={d.height}
          stroke={d.stroke}
          strokeWidth={d.strokeWidth ?? 2}
          dash={d.dash}
          fill={d.fill}
        />
      );
    case "ellipse":
      return (
        <Ellipse
          key="draft"
          x={d.x}
          y={d.y}
          width={d.width}
          height={d.height}
          stroke={d.stroke}
          strokeWidth={d.strokeWidth ?? 2}
          dash={d.dash}
        />
      );
    case "highlight":
      return (
        <Rect
          key="draft"
          x={d.x}
          y={d.y}
          width={d.width}
          height={d.height}
          fill={d.fill}
          opacity={d.opacity ?? 0.35}
        />
      );
    case "blur":
      return (
        <Rect
          key="draft"
          x={d.x}
          y={d.y}
          width={d.width}
          height={d.height}
          fill="rgba(255,255,255,0.12)"
          stroke="#94a3b8"
          strokeWidth={1}
          dash={[5, 4]}
        />
      );
    case "arrow":
      return (
        <Arrow
          key="draft"
          points={d.points}
          stroke={d.stroke}
          strokeWidth={d.strokeWidth ?? 2}
          pointerLength={d.pointerLength ?? 12}
          pointerWidth={d.pointerWidth ?? 9}
        />
      );
    case "line":
      return (
        <Line
          key="draft"
          points={d.points}
          stroke={d.stroke}
          strokeWidth={d.strokeWidth ?? 2}
          lineCap="round"
        />
      );
    case "freehand":
      return (
        <Line
          key="draft"
          points={d.points}
          stroke={d.stroke}
          strokeWidth={d.strokeWidth ?? 3}
          tension={d.tension ?? 0.5}
          lineCap="round"
          lineJoin="round"
        />
      );
    default:
      return null;
  }
}

function KonvaImageElement({
  obj,
  events,
}: {
  obj: CanvasObject;
  events: Record<string, unknown>;
}) {
  const [img] = useKonvaImage(obj.src ?? "");
  if (!img) return null;
  return (
    <KonvaImage
      {...events}
      image={img}
      x={obj.x}
      y={obj.y}
      width={obj.width}
      height={obj.height}
    />
  );
}

function useKonvaImage(src: string): [HTMLImageElement | undefined] {
  const [img, setImg] = useState<HTMLImageElement | undefined>();
  useEffect(() => {
    if (!src) return;
    const image = new window.Image();
    image.onload = () => setImg(image);
    image.src = src;
  }, [src]);
  return [img];
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target) return false;
  const el = target as HTMLElement;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    el.isContentEditable ||
    tag === "SELECT"
  );
}
