const VERSION = "uncanva-shell-__BUILD__";
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const response = await fetch("/offline-shell.json", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Offline shell manifest missing");
      const urls = await response.json();
      const cache = await caches.open(VERSION);
      await cache.addAll(urls);
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        const shells = keys.filter((k) => k.startsWith("uncanva-shell-"));
        const previous = shells.filter((k) => k !== VERSION).at(-1);
        return Promise.all(
          shells
            .filter((k) => k !== VERSION && k !== previous)
            .map((k) => caches.delete(k)),
        );
      })
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const req = event.request,
    url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(
    (async () => {
      // Online navigation must see current HTML; cached HTML is the offline fallback.
      // Keep the previous shell's chunks available until open tabs save and update.
      if (req.mode === "navigate") {
        const shell = await caches.open(VERSION);
        try {
          const response = await fetch(req, {
            signal: AbortSignal.timeout(8000),
          });
          if (response.ok) await shell.put(req, response.clone());
          return response;
        } catch {
          const fallback =
            (await shell.match(req)) ||
            (await shell.match(
              url.pathname.startsWith("/editor") ? "/editor/" : "/",
            ));
          if (fallback) return fallback;
        }
      }
      const cached = await caches.match(req, {
        ignoreSearch:
          url.pathname.startsWith("/_next/") || url.pathname.endsWith(".txt"),
      });
      if (cached) return cached;
      const cache = await caches.open(VERSION);
      try {
        const response = await fetch(req);
        if (
          response.ok &&
          (url.pathname.startsWith("/_next/") ||
            url.pathname.startsWith("/runtime/") ||
            url.pathname.startsWith("/codecs/") ||
            url.pathname.startsWith("/models/") ||
            req.mode === "navigate")
        )
          await cache.put(req, response.clone());
        return response;
      } catch (error) {
        if (req.mode === "navigate") {
          const shell = await cache.match(
            url.pathname.startsWith("/editor") ? "/editor" : "/",
          );
          if (shell) return shell;
        }
        throw error;
      }
    })(),
  );
});
