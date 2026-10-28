import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { codexConfigArgs, verifyEffectiveConfig, verifyThreadBoundary, prepareThreadStart, prepareTurnStart, DISABLED_FEATURES } from '../src/policy.mjs';

const setup = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-bounded-'));
  return { root, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
};
const configFor = root => ({ approval_policy: 'never', sandbox_mode: 'workspace-write', web_search: 'disabled', mcp_servers: {}, agents: { enabled: false }, skills: { bundled: { enabled: false } }, sandbox_workspace_write: { writable_roots: [root], network_access: false, exclude_tmpdir_env_var: true, exclude_slash_tmp: true }, features: { ...DISABLED_FEATURES } });

test('creates strict Codex app-server overrides for exactly one existing workspace', () => {
  const { root, cleanup } = setup();
  try {
    const args = codexConfigArgs(root);
    assert.ok(args.includes('approval_policy="never"'));
    assert.ok(args.includes('sandbox_mode="workspace-write"'));
    assert.ok(args.includes('sandbox_workspace_write.network_access=false'));
    assert.ok(args.includes('sandbox_workspace_write.exclude_tmpdir_env_var=true'));
    assert.ok(args.includes('sandbox_workspace_write.exclude_slash_tmp=true'));
    assert.ok(args.includes(`sandbox_workspace_write.writable_roots=[${JSON.stringify(root.replaceAll('\\', '/'))}]`));
    assert.ok(args.includes('features.shell_tool=false'));
    assert.ok(args.includes('features.code_mode_host=false'));
    assert.ok(args.includes('web_search="disabled"'));
    assert.ok(args.includes('mcp_servers={}'));
    assert.ok(args.includes('agents.enabled=false'));
    assert.ok(args.includes('skills.bundled.enabled=false'));
  } finally { cleanup(); }
});

test('accepts effective config only when approval, sandbox, network and root match', () => {
  const { root, cleanup } = setup();
  try {
    assert.equal(verifyEffectiveConfig(configFor(root), root), true);
    assert.equal(verifyEffectiveConfig({ ...configFor(root), mcp_servers: null }, root), true);
    assert.throws(() => verifyEffectiveConfig({ ...configFor(root), approval_policy: 'on-request' }, root), /APPROVAL_POLICY/);
    assert.throws(() => verifyEffectiveConfig({ ...configFor(root), sandbox_workspace_write: { ...configFor(root).sandbox_workspace_write, network_access: true } }, root), /NETWORK_POLICY/);
    assert.throws(() => verifyEffectiveConfig({ ...configFor(root), sandbox_workspace_write: { ...configFor(root).sandbox_workspace_write, writable_roots: [root, os.tmpdir()] } }, root), /WRITABLE_ROOTS/);
    assert.throws(() => verifyEffectiveConfig({ ...configFor(root), mcp_servers: { unexpected: {} } }, root), /MCP_CONFIG/);
  } finally { cleanup(); }
});

test('thread check permits no extra roots but rejects widened boundaries', () => {
  const { root, cleanup } = setup();
  try {
    const baseline = { type: 'workspaceWrite', networkAccess: false, excludeTmpdirEnvVar: true, excludeSlashTmp: true, writableRoots: [] };
    assert.equal(verifyThreadBoundary({ approvalPolicy: 'never', sandbox: baseline }, root), true);
    assert.throws(() => verifyThreadBoundary({ approvalPolicy: 'never', sandbox: { ...baseline, networkAccess: true } }, root), /SANDBOX/);
    assert.throws(() => verifyThreadBoundary({ approvalPolicy: 'never', sandbox: { ...baseline, writableRoots: [os.tmpdir(), os.tmpdir()] } }, root), /ROOTS/);
    assert.throws(() => verifyThreadBoundary({ cwd: os.tmpdir(), approvalPolicy: 'never', sandbox: baseline }, root), /CWD/);
  } finally { cleanup(); }
});

test('pins thread and turn requests to the selected workspace', () => {
  const { root, cleanup } = setup();
  try {
    const thread = prepareThreadStart({ model: 'example-model' }, root, [{ name: 'workspace_read' }]);
    assert.equal(thread.cwd, root);
    assert.deepEqual(thread.runtimeWorkspaceRoots, [root]);
    assert.equal(thread.sandbox, 'workspace-write');
    assert.equal(thread.approvalPolicy, 'never');
    assert.equal(thread.dynamicTools.length, 1);
    assert.throws(() => prepareThreadStart({ cwd: os.tmpdir() }, root), /OUTSIDE_WORKSPACE/);
    const turn = prepareTurnStart({ threadId: 'thread-1', input: [] }, root);
    assert.deepEqual(turn.sandboxPolicy.writableRoots, [root]);
    assert.equal(turn.sandboxPolicy.networkAccess, false);
    assert.equal(turn.sandboxPolicy.excludeSlashTmp, true);
  } finally { cleanup(); }
});
