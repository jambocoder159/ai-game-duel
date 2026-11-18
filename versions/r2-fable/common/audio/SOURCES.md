# Lantern Drift 音訊來源

全部是 CC0（公眾領域、免標示）的錄製／製作素材，沒有任何程式合成的聲音。授權於 2026-11-18 在各來源頁逐項查閱：OpenGameArt 項目頁標示 CC0；Kenney 素材頁連到 CC0 1.0，壓縮檔內 License.txt 同樣寫明 CC0。

| 檔名 | 用途 | 來源名稱與原檔名 | 作者 | 來源頁網址 | 授權 | 查閱日期 | 處理（裁切秒數、音量） |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bgm_base.mp3 | 背景音樂（循環播放） | OpenGameArt「Asianoriental1」，原檔 asianoriental1_0.ogg | Tozan | https://opengameart.org/content/asianoriental1 | CC0 | 2026-11-18 | 去頭尾靜音、結尾 0.4 秒淡出，全長 103.29 秒；增益 +2.8 dB 至約 -18 LUFS；MP3 112 kbps 立體聲 |
| sfx_spark_collect.mp3 | 接到火星 | OpenGameArt「Catching Fire」（衍生自 qubodup 的 CC0 錄音 freesound 159725），原檔 flame_0.ogg | themightyglider | https://opengameart.org/content/catching-fire | CC0 | 2026-11-18 | 去前端靜音、裁成單一聲響 0.50 秒、尾端淡出；峰值正規化至 -3.4 dBFS；MP3 128 kbps 單聲道 |
| sfx_star_collect.mp3 | 接到星星 | OpenGameArt「Pleasing bell sound effect」，原檔 pleasing-bell.wav | Spring Spring（Julie Damsgaard） | https://opengameart.org/content/pleasing-bell-sound-effect | CC0 | 2026-11-18 | 去前端靜音、裁成單一聲響 0.52 秒、尾端淡出；峰值正規化至 -2.8 dBFS；MP3 128 kbps 單聲道 |
| sfx_rain_hit.mp3 | 被雨滴打中 | OpenGameArt「40 CC0 water / splash / slime SFX」，原檔 splash_10.ogg | rubberduck | https://opengameart.org/content/40-cc0-water-splash-slime-sfx | CC0 | 2026-11-18 | 去前端靜音、裁成單一聲響 0.26 秒、尾端淡出；峰值正規化至 -3.3 dBFS；MP3 128 kbps 單聲道 |
| sfx_crash.mp3 | 撞到障礙 | Kenney「Impact Sounds」，原檔 impactWood_heavy_000.ogg | Kenney Vleugels | https://kenney.nl/assets/impact-sounds | CC0 | 2026-11-18 | 去前端靜音、裁成單一聲響 0.34 秒、尾端淡出；峰值正規化至 -3.4 dBFS；MP3 128 kbps 單聲道 |
| sfx_flame_out.mp3 | 燈火熄滅 | OpenGameArt「80 CC0 RPG SFX」，原檔 spell_fire_05.ogg | rubberduck | https://opengameart.org/content/80-cc0-rpg-sfx | CC0 | 2026-11-18 | 去前端靜音、裁成單一聲響 1.02 秒、尾端淡出；峰值正規化至 -3.5 dBFS；MP3 128 kbps 單聲道 |
| sfx_ui_hover.mp3 | 介面滑過 | Kenney「UI Audio」，原檔 rollover2.ogg | Kenney Vleugels | https://kenney.nl/assets/ui-audio | CC0 | 2026-11-18 | 去前端靜音、裁成單一聲響 0.08 秒、尾端淡出；峰值正規化至 -3.2 dBFS；MP3 128 kbps 單聲道 |
| sfx_ui_press.mp3 | 介面按下 | Kenney「Impact Sounds」，原檔 impactWood_light_000.ogg | Kenney Vleugels | https://kenney.nl/assets/impact-sounds | CC0 | 2026-11-18 | 去前端靜音、裁成單一聲響 0.29 秒、尾端淡出；峰值正規化至 -3.4 dBFS；MP3 128 kbps 單聲道 |
| sfx_result.mp3 | 結算畫面 | OpenGameArt「Bell dings/chimes」，原檔 bell_ding4.wav | pwl | https://opengameart.org/content/bell-dingschimes | CC0 | 2026-11-18 | 去前端靜音、裁成單一聲響 1.44 秒、尾端淡出；峰值正規化至 -3.3 dBFS；MP3 128 kbps 單聲道 |
## 挑選方式與待審事項

- 挑選由代理依檔名、來源頁說明、量測到的長度、音量包絡與頻譜重心決定，代理沒有聽過任何一個檔案，全部待擁有者用耳朵審。
- 沒有空缺的欄位；九個檔案各用不同的原始錄音（已比對雜湊）。
- bgm_base.mp3 不是無縫循環曲：原曲有自然收尾，結尾 1 秒約 -50 dBFS、開頭 50 毫秒約 -29 dBFS，循環時聽得到一次收尾再重新開始。
- sfx_flame_out.mp3 用的是火焰呼嘯聲（先起後衰），來源中沒有找到真正的「熄火」錄音，是否合用需要耳朵判斷。
- sfx_star_collect.mp3 原檔音量很低（峰值 -24 dBFS），增益約 +18 dB，底噪是否明顯需要耳朵判斷。
- sfx_spark_collect.mp3 的來源頁註明衍生自 qubodup 的 freesound 159725，該頁同為 CC0。
