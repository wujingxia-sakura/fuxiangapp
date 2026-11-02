# 浮想

> 一个默认私密的内心天气记录。  
> 打开就写，写完落进那天的天气里；月度看气候，某一天才回到当时的场景。

---

## 怎么打开

**最简单：双击 `启动浮想.bat`**  
它会在本机起一个小服务，然后用默认浏览器打开 `http://127.0.0.1:8765`。  
需要电脑上装有 Python（Windows 商店版或 python.org 版都可以）。

**也可以直接双击 `index.html`**  
能看、能写，但部分浏览器在 `file://` 下会限制本地存储或 Service Worker。  
想完整体验 PWA（安装到桌面、离线），请用上面的方式，或把文件夹部署到静态托管。

**想先看看有内容的样子：**  
打开 `http://127.0.0.1:8765/?demo=1`。  
演示数据写在单独的存储键里，不会影响你的正式记录。

**直达某个月 / 某一天 / 选择器（调试或分享用）：**

- `?month=2026-10`：直接打开 2026 年 10 月的回顾
- `?day=2026-11-02`：直接打开 11 月 2 日
- `?picker=scene`：直接打开场景选择器（`weather` 则是天气）
- 可以和 `?demo=1` 一起用

---

## 这一版有什么

- **今天**：一个输入框，Enter 发送，Shift + Enter 换行。写完的泡泡落在当前那段天气里。
- **天气**：8 个家族、30 个变体（晴、云、雨、雪、雾/尘、风、雷、冰/霜）。
- **场景**：36 张场景插图 + CSS 天气粒子（雨、雪、花瓣、萤火、尘埃……）。每个场景还有远景、中景、近景和光；图片全部在本地，没有外部请求、没有 canvas。
- **一天多段天气**：随时切换，顶部天气带显示这一天的变化；点某一段可以回看当时的场景。
- **回顾**：月视图看天气色带，年视图看 12 个月的天气纹理；点某一天才展开场景、题记和泡泡。
- **搜索**：按文字或 `#标签` 搜索所有泡泡。
- **编辑 / 戳破**：泡泡可以改、可以删，删除后 5 秒内可撤销。
- **导出**：Markdown（按天/天气/场景整理）和 JSON（完整备份）。
- **PWA**：可以安装到桌面；离线时仍可打开已缓存的页面。
- **减少动效**：设置里可手动关闭粒子动画，也会尊重系统的 `prefers-reduced-motion`。

## 这一版还没有

- 账号、云同步（当前是本地版，数据只在这台设备）。
- 图片附件。
- 公开分享页 / 公开花园（已从这一版拿掉）。
- 语音输入、导入旧备忘录。
- AI 整理文章。

这些都在路线图里，但第一版先保证「打开就写」和「回顾」这两件事是顺的。

---

## 数据在哪里

所有数据存在浏览器的 `localStorage` 里，键名：

- 正式记录：`fuxiang.v1`
- 演示记录：`fuxiang.demo.v1`

**重要：清浏览器数据、换浏览器、换设备，记录都不会自动跟过去。**  
请定期在「设置 → 数据 → 导出 JSON」备份。导入 JSON 会覆盖当前数据。

---

## 文件说明

| 文件 | 作用 |
| --- | --- |
| `index.html` | 页面结构 |
| `styles.css` | 全部样式、照片层与天气配方 |
| `data.js` | 天气、场景、分组、图片路径。**加天气/场景主要改这里** |
| `app.js` | 状态、渲染、交互、导入导出 |
| `images/scenes/` | 36 张场景大图 + 缩略图 + `captions.json` |
| `manifest.webmanifest` | PWA 配置 |
| `sw.js` | Service Worker，缓存静态资源与场景图片 |
| `icons/` | 图标（SVG + 192/512 PNG） |
| `tools/make_icons.py` | 重新生成 PNG 图标的脚本 |
| `启动浮想.bat` | 本机起服务并打开浏览器 |

没有构建步骤，没有依赖，没有第三方请求。

> 如果你改了 `styles.css` 或 `app.js`，记得把 `sw.js` 里的 `CACHE` 版本号 +1，否则浏览器可能还在用旧缓存。换场景图片时，把 `IMAGE_CACHE` 版本号也 +1。

---

## 场景图片

- 36 张插图来自你提供的《插图.docx》，顺序与 `data.js` 里的 `SCENES` 一致：01 花园、02 夜萤火……36 雾中远山与钟声。
- 已裁掉底部约 7% 的水印区域，并转成 WebP；大图在 `images/scenes/01.webp` … `36.webp`，缩略图在 `images/scenes/thumbs/`。
- 选择场景时，大图作为背景；CSS 的雨、雪、花瓣、萤火、尘埃会叠在照片上，原来的 CSS 剪影会自动退场。
- 图片首次打开某个场景时加载并缓存，不会一次性加载 36 张。
- 换图：保持文件名和顺序，或改 `data.js` 里 `SCENES` 的 `image` / `thumb`。

---

## 怎么加一个场景

1. 在 `data.js` 的 `SCENES` 里加一条：

