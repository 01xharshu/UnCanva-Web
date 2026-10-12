"use client";
import ColorManagement from "./color-management";
import { Dispatch, SetStateAction, RefObject, useState } from "react";
import {
  Sparkles,
  ImagePlus,
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Type,
  Square,
  Circle,
  Save,
  FolderOpen,
  ShieldCheck,
} from "lucide-react";
import {
  Adjustments,
  Artboard,
  Layer,
  Project,
  defaults,
  dimensions,
  uid,
} from "@/lib/document";
import { backup } from "@/lib/storage";
import { download } from "@/lib/render";
import { prepareOfflineAI } from "@/lib/offline";
import { bandNames } from "@/lib/hsl";
import { models, modelIds, ModelId } from "@/lib/ai-models";
import { Tool, Brush } from "./types";
type Props = {
  project: Project;
  board: Artboard;
  layer: Layer | undefined;
  selected: string | null;
  setSelected: (id: string | null) => void;
  mutate: (fn: (p: Project) => void) => void;
  tab: string;
  setTab: (s: string) => void;
  tool: Tool;
  setTool: (s: Tool) => void;
  brush: Brush;
  setBrush: Dispatch<SetStateAction<Brush>>;
  busy: string;
  removeBackground: () => Promise<void>;
  cleanup: () => Promise<void>;
  readOnly: boolean;
  subjectArea: boolean;
  selectObject: () => Promise<void>;
  wandTolerance: number;
  setWandTolerance: (n: number) => void;
  wandContiguous: boolean;
  setWandContiguous: (b: boolean) => void;
  clearSubjectArea: () => void;
  editSelection: (action: "erase" | "keep" | "restore") => Promise<void>;
  modelId: ModelId;
  setModelId: (id: ModelId) => void;
  updateLayer: (p: Partial<Layer>) => void;
  developRAW: () => Promise<void>;
  updateBoard: (p: Partial<Artboard>) => void;
  deleteSelected: () => void;
  add: (t: Layer["type"]) => void;
  backupRef: RefObject<HTMLInputElement | null>;
  setMessage: (s: string) => void;
};
const controls: [
  keyof Omit<
    Adjustments,
    "curve" | "redCurve" | "greenCurve" | "blueCurve" | "hsl"
  >,
  number,
  number,
  number,
][] = [
  ["brightness", -100, 100, 1],
  ["contrast", -100, 100, 1],
  ["saturation", -100, 100, 1],
  ["exposure", -4, 4, 0.1],
  ["temperature", -100, 100, 1],
  ["tint", -100, 100, 1],
  ["highlights", -100, 100, 1],
  ["shadows", -100, 100, 1],
  ["whites", -100, 100, 1],
  ["blacks", -100, 100, 1],
  ["grayscale", 0, 100, 1],
  ["gamma", 0.1, 3, 0.05],
  ["vibrance", -100, 100, 1],
  ["sharpness", 0, 100, 1],
  ["blur", 0, 40, 0.5],
  ["vignette", 0, 100, 1],
  ["red", -100, 100, 1],
  ["green", -100, 100, 1],
  ["blue", -100, 100, 1],
  ["hue", -180, 180, 1],
];
export default function PropertiesPanel({
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
  setModelId,
  subjectArea, selectObject, wandTolerance, setWandTolerance, wandContiguous, setWandContiguous,
  clearSubjectArea,
  editSelection,
  cleanup,
  readOnly,
  updateLayer,
  developRAW,
  updateBoard,
  deleteSelected,
  add,
  backupRef,
  setMessage,
}: Props) {
  const [curveChannel, setCurveChannel] = useState<
    "curve" | "redCurve" | "greenCurve" | "blueCurve"
  >("curve");
  const [hslBand, setHslBand] = useState(0);
  const [offlineStage, setOfflineStage] = useState("");
  const [caching, setCaching] = useState(false);
  return (
    <aside className="right-panel">
      <div className="properties-title">
        Make it yours<span>✦</span>
      </div>
      <div className="property-tabs">
        {["Adjust", "Layer", "Canvas"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="properties-scroll">
        {tab === "Adjust" && (
          <>
            <div className="section-label">
              SMART TOOLS <span>ON DEVICE</span>
            </div>
            <label className="field">
              Background model
              <select
                aria-label="Background model"
                value={modelId}
                disabled={!!busy}
                onChange={(e) => setModelId(e.target.value as ModelId)}
              >
                {modelIds.map((id) => (
                  <option key={id} value={id}>
                    {models[id].label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="ai-button"
              disabled={layer?.type !== "image" || !!busy || layer?.locked}
              onClick={() => void removeBackground()}
            >
              <span className="ai-icon">
                <Sparkles size={19} />
              </span>
              <span>
                <strong>Remove background</strong>
                <small>
                  Local AI ·{" "}
                  {modelId === "portrait"
                    ? "portrait matting"
                    : "general subjects"}
                </small>
              </span>
              <span>↗</span>
            </button>
            <p className="helper">
              {models[modelId].description} Refine edges with erase and restore.
            </p>
            {layer?.rawSource && layer.rawOptions && <section className="subject-controls"><h3>Camera RAW development</h3>
              <p className="helper">The source RAW file stays in this local project. Rebuild the rendered layer after changing settings.</p>
              <label className="field"><input type="checkbox" aria-label="Full resolution RAW" checked={!layer.rawOptions.halfSize} onChange={e=>updateLayer({rawOptions:{...layer.rawOptions!,halfSize:!e.target.checked}})} /> Develop at full resolution</label>
              <label className="field">White balance<select aria-label="RAW white balance" value={layer.rawOptions.whiteBalance} onChange={e=>updateLayer({rawOptions:{...layer.rawOptions!,whiteBalance:e.target.value as "camera"|"auto"}})}><option value="camera">Camera metadata</option><option value="auto">Automatic</option></select></label>
              <label className="slider-control"><span>Exposure · {layer.rawOptions.exposure} EV</span><input aria-label="RAW exposure" type="range" min="-3" max="3" step="0.1" value={layer.rawOptions.exposure} onChange={e=>updateLayer({rawOptions:{...layer.rawOptions!,exposure:+e.target.value}})} /></label>
              <label className="slider-control"><span>Denoise · {layer.rawOptions.denoise}</span><input aria-label="RAW denoise" type="range" min="0" max="100" step="1" value={layer.rawOptions.denoise} onChange={e=>updateLayer({rawOptions:{...layer.rawOptions!,denoise:+e.target.value}})} /></label>
              <button className="button" disabled={!!busy||layer.locked} onClick={()=>void developRAW()}>Develop from original RAW</button>
            </section>}
            {board && <ColorManagement board={board} layer={layer} updateBoard={updateBoard} updateLayer={updateLayer} setMessage={setMessage} />}
            {layer?.type === "path" && layer.pathPoints && <div className="subject-controls">
              <h3>Path nodes</h3>
              <div style={{maxHeight:220,overflowY:"auto"}}>{layer.pathPoints.map((point,index)=><div key={index} style={{display:"flex",gap:6}}><span>{index+1}</span>{point.map((v,axis)=><input key={axis} aria-label={`Node ${index+1} ${axis?"Y":"X"}`} type="number" min="0" max="1" step="0.01" value={v} onChange={e=>{const points=layer.pathPoints!.map(p=>[...p] as [number,number]);points[index][axis]=Math.max(0,Math.min(1,Number(e.target.value)));updateLayer({pathPoints:points,pathData:"M "+points.map(p=>p.join(" ")).join(" L ")+" Z"});}} />)}</div>)}</div>
            </div>}
            {layer?.type === "path" && <div className="subject-controls">
              <h3>Vector path</h3>
              <label>SVG path data<textarea aria-label="Vector path data" value={layer.pathData || ""} onChange={e => { if (/^[MmLlHhVvCcSsQqTtAaZz0-9.,+\-\seE]*$/.test(e.target.value)) updateLayer({pathData:e.target.value,pathPoints:undefined}); }} /></label>
              <p className="helper">SVG M/L/C/Q/A commands are editable. Drawn outlines also have editable nodes in Layer properties.</p>
            </div>}
            {layer?.type === "image" && (
              <div className="subject-controls">
                <button className="button" disabled={!!busy || layer.locked} onClick={() => setTool("lasso")}>Freehand lasso</button>
                <button className="button" disabled={!!busy || layer.locked} onClick={() => setTool("wand")}>Magic wand</button>
                <label>Wand tolerance {wandTolerance}<input aria-label="Wand tolerance" type="range" min="0" max="255" value={wandTolerance} onChange={e => setWandTolerance(Number(e.target.value))} /></label>
                <label><input type="checkbox" checked={wandContiguous} onChange={e => setWandContiguous(e.target.checked)} /> Connected pixels only</label>
                <button className="button" disabled={!!busy || layer.locked} onClick={() => void selectObject()}>Select object automatically</button>
                <button
                  className="button"
                  disabled={!!busy || layer.locked}
                  onClick={() => {
                    setTool("subject");
                    setMessage(
                      "Draw around the person or object, including a little surrounding background. This does not crop the artboard.",
                    );
                  }}
                >
                  Select image area
                </button>
                {subjectArea && (
                  <div className="selection-actions">
                    <button
                      className="button"
                      disabled={!!busy || layer.locked}
                      onClick={() => void editSelection("erase")}
                    >
                      Erase selected area
                    </button>
                    <button
                      className="button"
                      disabled={!!busy || layer.locked}
                      onClick={() => void editSelection("keep")}
                    >
                      Keep only selected area
                    </button>
                    <button
                      className="button"
                      disabled={!!busy || layer.locked}
                      onClick={() => void editSelection("restore")}
                    >
                      Restore selected area
                    </button>
                  </div>
                )}
                {subjectArea && (
                  <button className="text-button" onClick={clearSubjectArea}>
                    Use whole image
                  </button>
                )}
                <p className="helper">
                  {subjectArea
                    ? "Only the outlined area is processed. Outside becomes transparent; Restore can recover those pixels."
                    : "Draw an area to erase, keep or restore pixels. For AI, include the subject and some surrounding background while excluding unrelated frames or graphics."}
                </p>
              </div>
            )}
            {layer?.type === "image" && (
              <button
                className="text-button"
                onClick={() => updateLayer({ mask: undefined, strokes: [] })}
                disabled={layer.locked}
              >
                Reset mask to original
              </button>
            )}
            <div className="section-heading">
              <h3>Light & color</h3>
              <button
                className="text-button"
                disabled={layer?.type !== "image" || layer?.locked}
                onClick={() =>
                  updateLayer({ adjustments: structuredClone(defaults) })
                }
              >
                Reset
              </button>
            </div>
            {layer?.type === "image" ? (
              <>
                {controls.slice(0, 4).map(([key, min, max, step]) => (
                  <label className="slider-control" key={key}>
                    <span>
                      {key}
                      <output>{layer.adjustments[key]}</output>
                    </span>
                    <input
                      aria-label={key}
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={layer.adjustments[key]}
                      disabled={layer.locked}
                      onChange={(e) =>
                        updateLayer({
                          adjustments: {
                            ...layer.adjustments,
                            [key]: +e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                ))}
                <details>
                  <summary>Advanced adjustments</summary>
                  {controls.slice(4).map(([key, min, max, step]) => (
                    <label className="slider-control" key={key}>
                      <span>
                        {key}
                        <output>{layer.adjustments[key]}</output>
                      </span>
                      <input
                        aria-label={key}
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={layer.adjustments[key]}
                        disabled={layer.locked}
                        onChange={(e) =>
                          updateLayer({
                            adjustments: {
                              ...layer.adjustments,
                              [key]: +e.target.value,
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                  <div className="section-label">RGB TONE CURVE</div>
                  <label className="field">
                    Curve channel
                    <select
                      aria-label="Curve channel"
                      value={curveChannel}
                      onChange={(e) =>
                        setCurveChannel(e.target.value as typeof curveChannel)
                      }
                    >
                      {(
                        [
                          "curve",
                          "redCurve",
                          "greenCurve",
                          "blueCurve",
                        ] as const
                      ).map((key) => (
                        <option key={key} value={key}>
                          {key === "curve"
                            ? "Master RGB"
                            : key.replace("Curve", "")}
                        </option>
                      ))}
                    </select>
                  </label>
                  {layer.adjustments[curveChannel].map((v, i) => (
                    <label className="slider-control" key={i}>
                      <span>
                        Input {[0, 64, 128, 192, 255][i]}
                        <output>{v}</output>
                      </span>
                      <input
                        aria-label={`Curve point ${i + 1}`}
                        type="range"
                        min="0"
                        max="255"
                        value={v}
                        disabled={layer.locked}
                        onChange={(e) => {
                          const curve = [...layer.adjustments[curveChannel]];
                          curve[i] = +e.target.value;
                          updateLayer({
                            adjustments: {
                              ...layer.adjustments,
                              [curveChannel]: curve,
                            },
                          });
                        }}
                      />
                    </label>
                  ))}
                  <div className="section-label">HSL COLOR MIXER</div>
                  <label className="field">
                    Color range
                    <select
                      aria-label="HSL color range"
                      value={hslBand}
                      onChange={(e) => setHslBand(+e.target.value)}
                    >
                      {bandNames.map((name, i) => (
                        <option key={name} value={i}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {(["hue", "saturation", "lightness"] as const).map((key) => (
                    <label className="slider-control" key={key}>
                      <span>
                        {key}
                        <output>{layer.adjustments.hsl[hslBand][key]}</output>
                      </span>
                      <input
                        type="range"
                        aria-label={`HSL ${bandNames[hslBand]} ${key}`}
                        min={key === "hue" ? -180 : -100}
                        max={key === "hue" ? 180 : 100}
                        disabled={layer.locked}
                        value={layer.adjustments.hsl[hslBand][key]}
                        onChange={(e) => {
                          const hsl = structuredClone(layer.adjustments.hsl);
                          hsl[hslBand][key] = +e.target.value;
                          updateLayer({
                            adjustments: { ...layer.adjustments, hsl },
                          });
                        }}
                      />
                    </label>
                  ))}
                </details>
              </>
            ) : (
              <div className="choose-layer">
                <ImagePlus size={24} />
                <p>
                  Select an image layer
                  <br />
                  to adjust light and color.
                </p>
              </div>
            )}
            <div className="section-heading">
              <h3>Brush & edge refinement</h3>
            </div>
            <div className="brush-toggle">
              {(["erase", "restore", "brush"] as Tool[]).map((t) => (
                <button
                  key={t}
                  className={tool === t ? "active" : ""}
                  onClick={() => setTool(t)}
                >
                  {t === "brush" ? "Paint" : t}
                </button>
              ))}
            </div>
            {(["size", "hardness", "opacity", "feather"] as const).map((k) => (
              <label key={k} className="slider-control">
                <span>
                  {k}
                  <output>
                    {k === "size"
                      ? `${brush[k]} px`
                      : `${Math.round(brush[k] * 100)}%`}
                  </output>
                </span>
                <input
                  aria-label={`Brush ${k}`}
                  type="range"
                  min={k === "size" ? 1 : 0}
                  max={k === "size" ? 500 : 1}
                  step={k === "size" ? 1 : 0.01}
                  value={brush[k]}
                  onChange={(e) =>
                    setBrush((b) => ({ ...b, [k]: +e.target.value }))
                  }
                />
              </label>
            ))}
            <label className="field">
              Paint color
              <input
                type="color"
                value={brush.color}
                onChange={(e) =>
                  setBrush((b) => ({ ...b, color: e.target.value }))
                }
              />
            </label>
          </>
        )}
        {tab === "Layer" && (
          <>
            {layer ? (
              <>
                <div className="section-label">LAYER PROPERTIES</div>
                <label className="field">
                  Name
                  <input
                    value={layer.name}
                    disabled={layer.locked}
                    onChange={(e) => updateLayer({ name: e.target.value })}
                  />
                </label>
                <div className="field-grid">
                  {(
                    [
                      "x",
                      "y",
                      "width",
                      "height",
                      "rotation",
                      "opacity",
                    ] as const
                  ).map((k) => (
                    <label className="field" key={k}>
                      {k}
                      <input
                        type="number"
                        aria-label={`Layer ${k}`}
                        value={layer[k]}
                        step={k === "opacity" ? 0.05 : 1}
                        min={
                          k === "opacity"
                            ? 0
                            : k === "width" || k === "height"
                              ? 1
                              : undefined
                        }
                        max={k === "opacity" ? 1 : undefined}
                        disabled={layer.locked}
                        onChange={(e) => {
                          const v = +e.target.value;
                          if (Number.isFinite(v))
                            updateLayer({
                              [k]:
                                k === "opacity"
                                  ? Math.max(0, Math.min(1, v))
                                  : k === "width" || k === "height"
                                    ? Math.max(1, v)
                                    : v,
                            });
                        }}
                      />
                    </label>
                  ))}
                </div>
                {layer.type === "text" && (
                  <>
                    <label className="field">
                      Text
                      <textarea
                        value={layer.text}
                        disabled={layer.locked}
                        onChange={(e) => updateLayer({ text: e.target.value })}
                      />
                    </label>
                    <label className="field">
                      Font size
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={layer.fontSize}
                        disabled={layer.locked}
                        onChange={(e) =>
                          updateLayer({
                            fontSize: Math.max(1, +e.target.value),
                          })
                        }
                      />
                    </label>
                  </>
                )}
                {layer.type !== "image" && (
                  <label className="field">
                    Color
                    <input
                      type="color"
                      value={layer.color}
                      disabled={layer.locked}
                      onChange={(e) => updateLayer({ color: e.target.value })}
                    />
                  </label>
                )}
                <div className="button-grid">
                  <button
                    className="button"
                    disabled={layer.locked}
                    onClick={() =>
                      mutate((p) => {
                        const b = p.artboards.find((b) => b.id === p.active)!,
                          i = b.layers.findIndex((l) => l.id === selected);
                        if (i < b.layers.length - 1)
                          [b.layers[i], b.layers[i + 1]] = [
                            b.layers[i + 1],
                            b.layers[i],
                          ];
                      })
                    }
                  >
                    <ChevronUp size={14} />
                    Forward
                  </button>
                  <button
                    className="button"
                    disabled={layer.locked}
                    onClick={() =>
                      mutate((p) => {
                        const b = p.artboards.find((b) => b.id === p.active)!,
                          i = b.layers.findIndex((l) => l.id === selected);
                        if (i > 0)
                          [b.layers[i], b.layers[i - 1]] = [
                            b.layers[i - 1],
                            b.layers[i],
                          ];
                      })
                    }
                  >
                    <ChevronDown size={14} />
                    Backward
                  </button>
                  <button
                    className="button"
                    onClick={() => {
                      const n = structuredClone(layer);
                      n.id = uid();
                      n.x += 20;
                      n.y += 20;
                      n.locked = false;
                      mutate((p) =>
                        p.artboards
                          .find((b) => b.id === p.active)!
                          .layers.push(n),
                      );
                      setSelected(n.id);
                    }}
                  >
                    <Copy size={14} />
                    Duplicate
                  </button>
                  <button
                    className="button danger"
                    disabled={layer.locked}
                    onClick={deleteSelected}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <p className="helper">
                Select a layer on the canvas or in the layers panel.
              </p>
            )}
            <div className="section-heading">
              <h3>Add something</h3>
            </div>
            <div className="button-grid">
              <button className="button" onClick={() => add("text")}>
                <Type size={15} />
                Text
              </button>
              <button className="button" onClick={() => add("rect")}>
                <Square size={15} />
                Rectangle
              </button>
              <button className="button" onClick={() => add("ellipse")}>
                <Circle size={15} />
                Ellipse
              </button>
            </div>
          </>
        )}
        {tab === "Canvas" && (
          <>
            <div className="section-label">ARTBOARD SIZE</div>
            <label className="field">
              Preset
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    const [w, h] = e.target.value.split("x").map(Number);
                    updateBoard({ width: w, height: h });
                  }
                }}
              >
                <option value="">Choose a size</option>
                <option value="1080x1080">Social square · 1080 × 1080</option>
                <option value="1080x1920">Story · 1080 × 1920</option>
                <option value="1920x1080">Landscape · 1920 × 1080</option>
                <option value="1200x900">Classic · 1200 × 900</option>
              </select>
            </label>
            <div className="field-grid">
              {(["width", "height"] as const).map((k) => (
                <label className="field" key={k}>
                  {k}
                  <input
                    type="number"
                    aria-label={`Artboard ${k}`}
                    value={board[k]}
                    onChange={(e) => {
                      try {
                        dimensions(
                          k === "width" ? +e.target.value : board.width,
                          k === "height" ? +e.target.value : board.height,
                        );
                        updateBoard({ [k]: +e.target.value });
                      } catch (error) {
                        setMessage(String(error));
                      }
                    }}
                  />
                </label>
              ))}
            </div>
            <label className="field">
              Background
              <select
                value={
                  board.background === "transparent" ? "transparent" : "color"
                }
                onChange={(e) =>
                  updateBoard({
                    background:
                      e.target.value === "transparent"
                        ? "transparent"
                        : "#ffffff",
                  })
                }
              >
                <option value="transparent">Transparent</option>
                <option value="color">Solid color</option>
              </select>
            </label>
            {board.background !== "transparent" && (
              <input
                aria-label="Artboard background color"
                type="color"
                value={board.background}
                onChange={(e) => updateBoard({ background: e.target.value })}
              />
            )}
            <div className="section-heading">
              <h3>Offline tools</h3>
            </div>
            <button
              className="button wide"
              disabled={caching || !!busy}
              onClick={async () => {
                setCaching(true);
                try {
                  await prepareOfflineAI(setOfflineStage, modelId);
                  setMessage(
                    "AI model and runtime cached on this device. The production app also caches its shell automatically.",
                  );
                } catch (error) {
                  setMessage(String(error));
                  setOfflineStage("");
                } finally {
                  setCaching(false);
                }
              }}
            >
              {caching ? offlineStage : "Download AI for offline use"}
            </button>
            {offlineStage && !caching && (
              <p className="helper">{offlineStage}</p>
            )}
            <p className="helper">
              Selected model: {(models[modelId].bytes / 1048576).toFixed(1)} MB
              plus runtime, downloaded from this website. Your images stay on
              your device. Browser storage can be cleared or evicted.
            </p>
            <div className="section-heading">
              <h3>Project files</h3>
            </div>
            <button
              className="button wide"
              onClick={async () => {
                try {
                  download(await backup(project), `${project.name}.uncanva`);
                } catch (e) {
                  setMessage(String(e));
                }
              }}
            >
              <Save size={16} />
              Download project backup
            </button>
            <button
              className="button wide"
              onClick={() => backupRef.current?.click()}
            >
              <FolderOpen size={16} />
              Open project backup
            </button>
            <p className="helper">
              Backups include original images and every editable layer. Browser
              storage is local; keep a backup for safekeeping.
            </p>
            <button
              className="button full"
              disabled={readOnly || !!busy}
              onClick={() => void cleanup().catch((e) => setMessage(String(e)))}
            >
              Remove unused local assets
            </button>
          </>
        )}
      </div>
      <div className="panel-footer">
        <ShieldCheck size={13} />
        100% local. 100% yours.
      </div>
    </aside>
  );
}
