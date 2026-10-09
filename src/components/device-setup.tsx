"use client";
import { useEffect, useState } from "react";
import { deviceInfo, DeviceInfo } from "@/lib/device";
export default function DeviceSetup({
  open,
  onClose,
  onOpen,
}: {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}) {
  const [info, setInfo] = useState<DeviceInfo | null>(null),
    [prompt, setPrompt] = useState(false),
    [result, setResult] = useState("");
  useEffect(() => {
    deviceInfo()
      .then((i) => {
        setInfo(i);
        try {
          setPrompt(
            !localStorage.getItem("uncanva-device-prompt-dismissed") &&
              (!i.persistent || !i.gpu || i.lowMemory),
          );
        } catch {
          /* Settings storage may be denied. */
        }
      })
      .catch(() =>
        setResult(
          "Device details unavailable. The editor still works with local fallbacks.",
        ),
      );
  }, []);
  function dismiss() {
    setPrompt(false);
    try {
      localStorage.setItem("uncanva-device-prompt-dismissed", "true");
    } catch {
      /* Dismiss for this session. */
    }
  }
  if (!open)
    return prompt ? (
      <aside className="device-prompt" aria-label="Device setup suggestion">
        <span>Keep local projects safer and review performance options.</span>
        <button
          className="text-button"
          onClick={() => {
            setPrompt(false);
            onOpen();
          }}
        >
          Review device setup
        </button>
        <button
          className="text-button"
          aria-label="Dismiss device setup suggestion"
          onClick={dismiss}
        >
          ×
        </button>
      </aside>
    ) : null;
  return (
    <div className="modal-backdrop">
      <section
        className="device-setup"
        role="dialog"
        aria-modal="true"
        aria-label="Device setup"
      >
        <h2>Make this device your studio</h2>
        <p>Recommended settings are optional. Your images stay local.</p>
        {info ? (
          <>
            <h3>Local storage</h3>
            <p>
              {info.persistent
                ? "Persistent storage is enabled."
                : "Browser storage can be evicted. Request persistent storage and keep project backups."}{" "}
              {(info.usage / 1048576).toFixed(1)} MB used
              {info.quota
                ? ` of ${(info.quota / 1048576).toFixed(0)} MB available`
                : ""}
              .
            </p>
            <button
              className="button"
              disabled={info.persistent || !navigator.storage?.persist}
              onClick={() =>
                void navigator.storage
                  .persist()
                  .then((granted) => {
                    setInfo({ ...info, persistent: granted });
                    setResult(
                      granted
                        ? "Persistent storage enabled. Continue keeping backups."
                        : "The browser did not grant persistence. Keep .uncanva backups; no browser flags are required.",
                    );
                  })
                  .catch((e) => setResult(String(e)))
              }
            >
              Keep local storage
            </button>
            <h3>Graphics acceleration</h3>
            <p>
              {info.gpu
                ? "A WebGPU adapter is available. AI attempts acceleration and retries on CPU if needed."
                : "WebGPU is unavailable here. CPU processing remains available. In Chrome or Edge, enable “Use graphics acceleration when available” in Settings → System, then restart the browser. Update the browser and graphics driver if needed. Firefox and Safari support varies; no experimental flags are required."}
            </p>
            <h3>Memory and offline use</h3>
            <p>
              {info.lowMemory
                ? "This device reports limited memory; reduced preview resolution is enabled. Prefer the fast general model and smaller images."
                : "Previews have a bounded resolution; exports use your requested full resolution."}{" "}
              In Canvas, download your selected AI model before going offline.
              Advanced formats cache their codecs on first use.
            </p>
            {!info.workers && (
              <p role="alert">
                This browser lacks worker canvas support. Use an up-to-date
                desktop browser for AI and advanced formats.
              </p>
            )}
          </>
        ) : (
          <p>Checking this browser…</p>
        )}
        {result && <p role="status">{result}</p>}
        <div className="modal-actions">
          <button
            className="button"
            onClick={() => {
              dismiss();
              onClose();
            }}
          >
            Don&apos;t show again
          </button>
          <button className="button primary" onClick={onClose}>
            Done
          </button>
        </div>
      </section>
    </div>
  );
}
