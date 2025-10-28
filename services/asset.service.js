(function () {

  async function loadAsset(path) {
    const url = chrome.runtime.getURL(path);
    const res = await fetch(url);
    if (!res.ok) throw new Error('[GGT] Failed to fetch ' + url + ' (status) ' + res.status);
    return await res.text();
  }

  window.__GGT_assetService = {
    loadAsset
  };
})();
