importScripts("/eta/bundle.js");
importScripts("/eta/config.js");
importScripts(__uv$config.sw || "/eta/sw.js");

const uv = new UVServiceWorker();

async function handleRequest(event) {
	if (uv.route(event)) {
		return await uv.fetch(event);
	}

	return await fetch(event.request);
}

self.addEventListener("fetch", (event) => {
	event.respondWith(handleRequest(event));
});

self.addEventListener("install", (event) => {
	console.log("Service worker installing...");
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	console.log("Service worker activating...");
	event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
	if (event.data && event.data.type === "SKIP_WAITING") {
		console.log("Received SKIP_WAITING message");
		self.skipWaiting();
	}
});
