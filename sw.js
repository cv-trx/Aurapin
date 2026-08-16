/* AuraPin Service Worker — يخزّن هيكل التطبيق (الواجهة) محليًا حتى يفتح بدون اتصال.
   لا يخزّن بيانات الملصقات نفسها (تلك مسؤولية IndexedDB داخل index.html). */

const CACHE_NAME = 'aurapin-shell-v5';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './favicon-32.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      /* addAll يفشل كامل لو ملف واحد ناقص — نضيف كل ملف لحاله عشان ما يوقف التثبيت */
      return Promise.all(
        SHELL_FILES.map((file) =>
          cache.add(file).catch((e) => console.warn('[SW] تعذّر تخزين:', file, e))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  /* لا نتدخل أبدًا بطلبات Firebase أو Supabase أو أي API خارجي —
     هذي بيانات حية يجب أن تفشل بوضوح لو ما فيه نت، لا أن تُخدَّم من كاش قديم */
  if (!req.url.startsWith(self.location.origin)) return;

  /* طلبات التنقل (فتح الصفحة نفسها): جرّب الشبكة أولًا، ولو فشلت ارجع للنسخة المخزَّنة */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  /* باقي ملفات الهيكل (أيقونات، مانيفست): كاش أولًا، ولو مو موجود جرّب الشبكة */
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).catch(() => undefined))
  );
});
