const { error } = require("console")
const fastify = require("fastify")
const path = require("path")
const dotenv = require("dotenv")
const { server: wisp } = require("@mercuryworkshop/wisp-js/server");
const { scramjetPath } = require("@mercuryworkshop/scramjet/path");
const { epoxyPath } = require("@mercuryworkshop/epoxy-transport")
const { baremuxPath } = require("@mercuryworkshop/bare-mux/node")

let premium_keys
try {
  premium_keys = dotenv.config().parsed.PREMIUM_KEYS.split(",")
} catch (e) {
  premium_keys = ["defu"]
}

const server = fastify()

server.register(require("@fastify/static"), {
    "root": path.join(__dirname, "/frontend"),
    "prefix": "/",
    "decorateReply": true,
    "setHeaders": (res, path) => {
        if (path.endsWith("sw.js")) {
            res.setHeader("Service-Worker-Allowed", "/");
        }
    }
})

server.register(require("@fastify/static"), {
    root: scramjetPath,
    prefix: "/scram/",
    decorateReply: false
})

server.register(require("@fastify/static"), {
    root: epoxyPath,
    prefix: "/epoxy/",
    decorateReply: false
})

server.register(require("@fastify/static"), {
    root: baremuxPath,
    prefix: "/baremux/",
    decorateReply: false
})

server.register(require("@fastify/rate-limit"), {
    timeWindow: "1m",
    max: 50
})

server.get("/api/check-premium", async function(req, res) {
  const key = req.headers.key
  if (premium_keys.includes(key)) {
    res.send({ success: true })
  }
  else {
    res.send({ success: false })
  }
})

server.server.on("upgrade", (req, socket, head) => {
    if (req.url.endsWith("/wisp/")) {
        wisp.routeRequest(req, socket, head)
    } else {
        socket.end()
    }
})

const port = process.env.port || 8080

server.listen({port: port}).then(function(){
    console.log("AXIOM started!")
    console.log("Listening on port " + port)
    console.log("http://localhost:" + port + "/")
})