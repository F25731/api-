const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 8765);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Fyb2530+";
const ADMIN_COOKIE = "yunyi_admin";
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const CONFIG_PATH = path.join(DATA_DIR, "config.json");

const DEFAULT_CONFIG = {
  siteName: "云逸解析",
  globalApikey: "",
  requestTimeoutMs: 45000,
  apis: [
    ["youtube", "YouTube解析", "海外视频", "https://api.nycnm.cn/api/v2/youtube", "https://youtu.be/g0W66BptAdw?si=G-kDo0uEYDqvQdbU"],
    ["huya", "虎牙视频解析", "直播/视频", "https://api.nycnm.cn/api/v2/huya", "https://www.huya.com/video/play/1102925198.html"],
    ["wxsph", "微信视频号解析", "国内短视频", "https://api.nycnm.cn/api/v2/wxsph", "https://weixin.qq.com/sph/AYznnccv9H"],
    ["qianwen", "千问图片视频无水印解析", "AI创作", "https://api.nycnm.cn/api/v2/qianwen", ""],
    ["doubao", "豆包图片视频去水印解析", "AI创作", "https://api.nycnm.cn/api/v2/doubao", ""],
    ["jimengai", "即梦AI去水印解析", "AI创作", "https://api.nycnm.cn/api/v2/jimengai", ""],
    ["tiktok", "TikTok视频解析", "海外视频", "https://api.nycnm.cn/api/v2/tiktok", "https://www.tiktok.com/@scout2015/video/6718335390845095173"],
    ["zuiyou", "最右视频解析", "社区视频", "https://api.nycnm.cn/api/v2/zuiyou", "https://share.xiaochuankeji.cn/hybrid/share/post?pid=409909720&vid=2499989659"],
    ["weibo", "微博短视频解析", "社区视频", "https://api.nycnm.cn/api/v2/weibo", "https://video.weibo.com/show?fid=1034:5213178888388610"],
    ["xhs", "小红书视频图文解析", "图文/视频", "https://api.nycnm.cn/api/v2/xhs", "http://xhslink.com/o/2e2mgpx7Yk9"],
    ["pipigx", "皮皮搞笑去水印", "社区视频", "https://api.nycnm.cn/api/v2/pipigx", "https://h5.pipigx.com/pp/post/713972441434"],
    ["bilibili", "哔哩哔哩去水印", "长视频", "https://api.nycnm.cn/api/v2/bilibili", "https://www.bilibili.com/video/BV1UwknYnE9w/?share_source=copy_web"],
    ["dy", "抖音视频图集解析", "国内短视频", "https://api.nycnm.cn/api/v2/dy", "https://v.douyin.com/M9d3P5PA7LM"],
    ["tt", "头条视频解析", "资讯视频", "https://api.nycnm.cn/api/v2/tt", "https://m.toutiao.com/is/oEe4HwA2dRY/"],
    ["ks", "快手视频图集解析", "国内短视频", "https://api.nycnm.cn/api/v2/ks", "https://www.kuaishou.com/f/X-3wBPzKx1Kvi1sE"]
  ].map((item, index) => ({
    id: item[0],
    name: item[1],
    group: item[2],
    endpointUrl: item[3],
    sampleUrl: item[4],
    method: "GET",
    urlParam: "url",
    keyParam: "apikey",
    apikey: "",
    enabled: true,
    order: index + 1
  }))
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

const API_DOMAINS = {
  youtube: ["youtube.com", "youtu.be"],
  huya: ["huya.com"],
  wxsph: ["weixin.qq.com"],
  qianwen: ["qianwen", "tongyi", "aliyun.com"],
  doubao: ["doubao.com"],
  jimengai: ["jimeng", "jianying.com"],
  tiktok: ["tiktok.com"],
  zuiyou: ["xiaochuankeji.cn", "izuiyou.com"],
  weibo: ["weibo.com"],
  xhs: ["xhslink.com", "xiaohongshu.com"],
  pipigx: ["pipigx.com"],
  bilibili: ["bilibili.com", "b23.tv"],
  dy: ["douyin.com", "iesdouyin.com"],
  tt: ["toutiao.com"],
  ks: ["kuaishou.com"]
};

const YOUTUBE_ITAGS = {
  "18": "360p MP4",
  "22": "720p MP4",
  "37": "1080p MP4",
  "38": "3072p MP4",
  "43": "360p WebM",
  "59": "480p MP4",
  "78": "480p MP4",
  "133": "240p video-only MP4",
  "134": "360p video-only MP4",
  "135": "480p video-only MP4",
  "136": "720p video-only MP4",
  "137": "1080p video-only MP4",
  "138": "2160p video-only MP4",
  "139": "Audio M4A 48kbps",
  "140": "Audio M4A 128kbps",
  "141": "Audio M4A 256kbps",
  "160": "144p video-only MP4",
  "242": "240p video-only WebM",
  "243": "360p video-only WebM",
  "244": "480p video-only WebM",
  "247": "720p video-only WebM",
  "248": "1080p video-only WebM",
  "249": "Audio Opus 50kbps",
  "250": "Audio Opus 70kbps",
  "251": "Audio Opus 160kbps",
  "278": "144p video-only WebM",
  "394": "144p video-only MP4",
  "395": "240p video-only MP4",
  "396": "360p video-only MP4",
  "397": "480p video-only MP4",
  "398": "720p video-only MP4",
  "399": "1080p video-only MP4",
  "400": "1440p video-only MP4",
  "401": "2160p video-only MP4"
};

function ensureConfig() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf8");
    return structuredClone(DEFAULT_CONFIG);
  }
  const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  return mergeConfig(saved);
}

