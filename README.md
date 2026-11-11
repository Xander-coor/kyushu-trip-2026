# 九州行程 App（PWA）

給 iPhone 用的離線行程 app。介面（`index.html`、`app.js`、`styles.css`）和內容（`data.json`）分開，**行程有變時只要改 `data.json`**。

## 檔案

| 檔案 | 用途 |
|---|---|
| `data.json` | 全部行程內容（每日行程、住宿、交通租車、注意事項、待辦、待查、來源） |
| `index.html` / `app.js` / `styles.css` | 介面，一般不用動 |
| `sw.js` | 離線快取（service worker） |
| `manifest.webmanifest`、`icons/` | 加入主畫面用的名稱與圖示 |
| `../kyushu-app-offline.html` | 單檔備援版（所有內容都內嵌），可用「檔案」App 直接開 |

## 怎麼更新行程

1. 打開 `data.json` 修改內容（UTF-8、標準 JSON，注意逗號與引號）。常用欄位：
   - `days[]`：每一天。`items[]` 是時間表，每項有 `time`、`text`、`category`（草案原本的類別文字）、`status`。
   - `status` 可用：`booked`（已訂）、`notBooked`（尚未訂）、`estimate`（估價・未訂）、`planned`（已計畫・未訂）、`mixed`（部分已訂）、`suggested`（建議）。
   - `stay.status`：當晚住宿狀態，同上；`none` 表示當晚不住。
   - 文字裡只要出現「需再確認」，畫面就會自動加上黃色「⚠ 需再確認」標籤；也可以加 `"verify": true`。
   - `sources`：寫來源編號（對應最下面 `sources[]` 的 `id`），畫面會顯示「來源 N」可點連結。文字中的網址也會自動變成連結。
   - `stays`、`transport`、`notices`、`todos`（`done: true/false`）、`openQuestions` 分別對應各分頁。
   - 改完把 `meta.dataVersion` 改成今天日期，畫面底部會顯示。
2. **把 `sw.js` 第一行附近的 `VERSION`（例如 `kyushu-v1` → `kyushu-v2`）加一。** 這樣 iPhone 上已安裝的 app 才會換掉舊快取。
   （`data.json` 本身是「先上網拿新的、沒網路才用快取」，有網路時打開就會拿到新內容；改了其他檔案則一定要改 VERSION。）
3. 檢查 JSON 格式：`python3 -m json.tool data.json > /dev/null`
4. 本機預覽：在這個資料夾執行 `python3 -m http.server 8765`，開 `http://localhost:8765/`。
5. 重新上傳整個資料夾到同一個網址。
6. 若也要更新單檔備援版，重新產生 `kyushu-app-offline.html`（產生腳本在 `/workspace/apro/kyushu-app-tools/build_offline.py`，需先啟動上面的本機預覽）。

## 規則提醒

- 「已訂」和「建議／尚未訂」要分開標示；只放草案裡已有的資訊。
- **不要放任何訂位碼、確認碼、密碼或信用卡資料**（網址公開時任何人都看得到）。

## 在 iPhone 安裝

1. 用 **Safari** 開啟 app 網址（一定要 Safari）。
2. 點下方「分享」按鈕 → 「加入主畫面」→「新增」。
3. 從主畫面打開一次、把每個分頁點一下，之後在日本沒網路也能看。
