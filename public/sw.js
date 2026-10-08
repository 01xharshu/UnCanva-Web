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
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("uncanva-shell-") && k !== VERSION)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const req = event.request,
    url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(
    (async () => {
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
