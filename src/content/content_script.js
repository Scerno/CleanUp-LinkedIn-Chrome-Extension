/*  CleanUp LinkedIn – content_script.js            rev 4.1.2
    · waits for window.load
    · multi-column feed that co-exists with LinkedIn’s infinite scroll
------------------------------------------------------------------ */

(() => {
	/* ======================================================================
		I N I T I A L    S E T U P
	=================================================================== */
	
	/* ── special log functions ───────────────────────────────────────────── */
	function log(str, type="log") {
		str = "CleanUp Linkedin: "+str;
		console.log(str);
	};
	function info(obj, type="log") {
		console.log("CleanUp Linkedin object");
		console.info(obj);
	};
	
	/* ── selectors we reuse ───────────────────────────────────────────── */
	const S = {
		leftRail  : 'div.scaffold-layout__sidebar',
		rightRail : 'aside.scaffold-layout__aside',
		frame     : '.scaffold-layout__inner.scaffold-layout-container',
		innerFrame: '.scaffold-layout__row.scaffold-layout__content',
		feedRoot  : 'main div.scaffold-finite-scroll__content'
	};

	/* ── default option values ─────────────────────────────────────────── */
	const DFLT = {
		enableCleanup  : true,
		hideLeft       : false,
		hideRight      : false,
		feedWidth      : 'standard',          // 'standard' | 'full' | 'custom'
		feedWidthValue : 960,                 // px for “custom”
		columnCount    : 1                    // 1 ⇒ LinkedIn default
	};

	/* ── wait until the two key containers exist ──────────────────────── */
	const domReady = () => new Promise(resolve => {
		const tick = () =>
		  document.querySelector(S.frame) && document.querySelector(S.feedRoot)
			? resolve()
			: setTimeout(tick, 120);
		tick();
	});
	
	/* called from applySettings() ---------------------------------------*/
	function setRail(sel, hide, cls) {
		const el           = document.querySelector(sel);
		const innerFrame   = document.querySelector(S.innerFrame);
		if (!el || !innerFrame) return;

		el.style.display = hide ? 'none' : '';
		toggleClass(innerFrame, cls, hide);   // add/remove .cleanup--no-left | --no-right
	}

	/* ======================================================================
		H E L P E R S
	=================================================================== */
	
	/* ── helper grid-collapse CSS ────────────────────────────────────────── */
	const gridFixStyle = (() => {
		const tag = document.createElement('style');
		tag.id = 'cleanup-grid-fix';
		tag.textContent = `
		/* hide LEFT rail → collapse grid to 2 cols (main + right-aside) */
		.scaffold-layout--reflow 
		.scaffold-layout__content--sidebar-main-aside.cleanup--no-left {
		  grid-template-areas: "main aside";
		  grid-template-columns:
			   var(--scaffold-layout-main-width)
			   var(--scaffold-layout-aside-width);
		}

		/* hide RIGHT rail → collapse grid to 2 cols (left-sidebar + main) */
		.scaffold-layout--reflow 
		.scaffold-layout__content--sidebar-main-aside.cleanup--no-right {
		  grid-template-areas: "sidebar main";
		  grid-template-columns:
			   var(--scaffold-layout-sidebar-narrow-width)
			   var(--scaffold-layout-main-width);
		}

		/* hide BOTH rails → single, full-width main column */
		.scaffold-layout--reflow 
		.scaffold-layout__content--sidebar-main-aside.cleanup--no-left.cleanup--no-right {
		  grid-template-areas: "main";
		  grid-template-columns: 1fr;
		}
		`;
		document.head.appendChild(tag);
		return tag;
	})();
	
	
	function toggleClass(el, cls, on) {
		on ? el.classList.add(cls) : el.classList.remove(cls);
	}

	
	
	
	/* ======================================================================
		C O L U M N   L A Y O U T
	=================================================================== */
	const CARD_SELECTOR   = 'div';
	const MARKER_SELECTOR = 'h2.feed-skip-link__container';

	const COL_GAP  = 12;
	const ROW_GAP  = 12;
	const STYLE_ID = 'lfm-column-css';

	let currentCols   = 0;
	let colObserver   = null;
	let nextIndex     = 0;

	function injectColumnCss(cols) {
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

	function teardownColumns() {
		if (!currentCols) return;

		const feed = document.querySelector(S.feedRoot);
		const wrap = feed?.querySelector('.lfm-col-wrapper');

		if (wrap) {
			/* move everything back in visual order */
			[...wrap.querySelectorAll(`${MARKER_SELECTOR},${CARD_SELECTOR}`)]
			.forEach(node => feed.insertBefore(node, wrap));
			wrap.remove();
		}
		document.getElementById(STYLE_ID)?.remove();
		colObserver?.disconnect();

		currentCols = 0;
		nextIndex   = 0;
	}

/******************************************************************
*  BUILD COLUMNS  – keeps  <div> + following <h2> together
******************************************************************/
function buildColumns(colCount) {
  const feed = document.querySelector(S.feedRoot);
  if (!feed) return;

  injectColumnCss(colCount);

  /* 1 ▸ wrapper & empty columns */
  const wrapper = document.createElement('div');
  wrapper.className = 'lfm-col-wrapper';

  const cols = Array.from({ length: colCount }, () => {
    const col = document.createElement('div');
    col.className = 'lfm-col';
    wrapper.appendChild(col);
    return col;
  });

  /* 2 ▸ migrate EXISTING children, keeping order */
  let colPtr   = 0;         // next column for a CARD
  let lastCol  = 0;         // column of the most-recent CARD

  Array.from(feed.childNodes).forEach(node => {
    if (!(node instanceof HTMLElement)) return;

    if (node.matches(CARD_SELECTOR)) {       // visible post card
      cols[colPtr].appendChild(node);
      lastCol = colPtr;
      colPtr  = (colPtr + 1) % colCount;     // advance for next card
    }
    else if (node.matches(MARKER_SELECTOR)) { // skip-link heading
      cols[lastCol].appendChild(node);        // stay in same column
    }
  });

  nextIndex = colPtr;       // how many CARDs we placed
  feed.prepend(wrapper);

  /* 3 ▸ observe FUTURE additions (infinite scroll) */
  colObserver = new MutationObserver(muts => {
    muts.forEach(m => {
      m.addedNodes.forEach(node => {
        if (!(node instanceof HTMLElement)) return;
        if (node.parentElement !== feed)    return;

        if (node.matches(CARD_SELECTOR)) {          // new card
          const dest = cols[nextIndex % colCount];
          dest.appendChild(node);
          lastCol = nextIndex % colCount;
          nextIndex++;
        }
        else if (node.matches(MARKER_SELECTOR)) {   // its heading
          cols[lastCol].appendChild(node);
        }
      });
    });
  });
  colObserver.observe(feed, { childList: true });

  currentCols = colCount;
}



	function applyColumns(count) {
		if (count < 2) { teardownColumns(); return; }
		if (count !== currentCols) {
			teardownColumns();
			buildColumns(count);
		}
	}

	/* ======================================================================
		W I D T H   O V E R R I D E
	=================================================================== */
	const widthStyle = (() => {
		const tag = document.createElement('style');
		tag.id = 'cleanup-width-style';
		document.head.appendChild(tag);
		return tag;
	})();

	const applyWidth = (mode, px) => {
		if (mode === 'full') {
			widthStyle.textContent = `${S.frame}{max-width:none!important;width:100%!important;}
				${S.innerFrame} main{max-width:100vw;}`;
		} else if (mode === 'custom') {
			widthStyle.textContent = `${S.frame}{max-width:${px}px!important;width:${px}px!important;}
				${S.innerFrame} main{max-width:${px}px;}`;
		} else {
			widthStyle.textContent = ''; // standard
		}
	};

	/* ======================================================================
		A P P L Y   S E T T I N G S
	=================================================================== */
	function applySettings(cfg) {
		if (!cfg.enableCleanup) return;

		setRail(S.leftRail , cfg.hideLeft , 'cleanup--no-left');
		setRail(S.rightRail, cfg.hideRight, 'cleanup--no-right');

		applyWidth  (cfg.feedWidth, cfg.feedWidthValue);
		applyColumns(cfg.columnCount);
	}

	/* ======================================================================
		I N I T
	=================================================================== */
	function start() {
		domReady().then(() => {
			chrome.storage.sync.get(DFLT, applySettings);

			chrome.storage.onChanged.addListener((_chg, area) => {
				if (area !== 'sync') return;
				chrome.storage.sync.get(DFLT, applySettings);
			});
		});
	}

	/* run only after full page load to avoid LinkedIn race-conditions */
	document.readyState === 'complete'
		? start()
		: window.addEventListener('load', start);
	
	
})();

