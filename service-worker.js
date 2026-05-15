const CACHE_NAME = "container-lost-pwa-v1";
const OFFLINE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./favicon.png",
  "./privacy/index.php",
  "./screen-pwa/screen-1.jpg",
  "./screen-pwa/screen-2.jpg",
  "./screen-pwa/screen-3.jpg",
  "./assets/css/style.min.css",
  "./assets/js/createjs.min.js",
  "./assets/js/script.min.js",
  "./assets/images/bg.jpg",
  "./assets/images/intro-desktop.jpg",
  "./assets/images/intro-mobile.webp",
  "./assets/images/container.png",
  "./assets/images/robot-0.webp",
  "./assets/images/robot-1.webp",
  "./assets/images/robot-2.webp",
  "./assets/images/robot-3.webp",
  "./assets/images/game.webp",
  "./assets/images/tv.webp",
  "./assets/images/drone.webp",
  "./assets/images/phone.webp",
  "./assets/images/sound.webp",
  "./assets/images/shield.webp",
  "./assets/images/life.webp",
  "./assets/images/combo.webp",
  "./assets/images/battery.webp",
  "./assets/images/start-game.webp",
  "./assets/images/rain-1.webp",
  "./assets/images/rain-2.webp",
  "./assets/images/wave.svg",
  "./assets/sounds/bonus.mp3",
  "./assets/sounds/life.mp3",
  "./assets/sounds/life-restored.mp3",
  "./assets/sounds/reached.mp3",
  "./assets/sounds/shield.mp3",
  "./assets/sounds/soundtrack.mp3",
  "./assets/sounds/thunder.mp3",
  "./assets/sounds/avoid.mp3"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return networkResponse;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
