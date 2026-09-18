// שומר את האתר בטלפון כדי שיעבוד גם בהרים, בלי קליטה.
// אחרי שמוסיפים או מחליפים תמונות/אריחי מפה: מעדכנים את הרשימה כאן ומעלים את מספר הגרסה.
const VERSION = 'trip-v1';

const CDN = [
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js',
];

const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/js/dc-runtime.js',
  'assets/fonts/fonts.css',
  'assets/fonts/heebo-hebrew.woff2',
  'assets/fonts/heebo-latin.woff2',
  'assets/fonts/rubik-hebrew.woff2',
  'assets/fonts/rubik-latin.woff2',
  'assets/icons/apple-touch-icon.png',
  'assets/icons/favicon-32.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/photos/aosta-arch.jpg',
  'assets/photos/aosta-cathedral.jpg',
  'assets/photos/borgosesia.jpg',
  'assets/photos/brusson.jpg',
  'assets/photos/fontainemore-river.jpg',
  'assets/photos/fontainemore-view.jpg',
  'assets/photos/gran-paradiso.jpg',
  'assets/photos/hero.jpg',
  'assets/photos/isola-bella.jpg',
  'assets/photos/isola-madre-view.jpg',
  'assets/photos/lac-bleu.jpg',
  'assets/photos/lago-maen.jpg',
  'assets/photos/lillaz-falls.jpg',
  'assets/photos/malpensa-checkin.jpg',
  'assets/photos/malpensa-terminal.jpg',
  'assets/photos/matterhorn-cervinia.jpg',
  'assets/photos/mottarone.jpg',
  'assets/photos/orta-aerial.jpg',
  'assets/photos/orta-island.jpg',
  'assets/photos/orta-sacro-monte.jpg',
  'assets/photos/saint-vincent-panorama.jpg',
  'assets/photos/saint-vincent-street.jpg',
  'assets/photos/stresa-promenade.jpg',
  'assets/photos/varallo-sacro-monte.jpg',
  'assets/photos/varallo.jpg',
  'assets/tiles/4_7_5.png',
  'assets/tiles/4_7_6.png',
  'assets/tiles/4_8_5.png',
  'assets/tiles/4_8_6.png',
  'assets/tiles/4_9_5.png',
  'assets/tiles/4_9_6.png',
  'assets/tiles/9_266_182.png',
  'assets/tiles/9_266_183.png',
  'assets/tiles/9_267_182.png',
  'assets/tiles/9_267_183.png',
  'assets/tiles/9_268_182.png',
  'assets/tiles/9_268_183.png',
  'assets/tiles/10_532_365.png',
  'assets/tiles/10_532_366.png',
  'assets/tiles/10_533_364.png',
  'assets/tiles/10_533_365.png',
  'assets/tiles/10_533_366.png',
  'assets/tiles/10_534_364.png',
  'assets/tiles/10_534_365.png',
  'assets/tiles/10_534_366.png',
  'assets/tiles/10_535_364.png',
  'assets/tiles/10_535_365.png',
  'assets/tiles/10_536_364.png',
  'assets/tiles/10_536_365.png',
  'assets/tiles/11_1070_729.png',
  'assets/tiles/11_1070_730.png',
  'assets/tiles/11_1070_731.png',
  'assets/tiles/11_1071_729.png',
  'assets/tiles/11_1071_730.png',
  'assets/tiles/11_1071_731.png',
  'assets/tiles/11_1072_729.png',
  'assets/tiles/11_1072_730.png',
  'assets/tiles/11_1072_731.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    let failed = 0;
    await Promise.all(PRECACHE.concat(CDN).map((url) =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => { failed += 1; })
    ));
    // הדף קורא את הסימון הזה כדי להציג "נשמר בטלפון"
    if (failed === 0) {
      await cache.put('__ready', new Response('ok'));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('trip-') && n !== VERSION).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// דף ה-HTML: קודם מהרשת (כדי שעדכונים יגיעו), ואם אין קליטה מהשמור.
async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  try {
    const fresh = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
    ]);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (e) {
    return (await cache.match(request, { ignoreSearch: true }))
      || (await cache.match('index.html'))
      || (await cache.match('./'))
      || Response.error();
  }
}

// שאר הקבצים (תמונות, מפות, פונטים): קודם מהשמור, ואם חסר מהרשת.
async function cacheFirst(request) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const fresh = await fetch(request);
  if (fresh && fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !CDN.includes(request.url)) return; // תחזית וכו': הדף מטפל בעצמו
  if (sameOrigin && url.pathname.endsWith('/sw.js')) return;
  const isPage = request.mode === 'navigate' || (sameOrigin && (url.pathname === '/' || url.pathname.endsWith('/index.html')));
  event.respondWith(isPage ? networkFirst(request) : cacheFirst(request));
});
