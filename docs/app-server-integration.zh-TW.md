# 整合 Codex app-server

繁體中文 · [English](app-server-integration.md) · [回到首頁](../README.zh-TW.md)

本指南說明 Host 如何以工作區範圍政策啟動 Codex、將每個 app-server thread 與 turn 固定在該工作區，並提供範圍受限的檔案工具。Host 仍須負責驗證身分、thread 所有權、程序生命週期與請求轉送。

## 需求

- Node.js 20 以上
- 已安裝 Codex CLI；或將 `CODEX_BIN` 設為執行檔／npm 入口檔
- 已存在的工作區目錄
- 實作 Codex app-server JSON-RPC 協定的 Host

## 安裝與啟動

將本儲存庫放入 Host 專案，或複製 `src/` 模組。執行階段沒有 npm 相依套件。

```sh
CODEX_BOUNDED_WORKSPACE=/absolute/path/to/worktree node src/launch.mjs
```

PowerShell：

```powershell
$env:CODEX_BOUNDED_WORKSPACE = (Get-Location).Path
$env:CODEX_BIN = 'C:\Tools\codex.exe' # 選用
node src/launch.mjs
```

啟動器會以 workspace-write 沙箱、`never` 核准政策、停用沙箱網路與精簡功能集啟動 `codex app-server`。調整啟動方式前請先檢查 `src/launch.mjs`。`never` 表示遭拒的操作會直接失敗，不會跳出互動核准；它不會授予沙箱外的存取權。

## 固定 thread 與 turn

建立 app-server 請求時使用政策函式。每個 Host session 選定一次工作區，啟動 thread 與 turn 時都傳入相同的標準化路徑。

```js
import {
  prepareThreadStart,
  prepareTurnStart,
} from './src/index.mjs';

const workspace = '/absolute/path/to/worktree';
const threadRequest = prepareThreadStart({ cwd: workspace });
const turnRequest = prepareTurnStart({ cwd: workspace });
```

若請求試圖改用其他工作區，或降低預期的沙箱／核准設定，函式會拒絕。請查看 `src/policy.mjs` 的輸入輸出契約，並以 Host 管理的 session 對應表作為唯一依據。

## 提供範圍受限的工作區工具

選用的檔案工具只處理工作區內的 UTF-8 文字檔。工具會驗證相對路徑、拒絕路徑穿越與符號連結逃逸、限制檔案大小，並支援 SHA-256 比對後替換。

```js
import {
  workspaceTools,
  callWorkspaceTool,
} from './src/index.mjs';

const tools = workspaceTools({ root: workspace });
// 將 tools 加入 Host 提供給 app-server 的工具設定。
const result = await callWorkspaceTool({
  root: workspace,
  name: 'workspace_read_text',
  arguments: { path: 'README.md' },
});
```

請使用套件匯出的工具名稱與 JSON Schema，並將所有工具參數視為不可信資料。不要在這個界線加入任意 shell、網路或不受限的檔案工具。寫入時，後續比對替換應使用回傳的摘要，以偵測並行修改。

## 驗證實際生效的政策

程序成功啟動不代表啟動參數一定生效。接收工作前，應驗證 app-server 回報的有效設定與 thread 邊界：

```js
import {
  verifyEffectiveConfig,
  verifyThreadBoundary,
} from './src/index.mjs';

verifyEffectiveConfig(serverConfig, { workspace });
verifyThreadBoundary(thread, { workspace });
```

請依來源碼說明，將協定回應轉為 `serverConfig` 與 `thread`。若必要欄位缺漏、回報的 cwd 不一致，或實際沙箱／核准政策比預期寬鬆，應拒絕繼續執行。

## Host 必須負責的事項

- 驗證使用者身分，並授權其使用特定工作區。
- 維護 user／session／thread 到工作區的對應；不可把用戶端傳來的路徑當成授權依據。
- 轉送工具呼叫前，確認 thread 屬於同一個由 Host 管理的工作區。
- 設定請求大小、逾時、並行數、稽核紀錄與程序清理機制。
- 將憑證及其他秘密放在 Codex 程序無法讀取的位置。
- 升級前檢查 Codex CLI 與 app-server 協定版本的變更。

這些工具是安全邊界的一部分，不是完整的多使用者服務，也不能取代作業系統隔離。回報及部署建議請見[安全政策](../SECURITY.zh-TW.md)。

## 執行測試

```sh
node --test
node --check src/index.mjs
node --check src/launch.mjs
node --check src/policy.mjs
node --check src/workspace-files.mjs
```

測試使用暫存目錄，不需要 Codex 憑證或網路。若 Windows 帳戶無法建立符號連結，相關案例可能會略過。

## 常見問題

| 狀況 | 檢查方式 |
| --- | --- |
| 啟動器找不到 Codex | 將 `CODEX_BIN` 設為已安裝的執行檔或 npm `.js` 入口檔。 |
| 工作區遭拒 | 將 `CODEX_BOUNDED_WORKSPACE` 設為已存在目錄，並從預期 worktree 啟動。 |
| 設定驗證失敗 | 檢查實際 app-server 回應及 `src/launch.mjs` 組合的參數；不要略過驗證。 |
| 檔案工具拒絕路徑 | 使用工作區內的相對路徑；路徑穿越、符號連結逃逸、二進位／無效 UTF-8 內容與過大檔案都會遭拒。 |

