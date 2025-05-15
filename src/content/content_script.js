/*  CleanUp LinkedIn – content_script.js            rev 4.1.1
    · wait for full window.load before touching the DOM
    · width tweaks, side-rail toggles
    · live multi-column feed (flex-column approach)
----------------------------------------------------------------- */

(() => {
  /* ── selectors ─────────────────────────────────────────────── */
  const S = {
    leftRail  : 'aside.scaffold-layout__aside',
    rightRail : 'aside.scaffold-layout__aside--right, aside#right-rail',
    frame     : '.scaffold-layout__inner.scaffold-layout-container',
    feedRoot  : 'main div.scaffold-finite-scroll__content'
  };

  /* ── default option values ─────────────────────────────────── */
  const DFLT = {
    enableCleanup  : true,
    hideLeft       : false,
    hideRight      : false,
    feedWidth      : 'standard',          // 'standard' | 'full' | 'custom'
    feedWidthValue : 960,                 // px if feedWidth === 'custom'
    columnCount    : 1                    // 1 ⇒ LinkedIn default
  };

  /* ── little helpers ────────────────────────────────────────── */
  function domReady () {
    /* wait until frame + feed exist – they’re sometimes injected late */
    return new Promise(resolve => {
      const tick = () =>
        document.querySelector(S.frame) && document.querySelector(S.feedRoot)
          ? resolve()
          : setTimeout(tick, 120);
      tick();
    });
  }

  function setRail (selector, hide) {
    const el = document.querySelector(selector);
    if (el) el.style.display = hide ? 'none' : '';
  }

  /* ------------------------------------------------------------------ */
  /*        C O L U M N   L A Y O U T                                   */
  /* ------------------------------------------------------------------ */
  const CARD_SELECTOR   = 'div[data-view-name="feed-full-update"]';
  const MARKER_SELECTOR = 'h2.visually-hidden, h2.feed-skip-link__container';

  const COL_GAP  = 12;
  const ROW_GAP  = 12;
  const STYLE_ID = 'lfm-column-css';

  let currentColCount = 0;
  let colObserver     = null;
  let nextIndex       = 0;

  function injectColumnCss (cols) {
    let tag = document.getElementById(STYLE_ID);
    if (!tag) {
      tag = document.createElement('style');
      tag.id = STYLE_ID;
      document.head.appendChild(tag);
    }
    tag.textContent = `
      .lfm-col-wrapper{
        display:flex;
        gap:${COL_GAP}px;
        width:100%;
        box-sizing:border-box;
      }
      .lfm-col{
        flex:1 1 calc((100% - ${(cols - 1) * COL_GAP}px)/${cols});
        display:flex;
        flex-direction:column;
        row-gap:${ROW_GAP}px;
        min-width:0;
      }`;
  }

  function teardownColumns () {
    if (!currentColCount) return;

    const feed   = document.querySelector(S.feedRoot);
    const wrapEl = feed?.querySelector('.lfm-col-wrapper');

    if (wrapEl) {
      [...wrapEl.querySelectorAll(`${MARKER_SELECTOR},${CARD_SELECTOR}`)]
        .forEach(node => feed.appendChild(node));
      wrapEl.remove();
    }
    document.getElementById(STYLE_ID)?.remove();
    colObserver?.disconnect();

    currentColCount = 0;
    nextIndex       = 0;
  }

  function buildColumns (colCount) {
    const feed = document.querySelector(S.feedRoot);
    if (!feed) return;

    injectColumnCss(colCount);

    /* 1. wrapper + columns */
    const wrapper = document.createElement('div');
    wrapper.className = 'lfm-col-wrapper';

    const cols = Array.from({ length: colCount }, () => {
      const c = document.createElement('div');
      c.className = 'lfm-col';
      wrapper.appendChild(c);
      return c;
    });

    /* 2. migrate current children into columns */
    const nodes = Array.from(feed.childNodes);
    let logical = 0;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!(n instanceof HTMLElement)) continue;

      if (n.matches(MARKER_SELECTOR)) {
        const card = nodes[i + 1]?.matches?.(CARD_SELECTOR) ? nodes[i + 1] : null;
        cols[logical % colCount].appendChild(n);
        if (card) cols[logical % colCount].appendChild(card);
        logical++; i++;
      } else if (n.matches(CARD_SELECTOR)) {
        cols[logical % colCount].appendChild(n);
        logical++;
      }
    }
    nextIndex = logical;

    feed.innerHTML = '';
    feed.appendChild(wrapper);

    /* 3. observe future infinite-scroll inserts */
    colObserver = new MutationObserver(muts => {
      muts.forEach(m => {
        m.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return;

          if (node.matches(MARKER_SELECTOR)) {
            const dest = cols[nextIndex % colCount];
            dest.appendChild(node);
            nextIndex++;

            const card = node.nextElementSibling;
            if (card?.matches?.(CARD_SELECTOR)) {
              dest.appendChild(card);
              nextIndex++;
            }
          } else if (node.matches(CARD_SELECTOR)) {
            const dest = cols[nextIndex % colCount];
            dest.appendChild(node);
            nextIndex++;
          }
        });
      });
    });
    colObserver.observe(feed, { childList: true, subtree: true });

    currentColCount = colCount;
  }

  function applyColumns (count) {
    if (count < 2) { teardownColumns(); return; }
    if (count !== currentColCount) {
      teardownColumns();
      buildColumns(count);
    }
  }

  /* ------------------------------------------------------------------ */
  /*        W I D T H   O V E R R I D E                                 */
  /* ------------------------------------------------------------------ */
  const widthStyle = (() => {
    const tag = document.createElement('style');
    tag.id = 'cleanup-width-style';
    document.head.appendChild(tag);
    return tag;
  })();

  function applyWidth (mode, px) {
    if (mode === 'full') {
      widthStyle.textContent = `${S.frame}{max-width:none!important;width:100%!important;}`;
    } else if (mode === 'custom') {
      widthStyle.textContent = `${S.frame}{max-width:${px}px!important;width:${px}px!important;}`;
    } else {
      widthStyle.textContent = '';              // 'standard'
    }
  }

  /* ------------------------------------------------------------------ */
  /*        A P P L Y   S E T T I N G S                                 */
  /* ------------------------------------------------------------------ */
  function applySettings (cfg) {
    if (!cfg.enableCleanup) return;

    setRail(S.leftRail , cfg.hideLeft);
    setRail(S.rightRail, cfg.hideRight);

    applyWidth(cfg.feedWidth, cfg.feedWidthValue);
    applyColumns(cfg.columnCount);
  }

  /* ------------------------------------------------------------------ */
  /*        I N I T  – wait for window.load first                       */
  /* ------------------------------------------------------------------ */
  function start() {
    domReady().then(() => {
      chrome.storage.sync.get(DFLT, applySettings);

      chrome.storage.onChanged.addListener((_, area) => {
        if (area !== 'sync') return;
        chrome.storage.sync.get(DFLT, applySettings);
      });
    });
  }

  if (document.readyState === 'complete') {
    start();                                // page already fully loaded
  } else {
    window.addEventListener('load', start); // run only after window.load
  }
})();
