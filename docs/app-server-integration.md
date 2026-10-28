# Integrate with the Codex app-server

English · [繁體中文](app-server-integration.zh-TW.md) · [Back to README](../README.md)

This guide shows how a host can launch Codex with a workspace-scoped policy, pin each app-server thread and turn to that workspace, and expose narrowly scoped file tools. The host remains responsible for authentication, user identity, thread ownership, process lifecycle, and request routing.

## Requirements

- Node.js 20 or newer
- Codex CLI installed and available, or set `CODEX_BIN` to its executable / npm entry point
- An existing workspace directory
- A host that implements the Codex app-server JSON-RPC protocol

## Install and launch

Copy this repository into your host project or vendor the `src/` modules. There are no runtime npm dependencies.

```sh
CODEX_BOUNDED_WORKSPACE=/absolute/path/to/worktree node src/launch.mjs
```

PowerShell:

```powershell
$env:CODEX_BOUNDED_WORKSPACE = (Get-Location).Path
$env:CODEX_BIN = 'C:\Tools\codex.exe' # optional
node src/launch.mjs
```

The launcher starts `codex app-server` with workspace-write sandboxing, approval policy `never`, disabled sandbox network access, and a reduced feature set. Inspect `src/launch.mjs` before adapting the command. `never` means a denied operation fails without an interactive approval prompt; it does not grant access outside the sandbox.

## Pin threads and turns

Use the policy helpers when constructing app-server requests. Resolve the workspace once per host-owned session, then pass that same canonical path whenever a thread or turn is started.

```js
import {
  prepareThreadStart,
  prepareTurnStart,
} from './src/index.mjs';

const workspace = '/absolute/path/to/worktree';
const threadRequest = prepareThreadStart({ cwd: workspace });
const turnRequest = prepareTurnStart({ cwd: workspace });
```

The helpers reject a request that tries to override the selected workspace or weaken the expected sandbox/approval settings. Check their input and output contracts in `src/policy.mjs`; keep the host's session-to-workspace mapping authoritative.

## Expose bounded workspace tools

The optional file tools operate on UTF-8 text files beneath the selected workspace. They validate relative paths, reject traversal and symlink escapes, limit file size, and support SHA-256 compare-and-swap writes.

```js
import {
  workspaceTools,
  callWorkspaceTool,
} from './src/index.mjs';

const tools = workspaceTools({ root: workspace });
// Advertise `tools` in the host's app-server tool configuration.
const result = await callWorkspaceTool({
  root: workspace,
  name: 'workspace_read_text',
  arguments: { path: 'README.md' },
});
```

Use the exact tool names and JSON schemas exported by the package. Treat tool arguments as untrusted input, and do not add arbitrary shell, network, or unrestricted filesystem tools to this boundary. For writes, use the returned digest as the expected digest on a subsequent compare-and-swap update so concurrent edits are detected.

## Verify the effective policy

Do not infer that launch arguments worked merely because the process started. Validate the app-server's effective configuration and the thread boundary before accepting work:

```js
import {
  verifyEffectiveConfig,
  verifyThreadBoundary,
} from './src/index.mjs';

verifyEffectiveConfig(serverConfig, { workspace });
verifyThreadBoundary(thread, { workspace });
```

Adapt `serverConfig` and `thread` from the protocol responses as documented in the source. Fail closed if a required field is absent, the returned cwd differs, or the effective sandbox/approval policy is weaker than expected.

## Host responsibilities

- Authenticate users and authorize access to each workspace.
- Store the mapping from user/session/thread to its selected workspace; never trust a client-supplied path as authorization.
- Route a tool call only after verifying that its thread belongs to the same host-owned workspace.
- Apply request size limits, timeouts, concurrency limits, audit logging, and process cleanup.
- Keep credentials and other secrets outside locations the Codex process can read.
- Review changes to Codex CLI and app-server protocol versions before upgrading.

These helpers are a boundary component, not a complete multi-user service or a substitute for OS isolation. See [Security](../SECURITY.md) for reporting and deployment guidance.

## Run tests

```sh
node --test
node --check src/index.mjs
node --check src/launch.mjs
node --check src/policy.mjs
node --check src/workspace-files.mjs
```

The test suite uses temporary directories and does not require Codex credentials or network access. Windows may skip symlink-specific cases when the account cannot create symlinks.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Launcher cannot find Codex | Set `CODEX_BIN` to the installed executable or npm `.js` entry point. |
| Workspace rejected | Set `CODEX_BOUNDED_WORKSPACE` to an existing directory and launch from the intended worktree. |
| Config verification fails | Inspect the actual app-server response and the arguments assembled in `src/launch.mjs`; do not bypass the check. |
| File tool rejects a path | Use a relative path beneath the workspace; traversal, symlink escapes, binary/invalid UTF-8 content, and oversized files are rejected. |

