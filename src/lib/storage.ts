import { Project, validateProject } from "./document";
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("uncanva", 2);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains("projects"))
        d.createObjectStore("projects");
      if (!d.objectStoreNames.contains("assets")) d.createObjectStore("assets");
      if (!d.objectStoreNames.contains("settings"))
        d.createObjectStore("settings");
      const projects = r.transaction!.objectStore("projects");
      const old = projects.get("current");
      old.onsuccess = () => {
        if (old.result) {
          projects.put(old.result, old.result.id);
          projects.delete("current");
          r.transaction!.objectStore("settings").put(old.result.id, "active");
        }
      };
    };
    r.onblocked = () =>
      reject(
        new Error("Close older UnCanva tabs so local storage can update."),
      );
    r.onsuccess = () => {
      r.result.onversionchange = () => r.result.close();
      resolve(r.result);
    };
    r.onerror = () => reject(r.error);
  });
}
async function transaction<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const r = run(t.objectStore(store));
    let value: T;
    r.onsuccess = () => {
      value = r.result;
    };
    t.oncomplete = () => {
      d.close();
      resolve(value);
    };
    t.onerror = t.onabort = () => {
      d.close();
      reject(r.error || t.error || new Error("Local storage failed"));
    };
  });
}
export async function saveProject(p: Project) {
  const d = await db();
  return new Promise<void>((resolve, reject) => {
    const t = d.transaction(["projects", "settings"], "readwrite");
    t.objectStore("projects").put(p, p.id);
    t.objectStore("settings").put(p.id, "active");
    t.oncomplete = () => {
      d.close();
      resolve();
    };
    t.onabort = t.onerror = () => {
      d.close();
      reject(t.error || new Error("Project save failed"));
    };
  });
}
export const loadProject = async (id?: string) => {
  const active =
    id || (await transaction("settings", "readonly", (s) => s.get("active")));
  if (!active) return null;
  const p = await transaction("projects", "readonly", (s) => s.get(active));
  return p ? validateProject(p) : null;
};
export async function listProjects() {
  return (await transaction("projects", "readonly", (s) => s.getAll())).map(
    validateProject,
  );
}
export async function deleteProject(id: string) {
  await transaction("projects", "readwrite", (s) => s.delete(id));
}
/** Explicit maintenance protects all persisted projects plus live undo/redo references. */
export async function compactAssets(live: Project[]) {
  const d = await db();
  return new Promise<{ count: number; bytes: number }>((resolve, reject) => {
    const t = d.transaction(["projects", "assets"], "readwrite"),
      ids = new Set<string>();
    let count = 0,
      bytes = 0;
    const retain = (p: Project) => {
      for (const b of p.artboards)
        for (const l of b.layers)
          for (const id of [l.asset, l.mask]) if (id) ids.add(id);
    };
    live.forEach(retain);
    const saved = t.objectStore("projects").getAll();
    saved.onsuccess = () => {
      saved.result.forEach(retain);
      const cursor = t.objectStore("assets").openCursor();
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (!c) return;
        if (!ids.has(String(c.key))) {
          count++;
          bytes +=
            c.value instanceof Blob ? c.value.size : c.value.data.byteLength;
          c.delete();
        }
        c.continue();
      };
    };
    t.oncomplete = () => {
      d.close();
      resolve({ count, bytes });
    };
    t.onabort = t.onerror = () => {
      d.close();
      reject(t.error || new Error("Storage cleanup failed"));
    };
  });
}
export const putAsset = async (id: string, b: Blob) => {
  // ArrayBuffer records avoid browser-specific IndexedDB Blob serialization failures.
  const data = await b.arrayBuffer();
  return transaction("assets", "readwrite", (s) =>
    s.put({ data, type: b.type }, id),
  );
};
export const getAsset = async (id: string): Promise<Blob | undefined> => {
  const value = await transaction("assets", "readonly", (s) => s.get(id));
  if (!value) return undefined;
  return value instanceof Blob
    ? value
    : new Blob([value.data], { type: value.type || "image/png" });
};
export async function backup(p: Project) {
  const ids = new Set(
    p.artboards.flatMap((b) =>
      b.layers.flatMap((l) =>
        [l.asset, l.mask].filter((x): x is string => !!x),
      ),
    ),
  );
  const assets: Record<string, string> = {};
  for (const id of ids) {
    const b = await getAsset(id);
    if (!b) throw new Error("Missing original asset");
    assets[id] = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(b);
    });
  }
  return new Blob([JSON.stringify({ format: "uncanva", project: p, assets })], {
    type: "application/json",
  });
}
export async function restoreBackup(file: File) {
  if (file.size > 250_000_000) throw new Error("Backup exceeds 250 MB");
  const v = JSON.parse(await file.text());
  if (v.format !== "uncanva") throw new Error("Unsupported backup");
  const p = validateProject(v.project);
  for (const b of p.artboards)
    for (const l of b.layers)
      for (const id of [l.asset, l.mask])
        if (id) {
          const data = v.assets[id];
          if (
            typeof data !== "string" ||
            !/^data:image\/(png|jpeg|webp);base64,/.test(data)
          )
            throw new Error("Invalid backup image");
          await putAsset(id, await (await fetch(data)).blob());
        }
  return p;
}
