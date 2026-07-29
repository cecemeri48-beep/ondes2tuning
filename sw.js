/* Pekerja layanan Chelebes Tuner — simpan aplikasi agar bisa dipakai offline.
   Naikkan angka VERSI setiap kali berkas diperbarui supaya simpanan lama dibuang. */
const VERSI = "v18";
const CACHE = "chelebes-tuner-" + VERSI;
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./logo.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-180.png",
  "./icon-192-trans.png",
  "./icon-512-trans.png",
  "./og-image.jpg"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  /* Halaman utama: ambil dari internet dulu supaya versi terbaru langsung terpakai,
     kalau sedang offline baru pakai simpanan. */
  if (req.mode === "navigate"){
    e.respondWith(
      fetch(req).then(res => {
        /* jangan simpan halaman error (404/500) sebagai "aplikasi" */
        if (res && res.ok && res.status === 200){
          const copy = res.clone();
          e.waitUntil(caches.open(CACHE).then(c => c.put("./index.html", copy)).catch(() => {}));
        }
        return res;
      }).catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  /* permintaan sebagian (Range) tidak boleh disimpan ke cache */
  if (req.headers.has("range")) return;

  /* Gambar dan berkas lain: pakai simpanan dulu supaya cepat, perbarui diam-diam. */
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.ok && res.status === 200 && res.type !== "opaque"){
          const copy = res.clone();
          e.waitUntil(caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}));
        }
        return res;
      }).catch(() => hit);
      if (hit) e.waitUntil(net.catch(() => {}));   // perbarui diam-diam
      return hit || net;
    })
  );
});
