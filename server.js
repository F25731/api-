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

function collectUrls(value, pathName = "", output = []) {
  if (!value) return output;
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) output.push({ label: pathName || "url", url: value });
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectUrls(item, `${pathName || "item"} ${index + 1}`, output));
    return output;
  }
  if (typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => collectUrls(item, key, output));
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

function normalizeResult(upstream) {
  const data = upstream && typeof upstream === "object" && "data" in upstream ? upstream.data : upstream;
  const source = data && typeof data === "object" ? data : upstream;
  const urls = collectUrls(source)
    .filter((item, index, array) => array.findIndex((other) => other.url === item.url) === index)
    .map((item) => ({ ...item, type: classifyUrl(item.label, item.url) }));

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
    videos: urls.filter((item) => item.type === "video"),
    images: urls.filter((item) => item.type === "image"),
    audios: urls.filter((item) => item.type === "audio"),
    links: urls.filter((item) => item.type === "link")
  };
}

async function parseMedia(req, res) {
  const body = JSON.parse(await readBody(req) || "{}");
  const shareUrl = String(body.url || "").trim();
  const apiId = String(body.apiId || "").trim();
  if (!shareUrl) return sendJson(res, 400, { ok: false, message: "请输入需要解析的分享链接" });

  const config = ensureConfig();
  const api = config.apis.find((item) => item.id === apiId && item.enabled);
  if (!api) return sendJson(res, 404, { ok: false, message: "接口不存在或已停用" });
  if (!api.endpointUrl) return sendJson(res, 400, { ok: false, message: "当前接口还没有配置请求地址" });

  const target = new URL(api.endpointUrl);
  const key = api.apikey || config.globalApikey;
  const params = new URLSearchParams();
  params.set(api.urlParam || "url", shareUrl);
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
