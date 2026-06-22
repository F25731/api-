const state = {
  catalog: null,
  result: null,
  activeTab: "videos"
};

const el = {
  siteName: document.querySelector("#siteName"),
  shareUrl: document.querySelector("#shareUrl"),
  parseForm: document.querySelector("#parseForm"),
  parseBtn: document.querySelector("#parseBtn"),
  pasteBtn: document.querySelector("#pasteBtn"),
  sampleBtn: document.querySelector("#sampleBtn"),
  statusText: document.querySelector("#statusText"),
  platformSection: document.querySelector("#platformSection"),
  typeGrid: document.querySelector("#typeGrid"),
  apiCount: document.querySelector("#apiCount"),
  resultSection: document.querySelector("#resultSection"),
  resultMeta: document.querySelector("#resultMeta"),
  coverFrame: document.querySelector("#coverFrame"),
  authorRow: document.querySelector("#authorRow"),
  resultTitle: document.querySelector("#resultTitle"),
  assetTabs: document.querySelector("#assetTabs"),
  assetList: document.querySelector("#assetList"),
  rawSection: document.querySelector("#rawSection"),
  rawToggle: document.querySelector("#rawToggle"),
  rawJson: document.querySelector("#rawJson")
};

function mediaUrl(url, download = false, filename = "media") {
  const target = new URL("/api/media", location.origin);
  target.searchParams.set("src", url);
  if (download) target.searchParams.set("download", "1");
  target.searchParams.set("filename", filename);
  return target.toString();
}

function setStatus(message, tone = "muted") {
  el.statusText.textContent = message;
  el.statusText.style.color = tone === "error" ? "#ffc2ce" : tone === "ok" ? "#a9ff68" : "var(--neon-purple)";
}

async function loadCatalog() {
  const res = await fetch("/api/catalog", { cache: "no-store" });
  state.catalog = await res.json();
  renderCatalog();
}

function renderCatalog() {
  el.siteName.textContent = state.catalog.siteName || "云逸解析";
  if (el.apiCount) el.apiCount.textContent = `${state.catalog.apis.length} 个接口可用`;
  el.typeGrid.innerHTML = state.catalog.apis.map((api) => `
    <div class="glass-panel platform-card" aria-label="${escapeHtml(api.name)}">${escapeHtml(api.name)}</div>
  `).join("");
}

async function parseCurrent(event) {
  event.preventDefault();
  const rawUrl = el.shareUrl.value.trim();
  if (!rawUrl) return setStatus("请先粘贴分享链接", "error");

  el.parseBtn.disabled = true;
  el.parseBtn.textContent = "解析中...";
  setStatus("正在自动识别平台并解析", "muted");

  try {
    const res = await fetch("/api/parse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: rawUrl })
    });
    const payload = await res.json();
    if (!res.ok || !payload.ok) {
      throw new Error(payload.message || payload.upstream?.msg || "解析失败");
    }
    state.result = payload;
    state.activeTab = firstAvailableTab(payload.normalized);
    renderResult();
    const used = payload.input?.normalizedUrl ? `，已识别：${payload.api.name}` : "";
    setStatus(`解析完成${used}`, "ok");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    el.parseBtn.disabled = false;
    el.parseBtn.textContent = "开始解析";
  }
}

function firstAvailableTab(normalized) {
  if (normalized.videos?.length) return "videos";
  if (normalized.images?.length) return "images";
  if (normalized.audios?.length) return "audios";
  return "links";
}

