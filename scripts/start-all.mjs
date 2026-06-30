// 一条命令同时启动三个进程：后端 / 前台 / 后台。零依赖，跨平台。
// 用法：npm run all
import { spawn } from 'node:child_process';

const procs = [
  { name: 'server', color: '\x1b[32m', args: ['run', 'server'] }, // 绿
  { name: 'web', color: '\x1b[36m', args: ['run', 'web'] }, // 青
  { name: 'admin', color: '\x1b[35m', args: ['run', 'admin'] }, // 紫
];
const RESET = '\x1b[0m';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const children = [];
for (const p of procs) {
  const child = spawn(npm, p.args, { cwd: process.cwd(), shell: process.platform === 'win32' });
  children.push(child);
  const tag = `${p.color}[${p.name}]${RESET} `;
  const pipe = (stream, out) => {
    let buf = '';
    stream.on('data', (d) => {
      buf += d.toString();
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) out.write(tag + line + '\n');
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => process.stdout.write(`${tag}已退出 (code ${code})\n`));
}

function shutdown() {
  for (const c of children) {
    try {
      c.kill();
    } catch {
      /* ignore */
    }
  }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('已启动 server(41131) / web(41132) / admin(41133)，Ctrl+C 全部停止。');