```js
{
  name: '海边黄昏',
  group: '山海',
  recipe: 'sea',                 // 粒子/渐变配方
  palette: ['#1a1020', '#3a1f2c', '#7a3f3a'],
  accent: '#f6b27a',
  line: '海把最后一点光，慢慢收走了。',
  far: 'sea',                    // 远景
  mid: 'lighthouse',             // 中景
  near: 'cliff',                 // 近景
  orb: 'sunset',                 // 光源：sun / moon / lamp / window / sunset / shop / dawn / mist-sun
  beam: 'beam',                  // 光束：sunbeam / lamp-cone / window-spill / beam / dust-beam / ...
  image: 'images/scenes/37.webp',        // 可选；不写就按顺序取 NN.webp
  thumb: 'images/scenes/thumbs/37.webp'  // 可选
}
```

2. 如果把它加在末尾，不写 `image` 会自动取 `37.webp`；没有第 37 张图时，会退回 CSS 场景。

3. 如果想复用现成的空间结构，也可以只写 `name`，然后在 `data.js` 的 `SCENE_PROPS` 里给它指定 `far / mid / near / orb / beam`。

4. 如果想加全新的视觉元素，在 `styles.css` 里加对应的 `.prop` 或 `.beam` 样式，并在 `app.js` 的 `PROP_SVG` / `RECIPE_PARTICLES` 里加图形或粒子配置。

场景是数据，不是代码；有图片时照片是主角，CSS 负责天气和光；没有图片时退回「远景 / 中景 / 近景 / 光」的舞台。

---

## 怎么加一个天气

在 `data.js` 的 `WEATHERS` 里加一条，`family` 必须是 `families` 里已有的 id：

```js
{ name: '细雨', family: 'rain', color: '#8fa9c4', scenes: ['雨夜路灯', '玻璃雨痕与街灯'] }
```

选择器会自动按家族分组，不需要改 UI。

---

## 在手机上用

### 同一 Wi-Fi（最快）

1. 电脑双击 `启动浮想.bat`。窗口里会打印“手机（同一 Wi-Fi）”地址，例如 `http://172.24.129.170:8765`。
2. 手机连同一个 Wi-Fi，用 Safari / Chrome 打开这个地址。
3. 电脑和这个命令行窗口要保持开着；手机和电脑的记录是**分开**的。
4. 局域网 HTTP 通常只能当网页用；要完整安装成 App / 离线，用下面的 HTTPS 部署。

如果手机打不开：允许 Python 通过 Windows 防火墙（专用网络），确认不是访客 Wi-Fi；有些校园/公司网络会隔离设备，这种情况直接用下面的部署。

### 部署到 Netlify（推荐日常用）

1. 电脑打开 <https://app.netlify.com/drop>，把整个 `浮想` 文件夹拖进去。
2. 几秒后会得到一个 `https://xxx.netlify.app` 网址。
3. 手机打开这个网址。
4. 装到桌面：
   - iPhone Safari：分享 → 添加到主屏幕
   - Android Chrome：⋮ → 安装应用 / 添加到主屏幕
5. 以后从桌面图标打开；看过的页面和场景图可以离线显示。

### 部署到 GitHub Pages

GitHub Pages 也免费、HTTPS，适合想留版本记录的人。

1. 新建一个 **public** 仓库，例如 `fuxiang`，不要勾选 README。
2. 把 `浮想` 文件夹里的**内容**上传到仓库根目录（不要把外层 `浮想` 文件夹整个拖进去，否则网址会变成 `/fuxiang/浮想/`）。
   - 图片多，推荐 GitHub Desktop：Add local repository → 选择 `D:\桌面\浮想` → commit → Publish repository。
   - 或者网页 Upload files，进入 `浮想` 文件夹后全选里面的文件/文件夹，拖进上传区。
3. 仓库 Settings → Pages → Build and deployment：
   - Source: Deploy from a branch
   - Branch: `main`，目录选 `/ (root)`
   - Save
4. 等 1–3 分钟，打开 `https://<用户名>.github.io/fuxiang/`。
5. 手机打开这个网址，Safari / Chrome 添加到主屏幕。

注意：

- 免费账号的 Pages 需要 public 仓库；代码和 36 张场景图会公开。**你的记录仍然只在各自浏览器里，不会上传。**
- 根目录放一个空的 `.nojekyll`，避免 GitHub 用 Jekyll 处理静态文件（项目里已经带了）。
- 更新：重新 commit / push；改了 CSS/JS/`data.js` 就把 `sw.js` 的 `CACHE` +1；换场景图就把 `IMAGE_CACHE` +1。
- 如果打开是 404：确认 `index.html` 在仓库根目录，Pages 分支选的是 `main` 和 `/ (root)`，再等一会儿。

GitHub Pages、Vercel、Cloudflare Pages 也都可以；因为全是静态文件，不需要服务器。

> 注意：数据存在每个浏览器自己的 `localStorage` 里。  
> 这一版没有账号，电脑和手机不会同步；换网址（origin）后旧记录也不会自动跟过去。  
> 换设备或换网址前，先在「设置 → 数据」导出 JSON，再到新地方导入。

---

## 隐私

- 没有统计代码、没有外部字体、没有 CDN、没有第三方请求。
- 数据不上传；除非你自己把导出的文件发给别人。
- 场景图片和 CSS 都在本地，没有外部图片请求。

---

## 下一步

1. 账号与同步（本地优先，登录后备份/多端）。
2. 图片附件（压缩、去 EXIF）。
3. 单条分享 / 明信片（可选，不做公开花园）。
4. 语音输入、导入旧记录。
5. 月度/年度「气候」更细的统计与年轮视图。
