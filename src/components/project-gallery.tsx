"use client";
import { useEffect, useState } from "react";
import { Project } from "@/lib/document";
import { listProjects, deleteProject } from "@/lib/storage";
export default function ProjectGallery({
  active,
  onOpen,
  onNew,
  onClose,
  readOnly,
}: {
  active: string;
  onOpen: (id: string) => Promise<void>;
  onNew: () => Promise<void>;
  onClose: () => void;
  readOnly: boolean;
}) {
  const [items, setItems] = useState<Project[]>([]),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [deleting, setDeleting] = useState<string | null>(null);
  useEffect(() => {
    listProjects()
      .then(setItems)
      .catch((e) => setError(String(e)));
  }, []);
  async function run(task: () => Promise<void>) {
    setPending(true);
    try {
      await task();
    } catch (e) {
      setError(String(e));
    } finally {
      setPending(false);
    }
  }
  return (
    <section
      className="project-gallery"
      role="dialog"
      aria-modal="true"
      aria-label="Local projects"
    >
      <h2>Your projects</h2>
      <p>
        Saved in this browser on this device. Keep portable backups for
        safekeeping.
      </p>
      <button
        className="button primary"
        disabled={pending || readOnly}
        onClick={() => void run(onNew)}
      >
        New project
      </button>
      <div className="project-list">
        {items.map((p) => (
          <article key={p.id}>
            <div>
              <strong>{p.name || "Untitled project"}</strong>
              <p>
                {p.artboards.length} artboards
                {p.id === active ? " · current" : ""}
              </p>
            </div>
            <button
              className="button"
              disabled={pending}
              onClick={() => void run(() => onOpen(p.id))}
            >
              Open {p.name || "Untitled project"}
            </button>
            {p.id !== active && (
              <button
                className="text-button"
                disabled={pending || readOnly}
                onClick={() => setDeleting(p.id)}
              >
                Delete {p.name || "Untitled project"}
              </button>
            )}
            {deleting === p.id && (
              <div role="alert">
                <p>
                  Delete this local project? Download its backup first if you
                  need it later.
                </p>
                <button className="button" onClick={() => setDeleting(null)}>
                  Keep project
                </button>
                <button
                  className="button"
                  onClick={() =>
                    void run(async () => {
                      await deleteProject(p.id);
                      setItems(items.filter((i) => i.id !== p.id));
                      setDeleting(null);
                    })
                  }
                >
                  Delete permanently
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      <button className="button" onClick={onClose}>
        Back to editor
      </button>
    </section>
  );
}
