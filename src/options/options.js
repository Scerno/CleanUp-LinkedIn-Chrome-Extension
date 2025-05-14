const ruleCheckboxes = [...document.querySelectorAll('[data-rule]')];
const widenFeedOpt = document.getElementById('widenFeedOpt');
const hideLeftRailOpt = document.getElementById('hideLeftRailOpt');
const status = document.getElementById('status');

function load() {
  chrome.storage.sync.get({
    rules: {},
    widenFeed: false,
    hideLeftRail: false
  }, res => {
    ruleCheckboxes.forEach(cb => cb.checked = !!res.rules[cb.dataset.rule]);
    widenFeedOpt.checked = res.widenFeed;
    hideLeftRailOpt.checked = res.hideLeftRail;
  });
}

function save() {
  const rules = {};
  ruleCheckboxes.forEach(cb => rules[cb.dataset.rule] = cb.checked);
  chrome.storage.sync.set({
    rules,
    widenFeed: widenFeedOpt.checked,
    hideLeftRail: hideLeftRailOpt.checked
  }, () => {
    status.textContent = 'Saved';
    setTimeout(() => status.textContent = '', 1500);
  });
}

document.body.addEventListener('change', save);
document.addEventListener('DOMContentLoaded', load);
