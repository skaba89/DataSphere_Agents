import cluster from 'cluster';
import { availableParallelism } from 'os';

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);
  
  // Fork workers
  const numWorkers = Math.min(availableParallelism(), 2);
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  // Worker process - start Next.js
  const { createServer } = await import('http');
  const { parse } = await import('url');
  const next = (await import('next')).default;
  
  const app = next({ dev: false });
  const handle = app.getRequestHandler();
  
  app.prepare().then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error:', err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    }).listen(3000, () => {
      console.log(`Worker ${process.pid} ready on http://localhost:3000`);
    });
  });
}
