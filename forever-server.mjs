import { spawn } from 'child_process';

const env = {
  ...process.env,
  DATABASE_URL: 'file:/home/z/my-project/db/custom.db',
  NODE_OPTIONS: '--max-old-space-size=4096'
};

function startServer() {
  console.log('[forever] Starting Next.js...');
  const child = spawn('npx', ['next', 'dev', '-p', '3000'], {
    cwd: '/home/z/my-project',
    env,
    stdio: 'inherit',
    detached: false
  });
  
  child.on('exit', (code) => {
    console.log(`[forever] Server exited (${code}). Restarting...`);
    setTimeout(startServer, 3000);
  });
  
  child.on('error', (err) => {
    console.error('[forever] Error:', err);
    setTimeout(startServer, 3000);
  });
}

startServer();
process.on('SIGTERM', () => {});
process.on('SIGINT', () => {});
setInterval(() => {}, 60000);
