# Codex 提示音 - 櫻羽艾瑪 (Linux)

在 Codex 要求權限或停止時，自動播放提示音通知用戶。

## 功能特色

- 🔔 **PermissionRequest 事件**: 當 Codex 要求權限時播放提示音
- 🛑 **Stop 事件**: 當 Codex 停止執行時播放提示音

## 安裝插件

```
codex plugin marketplace add ycs77/codex-notifications
codex plugin add notification-sakurabaema-linux@ycs77-notifications
```

## 使用說明

首次安裝或更新後，請重新開啟 Codex 對話。若 Codex 顯示 `Hooks need review`，可以選擇 `2. Trust all and continue` 信任這個插件提供的 hooks。

如果當下沒有成功信任，請在 Codex CLI 中執行 `/hooks`，再重新檢查並信任 hooks。Codex 會略過尚未信任的非 managed hook。

## Hook 觸發時機

### PermissionRequest Hook

- 當權限對話框出現、需要用戶授權時觸發
- 用於提醒用戶有權限需要授權

### Stop Hook

- 當 Codex 主代理準備停止執行時觸發
- 用於通知用戶任務已完成

## 作者

Lucas Yang (yangchenshin77@gmail.com)

## 授權

MIT License
