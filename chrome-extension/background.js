const CONFIG = { baseUrl: "https://prompt-keeper-teal.vercel.app" };

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "pk-save-selection",
    title: "Save selection to Prompt Keeper",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "pk-save-selection" || !tab?.id) return;

  chrome.scripting
    .executeScript({
      target: { tabId: tab.id },
      func: () => {
        const sel = window.getSelection();
        return sel ? sel.toString().trim() : "";
      },
    })
    .then(async ([{ result }]) => {
      const { baseUrl } = await chrome.storage.local.get(CONFIG);
      const prompt = encodeURIComponent(result || "");
      const url = `${baseUrl || CONFIG.baseUrl}/add?prompt=${prompt}&source=${encodeURIComponent(tab.url || "")}`;
      chrome.tabs.create({ url });
    })
    .catch(() => {
      chrome.tabs.create({ url: `${CONFIG.baseUrl}/add` });
    });
});