# 同一組素材 兩個 AI 做的遊戲

公開頁面，讓人在同一個網址切換兩個版本直接玩。

- [GPT-6.2 Astra《夕陽郵航》](https://jambocoder159.github.io/ai-game-duel/#astra)：模型自己生圖，再寫成可玩的瀏覽器遊戲，花 13 分 44 秒，`game.js` 262 行。
- [Claude Fable 5.2《柑仔的晚霞航空信》](https://jambocoder159.github.io/ai-game-duel/#fable)：只用同一組 5 張圖寫程式，花 6 分 35 秒，`game.js` 665 行。

線上玩：<https://jambocoder159.github.io/ai-game-duel/>

本機預覽：

```bash
python3 -m http.server 8000
# 打開 http://127.0.0.1:8000/
```

`assets/` 裡的標題圖和背景圖有壓成 WebP，精靈圖維持 PNG。兩個遊戲都沒有 build、也沒有外部 CDN。這個 repo 沒有密碼、沒有金鑰、也沒有個人資料。
