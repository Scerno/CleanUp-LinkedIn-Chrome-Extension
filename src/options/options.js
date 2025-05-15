/* options.js – matches popup styling & behaviour */

(() => {

  /* ---------- element map ---------- */
  const UI = {
    // level
    levelRadios:   [...document.getElementsByName('cleanupLevel')],
    customRulesBox: document.getElementById('customRules'),
    ruleChecks:    [...document.querySelectorAll('[data-rule]')],

    // layout
    hideLeft:  document.getElementById('hideLeft'),
    hideRight: document.getElementById('hideRight'),

    feedWidthRadios: [...document.getElementsByName('feedWidth')],
    feedWidthValue:  document.getElementById('feedWidthValue'),

    columnCount: document.getElementById('columnCount')
  };

  const RULE_KEYS = ['promoted','jobs','addToFeed','events','fresh','hiring'];

  /* ---------- defaults ---------- */
  const DEFAULTS = {
    cleanupLevel: 'basic',

    rules: RULE_KEYS.reduce((o,k)=>(o[k]=false,o), {}),

    hideLeft:false,
    hideRight:false,

    feedWidth:'standard',
    feedWidthValue:960,

    columnCount:1
  };

  /* ---------- helper: show/hide custom box ---------- */
  function toggleCustomBox () {
    const isCustom = UI.levelRadios.find(r=>r.checked)?.value === 'custom';
    UI.customRulesBox.classList.toggle('hidden', !isCustom);
  }

  /* ---------- load ---------- */
  function load () {
    chrome.storage.sync.get(DEFAULTS, data => {

      /* level & custom rules */
      UI.levelRadios.forEach(r => r.checked = (r.value === data.cleanupLevel));
      UI.ruleChecks.forEach(cb => cb.checked = !!data.rules[cb.dataset.rule]);
      toggleCustomBox();

      /* layout */
      UI.hideLeft.checked  = data.hideLeft;
      UI.hideRight.checked = data.hideRight;

      UI.feedWidthRadios.forEach(r => r.checked = (r.value === data.feedWidth));
      UI.feedWidthValue.value = data.feedWidthValue;

      UI.columnCount.value = data.columnCount;

      /* version */
      document.getElementById('version').textContent =
        chrome.runtime.getManifest().version;
    });
  }

  /* ---------- save ---------- */
  function save () {
    const rules = {};
    UI.ruleChecks.forEach(cb => rules[cb.dataset.rule] = cb.checked);

    chrome.storage.sync.set({
      cleanupLevel: UI.levelRadios.find(r=>r.checked)?.value || DEFAULTS.cleanupLevel,
      rules,

      hideLeft:  UI.hideLeft.checked,
      hideRight: UI.hideRight.checked,

      feedWidth: UI.feedWidthRadios.find(r=>r.checked)?.value || DEFAULTS.feedWidth,
      feedWidthValue: Number(UI.feedWidthValue.value) || DEFAULTS.feedWidthValue,

      columnCount: Number(UI.columnCount.value) || DEFAULTS.columnCount
    });
  }

  /* ---------- listeners ---------- */
  /* level + rules */
  UI.levelRadios.forEach(r => r.addEventListener('change',  ()=>{toggleCustomBox();save();}));
  UI.ruleChecks .forEach(cb=>cb.addEventListener('change',  save));

  /* layout */
  [UI.hideLeft, UI.hideRight, UI.feedWidthValue, UI.columnCount]
    .forEach(el => el.addEventListener('change', save));

  UI.feedWidthRadios.forEach(r => r.addEventListener('change', save));

  /* steppers */
  document.querySelectorAll('button.step').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const target=document.getElementById(btn.dataset.target);
      if(!target) return;
      const step=Number(btn.dataset.step);
      const val =Number(target.value)||0;
      const min =Number(target.min)||-Infinity;
      const max =Number(target.max)|| Infinity;
      target.value=Math.min(max,Math.max(min,val+step));
      target.dispatchEvent(new Event('change'));
    });
  });

  /* tooltip logic (same as popup) */
  document.querySelectorAll('.helpTrigger').forEach(trig=>{
    const tip=trig.parentElement.querySelector('.helpText');
    if(!tip) return;
    const show=()=>tip.style.display='block';
    const hide=()=>tip.style.display='none';
    trig.addEventListener('mouseenter',show);
    trig.addEventListener('mouseleave',hide);
    trig.addEventListener('focus',show);
    trig.addEventListener('blur',hide);
  });

  /* back to popup */
  document.getElementById('backToPopup').addEventListener('click',()=>{
    window.close();      // closes tab if it was a popup; otherwise just close page
  });

  /* init */
  load();
})();
