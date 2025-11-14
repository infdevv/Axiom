# ETA Unobfuscated Source Files

This directory contains the unobfuscated source files for the `/eta/` route.

## Setup Instructions

1. Place your unobfuscated Ultraviolet files in this directory:
   - `bundle.js`
   - `client.js`
   - `config.js`
   - `handler.js`
   - `sw.js`

2. Run the build script to obfuscate them:
   ```bash
   npm run build:eta
   ```

3. The obfuscated files will be output to `frontend/eta/`

## Getting the Ultraviolet Files

If you don't have these files yet, you can get them from:
- Build Ultraviolet from source: https://github.com/titaniumnetwork-dev/Ultraviolet
- Or copy them from an existing Ultraviolet installation

## Notes

- The build script uses javascript-obfuscator with settings optimized for service worker compatibility
- Make sure to run `npm install` first to install the required dependencies
- Keep these source files for future modifications
