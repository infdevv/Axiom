
self.__uv$config = {
    prefix: "/assets-images/backgrounds/",
    encodeUrl: function (url) { return Ultraviolet.codec.base64.encode(Ultraviolet.codec.xor.encode(url)); },
    decodeUrl: function (url) { return Ultraviolet.codec.xor.decode(Ultraviolet.codec.base64.decode(url)); },
    handler: "/eta/handler.js",
    client: "/eta/client.js",
    bare: "/svr/",
    bundle: "/eta/bundle.js",
    config: "/eta/config.js",
    sw: "/eta/sw.js",
};