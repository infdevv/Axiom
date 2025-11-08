// server.js
const { createBareServer } = require('@tomphttp/bare-server-node');
const { createServer } = require('http');
const Fastify = require('fastify');
const fastifyStatic = require('@fastify/static');
const { join } = require('path');

// fallback for fetch if Node < 18
let fetchFn = globalThis.fetch;
if (!fetchFn) {
  try {
    // use undici if available
    // npm i undici
    const { fetch } = require('undici');
    fetchFn = fetch;
  } catch (err) {
    console.error('Global fetch not available and undici not installed. Please run `npm i undici` or use Node >= 18.');
    process.exit(1);
  }
}

const bare = createBareServer('/svr/');
const fastify = Fastify({ logger: true });

// Serve static files (frontend)
fastify.register(fastifyStatic, {
  root: join(__dirname, 'frontend'),
  prefix: '/',
  decorateReply: false,
  setHeaders: (res, filePath) => {
    if (filePath && filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
});

// API: search suggestions (proxy)
fastify.get('/search_complete/*', async (req, reply) => {
  // wildcard param name is '*' in fastify when using `/*`
  const query = req.params['*'] || '';
  if (!query.trim()) {
    return reply.status(400).send('Search query is missing');
  }

  try {
    // remove stray space after q= and use proper encoding
    const url = `https://google.com/complete/search?client=firefox&hl=en&q=${encodeURIComponent(query)}`;
    const response = await fetchFn(url);
    if (!response.ok) {
      fastify.log.warn({ status: response.status }, 'Bad response from google complete');
      return reply.status(502).send('Upstream service error');
    }
    const suggestions = await response.json();
    return reply.status(200).send(suggestions);
  } catch (error) {
    fastify.log.error({ err: error }, 'Error fetching search suggestions');
    return reply.status(500).send('no search results.');
  }
});

// Simple API key check
const activeKeys = (process.env.ACTIVE_KEYS || '').split(',').filter(Boolean);

fastify.get('/api/check-premium', async (request, reply) => {
  const key = request.headers['key'];
  const ok = activeKeys.includes(key);
  return reply.send({ success: ok });
});

// AI forwarder
fastify.post('/api/ai', async (request, reply) => {
  try {
    // remove trailing space in URL
    const response = await fetchFn('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.body)
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      fastify.log.warn({ status: response.status, body: text }, 'Upstream AI error');
      return reply.code(502).send({ error: 'Upstream AI service error' });
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      fastify.log.error({ data }, 'Invalid response from AI service');
      return reply.code(500).send({ error: 'Invalid response from AI service' });
    }

    let content = data.choices[0].message.content || '';

    if (content.includes('---')) {
      content = content.split('---')[0].trim();
    }

    return reply.send(content);
  } catch (error) {
    fastify.log.error({ err: error }, 'Error contacting AI service');
    return reply.code(500).send({ error: error.message || 'unknown error' });
  }
});

// 404 handler (ensure uses same folder or adjust as needed)
fastify.setNotFoundHandler((req, reply) => {
  // try to send a 404 page from frontend/404.html if exists
  reply.status(404).sendFile('404.html').catch(() => {
    reply.status(404).send('Not Found');
  });
});

// Start-up: ensure Fastify ready once, then create the http server that delegates to bare or fastify
fastify.ready().then(() => {
  const server = createServer((req, res) => {
    if (bare.shouldRoute(req)) {
      bare.routeRequest(req, res);
      return;
    }
    // fastify.server is the underlying http server; emit request
    fastify.server.emit('request', req, res);
  });

  server.on('upgrade', (req, socket, head) => {
    if (bare.shouldRoute(req)) {
      bare.routeUpgrade(req, socket, head);
    } else {
      // if you want to support websockets for Fastify routes, implement here
      socket.end();
    }
  });

  const port = process.env.PORT || 8080;
  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });

}).catch(err => {
  console.error('Fastify failed to start:', err);
  process.exit(1);
});
