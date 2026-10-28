# 在 Orca 中使用工作區範圍的 Codex 權限

繁體中文 · [English](orca-setup.md) · [回到首頁](../README.zh-TW.md)

本指南設定 Orca 內建的 Codex CLI 終端。Codex 可在選定工作區內編輯檔案及執行指令，不必逐次等待一般核准；沙箱仍會限制工作區外寫入與網路存取。

本設定使用 Codex 原生 CLI 參數，不會安裝本儲存庫的 Node.js app-server 工具。

## 需求

- 已啟用內建 Codex Agent 的 Orca
- 已安裝 Codex CLI，且 Orca 執行環境已完成登入
- 已由 Orca 開啟 Codex 工作區或 worktree

## 設定 Orca

1. 在 Orca 開啟 **Settings → Agents → Codex**。
2. 將 Codex 啟動參數欄位的完整內容替換為下方設定，並確認已移除舊的 `--dangerously-bypass-approvals-and-sandbox` 參數。
3. 儲存後啟動新的 Codex 工作階段。既有工作階段會沿用原本的政策，直到重新啟動。

```text
--sandbox workspace-write --ask-for-approval never -c sandbox_workspace_write.writable_roots=[] -c sandbox_workspace_write.network_access=false -c sandbox_workspace_write.exclude_tmpdir_env_var=true -c sandbox_workspace_write.exclude_slash_tmp=true -c web_search=disabled -c mcp_servers={} -c agents.enabled=false -c skills.bundled.enabled=false -c features.apps=false -c features.plugins=false -c features.remote_plugin=false -c features.hooks=false -c features.memories=false -c features.browser_use=false -c features.browser_use_external=false -c features.computer_use=false -c features.in_app_browser=false -c features.multi_agent_v2=false -c features.request_permissions_tool=false -c features.view_image=false -c features.image_generation=false -c features.code_mode_host=false
```

Orca 將啟動參數儲存為 Agent 的預設值，會套用到該 Orca 設定檔之後啟動的 Codex 工作階段，也包含不同 worktree。這不是每個工作區各自獨立的政策。參考 Orca 的 [Agents 與 sessions 文件](https://github.com/stablyai/orca/blob/main/docs/site/content/docs/model/agents-sessions.mdx)。

## 參數作用

| 設定 | 效果 |
| --- | --- |
| `--sandbox workspace-write` | 保留 Codex 工作區沙箱；目前 Orca worktree 是主要工作區。 |
| `--ask-for-approval never` | 停用互動式核准；沙箱拒絕的操作會失敗，不會要求升級權限。 |
| `writable_roots=[]` | 清除 Codex 設定中的額外可寫目錄，不會移除目前工作區原有的寫入權限。 |
| `network_access=false` | 阻擋沙箱指令的網路存取。 |
| `exclude_tmpdir_env_var=true`、`exclude_slash_tmp=true` | 將暫存目錄排除於可寫範圍。 |
| 功能與服務覆寫 | 停用 MCP、網頁搜尋、外掛、Apps、Hooks、記憶、瀏覽器／電腦工具、內建 Skills、Agents 與 code-mode host。 |

Codex shell 仍可使用，因此能在 worktree 內執行建置工具。這與本儲存庫的 app-server 範例不同；該範例停用 Codex shell 功能，改由 Host 提供受限檔案工具。

## 驗證設定

在新啟動的 Codex 工作階段：

1. 執行 `/status`，確認沙箱為 `workspace-write`，核准政策為 `never`。
2. 請 Codex 在目前 worktree 建立無害的文字檔，確認不需核准即可建立，且檔案出現在 Orca 工作區。
3. 刪除測試檔。
4. 若 `/status` 顯示 `danger-full-access`，請停止使用並從 Orca Codex 啟動參數移除任何殘留的繞過參數。

workspace-write 限制寫入；依平台與設定不同，Codex 仍可能讀取工作區以外的檔案。請勿將秘密存放在 Codex 可讀取的位置。「不再跳出核准」不等於「不受限制」：沙箱拒絕的操作應直接失敗。

## 還原 Orca 預設值

回到 **Settings → Agents → Codex**，按啟動參數欄旁的 **Reset**，再啟動新工作階段套用還原後的設定。

## 用於其他 CLI Host

若其他 Host 能啟動 Codex CLI 並設定參數，也可使用上述設定。請確認 Host 將預期的專案／worktree 設為 Codex 工作目錄。這是 Codex 啟動設定，不限於 Orca。

使用 Codex app-server 協定的 Host，請參閱[整合指南](app-server-integration.zh-TW.md)。

## 參考資料

- [Orca：Agents 與 sessions](https://github.com/stablyai/orca/blob/main/docs/site/content/docs/model/agents-sessions.mdx)：Orca 的 Agent 啟動參數設定。
- [Codex CLI 參數](https://github.com/openai/codex/blob/main/codex-rs/utils/cli/src/shared_options.rs)：沙箱與核准參數。
- [Codex 沙箱實作說明](https://github.com/openai/codex/blob/main/codex-rs/core/README.md)：可寫根目錄與網路政策。
