import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { launchArgs, launchPlan } from '../src/launch.mjs';

test('launches app-server with fixed sandbox and approval configuration', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-launch-'));
  try {
    const args = launchArgs(root);
    assert.equal(args.at(-2), 'app-server');
    assert.equal(args.at(-1), '--stdio');
    assert.ok(args.includes('approval_policy="never"'));
    assert.ok(args.includes('sandbox_mode="workspace-write"'));
    assert.ok(args.includes('sandbox_workspace_write.network_access=false'));
    assert.ok(args.includes('features.shell_tool=false'));
    assert.equal(args.filter(arg => arg === 'sandbox_workspace_write.writable_roots=["' + root.replaceAll('\\', '/') + '"]').length, 1);
    const plan = launchPlan({ workspaceRoot: root, executable: 'codex.js' });
    assert.equal(plan.command, process.execPath);
    assert.equal(plan.args[0], 'codex.js');
    assert.equal(plan.cwd, root);
    assert.equal(launchPlan({ workspaceRoot: root, executable: 'codex.exe' }).command, 'codex.exe');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
