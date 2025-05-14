/* popup.js – v4.0 */

(() => {
  /* ---------- tab switching ---------- */
  const tabButtons   = document.querySelectorAll('#tabs button');
  const tabContents  = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector('#tabs button.active').classList.remove('active');
      btn.classList.add('active');
      tabContents.forEach(sec => {
        sec.classList.toggle('hidden', sec.id !== btn.dataset.tab);
      });
    });
  });

  /* ---------- quick navigation buttons ---------- */
  document.getElementById('openOptions')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('openOptionsFromHelp')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  /* add real URLs if you have them */
  document.getElementById('openWebStore')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://chrome.google.com/webstore' });
  });

  document.getElementById('openFeatureRequest')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://github.com/your‑repo/issues' });
  });

  /* ---------- element map ---------- */
  const UI = {
    enableCleanup: document.getElementById('enableCleanup'),
    cleanupLevelRadios: [...document.getElementsByName('cleanupLevel')],

    hideLeft: document.getElementById('hideLeft'),
    hideRight: document.getElementById('hideRight'),

    feedWidthRadios: [...document.getElementsByName('feedWidth')],
    feedWidthValue: document.getElementById('feedWidthValue'),

    columnCount: document.getElementById('columnCount')
  };

  /* ---------- defaults ---------- */
  const DEFAULTS = {
    enableCleanup: true,
    cleanupLevel:  'basic',

    hideLeft:  false,
    hideRight: false,

    feedWidth:      'standard',
    feedWidthValue: 960,

    columnCount: 1
  };

  /* ---------- load ---------- */
  function loadSettings () {
    chrome.storage.sync.get(DEFAULTS, data => {
      UI.enableCleanup.checked = data.enableCleanup;

      UI.cleanupLevelRadios.forEach(r => r.checked = (r.value === data.cleanupLevel));
      UI.hideLeft.checked  = data.hideLeft;
      UI.hideRight.checked = data.hideRight;

      UI.feedWidthRadios.forEach(r => r.checked = (r.value === data.feedWidth));
      UI.feedWidthValue.value = data.feedWidthValue;

      UI.columnCount.value = data.columnCount;

      document.getElementById('version').textContent =
        chrome.runtime.getManifest().version;
    });
  }

  /* ---------- save ---------- */
  function saveSettings () {
    chrome.storage.sync.set({
      enableCleanup: UI.enableCleanup.checked,

      cleanupLevel:  UI.cleanupLevelRadios.find(r => r.checked)?.value || DEFAULTS.cleanupLevel,

      hideLeft:  UI.hideLeft.checked,
      hideRight: UI.hideRight.checked,

      feedWidth: UI.feedWidthRadios.find(r => r.checked)?.value || DEFAULTS.feedWidth,
      feedWidthValue: Number(UI.feedWidthValue.value) || DEFAULTS.feedWidthValue,

      columnCount: Number(UI.columnCount.value) || DEFAULTS.columnCount
    });
  }

  /* --- attach change/input listeners --- */
  [
    UI.enableCleanup,
    UI.hideLeft,
    UI.hideRight,
    UI.feedWidthValue,
    UI.columnCount
  ].forEach(el => el?.addEventListener('change', saveSettings));

  UI.feedWidthValue?.addEventListener('input', saveSettings);
  UI.columnCount?.addEventListener('input', saveSettings);

  UI.cleanupLevelRadios.forEach(r => r.addEventListener('change', saveSettings));
  UI.feedWidthRadios.forEach(r => r.addEventListener('change', saveSettings));

  /* ---------- tooltip logic ---------- */
  document.querySelectorAll('.helpTrigger').forEach(trigger => {
    const tooltip = trigger.closest('.has-help')?.querySelector('.helpText');
    if (!tooltip) return;

    const show = () => (tooltip.style.display = 'block');
    const hide = () => (tooltip.style.display = 'none');

    trigger.addEventListener('mouseenter', show);
    trigger.addEventListener('mouseleave', hide);
    trigger.addEventListener('focus',     show);
    trigger.addEventListener('blur',      hide);
  });

  /* ---------- +/- steppers ---------- */
  document.querySelectorAll('button.step').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;

      const step    = Number(btn.dataset.step);
      const current = Number(target.value) || 0;
      const min     = Number(target.min) || -Infinity;
      const max     = Number(target.max) ||  Infinity;

      const next = Math.min(max, Math.max(min, current + step));
      target.value = next;
      target.dispatchEvent(new Event('change'));   // triggers save
    });
  });

  /* ---------- initialise ---------- */
  loadSettings();
})();
