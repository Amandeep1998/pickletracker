// PickleTracker push notification handlers
// Imported by the Workbox-generated service worker via importScripts.
//
// Icons must be absolute https URLs (especially on Android/iOS Web Push). Relative
// paths often resolve incorrectly from the SW scope. Avoid using `badge` with a full-
// color PNG — Android expects a small monochrome badge and may hide the main icon.

function resolveAbsoluteUrl(pathOrUrl) {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return new URL(path, self.location.origin).href;
}

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'PickleTracker', body: event.data.text() };
  }

  const origin = self.location.origin;
  const {
    title = 'PickleTracker',
    body = '',
    url = '/tournaments',
    tag = 'pickletracker',
    icon: payloadIcon,
    image: payloadImage,
  } = payload;

  // Same branding as PWA / favicon treatment: maskable PNGs (not SVG — unsupported).
  const icon =
    resolveAbsoluteUrl(payloadIcon) ||
    resolveAbsoluteUrl('/icon-192.png');
  const image = resolveAbsoluteUrl(payloadImage) || resolveAbsoluteUrl('/icon-512.png');

  const options = {
    body,
    icon,
    tag,
    renotify: true,
    data: { url },
    vibrate: [80],
    silent: false,
  };

  // Large image on Android expanded notification; omit if missing (optional field).
  if (image) options.image = image;

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = event.notification.data?.url || '/tournaments';
  const targetUrl = resolveAbsoluteUrl(raw) || new URL('/tournaments', self.location.origin).href;
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});
