const DEFAULT_CONFIG = { baseUrl: "https://prompt-keeper-teal.vercel.app", apiKey: "" };

const baseUrlEl = document.getElementById("baseUrl");
const apiKeyEl = document.getElementById("apiKey");
const saveBtn = document.getElementById("save");
const statusEl = document.getElementById("savedStatus");

document.addEventListener("DOMContentLoaded", async () => {
  const config = await chrome.storage.local.get(DEFAULT_CONFIG);
  baseUrlEl.value = config.baseUrl || DEFAULT_CONFIG.baseUrl;
  apiKeyEl.value = config.apiKey || "";
});

saveBtn.addEventListener("click", async () => {
  let baseUrl = baseUrlEl.value.trim().replace(/\/+$/, "");
  if (!baseUrl) baseUrl = DEFAULT_CONFIG.baseUrl;
  await chrome.storage.local.set({ baseUrl, apiKey: apiKeyEl.value.trim() });
  statusEl.textContent = "Saved ✓";
  setTimeout(() => (statusEl.textContent = ""), 2000);
});