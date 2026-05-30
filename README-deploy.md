# 水果賓果部署說明

這個專案已經是純靜態網站，可直接部署到免費靜態空間。

## 推薦平台

### 1. Vercel
1. 把整個資料夾上傳到 GitHub。
2. 到 [Vercel](https://vercel.com/) 用 GitHub 登入。
3. `Add New Project` -> 匯入這個 repo。
4. Framework Preset 選 `Other`。
5. 不需要 Build Command。
6. Output Directory 保持空白或填 `.`。
7. 點 `Deploy`。

### 2. Netlify
1. 把整個資料夾上傳到 GitHub。
2. 到 [Netlify](https://www.netlify.com/) 用 GitHub 登入。
3. `Add new site` -> `Import an existing project`。
4. Build command 留空。
5. Publish directory 填 `.`。
6. 點 `Deploy site`。

## 手機分享方式

部署完成後，你會拿到一個 HTTPS 網址，例如：

```text
https://your-fruit-bingo.vercel.app
```

把這個網址傳給朋友即可直接在手機瀏覽器開玩。

## 手機安裝成 App

部署完成後，朋友用手機開啟網址時可以：

- Android Chrome：看到 `安裝到手機` 按鈕或瀏覽器安裝提示
- iPhone Safari：用 `分享` -> `加入主畫面`

## 本機測試

如果要先在本機測試，請用任何靜態伺服器開啟，不要直接雙擊 HTML：

```powershell
python -m http.server 8080
```

然後開啟：

```text
http://localhost:8080
```
