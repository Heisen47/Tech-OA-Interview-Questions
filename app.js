(function () {
  'use strict';

  const STORAGE_KEY_BOOKMARKS = 'tech_oa_bookmarks_v1';
  const STORAGE_KEY_SOLVED = 'tech_oa_solved_v1';
  const STORAGE_KEY_VIEW = 'tech_oa_view_mode_v1';
  const STORAGE_KEY_PAGE_SIZE = 'tech_oa_page_size_v1';
  const STORAGE_KEY_GSHEET_URL = 'tech_oa_gsheet_url_v1';
  const STORAGE_KEY_COMMENTS = 'tech_oa_comments_v1';
  const STORAGE_KEY_SOLVED_DATES = 'tech_oa_solved_dates_v1';
  const STORAGE_KEY_NOTES = 'tech_oa_notes_v1';

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

  let gsheetUrl = localStorage.getItem(STORAGE_KEY_GSHEET_URL) || '';
  let commentsMap = {};
  try {
    commentsMap = JSON.parse(localStorage.getItem(STORAGE_KEY_COMMENTS) || '{}');
  } catch (_) {
    commentsMap = {};
  }
  let solvedDatesMap = {};
  try {
    solvedDatesMap = JSON.parse(localStorage.getItem(STORAGE_KEY_SOLVED_DATES) || '{}');
  } catch (_) {
    solvedDatesMap = {};
  }
  let notesMap = {};
  try {
    notesMap = JSON.parse(localStorage.getItem(STORAGE_KEY_NOTES) || '{}');
  } catch (_) {
    notesMap = {};
  }
  let activeEditingQuestionId = null;

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
    modalSolveBtn: document.getElementById('modal-solve-btn'),
    modalStarBtn: document.getElementById('modal-star-btn'),
    modalCheckBtn: document.getElementById('modal-check-btn'),

    // Code & Test Studio elements
    crModal: document.getElementById('code-runner-modal'),
    crModalCloseBtn: document.getElementById('cr-modal-close-btn'),
    crFormatBadge: document.getElementById('cr-format-badge'),
    crCompanyBadge: document.getElementById('cr-company-badge'),
    crDateBadge: document.getElementById('cr-date-badge'),
    crTitle: document.getElementById('cr-title'),
    crLanguage: document.getElementById('cr-language'),
    crResetCodeBtn: document.getElementById('cr-reset-code-btn'),
    crFastprepLink: document.getElementById('cr-fastprep-link'),
    crProblemLoading: document.getElementById('cr-problem-loading'),
    crProblemContent: document.getElementById('cr-problem-content'),
    crStatement: document.getElementById('cr-statement'),
    crSignature: document.getElementById('cr-signature'),
    crConstraints: document.getElementById('cr-constraints'),
    crExamples: document.getElementById('cr-examples'),
    crFileExt: document.getElementById('cr-file-ext'),
    crCodeEditor: document.getElementById('cr-code-editor'),
    crCaseTabs: document.getElementById('cr-case-tabs'),
    crAddCaseBtn: document.getElementById('cr-add-case-btn'),
    crCaseInput: document.getElementById('cr-case-input'),
    crCaseExpected: document.getElementById('cr-case-expected'),
    crResultsPanel: document.getElementById('cr-results-panel'),
    crOverallBadge: document.getElementById('cr-overall-badge'),
    crExecStats: document.getElementById('cr-exec-stats'),
    crResultsList: document.getElementById('cr-results-list'),
    crStdoutBox: document.getElementById('cr-stdout-box'),
    crStdoutContent: document.getElementById('cr-stdout-content'),
    crStatusMsg: document.getElementById('cr-status-msg'),
    crRunBtn: document.getElementById('cr-run-btn'),
    crMarkSolvedBtn: document.getElementById('cr-mark-solved-btn'),

    gsheetOpenBtn: document.getElementById('gsheet-open-btn'),
    gsheetStatusDot: document.getElementById('gsheet-status-dot'),
    gsheetModal: document.getElementById('gsheet-modal'),
    gsheetModalCloseBtn: document.getElementById('gsheet-modal-close-btn'),
    gsheetWebhookUrl: document.getElementById('gsheet-webhook-url'),
    gsheetConnectionStatus: document.getElementById('gsheet-connection-status'),
    gsheetStatusText: document.getElementById('gsheet-status-text'),
    gsheetTestBtn: document.getElementById('gsheet-test-btn'),
    gsheetSyncAllBtn: document.getElementById('gsheet-sync-all-btn'),
    gsheetSyncCount: document.getElementById('gsheet-sync-count'),
    gsheetSaveBtn: document.getElementById('gsheet-save-btn'),

    noteModal: document.getElementById('note-modal'),
    noteModalCloseBtn: document.getElementById('note-modal-close-btn'),
    noteProblemTitle: document.getElementById('note-problem-title'),
    noteProblemCompanies: document.getElementById('note-problem-companies'),
    noteProblemFormat: document.getElementById('note-problem-format'),
    noteProblemDate: document.getElementById('note-problem-date'),
    noteProblemLink: document.getElementById('note-problem-link'),
    noteSolveBtn: document.getElementById('note-solve-btn'),
    notePattern: document.getElementById('note-pattern'),
    noteTimeTaken: document.getElementById('note-time-taken'),
    noteQuality: document.getElementById('note-quality'),
    noteDateSolved: document.getElementById('note-date-solved'),
    noteComments: document.getElementById('note-comments'),
    noteUnmarkBtn: document.getElementById('note-unmark-btn'),
    noteQuickSaveBtn: document.getElementById('note-quick-save-btn'),
    noteSaveSyncBtn: document.getElementById('note-save-sync-btn'),
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
    updateGSheetStatusUI();
    updateGSheetSyncCount();
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
        openNoteModal(currentRandomQuestion.id);
      }
    });

    if (els.gsheetOpenBtn) els.gsheetOpenBtn.addEventListener('click', openGSheetModal);
    if (els.gsheetModalCloseBtn) els.gsheetModalCloseBtn.addEventListener('click', closeGSheetModal);
    if (els.gsheetModal) {
      els.gsheetModal.addEventListener('click', e => {
        if (e.target === els.gsheetModal) closeGSheetModal();
      });
    }
    if (els.gsheetSaveBtn) els.gsheetSaveBtn.addEventListener('click', saveGSheetUrl);
    if (els.gsheetTestBtn) els.gsheetTestBtn.addEventListener('click', testGSheetConnection);
    if (els.gsheetSyncAllBtn) els.gsheetSyncAllBtn.addEventListener('click', syncAllSolvedToSheet);

    if (els.noteModalCloseBtn) els.noteModalCloseBtn.addEventListener('click', closeNoteModal);
    if (els.noteModal) {
      els.noteModal.addEventListener('click', e => {
        if (e.target === els.noteModal) closeNoteModal();
      });
    }
    if (els.noteSaveSyncBtn) els.noteSaveSyncBtn.addEventListener('click', () => saveProblemNote(true));
    if (els.noteQuickSaveBtn) els.noteQuickSaveBtn.addEventListener('click', () => saveProblemNote(false));
    if (els.noteUnmarkBtn) els.noteUnmarkBtn.addEventListener('click', unmarkCurrentProblem);
    if (els.noteSolveBtn) {
      els.noteSolveBtn.addEventListener('click', () => {
        if (activeEditingQuestionId) {
          const q = rawQuestions.find(item => item.id === activeEditingQuestionId);
          if (q) {
            closeNoteModal();
            openCodeStudio(q);
          }
        }
      });
    }

    if (els.modalSolveBtn) {
      els.modalSolveBtn.addEventListener('click', () => {
        if (currentRandomQuestion) {
          closeRandomModal();
          openCodeStudio(currentRandomQuestion);
        }
      });
    }

    if (els.crModalCloseBtn) els.crModalCloseBtn.addEventListener('click', closeCodeStudio);
    if (els.crModal) {
      els.crModal.addEventListener('click', e => {
        if (e.target === els.crModal) closeCodeStudio();
      });
    }
    if (els.crLanguage) els.crLanguage.addEventListener('change', handleLanguageChange);
    if (els.crResetCodeBtn) els.crResetCodeBtn.addEventListener('click', resetStudioCode);
    if (els.crAddCaseBtn) els.crAddCaseBtn.addEventListener('click', addCustomTestCase);
    if (els.crRunBtn) els.crRunBtn.addEventListener('click', runActiveTests);
    if (els.crMarkSolvedBtn) els.crMarkSolvedBtn.addEventListener('click', markActiveProblemSolved);

    if (els.crCaseInput) {
      els.crCaseInput.addEventListener('input', () => {
        if (customTestCases[activeTestCaseIdx]) {
          customTestCases[activeTestCaseIdx].inputRaw = els.crCaseInput.value;
        }
      });
    }
    if (els.crCaseExpected) {
      els.crCaseExpected.addEventListener('input', () => {
        if (customTestCases[activeTestCaseIdx]) {
          customTestCases[activeTestCaseIdx].expectedRaw = els.crCaseExpected.value;
        }
      });
    }
    if (els.crCodeEditor) {
      els.crCodeEditor.addEventListener('keydown', e => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = els.crCodeEditor.selectionStart;
          const end = els.crCodeEditor.selectionEnd;
          els.crCodeEditor.value = els.crCodeEditor.value.substring(0, start) + '    ' + els.crCodeEditor.value.substring(end);
          els.crCodeEditor.selectionStart = els.crCodeEditor.selectionEnd = start + 4;
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          runActiveTests();
        }
      });
    }

    window.addEventListener('keydown', e => {
      const isInputFocused = document.activeElement && (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.isContentEditable ||
        document.activeElement.closest('#cr-ace-editor') ||
        document.activeElement.classList.contains('ace_text-input')
      );

      if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        els.searchInput.focus();
        els.searchInput.select();
      } else if (e.key.toLowerCase() === 'r' && !isInputFocused) {
        e.preventDefault();
        pickRandomQuestion();
      } else if (e.key === 'Escape') {
        closeCompanyMenu();
        closeRandomModal();
        closeGSheetModal();
        closeNoteModal();
        closeCodeStudio();
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
    const solveBtn = e.target.closest('[data-action="solve"]');
    if (solveBtn) {
      const id = solveBtn.dataset.id;
      const q = rawQuestions.find(x => x.id === id);
      if (q) openCodeStudio(q);
      return;
    }

    const starBtn = e.target.closest('[data-action="star"]');
    if (starBtn) {
      const id = starBtn.dataset.id;
      toggleBookmark(id);
      return;
    }

    const checkBtn = e.target.closest('[data-action="check"]');
    if (checkBtn) {
      const id = checkBtn.dataset.id;
      openNoteModal(id);
      return;
    }

    const noteBtn = e.target.closest('[data-action="note"]');
    if (noteBtn) {
      const id = noteBtn.dataset.id;
      openNoteModal(id);
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
    const hasNotes = !!(commentsMap[id] && commentsMap[id].trim());

    const starBtns = document.querySelectorAll(`[data-action="star"][data-id="${id}"]`);
    starBtns.forEach(btn => {
      btn.classList.toggle('active-star', isBookmarked);
      btn.title = isBookmarked ? 'Remove bookmark' : 'Bookmark question';
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', isBookmarked ? 'currentColor' : 'none');
    });

    const checkBtns = document.querySelectorAll(`[data-action="check"][data-id="${id}"]`);
    checkBtns.forEach(btn => {
      btn.classList.toggle('active-check', isSolved);
      btn.title = isSolved ? 'Solved! Click to edit notes/status' : 'Mark as solved';
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', isSolved ? 'currentColor' : 'none');
    });

    const noteBtns = document.querySelectorAll(`[data-action="note"][data-id="${id}"]`);
    noteBtns.forEach(btn => {
      btn.classList.toggle('has-notes', hasNotes);
      btn.title = hasNotes ? 'View/edit notes' : 'Add notes';
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
      const hasNotes = !!(commentsMap[q.id] && commentsMap[q.id].trim());

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
              <button type="button" class="action-icon-btn ${isSolved ? 'active-check' : ''}" data-action="check" data-id="${q.id}" title="${isSolved ? 'Solved! Click to edit notes/status' : 'Mark as solved'}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="${isSolved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </button>
              <button type="button" class="action-icon-btn ${hasNotes ? 'has-notes' : ''}" data-action="note" data-id="${q.id}" title="${hasNotes ? 'View/edit notes' : 'Add notes'}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
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
            <div class="action-buttons-group">
              <button type="button" class="btn-solve" data-action="solve" data-id="${q.id}" title="Run, compile, and test with custom cases (Free)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>Solve</span>
              </button>
              <a href="${escapeHTML(q.practiceUrl)}" target="_blank" rel="noopener" class="btn-fp-link" title="Open question on FastPrep.io">
                <span>FastPrep</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
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
      const hasNotes = !!(commentsMap[q.id] && commentsMap[q.id].trim());

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
              <button type="button" class="action-icon-btn ${isSolved ? 'active-check' : ''}" data-action="check" data-id="${q.id}" title="${isSolved ? 'Solved! Click to edit notes/status' : 'Mark as solved'}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="${isSolved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </button>
              <button type="button" class="action-icon-btn ${hasNotes ? 'has-notes' : ''}" data-action="note" data-id="${q.id}" title="${hasNotes ? 'View/edit notes' : 'Add notes'}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
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
            <button type="button" class="btn-solve" data-action="solve" data-id="${q.id}" title="Run, compile, and test with custom cases (Free)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <span>Solve & Test</span>
            </button>
            <div style="display:flex; gap:6px; align-items:center;">
              <button type="button" class="btn btn-secondary" data-action="copy" data-url="${escapeHTML(q.url)}" style="padding:4px 8px;font-size:0.75rem;">
                Copy
              </button>
              <a href="${escapeHTML(q.practiceUrl)}" target="_blank" rel="noopener" class="btn-fp-link" title="Open question on FastPrep.io">
                <span>FastPrep</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
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
    els.modalCheckBtn.title = isSolved ? 'Solved! Click to edit notes/status' : 'Mark as solved';
    els.modalCheckBtn.querySelector('svg').setAttribute('fill', isSolved ? 'currentColor' : 'none');
  }

  function closeRandomModal() {
    els.randomModal.style.display = 'none';
  }

  function updateGSheetStatusUI() {
    if (gsheetUrl) {
      updateGSheetDot('connected');
      if (els.gsheetStatusText) {
        els.gsheetStatusText.innerHTML = '<strong style="color:#10b981;">Connected</strong> (' + escapeHTML(gsheetUrl.slice(0, 32)) + '...)';
      }
      if (els.gsheetWebhookUrl) els.gsheetWebhookUrl.value = gsheetUrl;
    } else {
      updateGSheetDot('disconnected');
      if (els.gsheetStatusText) {
        els.gsheetStatusText.innerHTML = '<span style="color:#94a3b8;">Not configured</span>';
      }
    }
  }

  function updateGSheetDot(status) {
    if (!els.gsheetStatusDot) return;
    els.gsheetStatusDot.classList.remove('connected', 'syncing');
    if (status === 'connected') {
      els.gsheetStatusDot.classList.add('connected');
      els.gsheetStatusDot.title = 'Google Sheet connected';
    } else if (status === 'syncing') {
      els.gsheetStatusDot.classList.add('syncing');
      els.gsheetStatusDot.title = 'Syncing to Google Sheet...';
    } else {
      els.gsheetStatusDot.title = 'Google Sheet not configured';
    }
  }

  function updateGSheetSyncCount() {
    if (els.gsheetSyncCount) {
      els.gsheetSyncCount.textContent = String(solved.size);
    }
  }

  function openGSheetModal() {
    if (els.gsheetWebhookUrl) els.gsheetWebhookUrl.value = gsheetUrl;
    updateGSheetStatusUI();
    updateGSheetSyncCount();
    els.gsheetModal.style.display = 'flex';
  }

  function closeGSheetModal() {
    els.gsheetModal.style.display = 'none';
  }

  function saveGSheetUrl() {
    const val = els.gsheetWebhookUrl.value.trim();
    gsheetUrl = val;
    if (val) {
      localStorage.setItem(STORAGE_KEY_GSHEET_URL, val);
      showToast('Webhook URL saved!');
    } else {
      localStorage.removeItem(STORAGE_KEY_GSHEET_URL);
      showToast('Webhook URL cleared');
    }
    updateGSheetStatusUI();
  }

  async function testGSheetConnection() {
    const url = (els.gsheetWebhookUrl.value || gsheetUrl).trim();
    if (!url) {
      if (els.gsheetStatusText) {
        els.gsheetStatusText.innerHTML = '<span style="color:#f87171;">Enter a Webhook URL first</span>';
      }
      return;
    }
    if (els.gsheetStatusText) {
      els.gsheetStatusText.innerHTML = '<span style="color:#60a5fa;">Testing connection...</span>';
    }
    updateGSheetDot('syncing');

    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'ping' }),
      });
      updateGSheetDot('connected');
      if (els.gsheetStatusText) {
        els.gsheetStatusText.innerHTML = '<strong style="color:#10b981;">Ping sent successfully!</strong>';
      }
      showToast('Ping sent to Google Sheet');
    } catch (err) {
      updateGSheetDot('disconnected');
      if (els.gsheetStatusText) {
        els.gsheetStatusText.innerHTML = `<span style="color:#f87171;">Connection error: ${escapeHTML(err.message)}</span>`;
      }
      showToast('Ping failed');
    }
  }

  async function syncAllSolvedToSheet() {
    const url = (els.gsheetWebhookUrl.value || gsheetUrl).trim();
    if (!url) {
      showToast('Please enter and save your Webhook URL first');
      return;
    }
    if (solved.size === 0) {
      showToast('No solved problems to sync yet');
      return;
    }

    const items = [];
    rawQuestions.forEach(q => {
      if (solved.has(q.id)) {
        const note = notesMap[q.id] || {};
        items.push({
          title: q.title,
          company: (q.companies || []).join(', '),
          category: q.format || '',
          pattern: note.pattern || '',
          timeTaken: note.timeTaken || '',
          quality: note.quality || 'Solved Clean',
          status: 'Solved',
          dateSolved: note.dateSolved || solvedDatesMap[q.id] || new Date().toISOString().split('T')[0],
          link: q.url,
          date: q.date,
          comments: note.comments || commentsMap[q.id] || '',
        });
      }
    });

    if (els.gsheetStatusText) {
      els.gsheetStatusText.innerHTML = `<span style="color:#60a5fa;">Syncing ${items.length} items to sheet...</span>`;
    }
    updateGSheetDot('syncing');

    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'batch', items }),
      });
      updateGSheetDot('connected');
      if (els.gsheetStatusText) {
        els.gsheetStatusText.innerHTML = `<strong style="color:#10b981;">Successfully synced ${items.length} problems!</strong>`;
      }
      showToast(`Synced ${items.length} problems to Google Sheet`);
    } catch (err) {
      updateGSheetDot('connected');
      if (els.gsheetStatusText) {
        els.gsheetStatusText.innerHTML = `<span style="color:#f87171;">Sync failed: ${escapeHTML(err.message)}</span>`;
      }
      showToast('Failed to sync to Google Sheet');
    }
  }

  async function sendToGoogleSheet(payload) {
    if (!gsheetUrl) return;
    updateGSheetDot('syncing');
    try {
      await fetch(gsheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      updateGSheetDot('connected');
      showToast('Synced to Google Sheet');
    } catch (err) {
      console.error('GSheet sync error:', err);
      updateGSheetDot('connected');
      showToast('Failed to sync to Google Sheet');
    }
  }

  function openNoteModal(id) {
    const q = rawQuestions.find(item => item.id === id);
    if (!q) return;

    activeEditingQuestionId = id;
    els.noteProblemTitle.textContent = q.title;
    if (els.noteProblemCompanies) {
      els.noteProblemCompanies.textContent = 'Companies: ' + (q.companies || []).join(', ');
    }
    if (els.noteProblemFormat) {
      els.noteProblemFormat.textContent = 'Format: ' + (q.format || 'Coding');
    }
    els.noteProblemDate.textContent = 'Reported: ' + q.date;
    els.noteProblemLink.href = q.url;

    const isAlreadySolved = solved.has(id);
    const note = notesMap[id] || {};

    if (els.notePattern) els.notePattern.value = note.pattern || '';
    if (els.noteTimeTaken) els.noteTimeTaken.value = note.timeTaken || '';
    if (els.noteQuality) els.noteQuality.value = note.quality || 'Solved Clean';
    els.noteDateSolved.value = note.dateSolved || solvedDatesMap[id] || new Date().toISOString().split('T')[0];
    els.noteComments.value = note.comments || commentsMap[id] || '';

    if (isAlreadySolved) {
      els.noteUnmarkBtn.style.display = 'inline-flex';
      els.noteSaveSyncBtn.textContent = 'Update & Sync to Sheet';
    } else {
      els.noteUnmarkBtn.style.display = 'none';
      els.noteSaveSyncBtn.textContent = 'Mark Solved & Sync';
    }

    els.noteModal.style.display = 'flex';
    if (els.notePattern) els.notePattern.focus();
  }

  function closeNoteModal() {
    els.noteModal.style.display = 'none';
    activeEditingQuestionId = null;
  }

  function saveProblemNote(syncGSheet) {
    if (!activeEditingQuestionId) return;
    const id = activeEditingQuestionId;
    const q = rawQuestions.find(item => item.id === id);
    if (!q) return;

    const pattern = els.notePattern ? els.notePattern.value.trim() : '';
    const timeTaken = els.noteTimeTaken ? els.noteTimeTaken.value.trim() : '';
    const quality = els.noteQuality ? els.noteQuality.value : 'Solved Clean';
    const dateSolved = els.noteDateSolved.value.trim() || new Date().toISOString().split('T')[0];
    const comments = els.noteComments.value.trim();

    solved.add(id);
    solvedDatesMap[id] = dateSolved;
    localStorage.setItem(STORAGE_KEY_SOLVED_DATES, JSON.stringify(solvedDatesMap));

    if (comments) {
      commentsMap[id] = comments;
    } else {
      delete commentsMap[id];
    }
    localStorage.setItem(STORAGE_KEY_COMMENTS, JSON.stringify(commentsMap));

    notesMap[id] = {
      pattern,
      timeTaken,
      quality,
      dateSolved,
      comments,
    };
    localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notesMap));
    localStorage.setItem(STORAGE_KEY_SOLVED, JSON.stringify(Array.from(solved)));

    updateProgressUI();
    updateGSheetSyncCount();

    if (state.status === 'solved' || state.status === 'unsolved') {
      applyFiltersAndRender();
    } else {
      updateItemStateInDOM(id);
    }

    closeNoteModal();
    showToast('Saved as solved!');

    if (syncGSheet) {
      if (gsheetUrl) {
        sendToGoogleSheet({
          title: q.title,
          company: (q.companies || []).join(', '),
          category: q.format || '',
          pattern,
          timeTaken,
          quality,
          status: 'Solved',
          dateSolved,
          link: q.url,
          date: q.date,
          comments,
        });
      } else {
        showToast('Saved locally. Click "Google Sheet" in header to configure sync.');
      }
    }
  }

  function unmarkCurrentProblem() {
    if (!activeEditingQuestionId) return;
    const id = activeEditingQuestionId;
    const q = rawQuestions.find(item => item.id === id);

    solved.delete(id);
    localStorage.setItem(STORAGE_KEY_SOLVED, JSON.stringify(Array.from(solved)));

    updateProgressUI();
    updateGSheetSyncCount();

    if (state.status === 'solved' || state.status === 'unsolved') {
      applyFiltersAndRender();
    } else {
      updateItemStateInDOM(id);
    }

    closeNoteModal();
    showToast('Unmarked as solved');

    if (gsheetUrl && q) {
      const note = notesMap[id] || {};
      sendToGoogleSheet({
        title: q.title,
        company: (q.companies || []).join(', '),
        category: q.format || '',
        pattern: note.pattern || '',
        timeTaken: note.timeTaken || '',
        quality: note.quality || '',
        status: 'Unsolved',
        dateSolved: '',
        link: q.url,
        date: q.date,
        comments: note.comments || commentsMap[id] || '',
      });
    }
  }

  /* ==========================================================================
     Interactive Code & Test Studio Implementation
     ========================================================================== */

  let activeStudioQuestion = null;
  let activeProblemDetail = null;
  let customTestCases = [];
  let activeTestCaseIdx = 0;
  let userCodeMap = {
    python: '',
    javascript: '',
    cpp: '',
    java: ''
  };
  let testResultsCache = [];
  let aceEditor = null;

  const LANG_FILE_EXT = {
    python: 'py',
    javascript: 'js',
    cpp: 'cpp',
    java: 'java'
  };

  const ACE_MODE_MAP = {
    python: 'ace/mode/python',
    javascript: 'ace/mode/javascript',
    cpp: 'ace/mode/c_cpp',
    java: 'ace/mode/java'
  };

  const PRISM_LANG_MAP = {
    python: 'python',
    javascript: 'javascript',
    cpp: 'cpp',
    java: 'java'
  };

  function getPrismLang(lang) {
    return PRISM_LANG_MAP[lang] || 'python';
  }

  function initAceEditor() {
    const el = document.getElementById('cr-ace-editor');
    if (!el || typeof ace === 'undefined' || aceEditor) return;

    try {
      ace.config.set('basePath', 'vendor/ace');
      aceEditor = ace.edit(el, {
        theme: 'ace/theme/one_dark',
        mode: 'ace/mode/python',
        fontSize: '13.5px',
        showPrintMargin: false,
        showGutter: true,
        highlightActiveLine: true,
        wrap: true,
        tabSize: 4,
        useSoftTabs: true,
        showFoldWidgets: true,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: true
      });

      aceEditor.session.setUseWorker(false);

      aceEditor.commands.addCommand({
        name: 'runTests',
        bindKey: { win: 'Ctrl-Enter', mac: 'Command-Enter' },
        exec: () => {
          runActiveTests();
        }
      });

      aceEditor.session.on('change', () => {
        const curLang = els.crLanguage ? els.crLanguage.value : 'python';
        const val = aceEditor.getValue();
        userCodeMap[curLang] = val;
        if (els.crCodeEditor) els.crCodeEditor.value = val;
      });
    } catch (err) {
      console.warn('Ace editor fallback to textarea:', err);
      if (els.crCodeEditor) els.crCodeEditor.style.display = 'block';
    }
  }

  function getEditorCode() {
    if (aceEditor) return aceEditor.getValue();
    return els.crCodeEditor ? els.crCodeEditor.value : '';
  }

  function setEditorCode(code, lang) {
    if (aceEditor) {
      if (lang && ACE_MODE_MAP[lang]) {
        aceEditor.session.setMode(ACE_MODE_MAP[lang]);
      }
      aceEditor.setValue(code || '', -1);
      aceEditor.clearSelection();
    }
    if (els.crCodeEditor) {
      els.crCodeEditor.value = code || '';
    }
  }

  function highlightLeftPane(lang) {
    if (!activeProblemDetail) return;
    const prismLang = getPrismLang(lang || (els.crLanguage ? els.crLanguage.value : 'python'));

    if (els.crSignature) {
      els.crSignature.className = `language-${prismLang}`;
      if (window.Prism) Prism.highlightElement(els.crSignature);
    }

    if (activeProblemDetail.examples && activeProblemDetail.examples.length > 0) {
      els.crExamples.innerHTML = activeProblemDetail.examples.map((ex, idx) => `
        <div class="cr-ex-item">
          <div class="cr-ex-title">Example ${idx + 1}</div>
          <div class="cr-ex-block">
            <span class="cr-ex-label">Input:</span>
            <pre class="cr-code-snippet"><code class="language-${prismLang}">${escapeHTML((ex.inputRaw || '').trim())}</code></pre>
          </div>
          <div class="cr-ex-block">
            <span class="cr-ex-label">Expected:</span>
            <pre class="cr-code-snippet"><code class="language-${prismLang}">${escapeHTML((ex.expectedRaw || '').trim())}</code></pre>
          </div>
          ${ex.explanation ? `<div class="cr-ex-explanation">${escapeHTML(ex.explanation)}</div>` : ''}
        </div>
      `).join('');
      if (window.Prism) Prism.highlightAllUnder(els.crExamples);
    }

    if (window.Prism && els.crStatement) {
      Prism.highlightAllUnder(els.crStatement);
    }
  }

  async function openCodeStudio(q) {
    activeStudioQuestion = q;
    activeProblemDetail = null;
    customTestCases = [];
    activeTestCaseIdx = 0;
    testResultsCache = [];
    userCodeMap = { python: '', javascript: '', cpp: '', java: '' };

    els.crTitle.textContent = q.title;
    els.crFormatBadge.textContent = q.format;
    els.crCompanyBadge.textContent = (q.companies || []).join(' / ') || 'Tech OA';
    els.crDateBadge.textContent = q.date || '';
    if (els.crFastprepLink) els.crFastprepLink.href = q.url;

    els.crResultsPanel.style.display = 'none';
    els.crStdoutBox.style.display = 'none';
    els.crStatusMsg.className = 'cr-status-msg';
    els.crStatusMsg.textContent = 'Loading problem specifications...';
    els.crProblemLoading.style.display = 'flex';
    els.crProblemContent.style.display = 'none';
    els.crModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Fetch problem details
    let data = null;
    try {
      const res = await fetch(`/api/problem?id=${encodeURIComponent(q.id)}&url=${encodeURIComponent(q.url)}`);
      if (res.ok) {
        data = await res.json();
      }
    } catch (_) {}

    // Fallback: local static cache file
    if (!data) {
      try {
        const res = await fetch(`data/problems/${q.id}.json`);
        if (res.ok) {
          data = await res.json();
        }
      } catch (_) {}
    }

    // Fallback boilerplate if not yet cached
    if (!data) {
      const fnName = q.id.replace(/^([a-z]+-)+/, '').replace(/-(.)/g, (_, c) => c.toUpperCase()) || 'solve';
      data = {
        id: q.id,
        title: q.title,
        statementHtml: `<p>Practice <strong>${escapeHTML(q.title)}</strong> reported in recent technical assessments for <strong>${escapeHTML((q.companies || []).join(', '))}</strong>.</p>`,
        functionName: fnName,
        signature: `${fnName}() -> any`,
        constraints: ['Constraints reported in actual assessment.'],
        examples: [
          { id: 1, inputRaw: '// Sample input\ninput = []', expectedRaw: '0', explanation: 'Sample test case' }
        ],
        testCases: [
          { id: 1, inputRaw: '// Sample input\ninput = []', expectedRaw: '0' }
        ],
        starterCodes: {
          python: `def ${fnName}():\n    # Write your solution here\n    pass\n`,
          javascript: `function ${fnName}() {\n    // Write your solution here\n    return null;\n}\n`,
          java: `class Solution {\n    public int ${fnName}() {\n        return 0;\n    }\n}`,
          cpp: `class Solution {\npublic:\n    int ${fnName}() {\n        return 0;\n    }\n};`
        }
      };
    }

    activeProblemDetail = data;

    // Render left panel
    els.crStatement.innerHTML = data.statementHtml || '<p>Problem details.</p>';
    els.crSignature.textContent = data.signature || (data.functionName + '()');
    
    if (data.constraints && data.constraints.length > 0) {
      els.crConstraints.innerHTML = data.constraints.map(c => `<li>${escapeHTML(c)}</li>`).join('');
      els.crConstraints.parentElement.style.display = 'block';
    } else {
      els.crConstraints.parentElement.style.display = 'none';
    }

    if (data.examples && data.examples.length > 0) {
      els.crExamples.parentElement.style.display = 'block';
    } else {
      els.crExamples.parentElement.style.display = 'none';
    }

    els.crProblemLoading.style.display = 'none';
    els.crProblemContent.style.display = 'flex';

    // Populate test cases
    const sourceTests = (data.testCases && data.testCases.length > 0) ? data.testCases : data.examples;
    if (sourceTests && sourceTests.length > 0) {
      customTestCases = sourceTests.map((tc, idx) => ({
        id: idx + 1,
        inputRaw: tc.inputRaw || '',
        expectedRaw: tc.expectedRaw || ''
      }));
    } else {
      customTestCases = [{ id: 1, inputRaw: '', expectedRaw: '' }];
    }

    activeTestCaseIdx = 0;
    renderTestCaseTabs();

    // Starter code setup & syntax highlighting
    userCodeMap = { ...(data.starterCodes || {}) };
    const lang = els.crLanguage.value || 'python';
    els.crFileExt.textContent = LANG_FILE_EXT[lang] || 'py';

    initAceEditor();
    setEditorCode(userCodeMap[lang] || '', lang);
    highlightLeftPane(lang);

    setTimeout(() => {
      if (aceEditor) {
        aceEditor.resize();
        aceEditor.renderer.updateFull();
      }
    }, 50);

    els.crStatusMsg.textContent = 'Ready to test';
    els.crRunBtn.disabled = false;
  }

  function closeCodeStudio() {
    els.crModal.style.display = 'none';
    document.body.style.overflow = '';
    activeStudioQuestion = null;
  }

  function renderTestCaseTabs() {
    if (!els.crCaseTabs) return;
    els.crCaseTabs.innerHTML = '';

    customTestCases.forEach((tc, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `cr-case-tab ${idx === activeTestCaseIdx ? 'active' : ''}`;
      
      const res = testResultsCache.find(r => r.id === tc.id);
      if (res) {
        btn.classList.add(res.passed ? 'passed' : 'failed');
        btn.textContent = `Case ${idx + 1} ${res.passed ? '✓' : '✗'}`;
      } else {
        btn.textContent = `Case ${idx + 1}`;
      }

      btn.addEventListener('click', () => {
        saveActiveTestCaseInput();
        activeTestCaseIdx = idx;
        renderTestCaseTabs();
      });

      els.crCaseTabs.appendChild(btn);
    });

    const activeTc = customTestCases[activeTestCaseIdx];
    if (activeTc) {
      els.crCaseInput.value = activeTc.inputRaw || '';
      els.crCaseExpected.value = activeTc.expectedRaw || '';
    } else {
      els.crCaseInput.value = '';
      els.crCaseExpected.value = '';
    }
  }

  function saveActiveTestCaseInput() {
    if (customTestCases[activeTestCaseIdx]) {
      customTestCases[activeTestCaseIdx].inputRaw = els.crCaseInput.value;
      customTestCases[activeTestCaseIdx].expectedRaw = els.crCaseExpected.value;
    }
  }

  function addCustomTestCase() {
    saveActiveTestCaseInput();
    const newId = customTestCases.length + 1;
    customTestCases.push({
      id: newId,
      inputRaw: '// Custom test inputs\n',
      expectedRaw: '0'
    });
    activeTestCaseIdx = customTestCases.length - 1;
    renderTestCaseTabs();
    els.crCaseInput.focus();
  }

  function handleLanguageChange() {
    const prevExt = els.crFileExt.textContent;
    const oldLang = Object.keys(LANG_FILE_EXT).find(k => LANG_FILE_EXT[k] === prevExt) || 'python';
    userCodeMap[oldLang] = getEditorCode();

    const newLang = els.crLanguage.value;
    els.crFileExt.textContent = LANG_FILE_EXT[newLang] || 'py';

    let code = '';
    if (userCodeMap[newLang]) {
      code = userCodeMap[newLang];
    } else if (activeProblemDetail && activeProblemDetail.starterCodes && activeProblemDetail.starterCodes[newLang]) {
      code = activeProblemDetail.starterCodes[newLang];
    }

    setEditorCode(code, newLang);
    highlightLeftPane(newLang);
  }

  function resetStudioCode() {
    const lang = els.crLanguage.value;
    if (activeProblemDetail && activeProblemDetail.starterCodes && activeProblemDetail.starterCodes[lang]) {
      if (confirm('Reset code to initial boilerplate?')) {
        setEditorCode(activeProblemDetail.starterCodes[lang], lang);
        userCodeMap[lang] = activeProblemDetail.starterCodes[lang];
      }
    }
  }

  async function runActiveTests() {
    saveActiveTestCaseInput();
    const code = getEditorCode().trim();
    if (!code) {
      showToast('Please write some code before running tests');
      return;
    }

    const language = els.crLanguage.value;
    const functionName = activeProblemDetail ? activeProblemDetail.functionName : 'solve';

    els.crStatusMsg.className = 'cr-status-msg';
    els.crStatusMsg.textContent = 'Compiling and executing test cases...';
    els.crRunBtn.disabled = true;

    const payload = {
      language,
      code,
      functionName,
      testCases: customTestCases
    };

    let result = null;

    // 1. Try local dev server
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        result = await res.json();
      }
    } catch (_) {}

    // 2. Direct client-side fallback if server is unreachable
    if (!result) {
      if (language === 'javascript') {
        result = runClientSideJavaScript(code, functionName, customTestCases);
      } else {
        result = await runClientSideWandbox(language, code, functionName, customTestCases);
      }
    }

    els.crRunBtn.disabled = false;

    if (!result) {
      els.crStatusMsg.className = 'cr-status-msg error';
      els.crStatusMsg.textContent = 'Execution failed. Ensure local dev server is running or check internet connectivity.';
      return;
    }

    testResultsCache = result.results || [];
    renderTestCaseTabs();
    renderExecutionResults(result);
  }

  function runClientSideJavaScript(code, functionName, testCases) {
    const results = [];
    let userStdout = '';

    for (const tc of testCases) {
      const start = performance.now();
      try {
        const runnerCode = `
          ${code}
          const logs = [];
          const originalLog = console.log;
          console.log = (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
          
          ${tc.inputRaw}
          
          let targetFn = null;
          try { targetFn = ${functionName}; } catch (_) {}
          if (typeof targetFn !== 'function') {
            throw new Error("Function '${functionName}' is not defined");
          }

          const varNames = Object.keys(this).filter(k => k !== 'targetFn' && k !== 'logs' && k !== 'originalLog');
          const args = varNames.map(k => this[k]);
          
          const actual = targetFn(...args);
          console.log = originalLog;
          return { actual, logs: logs.join('\\n') };
        `;

        const fn = new Function(runnerCode);
        const output = fn.call({});
        const duration = Math.round((performance.now() - start) * 100) / 100;

        let expected;
        try {
          expected = JSON.parse(tc.expectedRaw);
        } catch (_) {
          expected = tc.expectedRaw.trim();
        }

        const passed = JSON.stringify(output.actual) === JSON.stringify(expected) || String(output.actual).trim() === String(expected).trim();
        if (output.logs) userStdout += (userStdout ? '\n' : '') + output.logs;

        results.push({
          id: tc.id,
          passed,
          input: tc.inputRaw,
          expected: JSON.stringify(expected),
          actual: JSON.stringify(output.actual),
          executionTimeMs: duration,
          error: null
        });
      } catch (err) {
        results.push({
          id: tc.id,
          passed: false,
          input: tc.inputRaw,
          expected: tc.expectedRaw,
          actual: '',
          executionTimeMs: 0,
          error: err.message || String(err)
        });
      }
    }

    const totalPassed = results.filter(r => r.passed).length;
    return {
      allPassed: totalPassed === testCases.length && testCases.length > 0,
      totalPassed,
      totalTests: testCases.length,
      results,
      stdout: userStdout,
      compileError: null
    };
  }

  async function runClientSideWandbox(language, code, functionName, testCases) {
    const compiler = language === 'python' ? 'cpython-3.12.7' : (language === 'cpp' ? 'gcc-head' : 'openjdk-jdk-21.0.3');
    
    // For Python, inject our test harness
    let execCode = code;
    if (language === 'python') {
      const testJson = JSON.stringify(testCases);
      execCode = `
import sys, json, time

${code}

raw_tests = ${testJson}
results = []
target_fn = globals().get(${JSON.stringify(functionName)})

for tc in raw_tests:
    tc_id = tc["id"]
    inp = tc["inputRaw"]
    exp_str = tc["expectedRaw"]
    if not target_fn:
        results.append({"id": tc_id, "passed": False, "input": inp, "expected": exp_str, "actual": "", "executionTimeMs": 0, "error": f"Function '${functionName}' not found."})
        continue
    scope = {}
    try:
        exec(inp, globals(), scope)
        args = list(scope.values())
        try: expected = json.loads(exp_str)
        except Exception:
            try: expected = eval(exp_str)
            except Exception: expected = exp_str.strip()
        t0 = time.perf_counter()
        actual = target_fn(*args)
        ms = round((time.perf_counter() - t0) * 1000, 2)
        passed = (actual == expected) or (json.dumps(actual) == json.dumps(expected))
        results.append({"id": tc_id, "passed": bool(passed), "input": inp, "expected": json.dumps(expected) if isinstance(expected, (dict, list)) else str(expected), "actual": json.dumps(actual) if isinstance(actual, (dict, list)) else str(actual), "executionTimeMs": ms, "error": None})
    except Exception as e:
        results.append({"id": tc_id, "passed": False, "input": inp, "expected": exp_str, "actual": "", "executionTimeMs": 0, "error": str(e)})

print("__OUTPUT_START__" + json.dumps(results) + "__OUTPUT_END__")
`;
    }

    try {
      const res = await fetch('https://wandbox.org/api/compile.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compiler, code: execCode })
      });
      const data = await res.json();
      const stdout = data.program_output || '';
      const match = stdout.match(/__OUTPUT_START__([\s\S]*?)__OUTPUT_END__/);

      if (match) {
        const results = JSON.parse(match[1]);
        const totalPassed = results.filter(r => r.passed).length;
        return {
          allPassed: totalPassed === testCases.length,
          totalPassed,
          totalTests: testCases.length,
          results,
          stdout: stdout.replace(/__OUTPUT_START__[\s\S]*?__OUTPUT_END__/, '').trim(),
          compileError: data.compiler_error || null
        };
      }

      return {
        allPassed: false,
        totalPassed: 0,
        totalTests: testCases.length,
        results: testCases.map(tc => ({
          id: tc.id,
          passed: false,
          input: tc.inputRaw,
          expected: tc.expectedRaw,
          actual: stdout,
          executionTimeMs: 0,
          error: data.compiler_error || data.program_error || 'Execution output returned.'
        })),
        stdout,
        compileError: data.compiler_error || data.program_error || null
      };
    } catch (err) {
      return {
        allPassed: false,
        totalPassed: 0,
        totalTests: testCases.length,
        results: [],
        stdout: '',
        compileError: err.message || 'Network error reaching compiler'
      };
    }
  }

  function renderExecutionResults(res) {
    els.crResultsPanel.style.display = 'block';

    const allPassed = res.allPassed;
    els.crOverallBadge.className = `pill-badge ${allPassed ? 'fmt-ai' : 'fmt-sql'}`;
    els.crOverallBadge.textContent = allPassed ? '✓ All Tests Passed' : `${res.totalPassed}/${res.totalTests} Passed`;

    els.crExecStats.textContent = res.compileError ? 'Compilation / Runtime Error' : `Completed ${res.totalTests} test cases`;

    els.crResultsList.innerHTML = (res.results || []).map((r, i) => `
      <div class="cr-result-card ${r.passed ? 'passed' : 'failed'}">
        <div class="cr-res-top">
          <span class="${r.passed ? 'cr-res-status-pass' : 'cr-res-status-fail'}">
            Case ${i + 1}: ${r.passed ? 'PASSED' : 'FAILED'}
          </span>
          <span style="color:var(--text-muted);font-size:0.75rem;">${r.executionTimeMs}ms</span>
        </div>
        ${r.error ? `<div style="color:#f87171;font-size:0.8rem;margin-top:2px;">Error: ${escapeHTML(r.error)}</div>` : ''}
        <div class="cr-res-detail">
          <span>Expected:</span>
          <span>${escapeHTML(r.expected)}</span>
        </div>
        <div class="cr-res-detail">
          <span>Actual:</span>
          <span style="color:${r.passed ? '#34d399' : '#f87171'}">${escapeHTML(r.actual)}</span>
        </div>
      </div>
    `).join('');

    if (res.stdout && res.stdout.trim()) {
      els.crStdoutBox.style.display = 'block';
      els.crStdoutContent.textContent = res.stdout;
    } else {
      els.crStdoutBox.style.display = 'none';
    }

    if (res.compileError) {
      els.crStatusMsg.className = 'cr-status-msg error';
      els.crStatusMsg.textContent = res.compileError.slice(0, 100);
    } else {
      els.crStatusMsg.className = 'cr-status-msg';
      els.crStatusMsg.textContent = allPassed ? 'All test cases passed! Ready to submit.' : 'Some test cases failed.';
    }
  }

  function markActiveProblemSolved() {
    if (!activeStudioQuestion) return;
    const id = activeStudioQuestion.id;
    if (!solved.has(id)) {
      solved.add(id);
      localStorage.setItem(STORAGE_KEY_SOLVED, JSON.stringify(Array.from(solved)));
      updateProgressUI();
      updateGSheetSyncCount();
      updateItemStateInDOM(id);
    }
    showToast(`Marked "${activeStudioQuestion.title}" as solved!`);
    els.crMarkSolvedBtn.textContent = '✓ Solved';
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
