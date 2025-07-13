import { handleRoutes } from './routes.js';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  try {
    return await handleRoutes(request);
  } catch (err) {
    console.error('Worker error:', err);
    return new Response('Server error', { status: 500 });
  }
}
