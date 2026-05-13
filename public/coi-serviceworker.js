/* eslint-disable */
/**
 * COOP/COEP Service Worker.
 *
 * Required for SharedArrayBuffer (used by Shen.AI's threaded WASM)
 * when the hosting platform does not set Cross-Origin-Opener-Policy
 * and Cross-Origin-Embedder-Policy headers itself.
 *
 * Based on https://github.com/gzuidhof/coi-serviceworker (MIT).
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (ev) => {
  if (ev.data && ev.data.type === "deregister") {
    self.registration
      .unregister()
      .then(() => self.clients.matchAll())
      .then((clients) => {
        clients.forEach((client) => client.navigate(client.url));
      });
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.cache === "only-if-cached" && req.mode !== "same-origin") return;

  // For cross-origin no-cors requests (e.g. some fonts/images), force credentialless
  // so they can be embedded under COEP: require-corp.
  const request =
    req.mode === "no-cors"
      ? new Request(req, { credentials: "omit" })
      : req;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 0) return response;
        const newHeaders = new Headers(response.headers);
        newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
        newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
        newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      })
      .catch((e) => console.error("[coi-sw]", e)),
  );
});
