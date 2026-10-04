"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Konva from "konva";
import type { CanvasObject } from "@/lib/types";
import { FONT_STACK } from "@/lib/palette";

interface TextEditorProps {
  obj: CanvasObject;
  stageRef: React.MutableRefObject<Konva.Stage | null>;
  onCommit: (id: string, text: string) => void;
  onCancel: () => void;
}

export default function TextEditor({ obj, stageRef, onCommit, onCancel }: TextEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(obj.text ?? "");
  const committed = useRef(false);
  const [pos, setPos] = useState({ left: 0, top: 0, fontSize: 16, color: "#ffffff" });

  useLayoutEffect(() => {
    const stage = stageRef.current;
    let x = obj.x;
    let y = obj.y;
    let fs = obj.fontSize ?? 16;
    if (obj.type === "arrow" && obj.points && obj.points.length >= 4) {
      x = (obj.points[0] + obj.points[2]) / 2;
      y = (obj.points[1] + obj.points[3]) / 2 - 16;
      fs = 15;
    }
    const pt = stage ? stage.getAbsoluteTransform().point({ x, y }) : { x: 0, y: 0 };
    const scale = stage ? stage.scaleX() : 1;
    setPos({ left: pt.x, top: pt.y, fontSize: fs * scale, color: obj.fill ?? "#ffffff" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = () => {
    if (committed.current) return;
    committed.current = true;
    onCommit(obj.id, value);
  };

  const cancel = () => {
    if (committed.current) return;
    committed.current = true;
    onCancel();
  };

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        const el = e.target;
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancel();
        }
      }}
      spellCheck={false}
      className="absolute z-30 resize-none overflow-hidden rounded border border-dashed border-primary/60 bg-black/60 px-1 outline-none"
      style={{
        left: pos.left,
        top: pos.top,
        fontSize: pos.fontSize,
        color: pos.color,
        fontFamily: FONT_STACK,
        lineHeight: 1.3,
        minWidth: 160,
        maxWidth: 420,
        width: Math.max(160, Math.min(420, value.length * pos.fontSize * 0.6 + 24)),
      }}
    />
  );
}
