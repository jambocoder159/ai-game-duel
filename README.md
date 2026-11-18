# 兩個 AI 做的遊戲 對決兩回合

公開頁面，讓人在同一個網址切換回合與版本直接玩。

## 第一回合 夕陽郵航

- [GPT-6.2 Astra《夕陽郵航》](https://jambocoder159.github.io/ai-game-duel/#r1-astra)：模型自己生圖，再寫成可玩的瀏覽器遊戲，花 13 分 44 秒，`game.js` 262 行。
- [Claude Fable 5.2《柑仔的晚霞航空信》](https://jambocoder159.github.io/ai-game-duel/#r1-fable)：只用同一組 5 張圖寫程式，花 6 分 35 秒，`game.js` 665 行。

## 第二回合 天燈漂流（GG-skills v4.0）

同一份題目《Lantern Drift》，兩邊照團隊的 GameGen 技能包 GG-skills v4.0 從零做，React 19 + TypeScript、四語。`versions/r2-*` 是各自遊戲封包解壓後的建置產物。

- [GPT-6.2 Astra](https://jambocoder159.github.io/ai-game-duel/#r2-astra)：自己生圖，木刻套色畫風，42 分 11 秒，介入 0 次。
- [Claude Fable 5.2](https://jambocoder159.github.io/ai-game-duel/#r2-fable)：分層剪紙畫風，圖是透過 Codex 呼叫 GPT 圖片生成畫的；跑到 47 分鐘上限被停下，介入 1 次請它收尾。

舊網址 `#astra`、`#fable` 仍然對應第一回合。

線上玩：<https://jambocoder159.github.io/ai-game-duel/>

本機預覽：

```bash
python3 -m http.server 8000
# 打開 http://127.0.0.1:8000/
```

`assets/` 裡的標題圖和背景圖有壓成 WebP，精靈圖維持 PNG。第一回合的兩個遊戲都沒有 build、也沒有外部 CDN。這個 repo 沒有密碼、沒有金鑰、也沒有個人資料。
