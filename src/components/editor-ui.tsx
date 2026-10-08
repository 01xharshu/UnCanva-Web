"use client";
import { useEffect, useRef } from "react";
import { Artboard } from "@/lib/document";
import { renderBoard } from "@/lib/render";
export function IconButton({
  title,
  children,
  onClick,
  disabled = false,
}: {
  title: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="icon-btn"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function Thumbnail({ board }: { board: Artboard }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let live = true;
    renderBoard(
      board,
      160,
      Math.max(1, Math.round((160 * board.height) / board.width)),
    )
      .then((c) => {
        if (live && ref.current) {
          ref.current.width = c.width;
          ref.current.height = c.height;
          ref.current.getContext("2d")!.drawImage(c, 0, 0);
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [board]);
  return <canvas ref={ref} className="thumbnail checker" />;
}
