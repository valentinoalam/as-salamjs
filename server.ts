import './register.js';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { setupSocketServer } from './server/socket-server.ts';

const dev = process.env.NODE_ENV !== 'production';
const hostname = dev? 'localhost' : '0.0.0.0';
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async(req, res) => {
    try {
        const parsedUrl = parse(req.url!, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error handling request:', err);
        res.statusCode = 500;
        res.end('Internal server error');
      }
    });

  const io = setupSocketServer(httpServer)

  io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);
  });

  httpServer.once('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  }).listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
