(function () {
  // obtain settings first
  chrome.storage.sync.get({
    enableCleanup: true,
    level: 'custom',
    rules: {},
    widenFeed: false,
    hideLeftRail: false
  }, cfg => {
    if (!cfg.enableCleanup) return;

    // determine which selectors or keywords we need to target
    const defaultRules = {
      basic: { promoted: true },
      extreme: { promoted: true, jobs: true, addToFeed: true, events: true, fresh: true, hiring: true }
    };

    const activeRules = (cfg.level === 'basic' || cfg.level === 'extreme')
      ? defaultRules[cfg.level]
      : cfg.rules;

    // helper tests for each rule
    const tests = {
      promoted: node => /sponsored|promoted/i.test(node.innerText),
      jobs: node => /jobs recommended for you/i.test(node.innerText),
      addToFeed: node => /add to your feed/i.test(node.innerText),
      events: node => /events recommended for you/i.test(node.innerText),
      fresh: node => /fresh perspectives/i.test(node.innerText),
      hiring: node => /are you hiring/i.test(node.innerText)
    };

    const FEED_SELECTOR = 'main div.feed-shared-update-v2';

    function sweep() {
      document.querySelectorAll(FEED_SELECTOR).forEach(post => {
        for (const [key, test] of Object.entries(tests)) {
          if (activeRules[key] && test(post)) {
            post.style.display = 'none';
            break;
          }
        }
      });
    }

    // run once and also whenever the feed updates
    sweep();
    const observer = new MutationObserver(sweep);
    observer.observe(document.body, { childList: true, subtree: true });

    // ------ layout tweaks ------
    if (cfg.widenFeed) {
      document.body.style.maxWidth = '100%';
    }
    if (cfg.hideLeftRail) {
      const leftRail = document.querySelector('.scaffold-layout__aside');
      if (leftRail) leftRail.style.display = 'none';
    }
  });
})();
