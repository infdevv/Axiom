const { createBareServer } = require('@tomphttp/bare-server-node');
const { createServer } = require('http');
const Fastify = require('fastify');
const fastifyStatic = require('@fastify/static');
const { join } = require('path');
const fs = require('fs').promises;
const path = require('path');
const bare = createBareServer('/svr/');
const fastify = Fastify();



fastify.register(fastifyStatic, {
    root: join(__dirname, 'frontend'),
    prefix: '/',
    decorateReply: false,
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
});

fastify.get('/search_complete/*', async (req, reply) => {
    const query = req.params['*'];
    if (!query) {
        reply.status(400).send('Search query is missing');
        return;
    }
    try {
        const response = await fetch(`https://google.com/complete/search?client=firefox&hl=en&q=${encodeURIComponent(query)}`);
        const suggestions = await response.json();
        reply.status(200).send(suggestions);
    } catch (error) {
        console.error('Error fetching search suggestions:', error);
        reply.status(500).send('no search results.');
    }
});



const activeKeys = process.env.ACTIVE_KEYS?.split(",") || [];

fastify.get("/api/check-premium", async (request, reply) => {
    const key = request.headers['key'];
    if (activeKeys.includes(key)) {
        reply.send({ success: true });
    } else {
        reply.send({ success: false });
    }
});

fastify.post("/api/ai", async (request, reply) => {
  try {
    const response = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body),
    });

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return reply.code(500).send({ error: 'Invalid response from AI service' });
    }

    const content = data.choices[0].message.content;

    if (content.includes("---")) {
      reply.send(content.split("---")[0].trim());
    } else {
      reply.send(content);
    }
  } catch (error) {
    reply.code(500).send({
      error: error.message,
    });
  }
})


fastify.setNotFoundHandler((req, reply) => {
    reply.status(404).sendFile('404.html', { root: join(__dirname, 'public') });
});

const server = createServer();

server.on('request', (req, res) => {
    if (bare.shouldRoute(req)) {
        bare.routeRequest(req, res);
        return;
    }
    fastify.ready(err => {
        if (err) throw err;
        fastify.server.emit('request', req, res);
    });
});

server.on('upgrade', (req, socket, head) => {
    if (bare.shouldRoute(req, socket, head)) {
        bare.routeUpgrade(req, socket, head);
    } else {
        socket.end();
    }
});

server.listen(process.env.PORT || 8080, () => {
    console.log(`Server listening on port ${process.env.PORT || 8080}`);
});