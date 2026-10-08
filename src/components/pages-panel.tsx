"use client";
import {
  Copy,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Layers,
  Type,
  ImagePlus,
  Square,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ShieldCheck,
} from "lucide-react";
import { Artboard, Project, uid, newBoard } from "@/lib/document";
import { IconButton, Thumbnail } from "./editor-ui";
type Props = {
  project: Project;
  board: Artboard;
  selected: string | null;
  setSelected: (id: string | null) => void;
  mutate: (fn: (p: Project) => void) => void;
  setPan: (p: { x: number; y: number }) => void;
};
export default function PagesPanel({
  project,
  board,
  selected,
  setSelected,
  mutate,
  setPan,
}: Props) {
  return (
    <aside className="left-panel">
      <div className="panel-title">
        <span>Pages</span>
        <span className="count">{project.artboards.length}</span>
        <IconButton
          title="Add artboard"
          onClick={() => {
            const b = newBoard();
            b.name = `Artboard ${project.artboards.length + 1}`;
            mutate((p) => {
              p.artboards.push(b);
              p.active = b.id;
            });
            setSelected(null);
          }}
        >
          <Plus size={18} />
        </IconButton>
      </div>
      <div className="boards">
        {project.artboards.map((b, i) => (
          <div
            key={b.id}
            className={`board-card ${b.id === board.id ? "selected" : ""}`}
          >
            <button
              className="board-preview"
              onClick={() => {
                mutate((p) => {
                  p.active = b.id;
                });
                setSelected(null);
                setPan({ x: 0, y: 0 });
              }}
            >
              <Thumbnail board={b} />
              <span className="page-number">{i + 1}</span>
            </button>
            <div className="board-caption">
              <input
                aria-label={`Artboard ${i + 1} name`}
                value={b.name}
                onChange={(e) =>
                  mutate((p) => {
                    p.artboards.find((x) => x.id === b.id)!.name =
                      e.target.value;
                  })
                }
              />
              <span>
                {b.width} × {b.height}
              </span>
            </div>
            {b.id === board.id && (
              <div className="mini-actions">
                <IconButton
                  title="Duplicate artboard"
                  onClick={() =>
                    mutate((p) => {
                      const n = structuredClone(b);
                      n.id = uid();
                      n.name += " copy";
                      n.layers.forEach((l) => (l.id = uid()));
                      p.artboards.push(n);
                      p.active = n.id;
                    })
                  }
                >
                  <Copy size={13} />
                </IconButton>
                <IconButton
                  title="Move artboard up"
                  disabled={i === 0}
                  onClick={() =>
                    mutate((p) => {
                      [p.artboards[i - 1], p.artboards[i]] = [
                        p.artboards[i],
                        p.artboards[i - 1],
                      ];
                    })
                  }
                >
                  <ChevronUp size={13} />
                </IconButton>
                <IconButton
                  title="Move artboard down"
                  disabled={i === project.artboards.length - 1}
                  onClick={() =>
                    mutate((p) => {
                      [p.artboards[i + 1], p.artboards[i]] = [
                        p.artboards[i],
                        p.artboards[i + 1],
                      ];
                    })
                  }
                >
                  <ChevronDown size={13} />
                </IconButton>
                <IconButton
                  title="Delete artboard"
                  disabled={project.artboards.length === 1}
                  onClick={() =>
                    mutate((p) => {
                      p.artboards = p.artboards.filter((x) => x.id !== b.id);
                      p.active = p.artboards[0].id;
                    })
                  }
                >
                  <Trash2 size={13} />
                </IconButton>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="panel-title layer-heading">
        <Layers size={16} />
        <span>Layers</span>
        <span className="count">{board.layers.length}</span>
      </div>
      <div className="layer-list">
        {[...board.layers].reverse().map((l) => (
          <div
            key={l.id}
            className={`layer-row ${l.id === selected ? "selected" : ""}`}
          >
            <button className="layer-select" onClick={() => setSelected(l.id)}>
              {l.type === "text" ? (
                <Type size={15} />
              ) : l.type === "image" ? (
                <ImagePlus size={15} />
              ) : (
                <Square size={15} />
              )}
              <span>{l.name}</span>
            </button>
            <IconButton
              title={l.visible ? "Hide layer" : "Show layer"}
              onClick={() =>
                mutate((p) => {
                  const x = p.artboards
                    .find((b) => b.id === p.active)!
                    .layers.find((x) => x.id === l.id)!;
                  x.visible = !x.visible;
                })
              }
            >
              {l.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </IconButton>
            <IconButton
              title={l.locked ? "Unlock layer" : "Lock layer"}
              onClick={() =>
                mutate((p) => {
                  const x = p.artboards
                    .find((b) => b.id === p.active)!
                    .layers.find((x) => x.id === l.id)!;
                  x.locked = !x.locked;
                })
              }
            >
              {l.locked ? <Lock size={13} /> : <Unlock size={13} />}
            </IconButton>
          </div>
        ))}
        {!board.layers.length && (
          <p className="muted empty-layers">
            Your layers will appear here.
            <br />
            Start with an image or a little type.
          </p>
        )}
      </div>
      <div className="local-card">
        <ShieldCheck size={18} />
        <div>
          <strong>Made here. Stays here.</strong>
          <p>Your images never leave this device.</p>
        </div>
      </div>
    </aside>
  );
}
