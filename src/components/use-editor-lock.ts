"use client";
import { useEffect, useState } from "react";
/** An exclusive browser lock prevents lost updates and unsafe asset maintenance across tabs. */
export function useEditorLock() {
  const [readOnly, setReadOnly] = useState(false);
  useEffect(() => {
    if (!navigator.locks) return;
    let release: () => void = () => {},
      gone = false;
    void navigator.locks.request(
      "uncanva-editor",
      { ifAvailable: true },
      (lock) => {
        if (gone) return;
        if (!lock) {
          setReadOnly(true);
          return;
        }
        setReadOnly(false);
        return new Promise<void>((resolve) => {
          release = resolve;
        });
      },
    );
    return () => {
      gone = true;
      release();
    };
  }, []);
  return readOnly;
}
