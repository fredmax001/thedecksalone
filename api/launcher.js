const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'dist', 'server.js');
const out = path.join(__dirname, 'server.log');

const child = spawn('node', [serverPath], {
  cwd: __dirname,
  env: { ...process.env, PORT: '5002' },
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe']
});

const fs = require('fs');
const logStream = fs.createWriteStream(out, { flags: 'a' });
child.stdout.pipe(logStream);
child.stderr.pipe(logStream);

child.unref();
fs.writeFileSync(path.join(__dirname, 'server.pid'), String(child.pid));
console.log('Server started with PID ' + child.pid);
process.exit(0);
