"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, ImageIcon, Trash2, ArrowRight } from "lucide-react";
import type { Project, ProjectMeta } from "@/lib/types";
import { uid } from "@/lib/types";
import { listProjects, deleteProject, saveProject } from "@/lib/storage";

export default function Home() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);

  const load = () => listProjects().then(setProjects);

  useEffect(() => {
    load();
  }, []);

  const importProject = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(String(reader.result)) as Project;
        if (!data || !Array.isArray(data.objects)) throw new Error("bad");
        const id = uid();
        const now = Date.now();
        await saveProject({
          id,
          name: data.name || "Imported",
          createdAt: now,
          updatedAt: now,
          objects: data.objects,
        });
        router.push(`/editor/${id}`);
      } catch {
        alert("Invalid project file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-12">
      <header className="flex items-center gap-2 text-sm font-semibold tracking-tight">
        <span className="grid size-6 place-items-center rounded-md bg-primary text-primary-foreground">
          <span className="text-xs">P</span>
        </span>
        Point
      </header>

      <section className="mt-16">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Show AI what you mean.
        </h1>
        <p className="mt-3 max-w-md text-base text-muted-foreground">
          Drop an image, point at it, explain. Annotate screenshots, sketch
          ideas, and hand AI precise visual context.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            className="flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => router.push("/editor")}
          >
            <Plus className="size-4" /> New canvas
          </button>
          <button
            className="flex h-10 items-center gap-1.5 rounded-lg border border-border px-4 text-sm text-foreground hover:bg-muted"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" /> Import project
          </button>
        </div>
      </section>

      {/* example strip */}
      <section className="mt-12 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex h-14 w-20 items-center justify-center rounded-md border border-border bg-muted">
          <ImageIcon className="size-5" />
        </div>
        <ArrowRight className="size-4" />
        <div className="flex h-14 w-20 items-center justify-center rounded-md border border-border bg-muted text-center leading-tight">
          ① widen
        </div>
        <ArrowRight className="size-4" />
        <div className="flex h-14 w-28 items-center justify-center rounded-md border border-border bg-muted text-center leading-tight">
          &ldquo;Make this
          <br />
          button wider&rdquo;
        </div>
      </section>

      {/* recent projects */}
      {projects.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recent
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {projects.map((p) => (
              <div
                key={p.id}
                className="group relative overflow-hidden rounded-lg border border-border bg-muted"
              >
                <button
                  className="block aspect-[4/3] w-full"
                  onClick={() => router.push(`/editor/${p.id}`)}
                >
                  {p.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.thumbnail}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-muted-foreground">
                      <ImageIcon className="size-6" />
                    </span>
                  )}
                </button>
                <div className="flex items-center justify-between px-2.5 py-2">
                  <button
                    className="truncate text-left text-sm"
                    onClick={() => router.push(`/editor/${p.id}`)}
                  >
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {p.objectCount} object{p.objectCount === 1 ? "" : "s"}
                    </div>
                  </button>
                  <button
                    className="grid size-6 place-items-center rounded text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    onClick={async () => {
                      await deleteProject(p.id);
                      load();
                    }}
                    title="Delete"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-auto pt-16 text-xs text-muted-foreground/70">
        Everything stays in your browser. No uploads.
      </footer>

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) importProject(e.target.files[0]);
          e.target.value = "";
        }}
      />
    </main>
  );
}
