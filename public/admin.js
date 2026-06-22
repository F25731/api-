let config = null;

const el = {
  siteNameBrand: document.querySelector("#siteNameBrand"),
  siteNameInput: document.querySelector("#siteNameInput"),
  apikeyInput: document.querySelector("#apikeyInput"),
  timeoutInput: document.querySelector("#timeoutInput"),
  apiRows: document.querySelector("#apiRows"),
  saveBtn: document.querySelector("#saveBtn"),
  addApiBtn: document.querySelector("#addApiBtn"),
  status: document.querySelector("#adminStatus")
};

async function loadConfig() {
  const res = await fetch("/api/config");
  config = await res.json();
  render();
}

function render() {
  if (el.siteNameBrand) el.siteNameBrand.textContent = config.siteName || "云逸解析";
  el.siteNameInput.value = config.siteName || "";
  el.apikeyInput.value = config.globalApikey || "";
  el.timeoutInput.value = config.requestTimeoutMs || 45000;
  config.apis.sort((a, b) => Number(a.order || 999) - Number(b.order || 999));
  el.apiRows.innerHTML = config.apis.map((api, index) => `
    <div class="api-row" data-index="${index}">
      <div class="order-badge">${index + 1}</div>
      <input data-field="name" value="${escapeHtml(api.name)}" placeholder="显示名称">
      <input data-field="group" value="${escapeHtml(api.group || "")}" placeholder="分组">
      <input data-field="endpointUrl" value="${escapeHtml(api.endpointUrl || "")}" placeholder="接口地址">
      <input data-field="sampleUrl" value="${escapeHtml(api.sampleUrl || "")}" placeholder="示例链接">
      <input data-field="apikey" type="password" value="${escapeHtml(api.apikey || "")}" placeholder="单独 apikey">
      <label class="api-switch"><input data-field="enabled" type="checkbox" ${api.enabled ? "checked" : ""}>启用</label>
      <div class="row-actions">
        <button class="mini-btn" type="button" data-action="up">上移</button>
        <button class="mini-btn" type="button" data-action="down">下移</button>
        <button class="mini-btn danger" type="button" data-action="remove">删除</button>
      </div>
    </div>
  `).join("");
}

function syncFromDom() {
  config.siteName = el.siteNameInput.value.trim();
  config.globalApikey = el.apikeyInput.value.trim();
  config.requestTimeoutMs = Number(el.timeoutInput.value || 45000);
  [...el.apiRows.querySelectorAll(".api-row")].forEach((row, index) => {
    const api = config.apis[Number(row.dataset.index)];
    row.querySelectorAll("[data-field]").forEach((input) => {
      const field = input.dataset.field;
      api[field] = input.type === "checkbox" ? input.checked : input.value.trim();
    });
    api.order = index + 1;
    api.method = api.method || "GET";
    api.urlParam = api.urlParam || "url";
    api.keyParam = api.keyParam || "apikey";
  });
}

async function saveConfig() {
  syncFromDom();
  el.saveBtn.disabled = true;
  setStatus("正在保存...");
  try {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(config)
    });
    config = await res.json();
    render();
    setStatus("配置已保存，前台会立即生效。", true);
  } catch (error) {
    setStatus(error.message, false);
  } finally {
    el.saveBtn.disabled = false;
  }
}

function moveRow(index, direction) {
  syncFromDom();
  const next = index + direction;
  if (next < 0 || next >= config.apis.length) return;
  const [item] = config.apis.splice(index, 1);
  config.apis.splice(next, 0, item);
  config.apis.forEach((api, order) => { api.order = order + 1; });
  render();
}

function addApi() {
  syncFromDom();
  const id = `custom_${Date.now()}`;
  config.apis.push({
    id,
    name: "新增解析接口",
    group: "自定义",
    endpointUrl: "",
    sampleUrl: "",
    method: "GET",
    urlParam: "url",
    keyParam: "apikey",
    apikey: "",
    enabled: true,
    order: config.apis.length + 1
  });
  render();
}

function setStatus(message, ok = true) {
  el.status.textContent = message;
  el.status.style.color = ok ? "var(--ok)" : "var(--danger)";
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

el.saveBtn.addEventListener("click", saveConfig);
el.addApiBtn.addEventListener("click", addApi);
el.apiRows.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const row = button.closest(".api-row");
  const index = Number(row.dataset.index);
  if (button.dataset.action === "up") moveRow(index, -1);
  if (button.dataset.action === "down") moveRow(index, 1);
  if (button.dataset.action === "remove") {
    syncFromDom();
    config.apis.splice(index, 1);
    config.apis.forEach((api, order) => { api.order = order + 1; });
    render();
  }
});

loadConfig().catch((error) => setStatus(error.message, false));