function mergeConfig(saved) {
  const byId = new Map((saved.apis || []).map((api) => [api.id, api]));
  const defaults = DEFAULT_CONFIG.apis.map((api) => ({ ...api, ...(byId.get(api.id) || {}) }));
  const extras = (saved.apis || []).filter((api) => !DEFAULT_CONFIG.apis.some((item) => item.id === api.id));
  return {
    ...DEFAULT_CONFIG,
    ...saved,
    apis: [...defaults, ...extras].sort((a, b) => Number(a.order || 999) - Number(b.order || 999))
  };
}

function saveConfig(config) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(body);
}

function getCookie(req, name) {
  const cookie = req.headers.cookie || "";
  const parts = cookie.split(";").map((part) => part.trim());
  const found = parts.find((part) => part.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : "";
}

function adminToken() {
  return crypto.createHmac("sha256", ADMIN_PASSWORD).update("yunyi-admin").digest("hex");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function isAdminAuthed(req) {
  return safeEqual(getCookie(req, ADMIN_COOKIE), adminToken());
}

function sendAdminLogin(res, message = "") {
  const error = message ? `<p class="error">${escapeHtml(message)}</p>` : "";
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  res.end(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>后台密钥 - 云逸解析</title>
  <style>
    :root{--bg:#0d0221;--glass:rgba(255,255,255,.04);--border:rgba(255,255,255,.1);--text:#f8f9fa;--muted:#adb5bd;--purple:#9d4edd;--neon:#e0aaff}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 10% 0,#3c096c,transparent 38vw),radial-gradient(circle at 90% 100%,#240046,transparent 42vw),var(--bg);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:var(--text)}
    .card{width:min(420px,calc(100% - 32px));padding:30px;border:1px solid var(--border);border-radius:20px;background:var(--glass);backdrop-filter:blur(16px);box-shadow:0 8px 32px rgba(0,0,0,.37)}
    .brand{display:flex;align-items:center;gap:12px;margin-bottom:24px}.brand img{width:42px;height:42px;border-radius:12px}.brand strong{font-size:1.25rem}
    h1{margin:0 0 8px;font-size:1.8rem}p{margin:0 0 20px;color:var(--muted);line-height:1.7}
    input{width:100%;height:48px;padding:0 14px;border:1px solid var(--border);border-radius:12px;background:rgba(0,0,0,.24);color:#fff;font:inherit;outline:none}input:focus{border-color:var(--neon)}
    button{width:100%;height:48px;margin-top:14px;border:0;border-radius:12px;background:linear-gradient(135deg,var(--purple),#7b2cbf);color:#fff;font:inherit;font-weight:700;cursor:pointer}
    .error{margin:0 0 14px;color:#ffc2ce}
  </style>
</head>
<body>
  <form class="card" id="loginForm">
    <div class="brand"><img src="/yunyi-logo.svg" alt=""><strong>云逸解析</strong></div>
    <h1>输入后台密钥</h1>
    <p>请输入管理员密钥后进入后台配置。</p>
    ${error}
    <input id="password" type="password" autocomplete="current-password" placeholder="后台密钥" autofocus>
    <button type="submit">进入后台</button>
  </form>
  <script>
    document.querySelector("#loginForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const password = document.querySelector("#password").value;
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password })
      });
      if (res.ok) location.href = "/admin";
      else location.reload();
    });
  </script>
</body>
</html>`);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("请求体过大"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function publicConfig(config) {
  return {
    siteName: config.siteName,
    apis: config.apis
      .filter((api) => api.enabled)
      .sort((a, b) => Number(a.order || 999) - Number(b.order || 999))
      .map(({ id, name, group, sampleUrl, order, enabled }) => ({ id, name, group, sampleUrl, order, enabled }))
  };
}

function sanitizeConfig(input) {
  const config = mergeConfig(input || {});
  config.siteName = String(config.siteName || DEFAULT_CONFIG.siteName).trim().slice(0, 40);
  config.globalApikey = String(config.globalApikey || "").trim();
  config.requestTimeoutMs = Math.min(Math.max(Number(config.requestTimeoutMs || 45000), 5000), 120000);
  config.apis = (config.apis || []).map((api, index) => ({
    id: String(api.id || `api-${index + 1}`).trim(),
    name: String(api.name || "未命名接口").trim(),
    group: String(api.group || "其他").trim(),
    endpointUrl: String(api.endpointUrl || "").trim(),
    sampleUrl: String(api.sampleUrl || "").trim(),
    method: String(api.method || "GET").toUpperCase() === "POST" ? "POST" : "GET",
    urlParam: String(api.urlParam || "url").trim(),
    keyParam: String(api.keyParam || "apikey").trim(),
    apikey: String(api.apikey || "").trim(),
    enabled: Boolean(api.enabled),
    order: Number(api.order || index + 1)
  }));
  return config;
}

function normalizeShareText(text, apiId) {
  const raw = String(text || "").trim();
  const urls = extractUrls(raw);
  if (!urls.length) return { url: raw, extracted: false, candidates: [] };
  const domains = API_DOMAINS[apiId] || [];
  const matched = urls.find((url) => domains.some((domain) => hostMatches(url, domain)));
  return {
    url: matched || urls[0],
    extracted: true,
    candidates: urls
  };
}

function extractUrls(text) {
  const matches = String(text || "").match(/https?:\/\/[^\s<>"'`，。！？、；：）】》]+/gi) || [];
  return matches.map(cleanUrl).filter(Boolean);
}

function cleanUrl(url) {
  return String(url || "").trim().replace(/[)\]}>,.?!;:'"。，、；：！？）】》]+$/g, "");
}

