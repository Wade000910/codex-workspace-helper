# Codex Workspace Helper

[繁體中文](README.zh-TW.md) · English

[![CI](https://github.com/Wade000910/codex-workspace-helper/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/Wade000910/codex-workspace-helper/actions/workflows/test.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) [![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](package.json)

**Run Codex with workspace-scoped writes and no routine approval prompts.** This project includes a copy-and-paste setup for Orca's built-in Codex terminal and reusable Node.js helpers for hosts that integrate with the Codex app-server.

This is an independent community project. It is not made by, affiliated with, or endorsed by OpenAI.

## Choose your setup

| Use case | Start here |
| --- | --- |
| Orca built-in Codex terminal | [Orca setup guide](docs/orca-setup.md) — replace the default full-access argument with a workspace sandbox. No package installation required. |
| Another Codex CLI host | [Orca setup guide](docs/orca-setup.md#other-hosts) — use the same Codex flags if the host lets you set CLI arguments. |
| A host integrating Codex app-server | [App-server integration guide](docs/app-server-integration.md) — launch configuration, thread/turn pinning, bounded file tools, and verification. |

## What it does

- Sets `approval_policy = "never"` while keeping Codex's `workspace-write` sandbox enabled.
- Limits configured writes to one selected workspace, disables sandbox network access, and excludes temporary directories.
- Provides helpers to pin app-server threads and turns to that workspace.
- Provides optional UTF-8 text-file tools with path checks, size limits, and SHA-256 compare-and-swap writes.
- Verifies the effective app-server settings instead of assuming the launch arguments took effect.

## What it does not do

- It does not disable Codex's or the operating system's sandbox.
- The Orca guide changes Orca's Codex launch arguments; it is a manual setup, not an Orca plugin or installer.
- The Node.js app-server helpers are host-independent. A host must call them and enforce thread ownership before routing custom tools.
- Workspace write permission restricts writes. Codex's ability to read outside the workspace can depend on its platform and configuration. Keep secrets out of locations Codex can read.
- It does not provide protection from a compromised host or another process running as the same user.

## Orca quick setup

Open **Settings → Agents → Codex**, replace the existing launch arguments with the value in the [Orca setup guide](docs/orca-setup.md), then start a new Codex session. The guide explains the effect, verification, and reset steps.

## App-server toolkit

Requirements: Node.js 20 or newer, Codex CLI, and an existing workspace directory.

From this repository:

```sh
node src/launch.mjs
```

To select a workspace explicitly:

```sh
CODEX_BOUNDED_WORKSPACE=/path/to/repository node src/launch.mjs
```

On Windows PowerShell:

```powershell
$env:CODEX_BOUNDED_WORKSPACE = (Get-Location).Path
$env:CODEX_BIN = 'C:\Tools\codex.exe'
node src/launch.mjs
```

If Codex was installed through npm, `CODEX_BIN` can point to its `.js` entry point; the launcher runs it with the current Node executable. See the [integration guide](docs/app-server-integration.md) before connecting a host.

## Verify and test

Run the local tests without Codex credentials or network access:

```sh
node --test
node --check src/index.mjs
node --check src/launch.mjs
node --check src/policy.mjs
node --check src/workspace-files.mjs
```

The GitHub Actions workflow tests Node.js 20, 22, and 24 on Linux and Windows. On PowerShell, use `node --test` or `npm.cmd test` if script execution blocks `npm.ps1`.

## Documentation

- [Orca setup](docs/orca-setup.md) · [繁體中文](docs/orca-setup.zh-TW.md)
- [App-server integration](docs/app-server-integration.md) · [繁體中文](docs/app-server-integration.zh-TW.md)
- [Security policy](SECURITY.md) · [繁體中文](SECURITY.zh-TW.md)
- [Contributing](CONTRIBUTING.md) · [繁體中文](CONTRIBUTING.zh-TW.md)
- [Changelog](CHANGELOG.md) · [繁體中文](CHANGELOG.zh-TW.md)

## License

[MIT](LICENSE).
