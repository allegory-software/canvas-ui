npm install @lezer/lr @lezer/common @lezer/javascript @lezer/html @lezer/css
esbuild lezer/main.js --bundle --outfile=lezer-bundle.js --format=iife --global-name=LezerBundle
