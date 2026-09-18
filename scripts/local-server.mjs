import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import { dirname, resolve, relative, isAbsolute, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import worker from '../src/worker.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = resolve(root, 'public');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp', '.woff2': 'font/woff2' };

// Serve only public files, including when a path contains encoded traversal or symlinks.
export async function serveAsset(request) {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url).pathname); }
  catch { return new Response('Invalid path', { status: 400 }); }
  if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(p => p.startsWith('.'))) return new Response('Not found', { status: 404 });
  try {
    const file = await realpath(resolve(publicRoot, '.' + (pathname === '/' ? '/index.html' : pathname)));
    const base = await realpath(publicRoot);
    const rel = relative(base, file);
    if (!rel || rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) return new Response('Not found', { status: 404 });
    const info = await stat(file);
    if (!info.isFile()) return new Response('Not found', { status: 404 });
    return new Response(request.method === 'HEAD' ? null : await readFile(file), {
      headers: { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': String(info.size) }
    });
  } catch (e) {
    if (['ENOENT', 'ENOTDIR', 'EACCES'].includes(e.code)) return new Response('Not found', { status: 404 });
    throw e;
  }
}

export function createLocalServer({ env = process.env, handler = worker } = {}) {
  return createServer(async (incoming, outgoing) => {
    try {
      const host = incoming.headers.host || `127.0.0.1:${incoming.socket.localPort}`;
      const url = new URL(incoming.url, `http://${host}`);
      // This adapter is for local use. Reject non-loopback Host headers (DNS rebinding).
      if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
        outgoing.writeHead(403); outgoing.end('Local access only'); incoming.resume(); return;
      }
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers)) {
        if (Array.isArray(value)) value.forEach(v => headers.append(key, v));
        else if (value !== undefined) headers.set(key, value);
      }
      headers.set('cf-connecting-ip', incoming.socket.remoteAddress || 'local');
      const hasBody = !['GET', 'HEAD'].includes(incoming.method);
      const request = new Request(url, { method: incoming.method, headers,
        ...(hasBody ? { body: Readable.toWeb(incoming), duplex: 'half' } : {}) });
      const response = await handler.fetch(request, { ...env, ASSETS: { fetch: serveAsset } });
      outgoing.statusCode = response.status;
      for (const [key, value] of response.headers) if (key !== 'set-cookie') outgoing.setHeader(key, value);
      const cookies = response.headers.getSetCookie();
      if (cookies.length) outgoing.setHeader('Set-Cookie', cookies);
      if (incoming.method === 'HEAD' || !response.body) outgoing.end();
      else {
        const body = Readable.fromWeb(response.body);
        body.on('error', () => outgoing.destroy());
        outgoing.on('close', () => body.destroy());
        body.pipe(outgoing);
      }
      if (!incoming.readableEnded) incoming.resume();
    } catch (e) {
      console.error('LOCAL_SERVER_ERROR', e.name || 'Error', typeof e.code === 'string' ? e.code : 'UNKNOWN');
      if (!outgoing.headersSent) {
        outgoing.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        outgoing.end(JSON.stringify({ error: 'تعذر تنفيذ الطلب على الخادم المحلي.' }));
      } else outgoing.destroy();
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { loadEnvFile(resolve(root, '.dev.vars')); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  const port = Number(process.env.PORT || 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
  const server = createLocalServer();
  server.on('error', e => {
    console.error(e.code === 'EADDRINUSE' ? `Port ${port} is busy. Stop the previous server with Ctrl+C.` : `Server could not start: ${e.code || e.name}`);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Almasri Engineering: http://127.0.0.1:${port}`);
    console.log('Local Node.js server. Keep this terminal open. Ctrl+C to stop.');
    if (!process.env.MONGODB_URI) console.log('MONGODB_URI is missing. Add it to .dev.vars.');
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}