function hostMatches(url, domain) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    const normalizedDomain = String(domain || "").toLowerCase().replace(/^www\./, "");
    return host === normalizedDomain || host.endsWith(`.${normalizedDomain}`) || host.includes(normalizedDomain);
  } catch (_) {
    return false;
  }
}

function resolveApiForInput(config, requestedApiId, input) {
  const enabledApis = (config.apis || [])
    .filter((api) => api.enabled)
    .sort((a, b) => Number(a.order || 999) - Number(b.order || 999));
  if (requestedApiId) {
    return enabledApis.find((api) => api.id === requestedApiId) || null;
  }
  const urls = extractUrls(input);
  for (const url of urls) {
    const matched = enabledApis.find((api) => (API_DOMAINS[api.id] || []).some((domain) => hostMatches(url, domain)));
    if (matched) return matched;
  }
  return null;
}

function collectUrls(value, pathName = "", output = []) {
  if (!value) return output;
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) output.push({ label: pathName || "url", url: value });
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectUrls(item, pathName ? `${pathName} ${index + 1}` : `item ${index + 1}`, output));
    return output;
  }
  if (typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => collectUrls(item, pathName ? `${pathName} ${key}` : key, output));
  }
  return output;
}

function classifyUrl(label, url) {
  const text = `${label} ${url}`.toLowerCase();
  if (/(cover|poster|thumb|avatar|image|img|pic|photo|logo|封面|图片)/i.test(text) || /\.(png|jpe?g|webp|gif|bmp|avif)(\?|$)/i.test(url)) {
    return "image";
  }
  if (/(music|audio|mp3|m4a|wav|sound|音频|音乐)/i.test(text) || /\.(mp3|m4a|aac|wav|flac|ogg)(\?|$)/i.test(url)) {
    return "audio";
  }
  if (/(video|play|url|mp4|m3u8|mov|视频)/i.test(text) || /\.(mp4|m3u8|mov|webm|m4v)(\?|$)/i.test(url)) {
    return "video";
  }
  return "link";
}

