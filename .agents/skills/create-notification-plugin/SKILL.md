---
name: create-notification-plugin
description: 互動式建立 Codex 多平台提示音插件。
---

# 建立 Codex 提示音插件

本 skill 維護專案根目錄的 `notifications.json` 註冊表，並透過 `node build.js` 全量重生 Codex plugin 產物。

## 專案規則

- 以 `notifications.json` 作為唯一真相來源。
- 不手動編輯 `plugins/*/`、`.agents/plugins/marketplace.json`，以及根 `README.md` 的插件列表表格；這些內容會由 `build.js` 覆蓋。
- 音檔來源放在 `templates/audios/{id}/notification.wav` 與 `templates/audios/{id}/stop.wav`。

## 步驟 1：收集插件資訊

需要從使用者取得：

- 插件 ID：kebab-case 英文，例如 `basic`、`my-sound`
- 插件名稱：顯示用名稱，例如「基本鈴聲」
- 平台：預設 `["Windows", "macOS", "Linux", "WSL"]`
- 是否指定獨立 author：
  - 若是，取得 author name 與 email
  - 若否，沿用 `notifications.json` 的 `owner`

收集方式由你自行判斷，重點是資訊完整且不重複打擾使用者。

## 步驟 2：預檢音檔

驗證以下兩個音檔是否已就位：

- `templates/audios/{id}/notification.wav`
- `templates/audios/{id}/stop.wav`

任一不存在時，明確告知使用者要放到 `templates/audios/{id}/`，請使用者先放好音檔再繼續，不可進入後續步驟。

## 步驟 3：更新註冊表

讀取 `notifications.json`，在 `plugins` 陣列末端加入新 entry：

```json
{
  "id": "{id}",
  "name": "{name}",
  "platforms": ["Windows", "macOS", "Linux", "WSL"]
}
```

若使用者指定獨立 author，加上 `author` 欄：

```json
{
  "id": "{id}",
  "name": "{name}",
  "platforms": ["Windows", "macOS", "Linux", "WSL"],
  "author": {
    "name": "{authorName}",
    "email": "{authorEmail}"
  }
}
```

若同 `id` 已存在於 `plugins` 陣列，回報該 id 已存在，`build.js` 會冪等覆蓋；不要新增重複 entry，直接進入建置。

## 步驟 4：執行建置

```bash
node build.js
```

build.js 會：

- 全量重生 `plugins/{id}-{win,mac,linux,wsl}/`
- 重寫 `.agents/plugins/marketplace.json`
- 更新根目錄的 `README.md` 的插件列表表格
- 清理 `notifications.json` 已移除但仍存在的 `plugins/{id}-{platform}/` 舊資料夾

若 build 失敗，向使用者顯示錯誤訊息並停止。

## 步驟 5：顯示結果

解析 build.js stdout，整理回報：

- 建立或重生的 plugin 目錄清單
- 對應平台的安裝指令，例如：
  - `codex plugin add notification-{id}-win@ycs77-notifications`
  - `codex plugin add notification-{id}-mac@ycs77-notifications`
  - `codex plugin add notification-{id}-linux@ycs77-notifications`
  - `codex plugin add notification-{id}-wsl@ycs77-notifications`
