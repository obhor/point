import type { Project, ProjectMeta } from "./types";

const DB_NAME = "point-db";
const STORE = "projects";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function saveProject(project: Project): Promise<void> {
  await tx("readwrite", (s) => s.put(project));
}

export async function getProject(id: string): Promise<Project | undefined> {
  return tx<Project | undefined>("readonly", (s) => s.get(id));
}

export async function deleteProject(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
}

export async function listProjects(): Promise<ProjectMeta[]> {
  const all = await tx<Project[]>("readonly", (s) => s.getAll());
  return (all || [])
    .map((p) => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      objectCount: p.objects?.length ?? 0,
      thumbnail: p.objects?.find((o) => o.type === "image")?.src,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function storageAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}
