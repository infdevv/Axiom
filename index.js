const { createServer } = require("node:http");
const { fileURLToPath } = require("url");
const { join } = require('path');
const { hostname } = require("node:os");
const fs = require("node:fs/promises");
const { server: wisp } = require("@mercuryworkshop/wisp-js/server");
const Fastify = require("fastify");
const fastifyStatic = require("@fastify/static");
const { epoxyPath } = require("@mercuryworkshop/epoxy-transport");
const { baremuxPath } = require("@mercuryworkshop/bare-mux/node");


const fastify = Fastify({
  serverFactory: (handler) => {
    return createServer()
      .on("request", handler)
      .on("upgrade", (req, socket, head) => {
        if (req.url === "/wisp/") wisp.routeRequest(req, socket, head);
        else socket.destroy();
      });
  },
  logger: false,
});

fastify.register(fastifyStatic, {
  root: join(__dirname, 'frontend'),
  prefix: '/',
  decorateReply: true
});

fastify.register(fastifyStatic, {
  root: epoxyPath,
  prefix: "/images/",
  decorateReply: false,
});

fastify.register(fastifyStatic, {
  root: baremuxPath,
  prefix: "/math/",
  decorateReply: false,
});

fastify.register(fastifyStatic, {
  root: epoxyPath,
  prefix: "/epoxy/",
  decorateReply: false,
});

fastify.register(fastifyStatic, {
  root: baremuxPath,
  prefix: "/baremux/",
  decorateReply: false,
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
  reply.code(404).type('text/html').sendFile('/frontend/404.html');
});

const shutdown = () => {
  console.log("Shutting down server...");
  fastify.close().then(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

fastify.listen({
  port: parseInt(process.env.PORT || "8080"),
  host: "0.0.0.0",
}, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  
  const address = fastify.server.address();
  console.log(`Server running on http://localhost:${address.port}`);
  console.log(`Access at: http://${address.family === "IPv6" ? `[${address.address}]` : address.address}:${address.port}`);
});