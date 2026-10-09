"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MousePointer2,
  Hand,
  Crop,
  Paintbrush,
  Eraser,
  RotateCcw,
  Type,
  Square,
  ZoomIn,
  Upload,
  Undo2,
  Redo2,
  Copy,
  Download,
  Plus,
  Sparkles,
  Check,
  ImagePlus,
  PanelLeftClose,
  Maximize,
} from "lucide-react";
import {
  History,
  Layer,
  Project,
  Stroke,
  localPoint,
  resizeLayer,
  Artboard,
  newLayer,
  newProject,
  uid,
} from "@/lib/document";
import {
  getAsset,
  compactAssets,
  loadProject,
  putAsset,
  restoreBackup,
  saveProject,
} from "@/lib/storage";
import { download, encode, original, renderBoard } from "@/lib/render";
import { IconButton } from "./editor-ui";
import PagesPanel from "./pages-panel";
import DeviceSetup from "./device-setup";
import { previewSize } from "@/lib/device";
import ProjectGallery from "./project-gallery";
import { useEditorLock } from "./use-editor-lock";
import PropertiesPanel from "./properties-panel";
import { Tool } from "./types";
import { formats, formatInfo, acceptImages } from "@/lib/formats";
import { decodeImport } from "@/lib/codecs";
import { applyStroke } from "@/lib/mask";
import { SubjectRegion, subjectRegion, regionPixels } from "@/lib/ai-region";
import { ModelId } from "@/lib/ai-models";
import { exportPDF } from "@/lib/pdf-export";
const tools = [
  ["select", MousePointer2, "Select · V"],
  ["pan", Hand, "Pan · H"],
  ["crop", Crop, "Crop artboard · C"],
  ["brush", Paintbrush, "Paint · B"],
  ["erase", Eraser, "Erase mask · E"],
  ["restore", RotateCcw, "Restore mask · R"],
  ["text", Type, "Add text · T"],
  ["shape", Square, "Add shape · S"],
  ["zoom", ZoomIn, "Zoom · Z"],
] as const;
export default function Editor() {
  const readOnly = useEditorLock();
  const [setup, setSetup] = useState(false);
  const [gallery, setGallery] = useState(false);
  const editable = useRef(true);
  editable.current = !readOnly;
  const [project, setProject] = useState<Project | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [tool, setTool] = useState<Tool>("select"),
    [zoom, setZoom] = useState(0.55),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [status, setStatus] = useState("Opening local workspace…"),
    [message, setMessage] = useState(""),
    [tab, setTab] = useState("Adjust"),
    [showExport, setShowExport] = useState(false),
    [promptId, setPromptId] = useState<string | null>(null),
    [online, setOnline] = useState(true),
    [busy, setBusy] = useState(""),
    [sidebar, setSidebar] = useState(true),
    [ready, setReady] = useState(false);
  const [modelId, setModelId] = useState<ModelId>("detail");
  const [subjectArea, setSubjectArea] = useState<{
    layerId: string;
    rect: SubjectRegion;
  } | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  useEffect(() => {
    try {
      const preferred = localStorage.getItem("uncanva-background-model");
      if (
        preferred === "general" ||
        preferred === "detail" ||
        preferred === "portrait"
      )
        setModelId(preferred);
    } catch {
      /* Model selection still works when preferences cannot be stored. */
    }
  }, []);
  const [brush, setBrush] = useState({
      size: 50,
      hardness: 0.8,
      opacity: 1,
      feather: 0,
      color: "#8570ee",
    }),
    [format, setFormat] = useState("image/png"),
    [quality, setQuality] = useState(0.92),
    [scale, setScale] = useState(1),
    [custom, setCustom] = useState({ w: 0, h: 0 }),
    [filename, setFilename] = useState("uncanva-export"),
    [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const history = useRef<History<Project> | null>(null),
    latest = useRef<Project | null>(null),
    fileRef = useRef<HTMLInputElement>(null),
    backupRef = useRef<HTMLInputElement>(null),
    canvasRef = useRef<HTMLCanvasElement>(null),
    previewAdjustments = useRef(""),
    workspace = useRef<HTMLDivElement>(null),
    aiRef = useRef<Worker | null>(null),
    saveChain = useRef(Promise.resolve());
  useEffect(() => {
    if (!showExport && !gallery && !setup) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[aria-modal="true"]');
    if (!dialog) return;
    const items = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),a[href]',
        ),
      ).filter((n) => n.getClientRects().length);
    items()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowExport(false);
        setGallery(false);
        setSetup(false);
      }
      if (e.key === "Tab") {
        const list = items(),
          first = list[0],
          last = list.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [showExport, gallery, setup]);
  const board = project?.artboards.find((b) => b.id === project.active),
    layer = board?.layers.find((l) => l.id === selected);
  const commit = useCallback((next: Project) => {
    if (!editable.current) return;
    history.current?.commit(next);
    latest.current = next;
    setProject(next);
  }, []);
  const mutate = useCallback(
    (fn: (p: Project) => void) => {
      if (!latest.current || !editable.current) return;
      const next = structuredClone(latest.current);
      fn(next);
      commit(next);
    },
    [commit],
  );
  const updateLayer = (patch: Partial<Layer>) =>
    mutate((p) => {
      const l = p.artboards
        .find((b) => b.id === p.active)
        ?.layers.find((l) => l.id === selected);
      if (l && !l.locked) Object.assign(l, patch);
    });
  const updateBoard = (patch: Partial<Artboard>) =>
    mutate((p) =>
      Object.assign(
        p.artboards.find((b) => b.id === p.active)!,
        patch,
      ),
    );
  const undo = useCallback((redo = false) => {
    if (!history.current || !editable.current) return;
    const p = redo ? history.current.redo() : history.current.undo();
    latest.current = p;
    setProject(p);
  }, []);
  useEffect(() => {
    let mounted = true;
    loadProject()
      .then((p) => {
        if (!mounted) return;
        const value = p || newProject();
        history.current = new History(value);
        latest.current = value;
        setProject(value);
        setReady(true);
        setStatus(p ? "Restored from this device" : "Saved on this device");
      })
      .catch((e) => {
        setMessage(
          `Storage could not open: ${e.message}. Export a backup before leaving.`,
        );
        const p = newProject();
        history.current = new History(p);
        latest.current = p;
        setProject(p);
        setReady(true);
      });
    setOnline(navigator.onLine);
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    const onController = () => {
      if (navigator.serviceWorker.controller) setUpdateAvailable(true);
    };
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((registration) => {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.addEventListener(
              "controllerchange",
              onController,
            );
            void registration.update().catch(() => {});
          }
        })
        .catch((e) => setMessage(`Offline setup failed: ${e.message}`));
    return () => {
      mounted = false;
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
      aiRef.current?.terminate();
      navigator.serviceWorker?.removeEventListener(
        "controllerchange",
        onController,
      );
    };
  }, []);
  useEffect(() => {
    if (!project || !ready || readOnly) return;
    setStatus("Saving…");
    const id = setTimeout(() => {
      saveChain.current = saveChain.current
        .catch(() => {})
        .then(async () => {
          await saveProject(project);
          if (latest.current === project) setStatus("Saved on this device");
        })
        .catch((e) => {
          setStatus("Save failed");
          setMessage(
            `Local save failed (${e.message}). Download a project backup.`,
          );
        });
    }, 600);
    return () => clearTimeout(id);
  }, [project, ready, readOnly]);
  useEffect(() => {
    if (!board) return;
    let live = true;
    const memory = (navigator as Navigator & { deviceMemory?: number })
      .deviceMemory;
    const preview = previewSize(
      board.width,
      board.height,
      memory && memory <= 4 ? 1024 : 2048,
    );
    const adjustmentKey = JSON.stringify(
      board.layers.map((l) => l.adjustments),
    );
    const adjustmentChanged = previewAdjustments.current !== adjustmentKey;
    previewAdjustments.current = adjustmentKey;
    const timer = setTimeout(
      () => {
        renderBoard(board, preview.width, preview.height, true)
          .then((c) => {
            if (live && canvasRef.current) {
              canvasRef.current.width = c.width;
              canvasRef.current.height = c.height;
              canvasRef.current.getContext("2d")!.drawImage(c, 0, 0);
            }
          })
          .catch((e) => {
            if (live) setMessage(e.message);
          });
      },
      adjustmentChanged ? 75 : 0,
    );
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [board]);
  const importFiles = useCallback(
    async (files: File[]) => {
      if (!editable.current) return;
      if (!latest.current || !editable.current) return;
      const target = latest.current.active;
      const added: Layer[] = [];
      for (const f of files) {
        try {
          if (f.size > 50_000_000)
            throw new Error("Images must be below 50 MB");
          const image = await decodeImport(f),
            id = uid();
          await putAsset(id, image.blob);
          const l = newLayer("image");
          l.asset = id;
          l.name = f.name || "Pasted image";
          l.width = image.width;
          l.height = image.height;
          l.x = 0;
          l.y = 0;
          added.push(l);
        } catch (e) {
          setMessage(e instanceof Error ? e.message : String(e));
        }
      }
      if (added.length) {
        mutate((p) => {
          const b = p.artboards.find((b) => b.id === target);
          if (!b) return;
          if (!b.layers.length) {
            b.width = added[0].width;
            b.height = added[0].height;
          }
          for (const l of added) {
            const factor = Math.min(1, b.width / l.width, b.height / l.height);
            l.width *= factor;
            l.height *= factor;
            l.x = (b.width - l.width) / 2;
            l.y = (b.height - l.height) / 2;
            b.layers.push(l);
          }
        });
        setSelected(added.at(-1)!.id);
        if (localStorage.getItem("uncanva-skip-bg") !== "true")
          setPromptId(added.at(-1)!.id);
        const area = workspace.current?.getBoundingClientRect();
        setZoom(
          Math.max(
            0.05,
            Math.min(
              0.7,
              ((area?.width || 750) - 100) / added[0].width,
              ((area?.height || 810) - 160) / added[0].height,
            ),
          ),
        );
        setPan({ x: 0, y: 0 });
      }
    },
    [mutate],
  );
  useEffect(() => {
    const paste = (e: ClipboardEvent) => {
      if (
        (e.target instanceof Element ? e.target : null)?.closest(
          "input,textarea,[contenteditable]",
        )
      )
        return;
      const files = Array.from(e.clipboardData?.items || [])
        .filter((i) => i.type.startsWith("image/"))
        .map((i) => i.getAsFile())
        .filter((f): f is File => !!f);
      if (files.length) {
        e.preventDefault();
        void importFiles(files);
      } else
        setMessage(
          "No supported image in the clipboard. Use Import for files.",
        );
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, [importFiles]);
  const deleteSelected = useCallback(
    () =>
      mutate((p) => {
        const b = p.artboards.find((b) => b.id === p.active)!;
        b.layers = b.layers.filter((l) => l.id !== selected || l.locked);
      }),
    [mutate, selected],
  );
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        (e.target instanceof Element ? e.target : null)?.closest(
          "input,textarea,[contenteditable]",
        )
      )
        return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo(e.shiftKey);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      }
      const map: Record<string, Tool> = {
        v: "select",
        h: "pan",
        c: "crop",
        b: "brush",
        e: "erase",
        r: "restore",
        t: "text",
        s: "shape",
        z: "zoom",
      };
      if (map[e.key.toLowerCase()] && !e.metaKey && !e.ctrlKey)
        setTool(map[e.key.toLowerCase()]);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [undo, deleteSelected]);
  async function removeBackground(id = selected) {
    if (!editable.current) return;
    const p = latest.current,
      b = p?.artboards.find((b) => b.id === p.active),
      l = b?.layers.find((l) => l.id === id);
    if (!l?.asset || l.locked || busy) return;
    const boardId = b!.id,
      layerId = l.id;
    setPromptId(null);
    setBusy("Preparing original image");
    try {
      const blob = await getAsset(l.asset);
      if (!blob) throw new Error("Original image missing");
      const worker = new Worker(
        new URL("../lib/ai.worker.ts", import.meta.url),
      );
      aiRef.current = worker;
      worker.onerror = (e) => {
        setMessage(e.message || "AI worker failed");
        setBusy("");
        worker.terminate();
      };
      worker.onmessage = async (e) => {
        if (e.data.stage) {
          setBusy(e.data.stage);
          return;
        }
        try {
          if (e.data.error) throw new Error(e.data.error);
          const mask = uid();
          await putAsset(mask, e.data.blob);
          mutate((p) => {
            const target = p.artboards
              .find((b) => b.id === boardId)
              ?.layers.find((l) => l.id === layerId);
            if (target) {
              target.mask = mask;
              target.strokes = [];
            }
          });
          setBusy("Rendering background mask");
          const updated = latest.current?.artboards.find(
            (b) => b.id === boardId,
          );
          if (updated) {
            const p = previewSize(updated.width, updated.height);
            await renderBoard(updated, p.width, p.height, true);
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() => resolve()),
            );
          }
          setMessage(
            `Background removed locally using ${e.data.backend} (${e.data.model}). Refine edges with Erase and Restore.`,
          );
        } catch (error) {
          setMessage(String(error));
        } finally {
          worker.terminate();
          aiRef.current = null;
          setBusy("");
        }
      };
      worker.postMessage({
        blob,
        model: modelId,
        region: subjectArea?.layerId === l.id ? subjectArea.rect : undefined,
      });
    } catch (e) {
      setBusy("");
      setMessage(String(e));
    }
  }
  async function editSelection(action: "erase" | "keep" | "restore") {
    if (
      !editable.current ||
      !layer?.asset ||
      layer.locked ||
      busy ||
      subjectArea?.layerId !== layer.id
    )
      return;
    const targetId = layer.id,
      targetBoard = board!.id;
    setBusy("Updating selected mask area");
    try {
      const image = await original(layer.asset),
        mask = document.createElement("canvas");
      mask.width = image.width;
      mask.height = image.height;
      const context = mask.getContext("2d")!;
      context.fillStyle = "white";
      context.fillRect(0, 0, mask.width, mask.height);
      if (layer.mask) {
        context.clearRect(0, 0, mask.width, mask.height);
        context.drawImage(
          await original(layer.mask),
          0,
          0,
          mask.width,
          mask.height,
        );
      }
      for (const stroke of layer.strokes) applyStroke(context, stroke);
      const area = regionPixels(subjectArea.rect, mask.width, mask.height);
      if (action === "erase")
        context.clearRect(area.x, area.y, area.width, area.height);
      else if (action === "restore") {
        context.fillStyle = "white";
        context.fillRect(area.x, area.y, area.width, area.height);
      } else {
        context.clearRect(0, 0, mask.width, area.y);
        context.clearRect(
          0,
          area.y + area.height,
          mask.width,
          mask.height - area.y - area.height,
        );
        context.clearRect(0, area.y, area.x, area.height);
        context.clearRect(
          area.x + area.width,
          area.y,
          mask.width - area.x - area.width,
          area.height,
        );
      }
      const blob = await new Promise<Blob>((resolve, reject) =>
        mask.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Mask encoding failed"))),
          "image/png",
        ),
      );
      const id = uid();
      await putAsset(id, blob);
      mutate((p) => {
        const target = p.artboards
          .find((b) => b.id === targetBoard)
          ?.layers.find((l) => l.id === targetId);
        if (target) {
          target.mask = id;
          target.strokes = [];
        }
      });
      setMessage(
        action === "erase"
          ? "Selected area erased. Undo or Restore reveals the original pixels."
          : action === "keep"
            ? "Pixels outside the selection erased. Original pixels are preserved."
            : "Selected area restored from original pixels.",
      );
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy("");
    }
  }
  function add(type: Layer["type"]) {
    const l = newLayer(type);
    mutate((p) => p.artboards.find((b) => b.id === p.active)!.layers.push(l));
    setSelected(l.id);
    setTool("select");
  }
  async function exportImage(all = false) {
    if (!board || !project) return;
    try {
      setBusy("Rendering export");
      if (format === "application/pdf") {
        download(
          await exportPDF(
            all ? project.artboards : [board],
            scale,
            custom,
            setBusy,
          ),
          `${filename}.pdf`,
        );
        setShowExport(false);
        return;
      }
      for (const b of all ? project.artboards : [board]) {
        const w = custom.w || Math.round(b.width * scale),
          h = custom.h || Math.round(b.height * scale);
        download(
          await encode(b, format, quality, w, h),
          `${filename}${all ? "-" + b.name : ""}.${formatInfo(format).ext}`,
        );
      }
      setShowExport(false);
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy("");
    }
  }
  async function copyImage() {
    if (!board) return;
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined")
        throw new Error("Image clipboard is unavailable. Export PNG instead.");
      const promise = encode(board, "image/png", 1);
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": promise }),
      ]);
      setMessage("Edited PNG copied with transparency.");
    } catch (e) {
      setMessage(`Copy failed: ${String(e)}`);
    }
  }
  const drag = useRef<{
    start: [number, number];
    layer?: Layer;
    mode:
      | "move"
      | "resize"
      | "rotate"
      | "pan"
      | "stroke"
      | "crop"
      | "paint"
      | "subject";
    base: Project;
    pan: { x: number; y: number };
    stroke?: Stroke;
    origin?: [number, number];
    corner?: "tl" | "tr" | "bl" | "br";
    finished?: boolean;
  } | null>(null);
  const point = (e: React.PointerEvent): [number, number] => {
    const r = canvasRef.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / zoom, (e.clientY - r.top) / zoom];
  };
  async function pointerDown(
    e: React.PointerEvent,
    mode?: "resize" | "rotate",
    corner: "tl" | "tr" | "bl" | "br" = "br",
  ) {
    if (!board || !project || !editable.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const xy = point(e);
    if (tool === "zoom") {
      setZoom((z) => Math.min(3, z * 1.2));
      return;
    }
    if (tool === "pan" || e.button === 1) {
      drag.current = {
        start: [e.clientX, e.clientY],
        mode: "pan",
        base: project,
        pan,
      };
      return;
    }
    if (tool === "text") {
      add("text");
      return;
    }
    if (tool === "shape") {
      add("rect");
      return;
    }
    if (tool === "subject") {
      if (!layer || layer.type !== "image" || layer.locked) return;
      drag.current = {
        start: localPoint(layer, ...xy),
        layer,
        mode: "subject",
        base: project,
        pan,
      };
      return;
    }
    if (tool === "crop") {
      drag.current = { start: xy, mode: "crop", base: project, pan };
      setMessage(
        "Drag a rectangle to crop the artboard. Undo restores the full layout.",
      );
      return;
    }
    const hit =
      tool === "brush"
        ? {
            ...newLayer("rect"),
            x: 0,
            y: 0,
            width: board.width,
            height: board.height,
          }
        : mode ||
            (["erase", "restore"].includes(tool) && layer?.type === "image")
          ? layer
          : [...board.layers].reverse().find((l) => {
              const p = localPoint(l, ...xy);
              return (
                l.visible &&
                !l.locked &&
                p[0] >= 0 &&
                p[1] >= 0 &&
                p[0] <= l.width &&
                p[1] <= l.height
              );
            });
    setSelected(hit?.id || null);
    if (!hit || hit.locked) return;
    if (["erase", "restore", "brush"].includes(tool)) {
      if (tool === "brush") {
        const paint = newLayer("image");
        paint.width = board.width;
        paint.height = board.height;
        paint.x = paint.y = 0;
        paint.name = "Paint stroke";
        const stroke: Stroke = {
          points: [xy],
          size: brush.size,
          hardness: brush.hardness * (1 - brush.feather),
          opacity: brush.opacity,
          restore: true,
        };
        const pending: NonNullable<typeof drag.current> = {
          start: xy,
          layer: paint,
          mode: "paint",
          base: project,
          pan,
          stroke,
          origin: [1, 1],
        };
        drag.current = pending;
        try {
          const c = document.createElement("canvas");
          c.width = board.width;
          c.height = board.height;
          const ctx = c.getContext("2d")!;
          ctx.fillStyle = brush.color;
          ctx.fillRect(0, 0, c.width, c.height);
          const blob = await new Promise<Blob>((resolve, reject) =>
            c.toBlob((b) =>
              b ? resolve(b) : reject(new Error("Paint image encoding failed")),
            ),
          );
          paint.asset = uid();
          await putAsset(paint.asset, blob);
          ctx.clearRect(0, 0, c.width, c.height);
          paint.mask = uid();
          await putAsset(
            paint.mask,
            await new Promise<Blob>((resolve, reject) =>
              c.toBlob((b) =>
                b
                  ? resolve(b)
                  : reject(new Error("Paint mask encoding failed")),
              ),
            ),
          );
          if (pending.finished) {
            paint.strokes = [stroke];
            mutate((p) =>
              p.artboards.find((b) => b.id === board.id)?.layers.push(paint),
            );
            setSelected(paint.id);
            return;
          }
          const base = structuredClone(latest.current!);
          base.artboards.find((b) => b.id === board.id)!.layers.push(paint);
          pending.base = base;
          pending.mode = "stroke";
          const preview = structuredClone(base);
          preview.artboards
            .find((b) => b.id === board.id)!
            .layers.find((l) => l.id === paint.id)!.strokes = [
            structuredClone(stroke),
          ];
          latest.current = preview;
          setProject(preview);
          setSelected(paint.id);
        } catch (error) {
          drag.current = null;
          setMessage(String(error));
        }
        return;
      }
      if (hit.type !== "image") return;
      const img = await original(hit.asset!);
      const p = localPoint(hit, ...xy),
        sx = img.width / hit.width,
        sy = img.height / hit.height;
      const stroke: Stroke = {
        points: [[p[0] * sx, p[1] * sy]],
        size: brush.size * sx,
        aspect: sy / sx,
        hardness: brush.hardness * (1 - brush.feather),
        opacity: brush.opacity,
        restore: tool === "restore",
      };
      drag.current = {
        start: xy,
        layer: hit,
        mode: "stroke",
        base: project,
        pan,
        stroke,
        origin: [sx, sy],
      };
    } else
      drag.current = {
        start: xy,
        layer: hit,
        mode: mode || "move",
        corner,
        base: project,
        pan,
      };
  }
  function pointerMove(e: React.PointerEvent) {
    setCursor({ x: e.clientX, y: e.clientY });
    const d = drag.current;
    if (!d) return;
    const xy = point(e);
    if (d.mode === "pan") {
      setPan({
        x: d.pan.x + e.clientX - d.start[0],
        y: d.pan.y + e.clientY - d.start[1],
      });
      return;
    }
    if (d.mode === "paint") {
      d.stroke!.points.push(xy);
      return;
    }
    if (d.mode === "subject") {
      const rect = subjectRegion(
        d.start,
        localPoint(d.layer!, ...xy),
        d.layer!.width,
        d.layer!.height,
      );
      setSubjectArea({ layerId: d.layer!.id, rect });
      return;
    }
    if (d.mode === "crop") return;
    const next = structuredClone(d.base),
      l = next.artboards
        .find((b) => b.id === next.active)!
        .layers.find((l) => l.id === d.layer!.id)!;
    if (d.mode === "move") {
      l.x += xy[0] - d.start[0];
      l.y += xy[1] - d.start[1];
    }
    if (d.mode === "resize") {
      Object.assign(l, resizeLayer(d.layer!, xy, d.corner || "br", e.shiftKey));
    }
    if (d.mode === "rotate")
      l.rotation =
        (Math.atan2(xy[1] - l.y - l.height / 2, xy[0] - l.x - l.width / 2) *
          180) /
          Math.PI +
        90;
    if (d.mode === "stroke") {
      const p = localPoint(d.layer!, ...xy);
      d.stroke!.points.push([p[0] * d.origin![0], p[1] * d.origin![1]]);
      l.strokes.push(structuredClone(d.stroke!));
    }
    latest.current = next;
    setProject(next);
  }
  function pointerUp(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (d.mode === "subject") {
      const rect = subjectRegion(
        d.start,
        localPoint(d.layer!, ...point(e)),
        d.layer!.width,
        d.layer!.height,
      );
      if (
        rect.width * d.layer!.width < 8 ||
        rect.height * d.layer!.height < 8
      ) {
        setSubjectArea(null);
        setMessage(
          "Draw a larger rectangle around the subject, with some background around its edges.",
        );
      } else {
        setSubjectArea({ layerId: d.layer!.id, rect });
        setMessage(
          "Subject area set. Remove background to process this area; outside pixels become transparent. Original pixels remain available to restore.",
        );
      }
      setTool("select");
      return;
    }
    if (d.mode === "paint") {
      d.finished = true;
      return;
    }
    if (d.mode === "crop") {
      const end = point(e),
        x = Math.max(0, Math.min(d.start[0], end[0])),
        y = Math.max(0, Math.min(d.start[1], end[1])),
        w = Math.min(board!.width - x, Math.abs(end[0] - d.start[0])),
        h = Math.min(board!.height - y, Math.abs(end[1] - d.start[1]));
      if (w > 5 && h > 5)
        mutate((p) => {
          const b = p.artboards.find((b) => b.id === p.active)!;
          b.width = Math.round(w);
          b.height = Math.round(h);
          for (const l of b.layers) {
            l.x -= x;
            l.y -= y;
          }
        });
    } else if (d.mode !== "pan") {
      if (d.mode === "stroke" && latest.current === d.base) {
        const next = structuredClone(d.base);
        next.artboards
          .find((b) => b.id === next.active)!
          .layers.find((l) => l.id === d.layer!.id)!
          .strokes.push(d.stroke!);
        latest.current = next;
      }
      commit(structuredClone(latest.current!));
    }
  }
  if (!project || !board)
    return (
      <div className="loading">
        <div className="brand-mark">u</div>
        <p>Opening your local studio…</p>
      </div>
    );
  return (
    <div
      className="editor"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void importFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept={acceptImages}
        multiple
        hidden
        onChange={(e) => {
          void importFiles(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      <input
        ref={backupRef}
        type="file"
        accept=".uncanva,application/json"
        hidden
        onChange={async (e) => {
          try {
            if (e.target.files?.[0] && editable.current) {
              const p = await restoreBackup(e.target.files[0]);
              commit(p);
              setSelected(null);
            }
          } catch (error) {
            setMessage(String(error));
          }
          e.target.value = "";
        }}
      />
      {updateAvailable && (
        <div className="update-notice" role="status">
          A newer editor is ready. Save and reload to use its improvements.
          <button
            className="button"
            disabled={!!busy}
            onClick={async () => {
              try {
                await saveChain.current;
                if (latest.current && !readOnly)
                  await saveProject(latest.current);
                location.reload();
              } catch (error) {
                setMessage(
                  `Could not save before reload: ${String(error)}. Download a backup first.`,
                );
              }
            }}
          >
            Save and update
          </button>
        </div>
      )}
      {readOnly && (
        <div className="read-only" role="status">
          Another tab is editing. This tab is read-only; close the other tab and
          reload to edit here.
        </div>
      )}
      <header>
        <div className="brand">
          <span className="brand-mark">
            u<span>✦</span>
          </span>
          UnCanva<span className="studio">STUDIO</span>
        </div>
        <span className="divider" />
        <input
          className="project-name"
          aria-label="Project name"
          value={project.name}
          onChange={(e) =>
            mutate((p) => {
              p.name = e.target.value;
            })
          }
        />
        <span className="save-status">
          <Check size={13} />
          {status}
        </span>
        <div className="header-actions">
          <button className="button" onClick={() => setSetup(true)}>
            Device setup
          </button>
          <button
            className="button"
            onClick={() => {
              void saveChain.current
                .then(async () => {
                  if (latest.current && !readOnly)
                    await saveProject(latest.current);
                  setGallery(true);
                })
                .catch((e) => setMessage(String(e)));
            }}
          >
            Projects
          </button>
          <IconButton
            title="Undo"
            onClick={() => undo()}
            disabled={!history.current?.past.length}
          >
            <Undo2 size={18} />
          </IconButton>
          <IconButton
            title="Redo"
            onClick={() => undo(true)}
            disabled={!history.current?.future.length}
          >
            <Redo2 size={18} />
          </IconButton>
          <span className="divider" />
          <button className="button" onClick={() => fileRef.current?.click()}>
            <Upload size={16} />
            Import image
          </button>
          <button
            className="button copy-button"
            onClick={() => void copyImage()}
          >
            <Copy size={16} />
            Copy PNG
          </button>
          <button
            className="button primary"
            onClick={() => setShowExport(true)}
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </header>
      <div className="main">
        <nav className="toolbar" aria-label="Tools">
          {tools.map(([id, Icon, title]) => (
            <button
              key={id}
              title={title}
              aria-label={title}
              aria-pressed={tool === id}
              className={tool === id ? "active" : ""}
              onClick={() => {
                if (id === "text") add("text");
                else if (id === "shape") add("rect");
                else setTool(id);
              }}
            >
              <Icon size={20} />
            </button>
          ))}
          <div className="toolbar-bottom">
            <IconButton
              title="Toggle pages panel"
              onClick={() => setSidebar(!sidebar)}
            >
              <PanelLeftClose size={19} />
            </IconButton>
            <span className="local-dot" />
          </div>
        </nav>
        {sidebar && (
          <PagesPanel
            {...{ project, board, selected, setSelected, mutate, setPan }}
          />
        )}
        <section
          className="workspace"
          ref={workspace}
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey)
              setZoom((z) =>
                Math.max(0.05, Math.min(3, z * Math.exp(-e.deltaY * 0.01))),
              );
            else setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
          }}
        >
          <div className="workspace-top">
            <span>
              <span className="breadcrumb">Workspace</span> / {board.name}
            </span>
            <span className="privacy-pill">
              <span />
              {online ? "Local workspace" : "Offline · local workspace"}
            </span>
          </div>
          <div className="canvas-center">
            <div
              className="artboard-wrap"
              style={{
                width: board.width * zoom,
                height: board.height * zoom,
                transform: `translate(${pan.x}px,${pan.y}px)`,
              }}
            >
              <div className="artboard-label">
                <span>{board.name}</span>
                <span>
                  {board.width} × {board.height} px
                </span>
              </div>
              <canvas
                ref={canvasRef}
                aria-label="Editing canvas"
                className={`editing-canvas checker tool-${tool}`}
                style={{
                  width: board.width * zoom,
                  height: board.height * zoom,
                }}
                onPointerDown={(e) => void pointerDown(e)}
                onPointerMove={pointerMove}
                onPointerUp={pointerUp}
                onPointerCancel={pointerUp}
                onPointerLeave={() => setCursor(null)}
              />
              {layer && layer.visible && subjectArea?.layerId === layer.id && (
                <div
                  className="ai-area-frame"
                  style={{
                    left: layer.x * zoom,
                    top: layer.y * zoom,
                    width: layer.width * zoom,
                    height: layer.height * zoom,
                    transform: `rotate(${layer.rotation}deg)`,
                  }}
                >
                  <div
                    className="ai-area"
                    aria-label="Selected subject area"
                    style={{
                      left: `${subjectArea.rect.x * 100}%`,
                      top: `${subjectArea.rect.y * 100}%`,
                      width: `${subjectArea.rect.width * 100}%`,
                      height: `${subjectArea.rect.height * 100}%`,
                    }}
                  />
                </div>
              )}
              {layer && layer.visible && tool === "select" && (
                <div
                  className="selection"
                  style={{
                    left: layer.x * zoom,
                    top: layer.y * zoom,
                    width: layer.width * zoom,
                    height: layer.height * zoom,
                    transform: `rotate(${layer.rotation}deg)`,
                  }}
                >
                  <div className="rotation-line" />
                  <button
                    aria-label="Rotate selected layer"
                    className="rotation-handle"
                    onPointerDown={(e) => void pointerDown(e, "rotate")}
                    onPointerMove={pointerMove}
                    onPointerUp={pointerUp}
                  />
                  {(["tl", "tr", "bl", "br"] as const).map((pos) => (
                    <button
                      key={pos}
                      aria-label="Resize selected layer"
                      className={`resize-handle ${pos}`}
                      onPointerDown={(e) => void pointerDown(e, "resize", pos)}
                      onPointerMove={pointerMove}
                      onPointerUp={pointerUp}
                    />
                  ))}
                </div>
              )}
              {!board.layers.length && tool !== "brush" && tool !== "crop" && (
                <div className="empty-canvas">
                  <div className="empty-icon">
                    <ImagePlus size={34} />
                    <span>✦</span>
                  </div>
                  <h1>
                    A little idea.
                    <br />
                    Endless possibilities.
                  </h1>
                  <p>
                    Drop an image here to make it yours.
                    <br />
                    Everything happens on your device.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Plus size={17} />
                    Choose an image
                  </button>
                  <span className="file-hint">
                    PNG, JPG, WebP & more · or paste ⌘ V
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="workspace-bottom">
            <span>
              {tool === "select"
                ? "Drag to move · Shift + resize to keep proportions"
                : tool === "crop"
                  ? "Drag on the canvas to crop"
                  : tool === "pan"
                    ? "Drag to pan around your canvas"
                    : `${tool} tool · changes stay editable`}
            </span>
            <div className="zoom-controls">
              <button
                aria-label="Zoom out"
                onClick={() => setZoom((z) => Math.max(0.05, z / 1.2))}
              >
                −
              </button>
              <input
                aria-label="Zoom percentage"
                type="number"
                min="5"
                max="300"
                value={Math.round(zoom * 100)}
                onChange={(e) =>
                  setZoom(Math.max(0.05, Math.min(3, +e.target.value / 100)))
                }
              />
              <span>%</span>
              <button
                aria-label="Zoom in"
                onClick={() => setZoom((z) => Math.min(3, z * 1.2))}
              >
                +
              </button>
              <IconButton
                title="Fit artboard"
                onClick={() => {
                  const r = workspace.current!.getBoundingClientRect();
                  setZoom(
                    Math.min(
                      (r.width - 100) / board.width,
                      (r.height - 160) / board.height,
                      1,
                    ),
                  );
                  setPan({ x: 0, y: 0 });
                }}
              >
                <Maximize size={15} />
              </IconButton>
            </div>
          </div>
        </section>
        <PropertiesPanel
          {...{
            project,
            board,
            layer,
            selected,
            setSelected,
            mutate,
            tab,
            setTab,
            tool,
            setTool,
            brush,
            setBrush,
            busy,
            removeBackground,
            modelId,
            setModelId: (id: ModelId) => {
              setModelId(id);
              try {
                localStorage.setItem("uncanva-background-model", id);
              } catch {
                /* Session choice remains usable. */
              }
            },
            subjectArea: subjectArea?.layerId === layer?.id,
            editSelection,
            clearSubjectArea: () => {
              setSubjectArea(null);
              setTool("select");
            },
            cleanup: async () => {
              await saveChain.current;
              if (latest.current) await saveProject(latest.current);
              const live = [
                latest.current!,
                ...(history.current?.past || []),
                ...(history.current?.future || []),
              ];
              const result = await compactAssets(live);
              setMessage(
                `Removed ${result.count} unused assets (${(result.bytes / 1048576).toFixed(1)} MB). Undo and saved projects preserved.`,
              );
            },
            readOnly,
            updateLayer,
            updateBoard,
            deleteSelected,
            add,
            backupRef,
            setMessage,
          }}
        />
      </div>
      {cursor && ["erase", "restore", "brush"].includes(tool) && (
        <div
          className="brush-cursor"
          style={{
            left: cursor.x,
            top: cursor.y,
            width: brush.size * zoom,
            height: brush.size * zoom,
          }}
        />
      )}
      {promptId && (
        <div className="import-prompt">
          <Sparkles size={21} />
          <div>
            <strong>Would you like to remove the background?</strong>
            <p>AI runs privately on your device. Choose a model in Adjust.</p>
          </div>
          <button
            className="button primary"
            onClick={() => void removeBackground(promptId)}
          >
            Remove background
          </button>
          <button className="button" onClick={() => setPromptId(null)}>
            Keep original
          </button>
          <button
            className="text-button"
            onClick={() => {
              localStorage.setItem("uncanva-skip-bg", "true");
              setPromptId(null);
            }}
          >
            Don&apos;t ask again
          </button>
        </div>
      )}
      {message && (
        <div className="toast" role="status">
          <span>{message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      )}
      {busy && (
        <div className="busy" role="status">
          <span className="spinner" />
          {busy}
          {aiRef.current && (
            <button
              onClick={() => {
                aiRef.current?.terminate();
                aiRef.current = null;
                setBusy("");
              }}
            >
              Cancel AI
            </button>
          )}
        </div>
      )}
      <DeviceSetup
        open={setup}
        onClose={() => setSetup(false)}
        onOpen={() => setSetup(true)}
      />
      {gallery && project && (
        <div className="modal-backdrop">
          <ProjectGallery
            active={project.id}
            readOnly={readOnly}
            onClose={() => setGallery(false)}
            onOpen={async (id) => {
              await saveChain.current;
              const p = await loadProject(id);
              if (p) {
                if (!readOnly) await saveProject(p);
                history.current = new History(p);
                latest.current = p;
                setProject(p);
                setSelected(null);
                setGallery(false);
                setPan({ x: 0, y: 0 });
              }
            }}
            onNew={async () => {
              await saveChain.current;
              if (latest.current) await saveProject(latest.current);
              const p = newProject();
              await saveProject(p);
              history.current = new History(p);
              latest.current = p;
              setProject(p);
              setSelected(null);
              setGallery(false);
            }}
          />
        </div>
      )}
      {showExport && (
        <div className="modal-backdrop" onClick={() => setShowExport(false)}>
          <section
            className="export-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Export image"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-heading">
              <h2>Ready for the world.</h2>
              <button
                className="icon-btn"
                aria-label="Close export"
                onClick={() => setShowExport(false)}
              >
                ×
              </button>
            </div>
            <p className="helper">
              Your edits, rendered at full quality. Right here.
            </p>
            <label className="field">
              File name
              <input
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
              />
            </label>
            <label className="field">
              Format
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                {formats.map((f) => (
                  <option key={f.mime} value={f.mime}>
                    {f.label} · {f.note}
                  </option>
                ))}
              </select>
            </label>
            <p className="helper">{formatInfo(format).note}</p>
            {formatInfo(format).quality && (
              <label className="slider-control">
                <span>
                  Quality<output>{Math.round(quality * 100)}%</output>
                </span>
                <input
                  aria-label="Export quality"
                  type="range"
                  min=".1"
                  max="1"
                  step=".01"
                  value={quality}
                  onChange={(e) => setQuality(+e.target.value)}
                />
              </label>
            )}
            <label className="field">
              Scale
              <select
                value={scale}
                onChange={(e) => {
                  setScale(+e.target.value);
                  setCustom({ w: 0, h: 0 });
                }}
              >
                <option value="0.5">0.5×</option>
                <option value="1">1× · artboard resolution</option>
                <option value="2">2×</option>
              </select>
            </label>
            <div className="field-grid">
              <label className="field">
                Output width
                <input
                  aria-label="Export width"
                  type="number"
                  placeholder={String(Math.round(board.width * scale))}
                  value={custom.w || ""}
                  onChange={(e) =>
                    setCustom((c) => ({ ...c, w: +e.target.value }))
                  }
                />
              </label>
              <label className="field">
                Output height
                <input
                  aria-label="Export height"
                  type="number"
                  placeholder={String(Math.round(board.height * scale))}
                  value={custom.h || ""}
                  onChange={(e) =>
                    setCustom((c) => ({ ...c, h: +e.target.value }))
                  }
                />
              </label>
            </div>
            <p className="helper">
              Up to 8192 px per edge / 32 MP. Custom width and height scale
              independently.
            </p>
            <button
              className="button primary wide"
              onClick={() => void exportImage()}
            >
              <Download size={16} />
              Export this artboard
            </button>
            <button
              className="button wide"
              onClick={() => void exportImage(true)}
            >
              {format === "application/pdf"
                ? `Export ${project.artboards.length}-page PDF`
                : `Export all ${project.artboards.length} artboards`}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
