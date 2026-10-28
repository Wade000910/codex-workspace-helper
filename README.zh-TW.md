# Codex Workspace Helper

繁體中文 · [English](README.md)

[![CI](https://github.com/Wade000910/codex-workspace-helper/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/Wade000910/codex-workspace-helper/actions/workflows/test.yml) [![授權：MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) [![Node.js 20 以上](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](package.json)

**讓 Codex 在工作區內寫入時不必逐次等候同意，同時保留工作區沙箱。** 本專案提供 Orca 內建 Codex 終端可直接貼上的設定，也提供給整合 Codex app-server 的 Host 使用之 Node.js 工具。

這是獨立社群專案，並非 OpenAI 製作、附屬或背書的產品。

## 選擇使用方式

| 使用情境 | 從這裡開始 |
| --- | --- |
| Orca 內建 Codex 終端 | [Orca 設定指南](docs/orca-setup.zh-TW.md)：移除預設的完整存取參數，改用工作區沙箱；不必安裝本專案。 |
| 其他 Codex CLI Host | [Orca 設定指南](docs/orca-setup.zh-TW.md#其他-host)：Host 若能設定 CLI 參數，也可使用相同的 Codex 設定。 |
| 整合 Codex app-server 的 Host | [app-server 整合指南](docs/app-server-integration.zh-TW.md)：啟動設定、thread/turn 工作區限制、受限檔案工具與有效設定驗證。 |

## 功能

- 設定 `approval_policy = "never"`，同時保留 Codex 的 `workspace-write` 沙箱。
- 將設定中的寫入範圍限制在單一工作區，關閉沙箱網路，並排除暫存目錄。
- 提供將 app-server thread 與 turn 固定在工作區內的函式。
- 提供受限 UTF-8 文字檔工具，包含路徑檢查、檔案大小限制與 SHA-256 比對後替換。
- 驗證 app-server 回報的有效設定，不只是假設啟動參數已生效。

## 範圍與限制

- 本專案不會關閉 Codex 或作業系統的沙箱。
- Orca 指南是修改 Orca 的 Codex 啟動參數；需要手動設定，並非 Orca 外掛或安裝程式。
- Node.js app-server 工具不依賴特定 Host；Host 必須呼叫這些函式，並在轉送自訂工具前驗證 thread 所屬權。
- 工作區寫入權限限制的是寫入。Codex 能否讀取工作區外的檔案，會依平台與設定而異。請勿把秘密放在 Codex 可讀取的位置。
- 本專案無法防護已遭入侵的 Host，或以相同使用者權限執行的其他惡意程式。

## Orca 快速設定

開啟 **Settings → Agents → Codex**，將現有啟動參數替換成 [Orca 設定指南](docs/orca-setup.zh-TW.md)中的內容，再啟動新的 Codex 工作階段。指南也說明設定效果、驗收方式與還原步驟。

## app-server 工具

需求：Node.js 20 以上、Codex CLI，以及已存在的工作區目錄。

在本專案目錄執行：

```sh
node src/launch.mjs
```

明確指定工作區：

```sh
CODEX_BOUNDED_WORKSPACE=/path/to/repository node src/launch.mjs
```

Windows PowerShell 範例：

```powershell
$env:CODEX_BOUNDED_WORKSPACE = (Get-Location).Path
$env:CODEX_BIN = 'C:\Tools\codex.exe'
node src/launch.mjs
```

若 Codex 是透過 npm 安裝，`CODEX_BIN` 可以指向 `.js` 入口檔；啟動器會以目前的 Node 執行它。連接 Host 前，請先閱讀[整合指南](docs/app-server-integration.zh-TW.md)。

## 驗證與測試

本機測試不需要 Codex 憑證或網路：

```sh
node --test
node --check src/index.mjs
node --check src/launch.mjs
node --check src/policy.mjs
node --check src/workspace-files.mjs
```

GitHub Actions 會在 Linux 與 Windows 上測試 Node.js 20、22、24。PowerShell 若封鎖 `npm.ps1`，可直接執行 `node --test` 或 `npm.cmd test`。

## 文件

- [Orca 設定](docs/orca-setup.zh-TW.md) · [English](docs/orca-setup.md)
- [app-server 整合](docs/app-server-integration.zh-TW.md) · [English](docs/app-server-integration.md)
- [安全政策](SECURITY.zh-TW.md) · [English](SECURITY.md)
- [貢獻指南](CONTRIBUTING.zh-TW.md) · [English](CONTRIBUTING.md)
- [變更紀錄](CHANGELOG.zh-TW.md) · [English](CHANGELOG.md)

## 授權

[MIT](LICENSE)。