function renderResult() {
  const { normalized, api, upstream, input } = state.result;
  el.platformSection?.classList.add("hidden");
  el.resultSection.classList.remove("hidden");
  el.rawSection.classList.remove("hidden");
  el.resultMeta.textContent = input?.normalizedUrl ? `${api.name} · ${input.normalizedUrl}` : api.name;
  el.resultTitle.textContent = normalized.title || "解析结果";
  el.rawJson.textContent = JSON.stringify({ input, upstream }, null, 2);

  renderAuthor(normalized);
  renderPreview(normalized);
  renderTabs(normalized);
  renderAssets(normalized);
  el.resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderAuthor(normalized) {
  const bits = [];
  if (normalized.avatar) {
    bits.push(`<img src="${mediaUrl(normalized.avatar)}" alt="">`);
  }
  bits.push(`<span>${escapeHtml(normalized.author || "未返回作者信息")}</span>`);
  el.authorRow.innerHTML = bits.join("");
}

function renderPreview(normalized) {
  const video = normalized.videos?.[0]?.url;
  const cover = normalized.cover;
  if (video) {
    el.coverFrame.innerHTML = `<video src="${mediaUrl(video)}" ${cover ? `poster="${mediaUrl(cover)}"` : ""} controls playsinline></video>`;
    return;
  }
  if (cover) {
    el.coverFrame.innerHTML = `<img src="${mediaUrl(cover)}" alt="封面">`;
    return;
  }
  el.coverFrame.innerHTML = "<span>当前结果没有可预览媒体</span>";
}

function renderTabs(normalized) {
  const tabs = [
    ["videos", "视频", normalized.videos?.length || 0],
    ["images", "封面/图片", normalized.images?.length || 0],
    ["audios", "音频", normalized.audios?.length || 0],
    ["links", "其他链接", normalized.links?.length || 0]
  ];
  el.assetTabs.innerHTML = tabs.map(([id, name, count]) => `
    <button class="tab-btn ${state.activeTab === id ? "active" : ""}" data-tab="${id}" type="button">
      ${name} ${count}
    </button>
  `).join("");
}

function renderAssets(normalized) {
  const assets = normalized[state.activeTab] || [];
  if (!assets.length) {
    el.assetList.innerHTML = `<div class="asset-card"><div class="asset-thumb">--</div><div class="asset-main"><strong>暂无资源</strong><span class="asset-url">这个分类下没有识别到可用链接</span></div></div>`;
    return;
  }
  el.assetList.innerHTML = assets.map((asset, index) => renderAssetCard(asset, index)).join("");
}

function renderAssetCard(asset, index) {
  const label = asset.label || `${typeName(asset.type)} ${index + 1}`;
  const filename = asset.filename || `${label.replace(/[^\w\u4e00-\u9fa5-]+/g, "_") || "media"}_${index + 1}`;
  const details = asset.details ? `<span class="asset-detail">${escapeHtml(asset.details)}</span>` : "";
  const thumb = asset.type === "image"
    ? `<img src="${mediaUrl(asset.url)}" alt="">`
    : iconFor(asset.type);
  const playable = asset.type === "video" || asset.type === "audio";
  return `
    <article class="asset-card">
      <div class="asset-thumb">${thumb}</div>
      <div class="asset-main">
        <strong>${escapeHtml(label)}</strong>
        ${details}
        <span class="asset-url" title="${escapeHtml(asset.url)}">${escapeHtml(asset.url)}</span>
        <div class="asset-actions">
          ${playable ? `<a class="download-link" href="${mediaUrl(asset.url)}" target="_blank" rel="noreferrer">播放</a>` : `<a class="download-link" href="${mediaUrl(asset.url)}" target="_blank" rel="noreferrer">查看</a>`}
          <a class="download-link" href="${mediaUrl(asset.url, true, filename)}">下载</a>
          <button class="mini-btn" type="button" data-copy="${escapeHtml(asset.url)}">复制链接</button>
        </div>
      </div>
    </article>
  `;
}

function typeName(type) {
  return { video: "视频", image: "图片", audio: "音频", link: "链接" }[type] || "资源";
}

function iconFor(type) {
  return { video: "PLAY", audio: "AUD", link: "URL" }[type] || "RES";
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

el.parseForm.addEventListener("submit", parseCurrent);
el.sampleBtn.addEventListener("click", () => {
  const api = state.catalog?.apis?.find((item) => item.sampleUrl);
  if (api?.sampleUrl) {
    el.shareUrl.value = api.sampleUrl;
    setStatus("已填入示例链接");
  } else {
    setStatus("暂无示例链接", "error");
  }
});
el.pasteBtn.addEventListener("click", async () => {
  try {
    el.shareUrl.value = await navigator.clipboard.readText();
    setStatus("已粘贴剪贴板内容");
  } catch (_) {
    setStatus("浏览器不允许读取剪贴板，请手动粘贴", "error");
  }
});
el.assetTabs.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-tab]");
  if (!tab) return;
  state.activeTab = tab.dataset.tab;
  renderTabs(state.result.normalized);
  renderAssets(state.result.normalized);
});
el.assetList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy]");
  if (!button) return;
  await navigator.clipboard.writeText(button.dataset.copy);
  button.textContent = "已复制";
  setTimeout(() => { button.textContent = "复制链接"; }, 1200);
});
el.rawToggle.addEventListener("click", () => el.rawSection.classList.toggle("open"));

loadCatalog().catch((error) => setStatus(error.message, "error"));
