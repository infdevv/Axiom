//    "@mercuryworkshop/scramjet": "https://github.com/MercuryWorkshop/scramjet/releases/download/latest/mercuryworkshop-scramjet-2.0.0-alpha.tgz",
const { createServer } = require("node:http");
const { scramjetPath } = require("@mercuryworkshop/scramjet/path");
const { fileURLToPath } = require("url");
const { join } = require('path');
const { hostname } = require("node:os");
const { server: wisp, logging } = require("@mercuryworkshop/wisp-js/server");
const Fastify = require("fastify");
const fastifyStatic = require("@fastify/static");
const fastifyCompress = require("@fastify/compress");
const cheerio = require("cheerio");
const { epoxyPath } = require("@mercuryworkshop/epoxy-transport");
const { baremuxPath } = require("@mercuryworkshop/bare-mux/node");
const { BlockList } = require("node:net");
const { Console } = require("node:console");


logging.set_level(logging.NONE);

Object.assign(wisp.options, {
  allow_udp_streams: false,
  dns_servers: ["94.140.14.14"],
});


const NodeCache = require("node-cache");
const apiCache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); 

const http = require("node:http");
const https = require("node:https");
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

const fastify = Fastify({
	serverFactory: (handler) => {
		return createServer()
			.on("request", (req, res) => {
				handler(req, res);
			})
			.on("upgrade", (req, socket, head) => {
				if (req.url.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
				else socket.end();
			});
	},
});

// Register compression plugin for faster responses
fastify.register(fastifyCompress, {
	global: true,
	encodings: ['gzip', 'deflate'],
	threshold: 1024, // Compress responses larger than 1KB
});

// Server optimizations
fastify.server.keepAliveTimeout = 65000; // 65 seconds
fastify.server.headersTimeout = 66000; // Slightly higher than keepAliveTimeout
fastify.server.requestTimeout = 30000; // 30 second request timeout

fastify.register(fastifyStatic, {
    root: join(__dirname, 'public'),
	decorateReply: true,
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

let plugins = [];
let plugin_code = {};

// Optimized plugin loading with caching and async processing
const pluginCache = new NodeCache({ stdTTL: 3600, checkperiod: 300 }); // 1 hour cache

async function loadPlugins() {
    console.log("Loading plugins from github...");

    try {
        // Check cache first
        const cachedPlugins = pluginCache.get('plugins_list');
        const cachedPluginCode = pluginCache.get('plugin_code') || {};

        if (cachedPlugins) {
            plugins = cachedPlugins;
            plugin_code = cachedPluginCode;
            console.log("Loaded plugins from cache!");
            return;
        }

        // Fetch plugins list
        const response = await fetch("https://raw.githubusercontent.com/Axiom-Proxy/Axiom-Plugins-Directory/refs/heads/main/plugins.json", {
            agent: httpsAgent,
            timeout: 5000
        });

        if (!response.ok) {
            throw new Error('Failed to fetch plugins list');
        }

        const data = await response.json();
        plugins = data;
        plugin_code = {};

        console.log(`Fetching ${plugins.length} plugin files...`);

        // Load plugin code concurrently with limit
        const concurrentLimit = 10;
        for (let i = 0; i < plugins.length; i += concurrentLimit) {
            const batch = plugins.slice(i, i + concurrentLimit);
            await Promise.all(batch.map(async (plugin) => {
                try {
                    // Check if already cached
                    if (cachedPluginCode[plugin.name]) {
                        plugin_code[plugin.name] = cachedPluginCode[plugin.name];
                        return;
                    }

                    const pluginResponse = await fetch(`https://raw.githubusercontent.com/Axiom-Proxy/Axiom-Plugins-Directory/refs/heads/main/${plugin.src}`, {
                        agent: httpsAgent,
                        timeout: 3000
                    });

                    if (pluginResponse.ok) {
                        plugin_code[plugin.name] = await pluginResponse.text();
                    }
                } catch (error) {
                    console.error(`Failed to load plugin ${plugin.name}:`, error.message);
                }
            }));
        }

        // Cache the loaded plugins
        pluginCache.set('plugins_list', plugins);
        pluginCache.set('plugin_code', plugin_code);

        console.log(`Successfully loaded ${Object.keys(plugin_code).length} plugins!`);
    } catch (error) {
        console.error("Plugin loading failed:", error.message);
        // Use cached version if available
        const cachedPlugins = pluginCache.get('plugins_list');
        const cachedPluginCode = pluginCache.get('plugin_code');
        if (cachedPlugins) {
            plugins = cachedPlugins;
            plugin_code = cachedPluginCode || {};
            console.log("Using cached plugins due to loading failure");
        }
    }
}

// Load plugins asynchronously without blocking server startup
loadPlugins().catch(console.error);

fastify.get("/api/plugins", (request, reply) => {
    reply.send(plugins);
})

fastify.get("/api/plugin/", (request, reply) => {
    // get body "src"
    let src = request.body.src;
    reply.send(plugin_code[src]);
})

fastify.register(fastifyStatic, {
  root: scramjetPath,
  prefix: "/scram/",
  decorateReply: false,
});

// Optimized random image endpoint with timeout
fastify.get("/ran", async (request, reply) => {
    try {
        const response = await fetch("https://random-image-pepebigotes.vercel.app/api/random-image", {
            agent: httpsAgent,
            timeout: 3000
        });

        if (response.ok) {
            reply.send(response);
        } else {
            reply.code(503).send({ error: 'Random image service unavailable' });
        }
    } catch (error) {
        console.error('Random image error:', error);
        reply.code(503).send({ error: 'Random image service unavailable' });
    }
})

// Optimized YouTube search with caching
fastify.get("/api/youtube/search", async (request, reply) => {
    try {
        const { query } = request.query;

        if (!query) {
            return reply.code(400).send({ error: "Query parameter is required" });
        }

        // Check cache first
        const cacheKey = `youtube_${query.toLowerCase().trim()}`;
        const cachedResult = apiCache.get(cacheKey);
        if (cachedResult) {
            return reply.send(cachedResult);
        }

        const invidiousUrl = `https://inv.nadeko.net/search?q=${encodeURIComponent(query)}`;
        const response = await fetch(invidiousUrl, {
            agent: httpsAgent,
            timeout: 8000,
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error('Invidious request failed');
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const videos = $('.pure-u-1.pure-u-md-1-4').map((index, element) => {
            const $video = $(element);
            const $thumbnailLink = $video.find('.thumbnail a');
            const videoUrl = $thumbnailLink.attr('href');
            const videoId = videoUrl ? videoUrl.split('v=')[1] : null;

            if (!videoId) return null;

            const title = $video.find('.video-card-row a p[title]').text().trim() ||
                         $video.find('.video-card-row a p').text().trim();

            const channelName = $video.find('.video-card-row.flexible .flex-left a p.channel-name')
                .text().trim()
                .replace(/\s+/g, ' ')
                .replace(/\s*$/, '');

            const length = $video.find('.bottom-right-overlay p.length').text().trim();

            const videoDataElements = $video.find('.video-card-row.flexible .flex-left p.video-data, .video-card-row.flexible .flex-right p.video-data');
            let uploadDate = '';
            let viewCount = '';
            videoDataElements.each((i, el) => {
                const text = $(el).text().trim();
                if (text.toLowerCase().includes('ago') || text.toLowerCase().includes('shared')) {
                    uploadDate = text;
                } else if (text.toLowerCase().includes('view')) {
                    viewCount = text;
                }
            });

            const thumbnailUrl = $video.find('.thumbnail img.thumbnail').attr('src');
            const fullThumbnailUrl = thumbnailUrl && thumbnailUrl.startsWith('http') ?
                thumbnailUrl : `https://inv.nadeko.net${thumbnailUrl || `/vi/${videoId}/mqdefault.jpg`}`;

            let lengthSeconds = 0;
            if (length) {
                const parts = length.split(':');
                if (parts.length === 3) { // HH:MM:SS
                    lengthSeconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
                } else if (parts.length === 2) { // MM:SS
                    lengthSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                }
            }

            return {
                videoId: videoId,
                title: title || 'Unknown Title',
                author: channelName || 'Unknown Channel',
                lengthSeconds: lengthSeconds,
                published: uploadDate || 'Unknown date',
                views: viewCount || '0 views',
                videoThumbnails: [
                    { url: fullThumbnailUrl },
                    { url: fullThumbnailUrl },
                    { url: fullThumbnailUrl }
                ],
                url: `https://www.youtube.com/watch?v=${videoId}`,
                invidiousUrl: `https://inv.nadeko.net${videoUrl}`
            };
        }).get().filter(video => video !== null);

        const result = { videos };

        // Cache successful results for 10 minutes
        apiCache.set(cacheKey, result, 600);

        reply.send(result);

    } catch (error) {
        console.error('YouTube search error:', error);

        // Check for cached result on error
        const cachedResult = apiCache.get(cacheKey);
        if (cachedResult) {
            return reply.send(cachedResult);
        }

        reply.code(500).send({ error: 'YouTube search failed' });
    }
})

fastify.post("/api/premium/check", async (request, reply) => {

    let active_keys = process.env.ACTIVE_KEYS.split(',');
    let key = request.body.axiomPremiumKey;
    if (active_keys.includes(key)) {
        reply.send({ success: true });
    } else {
        reply.send({ success: false });
    }
})

const apiKey = '1070730380f5fee0d87cf0382670b255'; 

fastify.get("/api/movies/search", async (request, reply) => {
    const query = request.query.query || '';

    if (!query.trim()) {
        return reply.code(400).send({ error: 'Query parameter is required' });
    }

    // Check cache first
    const cacheKey = `movies_${query.toLowerCase().trim()}`;
    const cachedResult = apiCache.get(cacheKey);
    if (cachedResult) {
        return reply.send(cachedResult);
    }

    // Make concurrent requests with connection pooling and timeouts
    const [movieResponse, tvResponse, animeResponse] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}`, {
            agent: httpsAgent,
            timeout: 5000
        }),
        fetch(`https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query)}`, {
            agent: httpsAgent,
            timeout: 5000
        }),
        fetch(`https://api.themoviedb.org/3/search/collection?api_key=${apiKey}&query=${encodeURIComponent(query)}`, {
            agent: httpsAgent,
            timeout: 5000
        })
    ]);

    let movieData = await movieResponse.json();
    let tvData = await tvResponse.json();
    let animeData = await animeResponse.json();

    // add media_type to each result
    movieData.results.forEach(result => result.media_type = 'Movie');
    tvData.results.forEach(result => result.media_type = 'TV Show');
    animeData.results.forEach(result => result.media_type = 'Anime');

    // merge and send the results
    const results = [...movieData.results, ...tvData.results, ...animeData.results];
    const responseData = { results };

    // Cache successful results for 30 minutes (movies don't change often)
    apiCache.set(cacheKey, responseData, 1800);

    reply.send(responseData);
})

