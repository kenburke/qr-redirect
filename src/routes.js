import {
  serveLanding,
  serveStats,
  serveDashboard,
  serveUpdateForm,
  handleUpdate,
  handleRedirect,
  exportAnalytics,
  exportHistory
} from './handlers.js';

export async function handleRoutes(request) {
  const url    = new URL(request.url);
  const path   = url.pathname.replace(/\/+$/, '');
  const method = request.method;

  if (path === '/admin'                      && method === 'GET')  return serveLanding();
  if (path === '/admin/stats'                && method === 'GET')  return serveStats();
  if (path === '/admin/dash'                 && method === 'GET')  return serveDashboard();
  if (path === '/admin/update'               && method === 'GET')  return serveUpdateForm();
  if (path === '/admin/update'               && method === 'POST') return handleUpdate(request);
  if (path === '/admin/export/analytics.csv' && method === 'GET')  return exportAnalytics();
  if (path === '/admin/export/history.csv'   && method === 'GET')  return exportHistory();
  if ((path === '' || path === '/')          && method === 'GET')  return handleRedirect();

  return new Response('Not found', { status: 404 });
}
