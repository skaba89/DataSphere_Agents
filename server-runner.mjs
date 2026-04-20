import { spawn } from 'child_process';

const env = {
  ...process.env,
  DATABASE_URL: 'file:/home/z/my-project/db/custom.db',
  NODE_OPTIONS: '--max-old-space-size=4096'
};

function startServer() {
  console.log('[runner] Starting Next.js dev server...');
  const child = spawn('npx', ['next', 'dev', '-p', '3000'], {
    cwd: '/home/z/my-project',
    env,
    stdio: 'inherit',
    detached: false
  });
  
  child.on('exit', (code, signal) => {
    console.log(`[runner] Server exited with code ${code}, signal ${signal}. Restarting in 3s...`);
    setTimeout(startServer, 3000);
  });
  
  child.on('error', (err) => {
    console.error('[runner] Server error:', err);
    setTimeout(startServer, 3000);
  });
}

startServer();

// Keep the process alive - ignore signals
process.on('SIGTERM', () => { console.log('[runner] SIGTERM received, ignoring'); });
process.on('SIGINT', () => { console.log('[runner] SIGINT received, ignoring'); });
setInterval(() => {}, 60000);
