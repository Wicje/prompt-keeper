const DEFAULT_CONFIG = { baseUrl: "https://prompt-keeper-teal.vercel.app", apiKey: "" };

const promptEl = document.getElementById("prompt");
const saveBtn = document.getElementById("save");
const openBtn = document.getElementById("open");
const statusEl = document.getElementById("status");
const settingsLink = document.getElementById("settings");

let tabUrl = "";

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
}

document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabUrl = tab?.url ?? "";

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => (window.getSelection() ? window.getSelection().toString().trim() : ""),
    });
    if (result) {
      promptEl.value = result;
      saveBtn.disabled = false;
    }
  } catch {
    // Popup opened without a page we can reach; let them paste manually.
  }

  promptEl.addEventListener("input", () => {
    saveBtn.disabled = !promptEl.value.trim();
  });
});

saveBtn.addEventListener("click", async () => {
  const text = promptEl.value.trim();
  if (!text) return;

  const config = await chrome.storage.local.get(DEFAULT_CONFIG);
  const baseUrl = (config.baseUrl || DEFAULT_CONFIG.baseUrl).replace(/\/+$/, "");
  const apiKey = config.apiKey || "";

  if (!apiKey) {
    setStatus(
      "No API key set. Open Settings, then grab a capture key from the Integrations page of your app.",
      true
    );
    return;
  }

  saveBtn.disabled = true;
  setStatus("Saving…");
  try {
    const res = await fetch(`${baseUrl}/api/external/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ promptText: text, aiSource: "other", sourceUrl: tabUrl }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(`Server said: ${data.error ?? "something went wrong"}`, true);
    } else if (data.duplicate) {
      setStatus("Already saved (duplicate).");
    } else {
      setStatus("Saved ✓");
    }
  } catch {
    setStatus("Network error — could not reach the app.", true);
  } finally {
    saveBtn.disabled = false;
  }
});

openBtn.addEventListener("click", async () => {
  const config = await chrome.storage.local.get(DEFAULT_CONFIG);
  const baseUrl = (config.baseUrl || DEFAULT_CONFIG.baseUrl).replace(/\/+$/, "");
  const prompt = encodeURIComponent(promptEl.value.trim());
  chrome.tabs.create({
    url: `${baseUrl}/add?prompt=${prompt}&source=${encodeURIComponent(tabUrl)}`,
  });
});

settingsLink.addEventListener("click", () => chrome.runtime.openOptionsPage());