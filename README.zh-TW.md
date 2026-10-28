# Codex Workspace Helper

一套小型 Node.js 工具，用來啟動 Codex app-server，停用互動式核准提示，同時把寫入限制在單一工作區。也提供受限的文字檔工具，供 app-server Host 整合使用。

這是獨立社群專案，並非 OpenAI 製作、附屬或背書的產品。

這套工具是從 Orca/Codex 使用案例整理出來，但程式本身面向 Codex app-server，不依賴特定 Host。Orca 或其他支援 Codex app-server 請求的 Host 都可以整合。目前它還不是一鍵安裝的 Orca 外掛；Host 需要依下方說明接上啟動器與請求準備函式。

## 需求

- Node.js 20 以上
- 已安裝 Codex CLI，並可用 `codex` 指令啟動；或以 `CODEX_BIN` 指定執行檔
- 已存在的工作區目錄

## 啟動 app-server

在工作區根目錄執行：

```sh
node src/launch.mjs
```

也可以指定工作區：

```sh
CODEX_BOUNDED_WORKSPACE=/path/to/repository node src/launch.mjs
```

Windows PowerShell 範例：

```powershell
$env:CODEX_BOUNDED_WORKSPACE = (Get-Location).Path
$env:CODEX_BIN = 'C:\Tools\codex.exe'
node src/launch.mjs
```

若使用 npm 安裝的 JavaScript 啟動器，請將 `CODEX_BIN` 設為 `.js` 入口檔；本專案會以目前的 Node 執行該檔案。

啟動器透過參數陣列執行 `codex app-server --stdio`，不會執行 shell 命令字串。每次啟動都會套用以下設定：

- `approval_policy = "never"`
- `sandbox_mode = "workspace-write"`
- 唯一可寫根目錄為指定工作區
- 關閉網路及暫存目錄寫入
- 關閉 shell、code-mode host、apps、plugins、hooks、memory、browser、computer、MCP servers、web search、內建 skills 與 agents

## Host 整合

從 `src/index.mjs` 匯入 `prepareThreadStart`、`prepareTurnStart`、`workspaceTools` 與 `callWorkspaceTool`。每個 `thread/start` 和 `turn/start` 請求都應先經過準備函式，再將 `item/tool/call` 路由到檔案工具。路由前還要驗證 thread 和 turn 的所屬權。

```js
import { prepareThreadStart, prepareTurnStart, workspaceTools, callWorkspaceTool } from './src/index.mjs';

const threadParams = prepareThreadStart(incomingThreadParams, workspaceRoot, workspaceTools);
const turnParams = prepareTurnStart(incomingTurnParams, workspaceRoot);
const result = callWorkspaceTool(workspaceRoot, 'workspace_read', { path: 'README.md' });
```

建立檔案時須使用 `expected_sha256: "MISSING"`。修改既有檔案前，先讀取並傳入讀取結果的 SHA-256。工具會拒絕路徑跳脫、符號連結、敏感檔案、二進位檔及大於 128 KiB 的檔案；寫入採原子替換，不會提交或上傳。

Host 必須自行驗證 thread 所屬權、turn 狀態、呼叫頻率與工具授權。不要把未過濾的 app-server 開放給任意 client，否則 client 可以要求使用其他工作目錄。檔案工具不能取代 Codex 或作業系統層級的沙箱。

## 驗證實際設定

連上 app-server 後，將 `config/read` 結果交給 `verifyEffectiveConfig`，再把 `thread/start` 結果交給 `verifyThreadBoundary`。設定不符時，函式會拋出錯誤。

## 測試

```sh
node --test
node --check src/index.mjs
node --check src/launch.mjs
node --check src/policy.mjs
node --check src/workspace-files.mjs
```

測試使用暫存目錄，不需要 Codex 憑證或網路。PowerShell 若無法執行 `npm.ps1`，可直接使用上述 Node 指令。

## 安全說明

- `approval_policy = "never"` 代表不出現互動式核准提示，並未關閉沙箱。
- 啟動器不使用 Codex 的 full-access 或略過沙箱旗標。
- 請檢查執行中 app-server 回報的有效設定，不要只依賴啟動參數。
- `workspace-write` 允許修改工作區內的檔案，請勿將秘密放在工作區。
- Host 必須使用 `prepareThreadStart` 與 `prepareTurnStart`；單靠啟動器設定無法阻止 client 要求其他 thread 工作目錄。
- 未增加驗證與傳輸安全前，不要把 app-server 對外開放到網路。
- 威脅模型及漏洞回報方式請見 [SECURITY.md](SECURITY.md)。

## 授權

MIT，詳見 [LICENSE](LICENSE)。
