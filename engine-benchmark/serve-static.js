#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.resolve(process.cwd(), process.argv[2] || '.');
const port = Number(process.argv[3] || 8088);
const host = '127.0.0.1';

const mimeTypes = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm'
};

if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  console.error(`Directory does not exist: ${root}`);
  process.exit(1);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${host}:${port}`);
  let filePath = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream'
  });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Serving ${root} at http://${host}:${port}/`);
});
