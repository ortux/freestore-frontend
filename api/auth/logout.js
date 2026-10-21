const { Readable } = require('node:stream');

const hopByHopHeaders = new Set([
  'connection', 'content-encoding', 'content-length', 'keep-alive',
  'proxy-authenticate', 'proxy-authorization', 'te', 'trailer',
  'transfer-encoding', 'upgrade',
]);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const backendOrigin = process.env.BACKEND_ORIGIN;
  const proxySecret   = process.env.PROXY_SHARED_SECRET;
  if (!backendOrigin || !proxySecret) {
    res.status(503).json({ error: 'Proxy not configured' });
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
  headers.set('x-forwarded-proto', 'https');

  const target = new URL('/auth/logout', backendOrigin);
  try {
    const upstream = await fetch(target, {
      method: 'POST',
      headers,
      body: req,
      duplex: 'half',
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
  } catch (err) {
    if (!res.headersSent) res.status(502).json({ error: 'Backend unreachable' });
  }
};
