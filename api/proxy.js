const { Readable } = require('node:stream');

const allowedMethods = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const allowedAuthPaths = new Set(['/auth/exchange', '/auth/logout', '/auth/me']);
const hopByHopHeaders = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function resolveTarget(req, origin) {
  const requestUrl = new URL(req.url || '/', 'https://proxy.invalid');
  const targetValues = requestUrl.searchParams.getAll('__proxy_target');
  let backendPath;
  const forwardedQuery = new URLSearchParams(requestUrl.searchParams);

  if (targetValues.length) {
    if (targetValues.length !== 1) return null;
    backendPath = targetValues[0];
    forwardedQuery.delete('__proxy_target');
  } else if (requestUrl.pathname.startsWith('/api/v1/')) {
    backendPath = requestUrl.pathname;
  } else if (requestUrl.pathname.startsWith('/api/')) {
    backendPath = `/api/v1/${requestUrl.pathname.slice('/api/'.length)}`;
  } else {
    backendPath = requestUrl.pathname;
  }

  const isApiPath = backendPath === '/api/v1' || backendPath.startsWith('/api/v1/');
  const isAuthPath = allowedAuthPaths.has(backendPath);
  if ((!isApiPath && !isAuthPath) || backendPath.includes('\\')) return null;

  const target = new URL(backendPath, origin);
  if (target.origin !== origin.origin ||
    (isApiPath && target.pathname !== '/api/v1' && !target.pathname.startsWith('/api/v1/')) ||
    (isAuthPath && !allowedAuthPaths.has(target.pathname))) {
    return null;
  }

  target.search = forwardedQuery.toString();
  return target;
}

module.exports = async function handler(req, res) {
  const backendOrigin = process.env.BACKEND_ORIGIN || 'https://apif.omrudra.tech';
  const proxySecret = process.env.PROXY_SHARED_SECRET;
  if (!backendOrigin || !proxySecret) {
    res.status(503).json({ error: 'API proxy is not configured' });
    return;
  }

  let origin;
  try {
    origin = new URL(backendOrigin);
  } catch {
    res.status(500).json({ error: 'API proxy backend origin is invalid' });
    return;
  }

  if ((process.env.NODE_ENV === 'production' && origin.protocol !== 'https:') ||
    origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) {
    res.status(500).json({ error: 'API proxy backend origin must be an HTTPS origin' });
    return;
  }

  if (!allowedMethods.has(req.method)) {
    res.setHeader('Allow', [...allowedMethods].join(', '));
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const target = resolveTarget(req, origin);
  if (!target) {
    res.status(404).json({ error: 'API route not found' });
    return;
  }

  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value && !hopByHopHeaders.has(name.toLowerCase()) && name.toLowerCase() !== 'host') {
      headers.set(name, Array.isArray(value) ? value.join(', ') : value);
    }
  }
  headers.set('x-proxy-secret', proxySecret);
  headers.set('x-forwarded-host', req.headers.host || '');
  headers.set('x-forwarded-proto', process.env.NODE_ENV === 'production' ? 'https' : 'http');

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req,
      duplex: 'half',
      redirect: 'manual',
    });

    res.statusCode = upstream.status;
    upstream.headers.forEach((value, name) => {
      if (!hopByHopHeaders.has(name.toLowerCase())) {
        res.setHeader(name, value);
      }
    });

    if (upstream.body) {
      Readable.fromWeb(upstream.body).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    console.error('API proxy request failed:', error instanceof Error ? error.message : 'Unknown error');
    if (!res.headersSent) {
      res.status(502).json({ error: 'Unable to reach the API service' });
    } else {
      res.destroy(error instanceof Error ? error : undefined);
    }
  }
};
