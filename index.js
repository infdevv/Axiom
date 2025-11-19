import { createServer } from "node:http";
import path, { join } from "node:path";
import { hostname } from "node:os";
import { server as wispServer } from '@mercuryworkshop/wisp-js/server';
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import pkg from 'javascript-obfuscator';
const { JavaScriptObfuscator } = pkg;
import fs from "node:fs/promises";

const fastify = Fastify({
	serverFactory: (handler) => {
		return createServer()
			.on("request", (req, res) => {
				res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
				res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
				handler(req, res);
			})
			.on("upgrade", (req, socket, head) => {
				if (req.url.endsWith("/wisp/")) wispServer.routeRequest(req, socket, head);
				else socket.end();
			});
	},
});

function obfs(data){
	return JavaScriptObfuscator.obfuscate(data, {
		compact: true,
		identifierNamesGenerator: "hexadecimal",
		simplify: true,
		rotateStringArray: true,
	});
}

let cache = {}

fastify.register(fastifyStatic, {
	root: path.join(process.cwd(), "frontend"),
	prefix: "/",
decorateReply: true,
  beforeHandler: async (request, reply) => {
    console.log("preHandler:", request.url);
    try {
      const { url } = request;
      const fileType = path.extname(url).toLowerCase();
      console.log("fileType:", fileType);
      if (fileType === ".js") {
        console.log("is js");
   if (url.includes("epoxy/") || url.includes("baremux/") || url.includes("math/") || url.includes("images/") || url.includes("eta/")) {
     console.log("excluded");
  return done();
   }
   console.log("not excluded, caching if needed");
   if (!cache[url]) {
     const filePath = path.join(process.cwd(), "frontend", url);
     console.log("reading", filePath);
  const content = await fs.readFile(filePath, "utf-8");
  console.log("read, length", content.length);
     cache[url] = obfs(content);
     console.log("obfuscated");
   }
   const obfCode = cache[url].getObfuscatedCode();
   console.log("sending obf length", obfCode.length);
   reply.send(obfCode);
   console.log("sent");
   return;
      }
      console.log("non js, done");
      done();
    } catch (e) {
      console.error("preHandler error:", e);
      done();
    }
  },
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

// fuckass caddy auth caddy-auth?domain=
fastify.get("/caddy-auth", async (request, reply) => {
	// just give a 200
	reply.status(200);
	return;
})

fastify.register(fastifyStatic, {
	root: epoxyPath,
	prefix: "/math/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: baremuxPath,
	prefix: "/images/",
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
    const response = await fetch('https://charbot.ape3d.com/prompt?q=' + encodeURIComponent(request.body.messages[request.body.messages.length - 1].content), 'https://charbot.ape3d.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
	return response
  }
})

fastify.server.on("listening", () => {
	const address = fastify.server.address();

	// by default we are listening on 0.0.0.0 (every interface)
	// we just need to list a few
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