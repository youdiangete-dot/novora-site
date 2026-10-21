import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import entry from './api/prepare.mjs';

// Local executable entry; it remains unavailable without the same complete,
// isolated configuration. This file is never started by the offline tests.
createServer(async (req, res) => {
  try {
    const request = new Request(`http://localhost${req.url}`, {
      method: req.method, headers: req.headers,
      ...(req.method === 'POST' ? { body: Readable.toWeb(req), duplex: 'half' } : {}),
    });
    const response = await entry.fetch(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(503); res.end('{"ok":false,"code":"signer_unavailable"}'); }
}).listen(8080, '127.0.0.1');
