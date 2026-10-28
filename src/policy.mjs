import fs from 'node:fs';
import path from 'node:path';

export const DISABLED_FEATURES = Object.freeze({
  shell_tool: false,
  code_mode_host: false,
  apps: false,
  plugins: false,
  remote_plugin: false,
  hooks: false,
  memories: false,
  browser_use: false,
  browser_use_external: false,
  computer_use: false,
  in_app_browser: false,
  multi_agent_v2: false,
  request_permissions_tool: false,
  view_image: false,
  image_generation: false
});

export function normalizeRoot(value) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError('workspace root must be a non-empty path');
  const normalized = path.resolve(value).replaceAll('\\', '/').replace(/\/$/, '');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

export function resolveWorkspaceRoot(value = process.cwd()) {
  const root = fs.realpathSync(value);
  if (!fs.statSync(root).isDirectory()) throw new TypeError('workspace root must be a directory');
  if (path.parse(root).root === root) throw new TypeError('workspace root cannot be a filesystem root');
  return root;
}

export function configOverrides(workspaceRoot) {
  const root = resolveWorkspaceRoot(workspaceRoot).replaceAll('\\', '/');
  return Object.freeze({
    approval_policy: 'never',
    sandbox_mode: 'workspace-write',
    web_search: 'disabled',
    mcp_servers: Object.freeze({}),
    agents: Object.freeze({ enabled: false }),
    skills: Object.freeze({ bundled: Object.freeze({ enabled: false }) }),
    sandbox_workspace_write: Object.freeze({
      writable_roots: Object.freeze([root]),
      network_access: false,
      exclude_tmpdir_env_var: true,
      exclude_slash_tmp: true
    }),
    features: DISABLED_FEATURES
  });
}

export function codexConfigArgs(workspaceRoot) {
  const config = configOverrides(workspaceRoot);
  const flat = {
    approval_policy: config.approval_policy,
    sandbox_mode: config.sandbox_mode,
    web_search: config.web_search,
    mcp_servers: config.mcp_servers,
    'agents.enabled': config.agents.enabled,
    'skills.bundled.enabled': config.skills.bundled.enabled,
    'sandbox_workspace_write.writable_roots': config.sandbox_workspace_write.writable_roots,
    'sandbox_workspace_write.network_access': config.sandbox_workspace_write.network_access,
    'sandbox_workspace_write.exclude_tmpdir_env_var': config.sandbox_workspace_write.exclude_tmpdir_env_var,
    'sandbox_workspace_write.exclude_slash_tmp': config.sandbox_workspace_write.exclude_slash_tmp,
    ...Object.fromEntries(Object.entries(config.features).map(([key, value]) => [`features.${key}`, value]))
  };
  return Object.entries(flat).flatMap(([key, value]) => ['-c', `${key}=${JSON.stringify(value)}`]);
}

export function verifyEffectiveConfig(config, workspaceRoot) {
  const expected = normalizeRoot(resolveWorkspaceRoot(workspaceRoot));
  const sandbox = config?.sandbox_workspace_write;
  if (config?.approval_policy !== 'never') throw new Error('EFFECTIVE_APPROVAL_POLICY_MISMATCH');
  if (config?.sandbox_mode !== 'workspace-write') throw new Error('EFFECTIVE_SANDBOX_MODE_MISMATCH');
  if (config?.web_search !== 'disabled') throw new Error('EFFECTIVE_WEB_SEARCH_MISMATCH');
  if (config?.mcp_servers != null && Object.keys(config.mcp_servers).length !== 0) throw new Error('EFFECTIVE_MCP_CONFIG_MISMATCH');
  if (config?.agents?.enabled !== false || config?.skills?.bundled?.enabled !== false) throw new Error('EFFECTIVE_AGENT_FEATURE_MISMATCH');
  if (sandbox?.network_access !== false) throw new Error('EFFECTIVE_NETWORK_POLICY_MISMATCH');
  if (sandbox?.exclude_tmpdir_env_var !== true || sandbox?.exclude_slash_tmp !== true) throw new Error('EFFECTIVE_TEMP_ROOTS_MISMATCH');
  const roots = sandbox?.writable_roots;
  if (!Array.isArray(roots) || roots.length !== 1 || normalizeRoot(roots[0]) !== expected) {
    throw new Error('EFFECTIVE_WRITABLE_ROOTS_MISMATCH');
  }
  for (const [feature, disabled] of Object.entries(DISABLED_FEATURES)) {
    if (config?.features?.[feature] !== disabled) throw new Error(`EFFECTIVE_FEATURE_MISMATCH:${feature}`);
  }
  return true;
}

// Some app-server versions report only additional thread roots here. The exact
// configured base root is verified separately with config/read above.
export function verifyThreadBoundary(thread, workspaceRoot) {
  const expected = normalizeRoot(resolveWorkspaceRoot(workspaceRoot));
  const sandbox = thread?.sandbox;
  const reportedCwd = thread?.cwd ?? thread?.thread?.cwd;
  if (reportedCwd !== undefined && normalizeRoot(reportedCwd) !== expected) throw new Error('THREAD_CWD_MISMATCH');
  if (sandbox?.type !== 'workspaceWrite' || sandbox.networkAccess !== false ||
      sandbox.excludeTmpdirEnvVar !== true || sandbox.excludeSlashTmp !== true) {
    throw new Error('THREAD_SANDBOX_MISMATCH');
  }
  const roots = sandbox.writableRoots ?? sandbox.writable_roots;
  if (!Array.isArray(roots)) throw new Error('THREAD_ROOTS_MISSING');
  if (roots.length > 1 || (roots.length === 1 && normalizeRoot(roots[0]) !== expected)) {
    throw new Error('THREAD_WRITABLE_ROOTS_MISMATCH');
  }
  if (thread.approvalPolicy !== 'never') throw new Error('THREAD_APPROVAL_POLICY_MISMATCH');
  return true;
}

export function prepareThreadStart(params, workspaceRoot, dynamicTools = []) {
  const root = resolveWorkspaceRoot(workspaceRoot);
  if (!params || typeof params !== 'object' || Array.isArray(params)) throw new TypeError('thread/start params must be an object');
  if (params.cwd !== undefined && normalizeRoot(params.cwd) !== normalizeRoot(root)) throw new Error('THREAD_CWD_OUTSIDE_WORKSPACE');
  return {
    ...params,
    cwd: root,
    runtimeWorkspaceRoots: [root],
    modelProvider: 'openai',
    allowProviderModelFallback: false,
    sandbox: 'workspace-write',
    approvalPolicy: 'never',
    dynamicTools: [...dynamicTools]
  };
}

export function prepareTurnStart(params, workspaceRoot) {
  const root = resolveWorkspaceRoot(workspaceRoot);
  if (!params || typeof params !== 'object' || Array.isArray(params)) throw new TypeError('turn/start params must be an object');
  return {
    ...params,
    cwd: root,
    runtimeWorkspaceRoots: [root],
    approvalPolicy: 'never',
    sandboxPolicy: {
      type: 'workspaceWrite',
      writableRoots: [root],
      networkAccess: false,
      excludeTmpdirEnvVar: true,
      excludeSlashTmp: true
    }
  };
}
