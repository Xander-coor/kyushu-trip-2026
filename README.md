# 九州行程 App（PWA）

給 iPhone 用的離線行程 app。介面（`index.html`、`app.js`、`styles.css`）和內容（`data.json`）分開，**行程有變時只要改 `data.json`**。

## 檔案

| 檔案 | 用途 |
|---|---|
| `data.json` | 全部行程內容（每日行程、住宿、交通租車、注意事項、待辦、待查、來源） |
| `index.html` / `app.js` / `styles.css` | 介面，一般不用動 |
| `sw.js` | 離線快取（service worker） |
| `manifest.webmanifest`、`icons/` | 加入主畫面用的名稱與圖示 |
| `offline.html` | 單檔備援版（所有內容都內嵌），可存到 iPhone「檔案」App 直接開；要跟 `data.json` 一起重新產生 |

## 怎麼更新行程

1. 打開 `data.json` 修改內容（UTF-8、標準 JSON，注意逗號與引號）。常用欄位：
   - `days[]`：每一天。`items[]` 是時間表，每項有 `time`、`text`、`category`（草案原本的類別文字）、`status`。
   - `status` 可用：`booked`（已訂）、`notBooked`（尚未訂）、`estimate`（估價・未訂）、`planned`（已計畫・未訂）、`mixed`（部分已訂）、`suggested`（建議）。
   - `stay.status`：當晚住宿狀態，同上；`none` 表示當晚不住。
   - 文字裡只要出現「需再確認」，畫面就會自動加上黃色「⚠ 需再確認」標籤；也可以加 `"verify": true`。
   - `sources`：寫來源編號（對應最下面 `sources[]` 的 `id`），畫面會顯示「來源 N」可點連結。文字中的網址也會自動變成連結。
   - `stays`、`transport`、`notices`、`todos`（`done: true/false`）、`openQuestions` 分別對應各分頁。
   - `maps`：導航目的地，格式 `[{"q": "Google 地圖要搜尋的地名或地址", "label": "按鈕上顯示的名字（可省略）"}]`。一個項目可以有多個。**只填草案裡有的地名、店名或地址。**
   - `mapMissing`：沒有可用地址時填原因，畫面會顯示灰色「無法導航」和「需再確認」。`mapNote`：導航可能不準時的提醒（例如 CROOM 地址待補），也會顯示「需再確認」。
   - `id`：每個項目、提醒、待辦都有固定 id（例如 `d1226-i2`、`todo-car`）。**新增項目時給一個新的 id，不要改舊的 id**，否則手機上已打的勾會對不上。
   - `meta.timeWords`：「現在／下一站」用來排順序的大約時間（上午、中午、晚上…），畫面上仍顯示原本的時間文字。
   - 改完把 `meta.dataVersion` 改成今天日期，畫面底部和「來源 › 關於」會顯示。
2. **把 `sw.js` 開頭的 `VERSION`（例如 `kyushu-v1.1.0` → `kyushu-v1.1.1`）加一。** 這樣 iPhone 上已安裝的 app 才會換掉舊快取；打開 app 時會出現「有新版本，點一下更新」。改了介面（`app.js`）時，也把 `app.js` 開頭的 `APP_VERSION` 改成一樣的版本號。
   （`data.json` 本身是「先上網拿新的、沒網路才用快取」，有網路時打開就會拿到新內容；改了其他檔案則一定要改 VERSION。）
3. 檢查 JSON 格式：`python3 -m json.tool data.json > /dev/null`
4. 本機預覽：在這個資料夾執行 `python3 -m http.server 8765`，開 `http://localhost:8765/`。
5. 重新上傳整個資料夾到同一個網址。
6. 同時重新產生 `offline.html`（腳本在 `/workspace/apro/kyushu-app-tools/build_offline.py`，需先啟動上面的本機預覽，會同時寫入 `offline.html` 與 `/workspace/apro/kyushu-app-offline.html`）。

## 功能（v1.1）

- **導航**：地點旁的「導航・…」按鈕會開 Google 地圖路線（`https://www.google.com/maps/dir/?api=1&destination=…`）。
- **現在／下一站**：每日行程最上方。旅途中依手機時間換算**日本時間**顯示目前與下一個項目；出發前顯示倒數與第一站；旅程結束後自動隱藏。
- **待辦打勾**：「待辦待查」分頁可以打勾，存在這支手機（`localStorage`，用項目 id 記錄），有進度條與「清除我的勾選」。已訂項目固定打勾。
- **搜尋**：右上角放大鏡，搜尋所有分頁；點結果會跳到該分頁／日期並閃一下。
- **匯率換算**：右上角 ¥。app 不內建匯率：自己輸入（100 日圓＝?台幣，記錄輸入時間），或按「線上更新匯率」從 ExchangeRate-API（open.er-api.com）抓，會顯示來源與時間；離線時沿用已存的匯率。
- **更新提示**：有新版時底部出現「有新版本，點一下更新」。

## 規則提醒

- 「已訂」和「建議／尚未訂」要分開標示；只放草案裡已有的資訊。
- **不要放任何訂位碼、確認碼、密碼或信用卡資料**（網址公開時任何人都看得到）。

## 在 iPhone 安裝

1. 用 **Safari** 開啟 app 網址（一定要 Safari）。
2. 點下方「分享」按鈕 → 「加入主畫面」→「新增」。
3. 從主畫面打開一次、把每個分頁點一下，之後在日本沒網路也能看。
