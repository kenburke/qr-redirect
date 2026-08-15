import { handleRoutes } from './routes.js';
import { runSync } from './scraper.js';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event));
});

async function handleRequest(event) {
  try {
    return await handleRoutes(event.request, event);
  } catch (err) {
    console.error('Worker error:', err);
    return new Response('Server error', { status: 500 });
  }
}

addEventListener('scheduled', event => {
  event.waitUntil(runSync({ trigger: 'cron' }));
});
