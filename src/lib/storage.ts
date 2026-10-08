import { Project, validateProject } from "./document";
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("uncanva", 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("projects");
      r.result.createObjectStore("assets");
    };
    r.onsuccess = () => resolve(r.result);
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
      reject(t.error || new Error("Local storage failed"));
    };
  });
}
export const saveProject = (p: Project) =>
  transaction("projects", "readwrite", (s) => s.put(p, "current"));
export const loadProject = async () => {
  const p = await transaction("projects", "readonly", (s) => s.get("current"));
  return p ? validateProject(p) : null;
};
export const putAsset = (id: string, b: Blob) =>
  transaction("assets", "readwrite", (s) => s.put(b, id));
export const getAsset = (id: string): Promise<Blob | undefined> =>
  transaction("assets", "readonly", (s) => s.get(id));
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
