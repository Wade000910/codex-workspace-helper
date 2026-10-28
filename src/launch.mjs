import { spawn } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { codexConfigArgs, resolveWorkspaceRoot } from './policy.mjs';

export function launchArgs(workspaceRoot) {
  return [...codexConfigArgs(workspaceRoot), 'app-server', '--stdio'];
}

export function launchPlan({ workspaceRoot = process.env.CODEX_BOUNDED_WORKSPACE ?? process.cwd(), executable = process.env.CODEX_BIN ?? 'codex' } = {}) {
  const root = resolveWorkspaceRoot(workspaceRoot);
  const args = launchArgs(root);
  if (/\.m?js$/iu.test(executable)) return { command: process.execPath, args: [executable, ...args], cwd: root };
  return { command: executable, args, cwd: root };
}

export function launchCodexAppServer({ workspaceRoot = process.env.CODEX_BOUNDED_WORKSPACE ?? process.cwd(), executable = process.env.CODEX_BIN ?? 'codex', spawnProcess = spawn } = {}) {
  const plan = launchPlan({ workspaceRoot, executable });
  const child = spawnProcess(plan.command, plan.args, { cwd: plan.cwd, env: process.env, stdio: 'inherit', windowsHide: true });
  child.once('error', error => { process.stderr.write(`codex launch failed: ${error.message}\n`); process.exitCode = 1; });
  child.once('exit', (code, signal) => {
    process.exitCode = signal ? 1 : code ?? 1;
  });
  return child;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) launchCodexAppServer();
