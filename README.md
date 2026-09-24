# Appium Side Project — Android E2E 自動化測試

用 **Appium 3 + WebdriverIO 9 + TypeScript** 對 Android 模擬器上的範例 App 做 UI 自動化測試的小作品。

測試對象是 Appium 官方維護的範例 App [**ApiDemos**](https://github.com/appium/android-apidemos)，APK 直接放在 repo 裡（`apps/`），所以 clone 下來不需要額外找 App 就能跑。

---

## 技術棧

| 項目 | 選用 | 說明 |
|------|------|------|
| 自動化引擎 | Appium 3 + UiAutomator2 driver | 業界標準的行動裝置自動化框架 |
| 測試框架 | WebdriverIO 9 + Mocha | WDIO 提供 `expect` 斷言、重試、報告 |
| 語言 | TypeScript（strict） | Page Object 有型別，重構安全 |
| 設計模式 | Page Object Model | 選擇器集中管理，spec 只描述行為 |
| 裝置 | Android Emulator（Pixel 7, API 35, arm64-v8a） | Apple Silicon 原生 |

---

## 專案結構

```
.
├── apps/
│   └── ApiDemos-debug.apk        # 受測 App（每次執行都會重新安裝）
├── scripts/
│   └── start-emulator.sh         # 開模擬器並等到真的可用為止
├── test/
│   ├── support/
│   │   └── preflight.ts          # 跑測試前檢查裝置與 port，失敗立刻報錯
│   ├── pageobjects/
│   │   ├── base.page.ts          # 共用選擇器 helper（id / text / UiScrollable）
│   │   ├── home.page.ts          # ApiDemos 首頁分類清單
│   │   └── controls.page.ts      # Views > Controls > 1. Light Theme 表單頁
│   └── specs/
│       ├── navigation.e2e.ts     # 導覽流程測試
│       └── controls.e2e.ts       # 表單元件互動測試
├── wdio.conf.ts                  # WDIO 設定（含自動啟動 Appium server）
└── .github/workflows/
    └── android-e2e.yml           # CI：在 GitHub Runner 上開模擬器跑測試
```

---

## 測試內容

### `navigation.e2e.ts` — 導覽流程

| 測試 | 驗證重點 |
|------|----------|
| 首頁顯示所有分類 | 11 個分類（Accessibility ~ Views）都出現在清單上 |
| 逐層進入 Controls 範例 | `Views → Controls → 1. Light Theme`，標題為 `Views/Controls/1. Light Theme` |
| 返回鍵回到上一層 | 按實體返回鍵後回到主題清單 |

### `controls.e2e.ts` — 表單元件互動

| 測試 | 驗證重點 |
|------|----------|
| 文字輸入 | 輸入文字後 EditText 內容正確 |
| Checkbox 獨立切換 | 勾選 checkbox 1 不會影響 checkbox 2 |
| Radio 單選行為 | 選 radio 2 後 radio 1 自動取消 |
| ToggleButton | 由 `OFF` 切換為 `ON` |
| Spinner 下拉選單 | 預設 `Mercury`，選擇後變成 `Jupiter` |
| 停用狀態的按鈕 | 一個 Save 可點、另一個為 disabled |

測試失敗時會自動截圖到 `logs/`。

---

## 環境需求

- Node.js 20+
- JDK 17
- Android SDK（platform-tools、emulator、API 35 system image）

### macOS（Apple Silicon）安裝步驟

> ⚠️ M1/M2/M3 Mac 必須使用 **arm64** 的 JDK 與 **arm64-v8a** system image，x86 image 無法執行。

```bash
# 1. JDK 17（arm64）
brew install --cask temurin@17
# 或手動下載 https://adoptium.net/ 的 macOS aarch64 版本

# 2. Android SDK command-line tools
#    下載 https://developer.android.com/studio#command-line-tools-only
#    解壓到 $ANDROID_HOME/cmdline-tools/latest

# 3. 環境變數（加進 ~/.zshrc）
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

# 4. 安裝 SDK 套件與 arm64 system image
sdkmanager --licenses
sdkmanager "platform-tools" "emulator" "platforms;android-35" \
           "build-tools;35.0.1" "system-images;android-35;google_apis;arm64-v8a"

# 5. 建立 AVD
avdmanager create avd -n Pixel_7_API_35 \
  -k "system-images;android-35;google_apis;arm64-v8a" -d pixel_7
```

---

## 執行測試

```bash
npm install

# 開模擬器（會等到 sys.boot_completed 才返回；預設 headless）
npm run emulator

# 想看畫面就關掉 headless（模式不符時會自動重開模擬器）
HEADLESS=0 npm run emulator

# 不要自動重開、只回報模式不符
RESTART=0 HEADLESS=0 npm run emulator

# 跑全部測試（Appium server 由 WDIO 自動啟動，不必另開終端機）
npm test

# 只跑某一組
npm run test:smoke      # navigation.e2e.ts
npx wdio run ./wdio.conf.ts --suite controls

# 型別檢查
npm run typecheck
```

---

## 設計說明

**Appium server 由 WDIO 託管。** `wdio.conf.ts` 使用 `@wdio/appium-service`，執行 `npm test` 時會自動起一個 Appium server 並在結束後關閉。

> 注意：不要在 service 的 `args` 裡把 `logLevel` 調低。`@wdio/appium-service` 是靠解析 Appium 的啟動訊息來判斷 server 就緒，壓低 log level 會讓它一直等到逾時。

**每個測試都從乾淨狀態開始。** `beforeEach` 會 `terminateApp` 再 `activateApp`，所以測試之間不會互相污染，順序也不影響結果。

**選擇器策略。** 優先用 `resource-id`（最穩定），清單項目用 text，長清單則用 `UiScrollable` 捲到畫面內再操作。

**Headless 模擬器快很多。** 同一台 M1 Mac、同一組測試實測：headless 全套 **56 秒**，帶視窗 **2 分 38 秒**（navigation 那組從 11 秒變成 1 分 32 秒）。主機負載高時差距更誇張——曾量到帶視窗的 `adb shell echo` 要 6 秒，headless 只要 0.06 秒。所以跑測試一律 headless，要看畫面時才 `HEADLESS=0`。

**`npm run emulator` 會尊重你要的模式。** 如果已經有模擬器在跑但模式不對（例如你下了 `HEADLESS=0` 但背景是 headless 的），腳本會**自動重開**成你要的模式，而不是默默沿用——這正是「下了 `HEADLESS=0` 卻看不到畫面」的原因。不想讓它重開就加 `RESTART=0`，它會報錯並保持原狀。

**測試前會做 pre-flight 檢查。** [`test/support/preflight.ts`](test/support/preflight.ts) 在 `onPrepare` 檢查「有沒有開好機的裝置」和「4723 有沒有被舊的 Appium server 佔住」，有問題就在 **5 秒內**用人話報錯並中止。沒有這層檢查的話，這兩種狀況都只會表現成每個 spec 在 `POST /session` 卡十幾分鐘後超時，看起來像測試壞掉，其實是機器還沒準備好。同時 session 會綁定實際抓到的 udid，避免多台裝置時跑錯機器。

---

## CI

`.github/workflows/android-e2e.yml` 使用 [`reactivecircus/android-emulator-runner`](https://github.com/ReactiveCircus/android-emulator-runner) 在 GitHub Runner 上開啟模擬器執行測試（Linux runner 用 x86_64 image + KVM 加速）。失敗時會把 `logs/` 的截圖上傳成 artifact。

---

## 疑難排解

| 症狀 | 原因與處理 |
|------|------------|
| `Timeout: Appium did not start within expected time` | service `args` 的 log level 被調太低，移除即可 |
| `Error getting device API level ... adbExec timed out` | 模擬器反應太慢（常見於記憶體不足）。關掉佔記憶體的程式，或調高 `appium:adbExecTimeout` |
| 下了 `HEADLESS=0` 卻看不到視窗 | 舊版腳本偵測到有模擬器在跑就沿用、忽略 `HEADLESS`。現已修正為自動重開；若還遇到，`adb emu kill` 後重跑 |
| 所有 spec 都失敗、`logs/` 裡沒有失敗截圖 | 代表是 **session 建立階段**就失敗（測試根本沒開始），不是測試邏輯壞掉。跑 `npm test` 看 pre-flight 的訊息 |
| `Port 4723 is already in use` | 前一次執行留下的 Appium server 還活著：`pkill -f appium` |
| 模擬器開不起來 / 非常慢 | 1) Apple Silicon 上請確認用的是 `arm64-v8a` image，不是 `x86`；2) 改用 headless（預設）；3) 檢查 `uptime` 的 load average，主機被其他程式拖垮時模擬器會慢到無法使用 |
| `adb: device not found` | 執行 `adb kill-server && adb start-server`，再確認 `adb devices` |

---

## License

MIT
