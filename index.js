import { createServer } from "node:http";
import { hostname } from "node:os";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { fileURLToPath } from "url";

import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, "public");

logging.set_level(logging.NONE);
Object.assign(wisp.options, {
  allow_udp_streams: false,
  // jarvis prevent the great goonathon
  hostname_blacklist: [/pornhub\.com/,/xvideos\.com/,/rule34\.xxx/],
  dns_servers: ["1.1.1.3", "1.0.0.3"]
});

const fastify = Fastify({
	serverFactory: (handler) => {
		return createServer()
			.on("request", (req, res) => {
				res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
				res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
				handler(req, res);
			})
			.on("upgrade", (req, socket, head) => {
				//if (req.url.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
				//else socket.end();
        socket.end()
      });
	},
});

fastify.register(fastifyStatic, {
	root: publicPath,
	decorateReply: true,
});

fastify.register(fastifyStatic, {
  root: scramjetPath,
  prefix: "/scram/",
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

fastify.post("/ai", async function(request, reply){
  try {
    const rawBody = await new Promise((resolve, reject) => {
      let chunks = [];
      request.raw.on('data', chunk => chunks.push(chunk));
      request.raw.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      request.raw.on('error', reject);
    });

    const headers = { ...request.headers };
    delete headers['content-length'];
    delete headers['host'];

    let endpoint = "https://text.pollinations.ai/openai"
    let response = await fetch(endpoint, {
      method: request.method,
      body: rawBody,
      headers: headers
    });
    reply.code(response.status);
    for (const [key, value] of response.headers) {
      if (key.toLowerCase() !== 'content-length') {
        reply.header(key, value);
      }
    }
    return response.body.pipe(reply.raw);
  } catch (error) {
    console.log(error);
    reply.code(500).send({ error: 'Internal server error' });
  }
})

fastify.get("/api/ip", async function(request, reply){
  // return requestor's ip
  reply.send({ ip: request.ip });
})


fastify.setNotFoundHandler((req, reply) => {
  // theres not even a page lol
	return reply.code(404).type('text/html').sendFile('404.html');
});

fastify.server.on("listening", () => {
	const address = fastify.server.address();

	console.log("Listening on:");
	console.log(`\thttp://localhost:${address.port}`);
	console.log(`\thttp://${hostname()}:${address.port}`);
	console.log(
		`\thttp://${
			address.family === "IPv6" ? `[${address.address}]` : address.address
		}:${address.port}`
	);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
	console.log("SIGTERM signal received: closing HTTP server");
	fastify.close();
	process.exit(0);
}

let port = parseInt(process.env.PORT || "");

if (isNaN(port)) port = 8080;

fastify.listen({
	port: port,
	host: "0.0.0.0",
});