const endpoint = "https://api.groq.com/openai/v1/chat/completions";
const api_key = "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"; // no, this isn't my api key, so don't call me a dumbass for putting it here

fastify.post("/openai/v1/chat/completions", async (request, reply) => {
    try {
        const data = request.body;

        // Create cache key for non-streaming requests (avoid caching streams)
        let cacheKey = null;
        if (!data.stream) {
            cacheKey = `ai_${JSON.stringify(data).slice(0, 200)}`; // Use first 200 chars as key
            const cachedResult = apiCache.get(cacheKey);
            if (cachedResult) {
                return reply.send(cachedResult);
            }
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            agent: httpsAgent,
            timeout: 30000, // 30 second timeout for AI requests
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${api_key}`
            },
            body: JSON.stringify(data)
        });

        if (data.stream) {
            reply.raw.setHeader('Content-Type', 'text/plain');
            reply.raw.setHeader('Cache-Control', 'no-cache');
            reply.raw.setHeader('Connection', 'keep-alive');
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                reply.raw.write(chunk);
            }
            reply.raw.end();
        } else {
            const json = await response.json();

            // Cache non-streaming responses for 5 minutes
            if (cacheKey && json.choices && json.choices.length > 0) {
                apiCache.set(cacheKey, json, 300);
            }

            reply.send(json);
        }

    } catch (err) {
        console.error('AI endpoint error:', err);

        // Return cached result if available on error
        if (cacheKey) {
            const cachedResult = apiCache.get(cacheKey);
            if (cachedResult) {
                return reply.send(cachedResult);
            }
        }

        reply.code(500).send({ error: 'Internal Server Error' });
    }
});

fastify.setNotFoundHandler((res, reply) => {
	return reply.code(404).type('text/html').sendFile('404.html');
})

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

