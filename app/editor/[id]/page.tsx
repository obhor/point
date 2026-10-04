"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const Editor = dynamic(() => import("@/components/editor/Editor"), {
  ssr: false,
  loading: () => (
    <div className="grid h-screen place-items-center bg-background text-sm text-muted-foreground">
      Loading…
    </div>
  ),
});

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  return <Editor projectId={id} />;
}
