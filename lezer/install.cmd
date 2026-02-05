call npm install @lezer/generator @lezer/lr @lezer/common @lezer/html @lezer/javascript @lezer/css @lezer/cpp @lezer/markdown --save-dev

call git clone git@github.com:R167/lezer-lua.git
call npx lezer-generator lezer-lua/src/lua.grammar -o lezer-lua/lua-parser.js
