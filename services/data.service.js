(function () {

  const AGENT__BUBBLE = 'div[data-message-author-role="assistant"]';
  let nextCharId = window.ggt__nextCharId;
  let charArray = window.ggt__charArray;

  function getTexts() {
    const divs = document.querySelectorAll(AGENT__BUBBLE);
    return Array.from(divs).map(d => d.innerText.trim()).filter(Boolean);
  }

  function getInfo() {
    const divs = document.querySelectorAll(AGENT__BUBBLE);
    const arr = [];

    nextCharId = nextCharId || 0;
    divs.forEach(d => {
      if (!d.dataset.assCharId) {
        nextCharId += 1;
        d.dataset.assCharId = 'ass-' + nextCharId;
      }
      const text = (d.innerText || '').trim();
      arr.push({ id: d.dataset.assCharId, count: text.length, text });
    });
    charArray = arr;
    return arr;
  }

  window.__GGT_dataService = {
    getTexts,
    getInfo
  };
})();
