# Codex 提示音 - 基本鈴聲 (Windows)

在 Codex 需要互動、提問或停止時，自動播放提示音通知用戶。

## 功能特色

- 🔔 **Notification 事件**: 當 Codex 發送通知時播放提示音
- 🛑 **Stop 事件**: 當 Codex 停止執行時播放提示音

## 安裝插件

```
codex plugin marketplace add ycs77/codex-notifications
codex plugin add notification-basic-win@ycs77-notifications
```

## 使用說明

首次安裝或更新後，請重新開啟 Codex conversation，並在 Codex CLI 中執行 `/hooks` 檢查與信任這個插件提供的 hooks。Codex 會略過尚未信任的非 managed hook。

## Hook 觸發時機

### Notification Hook
- 當 Codex 發送用戶通知時觸發
- 用於提醒用戶注意重要訊息

### Stop Hook
- 當 Codex 主代理準備停止執行時觸發
- 用於通知用戶任務已完成

## 作者

Lucas Yang (yangchenshin77@gmail.com)

## 授權

MIT License
