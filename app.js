(function () {
  'use strict';

  const STORAGE_KEY_BOOKMARKS = 'tech_oa_bookmarks_v1';
  const STORAGE_KEY_SOLVED = 'tech_oa_solved_v1';
  const STORAGE_KEY_VIEW = 'tech_oa_view_mode_v1';
  const STORAGE_KEY_PAGE_SIZE = 'tech_oa_page_size_v1';

  let rawQuestions = [];
  let metadata = {};
  let filteredQuestions = [];

  const state = {
    category: 'all',
    company: '',
    search: '',
    freshness: 'all',
    status: 'all',
    sort: 'newest',
    pageSize: parseInt(localStorage.getItem(STORAGE_KEY_PAGE_SIZE), 10) || 50,
    page: 1,
    view: localStorage.getItem(STORAGE_KEY_VIEW) || 'table',
  };

  const bookmarks = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY_BOOKMARKS) || '[]'));
  const solved = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY_SOLVED) || '[]'));

  const els = {
    loading: document.getElementById('loading-state'),
    empty: document.getElementById('empty-state'),
    emptyResetBtn: document.getElementById('empty-reset-btn'),
    tableContainer: document.getElementById('table-container'),
    tableBody: document.getElementById('table-body'),
    gridContainer: document.getElementById('grid-container'),
    paginationNav: document.getElementById('pagination-nav'),
    paginationPages: document.getElementById('pagination-pages'),
    paginationPrev: document.getElementById('pagination-prev'),
    paginationNext: document.getElementById('pagination-next'),

    statTotalQuestions: document.getElementById('stat-total-questions'),
    statTotalCompanies: document.getElementById('stat-total-companies'),
    statHotCount: document.getElementById('stat-hot-count'),
    statNewCount: document.getElementById('stat-new-count'),
    statSolvedText: document.getElementById('stat-solved-text'),
    progressFillBar: document.getElementById('progress-fill-bar'),

    categoryTabs: document.getElementById('category-tabs'),
    countAll: document.getElementById('count-all'),
    countCoding: document.getElementById('count-coding'),
    countSystemDesign: document.getElementById('count-system-design'),
    countLld: document.getElementById('count-lld'),
    countAiCoding: document.getElementById('count-ai-coding'),
    countSql: document.getElementById('count-sql'),

    searchInput: document.getElementById('search-input'),
    searchClearBtn: document.getElementById('search-clear-btn'),
    companyTrigger: document.getElementById('company-select-trigger'),
    companyLabel: document.getElementById('company-select-label'),
    companyMenu: document.getElementById('company-select-menu'),
    companyMenuSearch: document.getElementById('company-menu-search'),
    companyMenuOptions: document.getElementById('company-menu-options'),
    freshnessSelect: document.getElementById('freshness-select'),
    statusSelect: document.getElementById('status-select'),
    quickCompaniesList: document.getElementById('quick-companies-list'),
    activeChips: document.getElementById('active-chips'),
    clearAllBtn: document.getElementById('clear-all-filters-btn'),

    resultsCountText: document.getElementById('results-count-text'),
    sortSelect: document.getElementById('sort-select'),
    pageSizeSelect: document.getElementById('page-size-select'),
    viewTableBtn: document.getElementById('view-table-btn'),
    viewGridBtn: document.getElementById('view-grid-btn'),
    scrollTopBtn: document.getElementById('scroll-top-btn'),

    randomBtn: document.getElementById('random-btn'),
    randomModal: document.getElementById('random-modal'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    modalRollAgainBtn: document.getElementById('modal-roll-again-btn'),
    modalQTitle: document.getElementById('modal-q-title'),
    modalQFormat: document.getElementById('modal-q-format'),
    modalQDate: document.getElementById('modal-q-date'),
    modalQCompanies: document.getElementById('modal-q-companies'),
    modalPracticeBtn: document.getElementById('modal-practice-btn'),
    modalStarBtn: document.getElementById('modal-star-btn'),
    modalCheckBtn: document.getElementById('modal-check-btn'),
  };

  let currentRandomQuestion = null;

  async function init() {
    if (window.QUESTION_BANK_DATA) {
      loadData(window.QUESTION_BANK_DATA);
    } else {
      try {
        const res = await fetch('data/questions.json');
        const data = await res.json();
        loadData(data);
      } catch (err) {
        els.loading.innerHTML = '<p style="color:#f87171">Failed to load question bank data.</p>';
        return;
      }
    }

    bindEvents();
    syncUIControls();
    applyFiltersAndRender();
  }

  function loadData(payload) {
    rawQuestions = payload.questions.map(q => ({
      ...q,
      _searchStr: `${q.title} ${q.companies.join(' ')} ${q.format}`.toLowerCase()
    }));
    metadata = payload.metadata || {};

    renderStats();
    populateCompanyOptions();
    populateQuickCompanyChips();
  }

  function renderStats() {
    if (!metadata.total) return;

    let hotCount = 0;
    let newCount = 0;
    for (const q of rawQuestions) {
      if (q.isHot) hotCount++;
      if (q.isNew) newCount++;
    }

    els.statTotalQuestions.textContent = metadata.total.toLocaleString();
    els.statTotalCompanies.textContent = metadata.allCompanies ? metadata.allCompanies.length.toLocaleString() : '-';
    els.statHotCount.textContent = hotCount.toLocaleString();
    els.statNewCount.textContent = newCount.toLocaleString();

    const fmtCounts = metadata.formatCounts || {};
    els.countAll.textContent = metadata.total.toLocaleString();
    els.countCoding.textContent = (fmtCounts['Coding'] || 0).toLocaleString();
    els.countSystemDesign.textContent = (fmtCounts['System design'] || 0).toLocaleString();
    els.countLld.textContent = (fmtCounts['Low-level design'] || 0).toLocaleString();
    els.countAiCoding.textContent = (fmtCounts['AI coding'] || 0).toLocaleString();
    els.countSql.textContent = (fmtCounts['SQL'] || 0).toLocaleString();

    updateProgressUI();
  }

  function updateProgressUI() {
    const total = rawQuestions.length || 1;
    const solvedCount = solved.size;
    const pct = Math.round((solvedCount / total) * 100);
    els.statSolvedText.textContent = `${solvedCount} / ${total} (${pct}%)`;
    els.progressFillBar.style.width = `${pct}%`;
  }

  function populateCompanyOptions() {
    if (!metadata.allCompanies) return;
    const fragment = document.createDocumentFragment();

    const allOpt = document.createElement('div');
    allOpt.className = `menu-option ${!state.company ? 'selected' : ''}`;
    allOpt.dataset.company = '';
    allOpt.innerHTML = `<span>All Companies</span><span class="option-count">${metadata.total}</span>`;
    fragment.appendChild(allOpt);

    for (const c of metadata.allCompanies) {
      const opt = document.createElement('div');
      opt.className = `menu-option ${state.company === c.name ? 'selected' : ''}`;
      opt.dataset.company = c.name;
      opt.innerHTML = `<span>${escapeHTML(c.name)}</span><span class="option-count">${c.count}</span>`;
      fragment.appendChild(opt);
    }

    els.companyMenuOptions.innerHTML = '';
    els.companyMenuOptions.appendChild(fragment);
  }

  function populateQuickCompanyChips() {
    if (!metadata.topCompanies) return;
    const fragment = document.createDocumentFragment();

    for (const c of metadata.topCompanies.slice(0, 18)) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `company-chip ${state.company === c.name ? 'active' : ''}`;
      chip.dataset.company = c.name;

      const domain = getCompanyDomain(c.name);
      const iconHtml = domain
        ? `<img class="chip-avatar" src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" alt="" loading="lazy" />`
        : '';

      chip.innerHTML = `${iconHtml}<span>${escapeHTML(c.name)}</span>`;
      fragment.appendChild(chip);
    }

    els.quickCompaniesList.innerHTML = '';
    els.quickCompaniesList.appendChild(fragment);
  }

  function getCompanyDomain(name) {
    if (!name) return null;
    const cleaned = name.trim().toLowerCase();
    for (const q of rawQuestions) {
      if (q.domains) {
        for (const [k, v] of Object.entries(q.domains)) {
          if (k.toLowerCase() === cleaned) return v;
        }
      }
    }
    return null;
  }

  function bindEvents() {
    let searchTimeout = null;
    els.searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      const val = els.searchInput.value.trim();
      els.searchClearBtn.style.display = val ? 'flex' : 'none';
      searchTimeout = setTimeout(() => {
        state.search = val.toLowerCase();
        state.page = 1;
        applyFiltersAndRender();
      }, 150);
    });

    els.searchClearBtn.addEventListener('click', () => {
      els.searchInput.value = '';
      els.searchClearBtn.style.display = 'none';
      state.search = '';
      state.page = 1;
      applyFiltersAndRender();
      els.searchInput.focus();
    });

    els.categoryTabs.addEventListener('click', e => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      const cat = btn.dataset.category;
      if (state.category === cat) return;

      els.categoryTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.category = cat;
      state.page = 1;
      applyFiltersAndRender();
    });

    els.companyTrigger.addEventListener('click', () => {
      toggleCompanyMenu();
    });

    els.companyMenuSearch.addEventListener('input', () => {
      const query = els.companyMenuSearch.value.trim().toLowerCase();
      const options = els.companyMenuOptions.querySelectorAll('.menu-option');
      options.forEach(opt => {
        const text = opt.firstElementChild.textContent.toLowerCase();
        opt.style.display = text.includes(query) ? 'flex' : 'none';
      });
    });

    els.companyMenuOptions.addEventListener('click', e => {
      const opt = e.target.closest('.menu-option');
      if (!opt) return;
      const comp = opt.dataset.company || '';
      selectCompany(comp);
      closeCompanyMenu();
    });

    els.quickCompaniesList.addEventListener('click', e => {
      const chip = e.target.closest('.company-chip');
      if (!chip) return;
      const comp = chip.dataset.company;
      selectCompany(state.company === comp ? '' : comp);
    });

    els.freshnessSelect.addEventListener('change', () => {
      state.freshness = els.freshnessSelect.value;
      state.page = 1;
      applyFiltersAndRender();
    });

    els.statusSelect.addEventListener('change', () => {
      state.status = els.statusSelect.value;
      state.page = 1;
      applyFiltersAndRender();
    });

    els.sortSelect.addEventListener('change', () => {
      state.sort = els.sortSelect.value;
      state.page = 1;
      applyFiltersAndRender();
    });

    els.pageSizeSelect.addEventListener('change', () => {
      const val = els.pageSizeSelect.value;
      state.pageSize = val === 'all' ? 999999 : parseInt(val, 10);
      localStorage.setItem(STORAGE_KEY_PAGE_SIZE, state.pageSize);
      state.page = 1;
      applyFiltersAndRender();
    });

    els.viewTableBtn.addEventListener('click', () => setViewMode('table'));
    els.viewGridBtn.addEventListener('click', () => setViewMode('grid'));

    els.clearAllBtn.addEventListener('click', resetAllFilters);
    els.emptyResetBtn.addEventListener('click', resetAllFilters);

    els.paginationPrev.addEventListener('click', () => {
      if (state.page > 1) {
        state.page--;
        renderCurrentPage();
        scrollToListingTop();
      }
    });

    els.paginationNext.addEventListener('click', () => {
      const maxPage = Math.ceil(filteredQuestions.length / state.pageSize) || 1;
      if (state.page < maxPage) {
        state.page++;
        renderCurrentPage();
        scrollToListingTop();
      }
    });

    els.paginationPages.addEventListener('click', e => {
      const btn = e.target.closest('.page-num-btn');
      if (!btn) return;
      state.page = parseInt(btn.dataset.page, 10);
      renderCurrentPage();
      scrollToListingTop();
    });

    document.addEventListener('click', e => {
      if (!els.companyTrigger.contains(e.target) && !els.companyMenu.contains(e.target)) {
        closeCompanyMenu();
      }
    });

    els.randomBtn.addEventListener('click', pickRandomQuestion);
    els.modalRollAgainBtn.addEventListener('click', pickRandomQuestion);
    els.modalCloseBtn.addEventListener('click', closeRandomModal);
    els.randomModal.addEventListener('click', e => {
      if (e.target === els.randomModal) closeRandomModal();
    });

    els.modalStarBtn.addEventListener('click', () => {
      if (currentRandomQuestion) {
        toggleBookmark(currentRandomQuestion.id);
        updateModalActionButtons();
      }
    });

    els.modalCheckBtn.addEventListener('click', () => {
      if (currentRandomQuestion) {
        toggleSolved(currentRandomQuestion.id);
        updateModalActionButtons();
      }
    });

    window.addEventListener('keydown', e => {
      if (e.key === '/' && document.activeElement !== els.searchInput && document.activeElement !== els.companyMenuSearch) {
        e.preventDefault();
        els.searchInput.focus();
        els.searchInput.select();
      } else if (e.key.toLowerCase() === 'r' && document.activeElement !== els.searchInput && document.activeElement !== els.companyMenuSearch) {
        e.preventDefault();
        pickRandomQuestion();
      } else if (e.key === 'Escape') {
        closeCompanyMenu();
        closeRandomModal();
        if (document.activeElement === els.searchInput) {
          els.searchInput.blur();
        }
      }
    });

    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        els.scrollTopBtn.style.display = 'flex';
      } else {
        els.scrollTopBtn.style.display = 'none';
      }
    });

    els.scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    els.tableBody.addEventListener('click', handleItemActionClick);
    els.gridContainer.addEventListener('click', handleItemActionClick);
  }

  function handleItemActionClick(e) {
    const starBtn = e.target.closest('[data-action="star"]');
    if (starBtn) {
      const id = starBtn.dataset.id;
      toggleBookmark(id);
      return;
    }

    const checkBtn = e.target.closest('[data-action="check"]');
    if (checkBtn) {
      const id = checkBtn.dataset.id;
      toggleSolved(id);
      return;
    }

    const copyBtn = e.target.closest('[data-action="copy"]');
    if (copyBtn) {
      const url = copyBtn.dataset.url;
      if (url && navigator.clipboard) {
        navigator.clipboard.writeText(url);
        showToast('Question URL copied to clipboard');
      }
    }
  }

  function toggleBookmark(id) {
    if (bookmarks.has(id)) {
      bookmarks.delete(id);
    } else {
      bookmarks.add(id);
    }
    localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(Array.from(bookmarks)));
    if (state.status === 'bookmarked') {
      applyFiltersAndRender();
    } else {
      updateItemStateInDOM(id);
    }
  }

  function toggleSolved(id) {
    if (solved.has(id)) {
      solved.delete(id);
    } else {
      solved.add(id);
    }
    localStorage.setItem(STORAGE_KEY_SOLVED, JSON.stringify(Array.from(solved)));
    updateProgressUI();
    if (state.status === 'solved' || state.status === 'unsolved') {
      applyFiltersAndRender();
    } else {
      updateItemStateInDOM(id);
    }
  }

  function updateItemStateInDOM(id) {
    const isBookmarked = bookmarks.has(id);
    const isSolved = solved.has(id);

    const starBtns = document.querySelectorAll(`[data-action="star"][data-id="${id}"]`);
    starBtns.forEach(btn => {
      btn.classList.toggle('active-star', isBookmarked);
      btn.title = isBookmarked ? 'Remove bookmark' : 'Bookmark question';
    });

    const checkBtns = document.querySelectorAll(`[data-action="check"][data-id="${id}"]`);
    checkBtns.forEach(btn => {
      btn.classList.toggle('active-check', isSolved);
      btn.title = isSolved ? 'Mark as unsolved' : 'Mark as solved';
    });
  }

  function selectCompany(comp) {
    state.company = comp;
    state.page = 1;
    els.companyLabel.textContent = comp || 'All Companies';

    els.companyMenuOptions.querySelectorAll('.menu-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.company === comp);
    });

    els.quickCompaniesList.querySelectorAll('.company-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.company === comp);
    });

    applyFiltersAndRender();
  }

  function toggleCompanyMenu() {
    const isOpen = els.companyMenu.classList.contains('open');
    if (isOpen) {
      closeCompanyMenu();
    } else {
      els.companyMenu.classList.add('open');
      els.companyTrigger.classList.add('open');
      els.companyMenuSearch.value = '';
      els.companyMenuSearch.focus();
      els.companyMenuOptions.querySelectorAll('.menu-option').forEach(o => o.style.display = 'flex');
    }
  }

  function closeCompanyMenu() {
    els.companyMenu.classList.remove('open');
    els.companyTrigger.classList.remove('open');
  }

  function setViewMode(mode) {
    state.view = mode;
    localStorage.setItem(STORAGE_KEY_VIEW, mode);
    els.viewTableBtn.classList.toggle('active', mode === 'table');
    els.viewGridBtn.classList.toggle('active', mode === 'grid');
    renderCurrentPage();
  }

  function resetAllFilters() {
    state.category = 'all';
    state.company = '';
    state.search = '';
    state.freshness = 'all';
    state.status = 'all';
    state.page = 1;

    els.searchInput.value = '';
    els.searchClearBtn.style.display = 'none';
    els.companyLabel.textContent = 'All Companies';
    els.freshnessSelect.value = 'all';
    els.statusSelect.value = 'all';

    els.categoryTabs.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.category === 'all');
    });

    els.quickCompaniesList.querySelectorAll('.company-chip').forEach(c => {
      c.classList.remove('active');
    });

    els.companyMenuOptions.querySelectorAll('.menu-option').forEach(o => {
      o.classList.toggle('selected', !o.dataset.company);
    });

    applyFiltersAndRender();
  }

  function syncUIControls() {
    if (state.pageSize > 250) {
      els.pageSizeSelect.value = 'all';
    } else {
      els.pageSizeSelect.value = String(state.pageSize);
    }
    setViewMode(state.view);
  }

  function applyFiltersAndRender() {
    const cat = state.category;
    const comp = state.company.toLowerCase();
    const query = state.search;
    const fresh = state.freshness;
    const stat = state.status;

    filteredQuestions = rawQuestions.filter(q => {
      if (cat !== 'all' && q.format !== cat) return false;

      if (comp) {
        const matchesComp = q.companies.some(c => c.toLowerCase() === comp);
        if (!matchesComp) return false;
      }

      if (query && !q._searchStr.includes(query)) return false;

      if (fresh === 'hot' && !q.isHot) return false;
      if (fresh === 'new' && !q.isNew && !q.isHot) return false;
      if (fresh === '2026' && !q.date.includes('2026')) return false;
      if (fresh === '2025' && !q.date.includes('2025')) return false;
      if (fresh === '2024' && !q.date.includes('2024')) return false;

      if (stat === 'bookmarked' && !bookmarks.has(q.id)) return false;
      if (stat === 'solved' && !solved.has(q.id)) return false;
      if (stat === 'unsolved' && solved.has(q.id)) return false;

      return true;
    });

    sortQuestions();
    renderActiveFilterChips();
    renderCurrentPage();
  }

  function sortQuestions() {
    const s = state.sort;
    if (s === 'newest') {
      filteredQuestions.sort((a, b) => b.isoDate.localeCompare(a.isoDate));
    } else if (s === 'oldest') {
      filteredQuestions.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
    } else if (s === 'company-asc') {
      filteredQuestions.sort((a, b) => (a.companies[0] || '').localeCompare(b.companies[0] || ''));
    } else if (s === 'title-asc') {
      filteredQuestions.sort((a, b) => a.title.localeCompare(b.title));
    }
  }

  function renderActiveFilterChips() {
    const chips = [];

    if (state.category !== 'all') {
      chips.push({ label: `Format: ${state.category}`, clear: () => {
        state.category = 'all';
        els.categoryTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.category === 'all'));
      }});
    }

    if (state.company) {
      chips.push({ label: `Company: ${state.company}`, clear: () => selectCompany('') });
    }

    if (state.search) {
      chips.push({ label: `Search: "${state.search}"`, clear: () => {
        state.search = '';
        els.searchInput.value = '';
        els.searchClearBtn.style.display = 'none';
      }});
    }

    if (state.freshness !== 'all') {
      const labelMap = { hot: '🔥 Hot', new: '🆕 Fresh', '2026': '2026', '2025': '2025', '2024': '2024' };
      chips.push({ label: `Date: ${labelMap[state.freshness] || state.freshness}`, clear: () => {
        state.freshness = 'all';
        els.freshnessSelect.value = 'all';
      }});
    }

    if (state.status !== 'all') {
      const labelMap = { bookmarked: '⭐ Bookmarked', solved: '✅ Solved', unsolved: '⭕ Unsolved' };
      chips.push({ label: `Status: ${labelMap[state.status] || state.status}`, clear: () => {
        state.status = 'all';
        els.statusSelect.value = 'all';
      }});
    }

    if (chips.length === 0) {
      els.activeChips.innerHTML = '';
      els.clearAllBtn.style.display = 'none';
      return;
    }

    const fragment = document.createDocumentFragment();
    chips.forEach((c, idx) => {
      const badge = document.createElement('div');
      badge.className = 'filter-badge';
      badge.innerHTML = `<span>${escapeHTML(c.label)}</span><button type="button" class="remove-filter-btn" data-idx="${idx}" aria-label="Remove filter">✕</button>`;
      badge.querySelector('button').addEventListener('click', () => {
        c.clear();
        state.page = 1;
        applyFiltersAndRender();
      });
      fragment.appendChild(badge);
    });

    els.activeChips.innerHTML = '';
    els.activeChips.appendChild(fragment);
    els.clearAllBtn.style.display = 'inline-block';
  }

  function renderCurrentPage() {
    els.loading.style.display = 'none';
    const total = filteredQuestions.length;
    els.resultsCountText.innerHTML = `Showing <strong>${total.toLocaleString()}</strong> questions`;

    if (total === 0) {
      els.empty.style.display = 'block';
      els.tableContainer.style.display = 'none';
      els.gridContainer.style.display = 'none';
      els.paginationNav.style.display = 'none';
      return;
    }

    els.empty.style.display = 'none';

    const pageSize = state.pageSize;
    const maxPage = Math.ceil(total / pageSize) || 1;
    if (state.page > maxPage) state.page = maxPage;

    const startIdx = (state.page - 1) * pageSize;
    const pageItems = filteredQuestions.slice(startIdx, startIdx + pageSize);

    if (state.view === 'table') {
      els.tableContainer.style.display = 'block';
      els.gridContainer.style.display = 'none';
      renderTableRows(pageItems);
    } else {
      els.tableContainer.style.display = 'none';
      els.gridContainer.style.display = 'grid';
      renderGridCards(pageItems);
    }

    renderPagination(maxPage);
  }

  function getFormatBadgeClass(fmt) {
    switch (fmt) {
      case 'Coding': return 'fmt-coding';
      case 'System design': return 'fmt-system-design';
      case 'Low-level design': return 'fmt-low-level-design';
      case 'AI coding': return 'fmt-ai-coding';
      case 'SQL': return 'fmt-sql';
      default: return 'fmt-coding';
    }
  }

  function renderTableRows(items) {
    const rows = items.map(q => {
      const isBookmarked = bookmarks.has(q.id);
      const isSolved = solved.has(q.id);

      const companyHtml = q.companies.map(comp => {
        const domain = q.domains ? q.domains[comp] : null;
        const initial = comp.charAt(0).toUpperCase();
        const logoHtml = domain
          ? `<img class="company-logo-img" src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex';" /><span class="company-initial-badge" style="display:none;">${initial}</span>`
          : `<span class="company-initial-badge">${initial}</span>`;
        return `<span class="company-tag">${logoHtml}<span>${escapeHTML(comp)}</span></span>`;
      }).join(' <span style="color:#475569;font-size:0.75rem;">/</span> ');

      const formatClass = getFormatBadgeClass(q.format);
      const freshnessIcon = q.isHot ? '🔥 ' : (q.isNew ? '🆕 ' : '');

      return `
        <tr>
          <td class="col-status">
            <div class="status-btn-group">
              <button type="button" class="action-icon-btn ${isBookmarked ? 'active-star' : ''}" data-action="star" data-id="${q.id}" title="${isBookmarked ? 'Remove bookmark' : 'Bookmark question'}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </button>
              <button type="button" class="action-icon-btn ${isSolved ? 'active-check' : ''}" data-action="check" data-id="${q.id}" title="${isSolved ? 'Mark as unsolved' : 'Mark as solved'}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="${isSolved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </button>
            </div>
          </td>
          <td class="col-company">
            <div class="company-cell">${companyHtml}</div>
          </td>
          <td class="col-title">
            <a href="${escapeHTML(q.url)}" target="_blank" rel="noopener" class="question-title-link">
              ${escapeHTML(q.title)}
            </a>
          </td>
          <td class="col-format">
            <span class="format-badge ${formatClass}">${escapeHTML(q.format)}</span>
          </td>
          <td class="col-updated">
            <span class="date-cell">
              ${freshnessIcon ? `<span class="fresh-indicator">${freshnessIcon}</span>` : ''}
              <span>${escapeHTML(q.date)}</span>
            </span>
          </td>
          <td class="col-action">
            <a href="${escapeHTML(q.practiceUrl)}" target="_blank" rel="noopener" class="btn-practice">
              <span>Practice</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </a>
          </td>
        </tr>
      `;
    }).join('');

    els.tableBody.innerHTML = rows;
  }

  function renderGridCards(items) {
    const cards = items.map(q => {
      const isBookmarked = bookmarks.has(q.id);
      const isSolved = solved.has(q.id);

      const companyHtml = q.companies.map(comp => {
        const domain = q.domains ? q.domains[comp] : null;
        const initial = comp.charAt(0).toUpperCase();
        const logoHtml = domain
          ? `<img class="company-logo-img" src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex';" /><span class="company-initial-badge" style="display:none;">${initial}</span>`
          : `<span class="company-initial-badge">${initial}</span>`;
        return `<span class="company-tag">${logoHtml}<span>${escapeHTML(comp)}</span></span>`;
      }).join(' ');

      const formatClass = getFormatBadgeClass(q.format);
      const freshnessIcon = q.isHot ? '🔥 ' : (q.isNew ? '🆕 ' : '');

      return `
        <div class="question-card">
          <div class="card-header">
            <div class="card-companies">${companyHtml}</div>
            <div class="status-btn-group">
              <button type="button" class="action-icon-btn ${isBookmarked ? 'active-star' : ''}" data-action="star" data-id="${q.id}" title="${isBookmarked ? 'Remove bookmark' : 'Bookmark question'}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </button>
              <button type="button" class="action-icon-btn ${isSolved ? 'active-check' : ''}" data-action="check" data-id="${q.id}" title="${isSolved ? 'Mark as unsolved' : 'Mark as solved'}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="${isSolved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </button>
            </div>
          </div>

          <div class="card-body">
            <h4 class="card-title">
              <a href="${escapeHTML(q.url)}" target="_blank" rel="noopener" class="question-title-link">
                ${escapeHTML(q.title)}
              </a>
            </h4>
            <div class="card-meta-row">
              <span class="format-badge ${formatClass}">${escapeHTML(q.format)}</span>
              <span class="date-cell">
                ${freshnessIcon ? `<span class="fresh-indicator">${freshnessIcon}</span>` : ''}
                <span>${escapeHTML(q.date)}</span>
              </span>
            </div>
          </div>

          <div class="card-footer">
            <button type="button" class="btn btn-secondary" data-action="copy" data-url="${escapeHTML(q.url)}" style="padding:4px 8px;font-size:0.75rem;">
              Copy Link
            </button>
            <a href="${escapeHTML(q.practiceUrl)}" target="_blank" rel="noopener" class="btn-practice">
              <span>Practice Problem</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </a>
          </div>
        </div>
      `;
    }).join('');

    els.gridContainer.innerHTML = cards;
  }

  function renderPagination(maxPage) {
    if (maxPage <= 1) {
      els.paginationNav.style.display = 'none';
      return;
    }

    els.paginationNav.style.display = 'flex';
    els.paginationPrev.disabled = state.page <= 1;
    els.paginationNext.disabled = state.page >= maxPage;

    const pageButtons = [];
    const current = state.page;

    function addBtn(p) {
      pageButtons.push(`<button type="button" class="page-num-btn ${p === current ? 'active' : ''}" data-page="${p}">${p}</button>`);
    }

    function addEllipsis() {
      pageButtons.push('<span class="page-ellipsis">…</span>');
    }

    if (maxPage <= 7) {
      for (let i = 1; i <= maxPage; i++) addBtn(i);
    } else {
      addBtn(1);
      if (current > 3) addEllipsis();

      const start = Math.max(2, current - 1);
      const end = Math.min(maxPage - 1, current + 1);

      for (let i = start; i <= end; i++) addBtn(i);

      if (current < maxPage - 2) addEllipsis();
      addBtn(maxPage);
    }

    els.paginationPages.innerHTML = pageButtons.join('');
  }

  function scrollToListingTop() {
    const listingTop = document.getElementById('listing-section').getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: listingTop, behavior: 'smooth' });
  }

  function pickRandomQuestion() {
    const pool = filteredQuestions.length > 0 ? filteredQuestions : rawQuestions;
    if (!pool || pool.length === 0) return;

    const randomIndex = Math.floor(Math.random() * pool.length);
    const q = pool[randomIndex];
    currentRandomQuestion = q;

    els.modalQTitle.innerHTML = `<a href="${escapeHTML(q.url)}" target="_blank" rel="noopener" class="question-title-link">${escapeHTML(q.title)}</a>`;
    els.modalQFormat.textContent = q.format;
    els.modalQFormat.className = `format-badge ${getFormatBadgeClass(q.format)}`;
    els.modalQDate.innerHTML = `${q.isHot ? '🔥 ' : (q.isNew ? '🆕 ' : '')}<span>${escapeHTML(q.date)}</span>`;

    const companyHtml = q.companies.map(comp => {
      const domain = q.domains ? q.domains[comp] : null;
      const initial = comp.charAt(0).toUpperCase();
      const logoHtml = domain
        ? `<img class="company-logo-img" src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex';" /><span class="company-initial-badge" style="display:none;">${initial}</span>`
        : `<span class="company-initial-badge">${initial}</span>`;
      return `<span class="company-tag">${logoHtml}<span>${escapeHTML(comp)}</span></span>`;
    }).join(' <span style="color:#475569;font-size:0.75rem;">/</span> ');
    els.modalQCompanies.innerHTML = companyHtml;

    els.modalPracticeBtn.href = q.practiceUrl;
    updateModalActionButtons();

    els.randomModal.style.display = 'flex';
  }

  function updateModalActionButtons() {
    if (!currentRandomQuestion) return;
    const isBookmarked = bookmarks.has(currentRandomQuestion.id);
    const isSolved = solved.has(currentRandomQuestion.id);

    els.modalStarBtn.classList.toggle('active-star', isBookmarked);
    els.modalStarBtn.title = isBookmarked ? 'Remove bookmark' : 'Bookmark question';
    els.modalStarBtn.querySelector('svg').setAttribute('fill', isBookmarked ? 'currentColor' : 'none');

    els.modalCheckBtn.classList.toggle('active-check', isSolved);
    els.modalCheckBtn.title = isSolved ? 'Mark as unsolved' : 'Mark as solved';
    els.modalCheckBtn.querySelector('svg').setAttribute('fill', isSolved ? 'currentColor' : 'none');
  }

  function closeRandomModal() {
    els.randomModal.style.display = 'none';
  }

  function showToast(msg) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.style.position = 'fixed';
      toast.style.bottom = '28px';
      toast.style.left = '50%';
      toast.style.transform = 'translateX(-50%)';
      toast.style.backgroundColor = '#1e293b';
      toast.style.color = '#f8fafc';
      toast.style.padding = '8px 16px';
      toast.style.borderRadius = '8px';
      toast.style.fontSize = '0.84rem';
      toast.style.fontWeight = '500';
      toast.style.border = '1px solid #334155';
      toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
      toast.style.zIndex = '9999';
      toast.style.transition = 'opacity 0.2s ease';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => {
      toast.style.opacity = '0';
    }, 2000);
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
