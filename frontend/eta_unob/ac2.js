
self.__uv$config = {
	prefix: "/loco/assets/",
	encodeUrl: function(url) {
		if (typeof Ultraviolet !== 'undefined' && Ultraviolet.base64 && Ultraviolet.codec) {
			return Ultraviolet.base64.encode(Ultraviolet.codec.xor.encode(url));
		}
		
		try {
			return btoa(encodeURIComponent(url));
		} catch (e) {
			
			return url;
		}
	},
	decodeUrl: function(url) {
		if (typeof Ultraviolet !== 'undefined' && Ultraviolet.base64 && Ultraviolet.codec) {
			return Ultraviolet.codec.xor.decode(Ultraviolet.base64.decode(url));
		}
		
		try {
			
			if (url && typeof url === 'string' && url.length > 0) {
				
				if (url.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(url)) {
					return decodeURIComponent(atob(url));
				}
			}
			
			return url;
		} catch (e) {
			
			return url;
		}
	},
	handler: "/eta/aa.js",
	client: "/eta/ab.js",
	bundle: "/eta/ac.js",
	config: "/eta/ac2.js",
	sw: "/eta/ae.js",
};
