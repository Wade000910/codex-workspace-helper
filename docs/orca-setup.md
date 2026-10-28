# 在 Orca 使用 Codex Workspace Helper

這份設定讓 Orca 啟動的 Codex CLI 不再為一般操作逐次詢問，同時保留 Codex 的工作區沙箱。它適用於 Orca 的 Codex 終端工作階段，無需安裝本專案的 Node.js 啟動器。

## 設定步驟

1. 在 Orca 開啟 **Settings → Agents → Codex**。
2. 將 Codex 的啟動參數整欄替換成下方內容。請確認原本的 `--dangerously-bypass-approvals-and-sandbox` 已移除。
3. 儲存設定，關閉既有 Codex 工作階段，再開啟新的 Codex 工作階段。

```text
--sandbox workspace-write --ask-for-approval never -c sandbox_workspace_write.network_access=false -c sandbox_workspace_write.exclude_tmpdir_env_var=true -c sandbox_workspace_write.exclude_slash_tmp=true -c web_search=disabled
```

Orca 的 Codex 啟動參數是按 Agent 儲存的預設值，會套用到後續啟動的 Codex 工作階段。它不是每個工作區各自獨立的設定。若不想影響其他 Orca Codex 工作階段，請不要修改全域預設值；改用 Orca 支援的個別啟動方式。

## 設定效果

- Codex 不會為一般 CLI 操作跳出核准提示。
- Codex 保留 `workspace-write` 沙箱，寫入權限依啟動該工作階段的 Orca worktree/workspace 決定。
- 關閉 Codex sandbox 的網路存取及額外暫存目錄寫入。
- Codex 仍可在工作區內使用終端與開發工具；這與本專案 Node.js app-server 範例中停用 shell 的設定不同。
- `workspace-write` 主要限制寫入範圍；Codex 對工作區外檔案的讀取能力依 Codex 與作業系統設定而異。不要把秘密放在可能被 Codex 讀取的位置。

## 驗收

1. 在新 Codex 工作階段執行 `/status`，確認沙箱顯示 `workspace-write`，核准策略顯示 `never`。
2. 請 Codex 在目前 workspace 建立一個測試文字檔，確認沒有核准提示，並確認檔案出現在 Orca 顯示的 workspace。
3. 測試完成後刪除測試檔。
4. 若 `/status` 顯示 `danger-full-access`，不要繼續使用；檢查 Orca 是否仍附加舊的 bypass 參數。

## 還原

回到 **Settings → Agents → Codex**，按 **Reset** 還原 Orca 提供的預設參數。新工作階段會採用還原後的設定；已在執行中的工作階段需重新啟動。

## 其他 Host

其他能以命令列參數啟動 Codex CLI 的 Host，可使用同一組 Codex 參數，並自行確認該 Host 將目前專案目錄設為 Codex 工作目錄。若 Host 使用 Codex app-server，請參閱本 repo 的 Node.js 啟動器、thread/turn 設定函式與有效設定驗證工具。

## 參考

- [Orca：Agents & sessions](https://github.com/stablyai/orca/blob/main/docs/site/content/docs/model/agents-sessions.mdx) 說明 Codex 的預設啟動參數，以及在 Settings → Agents 修改參數的方法。
- [Codex CLI 選項原始碼](https://github.com/openai/codex/blob/main/codex-rs/utils/cli/src/shared_options.rs) 定義 `--sandbox`、`--ask-for-approval` 及完整略過沙箱的旗標。
- [Codex 沙箱說明](https://github.com/openai/codex/blob/main/codex-rs/core/README.md) 說明 `workspace-write` 的可寫根目錄及網路政策。
