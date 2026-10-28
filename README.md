# Codex Workspace Helper

[繁體中文](README.zh-TW.md)

A small Node.js toolkit for launching the Codex app-server with approval prompts disabled while keeping writes confined to one workspace. It also provides optional, bounded text-file tools for hosts that integrate with the app-server protocol.

This is an independent community project. It is not made by, affiliated with, or endorsed by OpenAI.

This toolkit was extracted from an Orca/Codex use case, but its code targets the Codex app-server and is host-independent. It can be integrated by Orca or another host that supports Codex app-server requests. It is not currently a one-click Orca plugin or installer; the host must connect the launcher and request-preparation helpers as described below.

For the built-in Orca Codex terminal, the repository includes a copy-and-paste launch-argument setup that does not require installing this toolkit: [Orca setup guide](docs/orca-setup.md).

The project does not disable the operating-system sandbox. It explicitly configures `workspace-write`, turns off network access, sets one writable root, and disables shell and other optional tool features by default.

## Requirements

- Node.js 20 or newer
- Codex CLI installed and available as `codex` (or set `CODEX_BIN` to the executable)
- An existing workspace directory

## Launch the app-server

From the workspace root:

```sh
node src/launch.mjs
```

Or set the workspace explicitly:

```sh
CODEX_BOUNDED_WORKSPACE=/path/to/repository node src/launch.mjs
```

On Windows PowerShell:

```powershell
$env:CODEX_BOUNDED_WORKSPACE = (Get-Location).Path
$env:CODEX_BIN = 'C:\Tools\codex.exe'
node src/launch.mjs
```

When using the npm-installed JavaScript launcher, set `CODEX_BIN` to its `.js` entry point; this project will run it with the current Node executable.

The launcher starts `codex app-server --stdio` and passes configuration overrides as argument-array entries (no shell command string is evaluated). The overrides are applied on every launch:

- `approval_policy = "never"`
- `sandbox_mode = "workspace-write"`
- exactly one `sandbox_workspace_write.writable_roots` entry
- `sandbox_workspace_write.network_access = false`
- temporary directories are excluded from the writable set
- shell, code-mode host, apps, plugins, hooks, memory, browser, computer, and delegation features disabled
- MCP servers, web search, bundled skills, and agents disabled

## Host integration

Import `prepareThreadStart`, `prepareTurnStart`, `workspaceTools`, and `callWorkspaceTool` from `src/index.mjs`. A host should pass every `thread/start` and `turn/start` request through the preparation functions, then route `item/tool/call` to `callWorkspaceTool` only after checking that the call belongs to an active thread and turn.

```js
import { prepareThreadStart, prepareTurnStart, workspaceTools, callWorkspaceTool } from './src/index.mjs';

const threadParams = prepareThreadStart(incomingThreadParams, workspaceRoot, workspaceTools);
const turnParams = prepareTurnStart(incomingTurnParams, workspaceRoot);
const result = callWorkspaceTool(workspaceRoot, 'workspace_read', { path: 'README.md' });
```

The write tool requires `expected_sha256: "MISSING"` to create a new file. To replace a file, the caller must first read it and pass the observed SHA-256. Paths are relative to the workspace; traversal, symlinks, sensitive files, binaries, and files larger than 128 KiB are rejected. Writes are atomic and do not commit or upload files.

The host must enforce thread ownership, turn state, rate limits, and tool-call authorization. Do not expose an unfiltered app-server to arbitrary clients: clients can otherwise request threads for different working directories. The filesystem helper is not a replacement for Codex's OS sandbox.

## Verify the effective configuration

After connecting to the app-server, pass the result of `config/read` to `verifyEffectiveConfig`. Pass a `thread/start` result to `verifyThreadBoundary` as a second check. Both checks throw on mismatches.

```js
import { verifyEffectiveConfig, verifyThreadBoundary } from './src/index.mjs';

verifyEffectiveConfig(configReadResult.config, workspaceRoot);
verifyThreadBoundary(threadStartResult, workspaceRoot);
```

## Tests

```sh
npm test
npm run check
```

Tests use temporary directories and do not require Codex credentials or network access.

## Security notes

- `approval_policy = "never"` prevents interactive approval prompts. The sandbox still limits the configured Codex execution surface.
- The launcher deliberately does not use Codex's full-access or approval-and-sandbox bypass flags.
- Review the effective configuration from the running app-server; do not assume command-line settings were accepted.
- Keep the workspace free of secrets. Workspace-write permits Codex to modify files under the configured root.
- Use `prepareThreadStart` and `prepareTurnStart` in the host; launcher configuration alone cannot prevent a client from requesting a different thread working directory.
- Do not expose an app-server over a network without adding authentication and transport security.

See [SECURITY.md](SECURITY.md) for the threat model and private reporting instructions. Contributions should follow [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