function enrichMediaItem(item, index, total) {
  const meta = getUrlMeta(item.url);
  const base = item.type === "video" ? describeVideo(item, meta, index) :
    item.type === "audio" ? describeAudio(item, meta, index) :
    item.type === "image" ? describeImage(item, meta, index) :
    describeLink(item, meta, index);
  const tags = [];
  const lowerLabel = String(item.label || "").toLowerCase();

  if (item.type === "video" && /\b(no[_-]?watermark|watermark_free|clean|download|download_addr|play_addr|hd)\b/i.test(lowerLabel)) {
    tags.push("no watermark");
  }
  if (item.type === "video" && /\b(watermark|wm)\b/i.test(lowerLabel) && !tags.includes("no watermark")) {
    tags.push("watermark");
  }
  if (meta.size) tags.push(meta.size);
  if (meta.duration) tags.push(meta.duration);
  if (meta.itag) tags.push(`itag ${meta.itag}`);

  return {
    ...item,
    label: total > 1 ? `${base} #${index + 1}` : base,
    details: tags.join(" · "),
    filename: buildFilename(item.type, base, index)
  };
}

function getUrlMeta(url) {
  const meta = {};
  try {
    const parsed = new URL(url);
    const params = parsed.searchParams;
    meta.ext = getExt(parsed.pathname);
    meta.mime = params.get("mime") || params.get("mimetype") || "";
    meta.itag = params.get("itag") || "";
    meta.quality = params.get("quality_label") || params.get("quality") || params.get("definition") || "";
    meta.width = params.get("width") || params.get("w") || "";
    meta.height = params.get("height") || params.get("h") || "";
    meta.bitrate = params.get("bitrate") || params.get("br") || params.get("rate") || "";
    meta.size = formatBytes(params.get("clen") || params.get("size") || "");
    meta.duration = formatDuration(params.get("dur") || params.get("duration") || "");
    meta.format = inferFormat(meta.ext, meta.mime, parsed.pathname);
  } catch (_) {
    meta.ext = "";
    meta.mime = "";
    meta.itag = "";
    meta.quality = "";
    meta.width = "";
    meta.height = "";
    meta.bitrate = "";
    meta.size = "";
    meta.duration = "";
    meta.format = "";
  }
  return meta;
}

function describeVideo(item, meta, index) {
  const lowerLabel = String(item.label || "").toLowerCase();
  const itagLabel = meta.itag ? YOUTUBE_ITAGS[meta.itag] : "";
  const resolution = getResolution(meta, lowerLabel);
  const quality = itagLabel || resolution || humanizeLabel(item.label) || `Video ${index + 1}`;
  const format = meta.format && !quality.toLowerCase().includes(meta.format.toLowerCase()) ? ` ${meta.format}` : "";
  return `${quality}${format}`.trim();
}

function describeAudio(item, meta, index) {
  const itagLabel = meta.itag ? YOUTUBE_ITAGS[meta.itag] : "";
  if (itagLabel && /^audio/i.test(itagLabel)) return itagLabel;
  const bitrate = meta.bitrate ? `${Math.round(Number(meta.bitrate) / 1000) || meta.bitrate}kbps` : "";
  return ["Audio", bitrate, meta.format || humanizeLabel(item.label) || `${index + 1}`].filter(Boolean).join(" ");
}

function describeImage(item, meta, index) {
  const lowerLabel = String(item.label || "").toLowerCase();
  const kind = /cover|poster|thumb|thumbnail/i.test(lowerLabel) ? "Cover" :
    /avatar|head|logo/i.test(lowerLabel) ? "Avatar" : `Image ${index + 1}`;
  const resolution = getResolution(meta, lowerLabel);
  return [kind, resolution, meta.format].filter(Boolean).join(" ");
}

function describeLink(item, meta, index) {
  return [humanizeLabel(item.label) || `Link ${index + 1}`, meta.format].filter(Boolean).join(" ");
}

function getResolution(meta, text = "") {
  const fromText = String(text).match(/(?:^|[^0-9])([1-9][0-9]{2,3}p|[1248]k)(?:[^0-9]|$)/i);
  if (fromText) return fromText[1].toUpperCase();
  if (meta.quality) return meta.quality;
  if (meta.width && meta.height) return `${meta.width}x${meta.height}`;
  if (meta.height) return `${meta.height}p`;
  return "";
}

