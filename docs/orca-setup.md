# Use Codex in Orca with workspace-scoped access

English · [繁體中文](orca-setup.zh-TW.md) · [Back to README](../README.md)

This guide configures Orca's built-in Codex CLI terminal. Codex can edit and run commands in the selected workspace without asking for routine approvals, while its sandbox continues to block writes outside that workspace and network access.

This setup uses Codex's native CLI flags. It does not install the Node.js app-server toolkit in this repository.

## Requirements

- Orca with the built-in Codex agent enabled
- Codex CLI installed and authenticated for the Orca host
- A Codex workspace or worktree opened by Orca

## Configure Orca

1. In Orca, open **Settings → Agents → Codex**.
2. Replace the entire Codex launch-arguments value with the line below. Make sure the old `--dangerously-bypass-approvals-and-sandbox` flag is removed.
3. Save the setting and start a new Codex session. Existing sessions keep their original launch policy until restarted.

```text
--sandbox workspace-write --ask-for-approval never -c sandbox_workspace_write.writable_roots=[] -c sandbox_workspace_write.network_access=false -c sandbox_workspace_write.exclude_tmpdir_env_var=true -c sandbox_workspace_write.exclude_slash_tmp=true -c web_search=disabled -c mcp_servers={} -c agents.enabled=false -c skills.bundled.enabled=false -c features.apps=false -c features.plugins=false -c features.remote_plugin=false -c features.hooks=false -c features.memories=false -c features.browser_use=false -c features.browser_use_external=false -c features.computer_use=false -c features.in_app_browser=false -c features.multi_agent_v2=false -c features.request_permissions_tool=false -c features.view_image=false -c features.image_generation=false -c features.code_mode_host=false
```

Orca stores launch arguments as a per-agent default. This affects future Codex sessions launched through that Orca profile, including sessions in different worktrees. It is not a per-workspace policy. Orca documents this setting under [Agents & sessions](https://github.com/stablyai/orca/blob/main/docs/site/content/docs/model/agents-sessions.mdx).

## What the arguments do

| Setting | Effect |
| --- | --- |
| `--sandbox workspace-write` | Keeps Codex's workspace sandbox enabled. The current Orca worktree is the primary workspace. |
| `--ask-for-approval never` | Disables interactive approval prompts. Operations denied by the sandbox fail instead of escalating for approval. |
| `writable_roots=[]` | Clears extra writable directories from Codex configuration; it does not remove the current workspace's normal write access. |
| `network_access=false` | Blocks network access from sandboxed commands. |
| `exclude_tmpdir_env_var=true`, `exclude_slash_tmp=true` | Removes temporary directories from the writable set. |
| feature and service overrides | Disable MCP servers, web search, plugins, apps, hooks, memory, browser/computer tools, bundled skills, agents, and code-mode host. |

The Codex shell remains available so it can run build tools inside the worktree. This is different from the app-server example in this repository, which disables Codex's shell feature and exposes bounded file tools instead.

## Verify the setting

In a newly launched Codex session:

1. Run `/status` and confirm the sandbox is `workspace-write` and approval policy is `never`.
2. Ask Codex to create a harmless text file inside the current worktree. Confirm it succeeds without an approval prompt and appears in the Orca workspace.
3. Remove the test file.
4. If `/status` reports `danger-full-access`, stop and remove any remaining bypass flag from Orca's Codex launch arguments.

Workspace-write limits writes; Codex may still be able to read files outside the workspace depending on the platform and configuration. Do not store secrets in locations Codex can read. Do not interpret “no approval prompts” as “unrestricted”: sandbox-denied operations should fail.

## Restore Orca's default

Return to **Settings → Agents → Codex** and use **Reset** beside the launch-arguments field. Start a new session to apply the restored defaults.

## Use with another CLI host

If another host launches Codex CLI and lets you set its arguments, use the same line above. Ensure the host sets the intended project/worktree as Codex's current working directory. This is a Codex launch profile, not an Orca-only feature.

For hosts that speak the Codex app-server protocol, see the [app-server integration guide](app-server-integration.md).

## References

- [Orca: Agents & sessions](https://github.com/stablyai/orca/blob/main/docs/site/content/docs/model/agents-sessions.mdx) — Orca's per-agent launch-argument setting.
- [Codex CLI options](https://github.com/openai/codex/blob/main/codex-rs/utils/cli/src/shared_options.rs) — sandbox and approval flags.
- [Codex sandbox implementation notes](https://github.com/openai/codex/blob/main/codex-rs/core/README.md) — writable roots and network policy.