function getExt(pathname) {
  const match = String(pathname || "").match(/\.([a-z0-9]{2,5})$/i);
  return match ? match[1].toLowerCase() : "";
}

function inferFormat(ext, mime, pathname) {
  const source = `${ext} ${mime} ${pathname}`.toLowerCase();
  if (source.includes("mp4")) return "MP4";
  if (source.includes("webm")) return "WebM";
  if (source.includes("m3u8")) return "M3U8";
  if (source.includes("m4a")) return "M4A";
  if (source.includes("mp3")) return "MP3";
  if (source.includes("opus")) return "Opus";
  if (source.includes("jpg") || source.includes("jpeg")) return "JPG";
  if (source.includes("png")) return "PNG";
  if (source.includes("webp")) return "WebP";
  return "";
}

function humanizeLabel(label) {
  return String(label || "")
    .replace(/[_\-.]+/g, " ")
    .replace(/\b(url|urls|data|item|list|media)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatBytes(value) {
  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size >= 1024 * 1024 * 1024) return `${(size / 1024 / 1024 / 1024).toFixed(1)}GB`;
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)}MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)}KB`;
  return `${size}B`;
}

function formatDuration(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

function buildFilename(type, label, index) {
  return `${type}_${index + 1}_${String(label || "media").replace(/[^\w\u4e00-\u9fa5-]+/g, "_").slice(0, 60)}`;
}

function normalizeResult(upstream) {
  const data = upstream && typeof upstream === "object" && "data" in upstream ? upstream.data : upstream;
  const source = data && typeof data === "object" ? data : upstream;
  const urls = collectUrls(source)
    .filter((item, index, array) => array.findIndex((other) => other.url === item.url) === index)
    .map((item) => ({ ...item, type: classifyUrl(item.label, item.url) }));
  const videos = urls.filter((item) => item.type === "video");
  const images = urls.filter((item) => item.type === "image");
  const audios = urls.filter((item) => item.type === "audio");
  const links = urls.filter((item) => item.type === "link");

  const pick = (...keys) => {
    if (!source || typeof source !== "object") return "";
    for (const key of keys) {
      if (typeof source[key] === "string" && source[key].trim()) return source[key];
    }
    return "";
  };

  return {
    title: pick("title", "desc", "description", "text") || "解析结果",
    author: pick("author", "nickname", "name", "user"),
    avatar: pick("avatar", "avatar_url", "head", "headimg"),
    cover: pick("cover", "poster", "thumbnail", "thumb", "image") || (urls.find((item) => item.type === "image") || {}).url || "",
    videos: videos.map((item, index) => enrichMediaItem(item, index, videos.length)),
    images: images.map((item, index) => enrichMediaItem(item, index, images.length)),
    audios: audios.map((item, index) => enrichMediaItem(item, index, audios.length)),
    links: links.map((item, index) => enrichMediaItem(item, index, links.length))
  };
}

async function parseMedia(req, res) {
  const body = JSON.parse(await readBody(req) || "{}");
  const shareUrl = String(body.url || "").trim();
  const apiId = String(body.apiId || "").trim();
  if (!shareUrl) return sendJson(res, 400, { ok: false, message: "请输入需要解析的分享链接" });

  const config = ensureConfig();
  const api = resolveApiForInput(config, apiId, shareUrl);
  if (!api) {
    return sendJson(res, apiId ? 404 : 400, {
      ok: false,
      message: apiId ? "接口不存在或已停用" : "无法自动识别平台，请确认链接属于支持的平台"
    });
  }
  if (!api.endpointUrl) return sendJson(res, 400, { ok: false, message: "当前接口还没有配置请求地址" });

  const normalizedShare = normalizeShareText(shareUrl, api.id);
  const target = new URL(api.endpointUrl);
  const key = api.apikey || config.globalApikey;
  const params = new URLSearchParams();
  params.set(api.urlParam || "url", normalizedShare.url);
  if (key) params.set(api.keyParam || "apikey", key);

  const timeout = Math.min(Math.max(Number(config.requestTimeoutMs || 45000), 5000), 120000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    let response;
    if (api.method === "POST") {
      response = await fetch(target, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded; charset=utf-8" },
        body: params,
        signal: controller.signal
      });
    } else {
      params.forEach((value, keyName) => target.searchParams.set(keyName, value));
      response = await fetch(target, { signal: controller.signal });
    }

    const text = await response.text();
    let upstream = text;
    try {
      upstream = JSON.parse(text);
    } catch (_) {
      upstream = { raw: text };
    }

    sendJson(res, response.ok ? 200 : 502, {
      ok: response.ok,
      status: response.status,
      api: { id: api.id, name: api.name },
      input: {
        originalUrl: shareUrl,
        normalizedUrl: normalizedShare.url,
        extracted: normalizedShare.extracted,
        candidates: normalizedShare.candidates,
        autoDetected: !apiId
      },
      upstream,
      normalized: normalizeResult(upstream)
    });
  } catch (error) {
    sendJson(res, 502, {
      ok: false,
      message: error.name === "AbortError" ? "接口请求超时" : error.message
    });
  } finally {
    clearTimeout(timer);
  }
}

async function proxyMedia(req, res, requestUrl) {
  const src = requestUrl.searchParams.get("src");
  const filename = requestUrl.searchParams.get("filename") || "media";
  if (!src || !/^https?:\/\//i.test(src)) return sendJson(res, 400, { ok: false, message: "无效的媒体地址" });

  try {
    const headers = {};
    if (req.headers.range) headers.range = req.headers.range;
    const upstream = await fetch(src, { headers });
    const responseHeaders = {
      "content-type": upstream.headers.get("content-type") || "application/octet-stream",
      "accept-ranges": upstream.headers.get("accept-ranges") || "bytes",
      "content-disposition": requestUrl.searchParams.get("download") === "1" ? `attachment; filename*=UTF-8''${encodeURIComponent(filename)}` : "inline"
    };
    const contentLength = upstream.headers.get("content-length");
    const contentRange = upstream.headers.get("content-range");
    if (contentLength) responseHeaders["content-length"] = contentLength;
    if (contentRange) responseHeaders["content-range"] = contentRange;
    res.writeHead(upstream.status, responseHeaders);
    if (upstream.body && upstream.body.pipeTo) {
      const { Writable } = require("stream");
      await upstream.body.pipeTo(Writable.toWeb(res));
    } else {
      res.end(Buffer.from(await upstream.arrayBuffer()));
    }
  } catch (error) {
    sendJson(res, 502, { ok: false, message: error.message });
  }
}

function serveStatic(req, res, requestUrl) {
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname === "/") pathname = "/index.html";
  if (pathname === "/admin") pathname = "/admin.html";
  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }
    res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === "GET" && (requestUrl.pathname === "/admin" || requestUrl.pathname === "/admin.html")) {
      if (!isAdminAuthed(req)) return sendAdminLogin(res);
      return serveStatic(req, res, requestUrl);
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/admin/login") {
      const body = JSON.parse(await readBody(req) || "{}");
      if (!safeEqual(body.password, ADMIN_PASSWORD)) {
        return sendJson(res, 401, { ok: false, message: "后台密钥错误" });
      }
      res.writeHead(204, {
        "set-cookie": `${ADMIN_COOKIE}=${encodeURIComponent(adminToken())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
        "cache-control": "no-store"
      });
      return res.end();
    }
    if (req.method === "GET" && requestUrl.pathname === "/api/catalog") {
      return sendJson(res, 200, publicConfig(ensureConfig()));
    }
    if (req.method === "GET" && requestUrl.pathname === "/api/config") {
      if (!isAdminAuthed(req)) return sendJson(res, 401, { ok: false, message: "请先输入后台密钥" });
      return sendJson(res, 200, ensureConfig());
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/config") {
      if (!isAdminAuthed(req)) return sendJson(res, 401, { ok: false, message: "请先输入后台密钥" });
      const body = JSON.parse(await readBody(req) || "{}");
      const config = sanitizeConfig(body);
      saveConfig(config);
      return sendJson(res, 200, config);
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/parse") {
      return parseMedia(req, res);
    }
    if (req.method === "GET" && requestUrl.pathname === "/api/media") {
      return proxyMedia(req, res, requestUrl);
    }
    if (req.method === "GET") {
      return serveStatic(req, res, requestUrl);
    }
    sendJson(res, 405, { ok: false, message: "Method not allowed" });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
});

ensureConfig();
server.listen(PORT, () => {
  console.log(`Media parser hub is running at http://127.0.0.1:${PORT}`);
});
