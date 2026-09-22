(function () {
  var fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  var usdFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  var dfmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
  var monthFmt = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' });

  // ---------- DOM refs ----------
  var gateEl = document.getElementById('gate');
  var gateForm = document.getElementById('gateForm');
  var gatePasswordEl = document.getElementById('gatePassword');
  var gateErrorEl = document.getElementById('gateError');
  var appEl = document.getElementById('app');
  var themeBtn = document.getElementById('themeBtn');
  var authBarEl = document.getElementById('authBar');
  var authStatusEl = document.getElementById('authStatus');
  var authBtn = document.getElementById('authBtn');

  var form = document.getElementById('expenseForm');
  var formCardEl = document.getElementById('formCard');
  var amountEl = document.getElementById('amount');
  var amountLabelEl = document.getElementById('amountLabel');
  var dateEl = document.getElementById('date');
  var descEl = document.getElementById('description');
  var descSuggestionsEl = document.getElementById('descSuggestions');
  var categoryRowEl = document.getElementById('categoryRow');
  var categoryEl = document.getElementById('category');
  var categoryFilterEl = document.getElementById('categoryFilter');
  var editCategoriesBtn = document.getElementById('editCategoriesBtn');
  var categoryEditorEl = document.getElementById('categoryEditor');
  var categoryEditorListEl = document.getElementById('categoryEditorList');
  var newCategoryInputEl = document.getElementById('newCategoryInput');
  var addCategoryBtn = document.getElementById('addCategoryBtn');
  var closeCategoryEditorBtn = document.getElementById('closeCategoryEditorBtn');
  var dolarCasaEl = document.getElementById('dolarCasa');
  var rateEl = document.getElementById('rate');
  var rateRowEl = document.getElementById('rateRow');
  var rateStatusEl = document.getElementById('rateStatus');
  var refreshRateBtn = document.getElementById('refreshRateBtn');
  var statusEl = document.getElementById('formStatus');
  var ledgerEl = document.getElementById('ledger');
  var balanceLineEl = document.getElementById('balanceLine');
  var statDelfinaEl = document.getElementById('statDelfina');
  var statNicolasEl = document.getElementById('statNicolas');
  var chartWrapEl = document.getElementById('chartWrap');
  var chartHolderEl = document.getElementById('chartHolder');
  var receiptInputEl = document.getElementById('receiptInput');
  var receiptPreviewEl = document.getElementById('receiptPreview');
  var receiptPreviewImgEl = document.getElementById('receiptPreviewImg');
  var removeReceiptBtn = document.getElementById('removeReceiptBtn');
  var exportCsvBtn = document.getElementById('exportCsvBtn');
  var fabBtn = document.getElementById('fabBtn');
  var payerButtons = Array.prototype.slice.call(document.querySelectorAll('#payerToggle .payer-btn'));
  var directionButtons = Array.prototype.slice.call(document.querySelectorAll('#directionToggle .payer-btn'));
  var currencyButtons = Array.prototype.slice.call(document.querySelectorAll('#currencyToggle .payer-btn'));
  var modeButtons = Array.prototype.slice.call(document.querySelectorAll('.mode-btn'));
  var filterButtons = Array.prototype.slice.call(document.querySelectorAll('.filter-btn'));
  var payerToggleEl = document.getElementById('payerToggle');
  var directionToggleEl = document.getElementById('directionToggle');
  var currencyToggleEl = document.getElementById('currencyToggle');
  var settlementHintEl = document.getElementById('settlementHint');
  var submitBtnEl = document.getElementById('submitBtn');
  var formTitleEl = document.getElementById('formTitle');
  var editBannerEl = document.getElementById('editBanner');
  var cancelEditBtn = document.getElementById('cancelEditBtn');
  var toastStackEl = document.getElementById('toastStack');

  // ---------- State ----------
  var selectedPayer = 'delfina';
  var selectedDirection = 'delfina-nicolas';
  var selectedMode = 'expense';
  var selectedCurrency = 'ARS';
  var rateAutoFilled = false;
  var fetchToken = 0;
  var activeFilter = 'all';
  var activeCategory = 'all';
  var expandedMonths = {};
  var dbRef = null;
  var docs = [];
  var loaded = false;
  var lastNet = 0; // > 0: Nicolás owes Delfina. < 0: Delfina owes Nicolás.
  var editingId = null;
  var editingCreatedAt = null;
  var pendingReceiptData = null;
  var currentUser = null;
  var ALLOWED_EMAILS = (window.ALLOWED_EMAILS || []).map(function (e) { return String(e).toLowerCase(); });

  var CASA_LABELS = { blue: 'Blue', oficial: 'Oficial', bolsa: 'MEP', contadoconliqui: 'CCL', mayorista: 'Mayorista', cripto: 'Cripto' };
  function casaLabel(casa) { return CASA_LABELS[casa] || casa; }

  var DEFAULT_CATEGORIES = {
    supermercado: 'Supermercado', comida: 'Comida afuera', transporte: 'Transporte',
    servicios: 'Servicios', salud: 'Salud', entretenimiento: 'Entretenimiento',
    hogar: 'Hogar', otros: 'Otros'
  };
  var categories = null; // se llena desde Firebase; null hasta el primer snapshot
  var categoriesRef = null;
  function categoryLabel(cat) {
    var map = categories || DEFAULT_CATEGORIES;
    return map[cat] || cat;
  }
  function slugify(s) {
    var out = String(s).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24);
    return out || 'cat';
  }
  function uniqueCategoryId(base) {
    var map = categories || {};
    var id = base, n = 2;
    while (map[id] != null) { id = base + '-' + n; n++; }
    return id;
  }

  function populateCategorySelect() {
    var map = categories || DEFAULT_CATEGORIES;
    var current = categoryEl.value;
    var ids = Object.keys(map);
    categoryEl.innerHTML = ids.map(function (id) {
      return '<option value="' + id + '">' + escapeHtml(map[id]) + '</option>';
    }).join('');
    if (ids.indexOf(current) !== -1) categoryEl.value = current;
    else if (ids.indexOf('otros') !== -1) categoryEl.value = 'otros';
  }

  function renderCategoryEditor() {
    var map = categories || DEFAULT_CATEGORIES;
    var ids = Object.keys(map);
    categoryEditorListEl.innerHTML = ids.map(function (id) {
      return (
        '<div class="cat-edit-row" data-id="' + id + '">' +
          '<input type="text" class="cat-edit-input" value="' + escapeHtml(map[id]) + '" data-id="' + id + '" maxlength="30">' +
          '<button type="button" class="row-del" data-catdel="' + id + '" aria-label="Eliminar categoría">×</button>' +
        '</div>'
      );
    }).join('');
    categoryEditorListEl.querySelectorAll('.cat-edit-input').forEach(function (input) {
      input.addEventListener('change', function () {
        renameCategory(input.getAttribute('data-id'), input.value.trim());
      });
    });
    categoryEditorListEl.querySelectorAll('[data-catdel]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        deleteCategory(btn.getAttribute('data-catdel'));
      });
    });
  }

  function requireAuthForCategories() {
    if (!categoriesRef) { showToast('No se pudo conectar la base de datos compartida.', true); return false; }
    if (!isAuthorized()) { showToast('Necesitás conectarte con una cuenta autorizada para editar categorías.', true); return false; }
    return true;
  }

  function renameCategory(id, label) {
    if (!requireAuthForCategories()) { renderCategoryEditor(); return; }
    if (!label) { renderCategoryEditor(); return; }
    categoriesRef.child(id).set(label).catch(function (err) {
      console.error(err);
      showToast('No se pudo renombrar la categoría.', true);
    });
  }

  function deleteCategory(id) {
    if (!requireAuthForCategories()) return;
    var map = categories || DEFAULT_CATEGORIES;
    if (Object.keys(map).length <= 1) {
      showToast('Tiene que quedar al menos una categoría.', true);
      return;
    }
    categoriesRef.child(id).remove().catch(function (err) {
      console.error(err);
      showToast('No se pudo eliminar la categoría.', true);
    });
  }

  function addCategoryFromInput() {
    if (!requireAuthForCategories()) return;
    var label = newCategoryInputEl.value.trim();
    if (!label) return;
    var id = uniqueCategoryId(slugify(label));
    categoriesRef.child(id).set(label).then(function () {
      newCategoryInputEl.value = '';
      newCategoryInputEl.focus();
    }).catch(function (err) {
      console.error(err);
      showToast('No se pudo agregar la categoría.', true);
    });
  }

  editCategoriesBtn.addEventListener('click', function () {
    categoryEditorEl.hidden = !categoryEditorEl.hidden;
    if (!categoryEditorEl.hidden) renderCategoryEditor();
  });
  closeCategoryEditorBtn.addEventListener('click', function () { categoryEditorEl.hidden = true; });
  addCategoryBtn.addEventListener('click', addCategoryFromInput);
  newCategoryInputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); addCategoryFromInput(); }
  });

  // ---------- Small helpers ----------
  function todayStr() {
    var d = new Date();
    var mo = String(d.getMonth() + 1).padStart(2, '0');
    var da = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mo + '-' + da;
  }
  function parseLocalDate(dateStr) {
    var parts = (dateStr || '').split('-');
    if (parts.length !== 3) return new Date();
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  function money(n) { return fmt.format(Math.round(n || 0)); }
  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
  function monthLabel(mk) {
    var parts = mk.split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    var label = monthFmt.format(d);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  function closingLabel(net) {
    if (Math.abs(net) < 1) return { text: 'Saldados', cls: 'settled' };
    if (net > 0) return { text: 'Nicolás debe ' + money(net), cls: 'owes-delfina' };
    return { text: 'Delfina debe ' + money(-net), cls: 'owes-nicolas' };
  }
  function setStatus(msg, isError) {
    statusEl.textContent = msg || '';
    statusEl.style.color = isError ? 'var(--danger)' : 'var(--ink-soft)';
  }
  function showToast(msg, opts) {
    if (opts === true) opts = { error: true };
    opts = opts || {};
    var el = document.createElement('div');
    el.className = 'toast' + (opts.error ? ' error' : '');
    var span = document.createElement('span');
    span.textContent = msg;
    el.appendChild(span);
    var timer;
    function dismiss() {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 200);
    }
    if (opts.actionLabel && opts.onAction) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast-action';
      btn.textContent = opts.actionLabel;
      btn.addEventListener('click', function () {
        clearTimeout(timer);
        opts.onAction();
        dismiss();
      });
      el.appendChild(btn);
    }
    toastStackEl.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    timer = setTimeout(dismiss, opts.duration || 4000);
  }

  // ---------- Theme ----------
  var THEME_KEY = 'gastos-compartidos-theme';
  function isDarkNow() {
    var current = document.documentElement.getAttribute('data-theme');
    if (current) return current === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function updateThemeBtn() { themeBtn.textContent = isDarkNow() ? '☀' : '◐'; }
  function initTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    updateThemeBtn();
    themeBtn.addEventListener('click', function () {
      var next = isDarkNow() ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(THEME_KEY, next);
      updateThemeBtn();
    });
  }

  // ---------- Password gate ----------
  var GATE_KEY = 'gastos-compartidos-unlocked';
  function initGate() {
    if (!window.APP_PASSWORD) { startApp(); return; }
    if (sessionStorage.getItem(GATE_KEY) === '1') { startApp(); return; }
    gateEl.hidden = false;
    gateForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (gatePasswordEl.value === window.APP_PASSWORD) {
        sessionStorage.setItem(GATE_KEY, '1');
        gateEl.hidden = true;
        startApp();
      } else {
        gateErrorEl.hidden = false;
        gatePasswordEl.value = '';
        gatePasswordEl.focus();
      }
    });
  }
  function startApp() {
    appEl.hidden = false;
    initFirebase();
  }

  // ---------- Firebase ----------
  function showUnavailable(msg) {
    ledgerEl.innerHTML = '<div class="banner">' + escapeHtml(msg) + '</div>';
    balanceLineEl.textContent = 'Sin conexión';
    balanceLineEl.classList.remove('owes-delfina', 'owes-nicolas');
    balanceLineEl.classList.add('settled');
  }
  function initFirebase() {
    if (!window.FIREBASE_CONFIG || window.FIREBASE_CONFIG.apiKey === 'TU_API_KEY') {
      loaded = true;
      showUnavailable('Falta configurar Firebase: completá firebase-config.js con los datos de tu proyecto antes de usar el sitio.');
      return;
    }
    try {
      firebase.initializeApp(window.FIREBASE_CONFIG);
      dbRef = firebase.database().ref((window.DB_PATH || 'gastosCompartidos') + '/movimientos');
    } catch (err) {
      console.error(err);
      loaded = true;
      showUnavailable('No se pudo inicializar Firebase. Revisá firebase-config.js.');
      return;
    }
    dbRef.on('value', function (snap) {
      var val = snap.val() || {};
      docs = Object.keys(val).map(function (id) {
        var d = val[id] || {};
        d.id = id;
        return d;
      });
      loaded = true;
      render();
    }, function (err) {
      console.error(err);
      loaded = true;
      showUnavailable('No se pudo conectar con la base de datos compartida. Revisá la configuración y las reglas de Firebase.');
    });
    categoriesRef = firebase.database().ref((window.DB_PATH || 'gastosCompartidos') + '/categorias');
    categoriesRef.on('value', function (snap) {
      var val = snap.val();
      if (val && Object.keys(val).length) {
        categories = val;
      } else if (val === null) {
        categories = DEFAULT_CATEGORIES;
        categoriesRef.set(DEFAULT_CATEGORIES).catch(function (err) { console.error(err); });
      }
      populateCategorySelect();
      if (!categoryEditorEl.hidden) renderCategoryEditor();
      render();
    }, function (err) {
      console.error(err);
      categories = DEFAULT_CATEGORIES;
      populateCategorySelect();
    });
    initAuth();
  }

  // ---------- Auth (Google, opcional) ----------
  function isAuthorized() {
    if (!ALLOWED_EMAILS.length) return true; // sin restricción configurada: se comporta como antes
    return !!(currentUser && currentUser.email && ALLOWED_EMAILS.indexOf(currentUser.email.toLowerCase()) !== -1);
  }
  function updateAuthUi() {
    if (!ALLOWED_EMAILS.length) { authBarEl.hidden = true; return; }
    authBarEl.hidden = false;
    if (!currentUser) {
      authBarEl.classList.remove('unauthorized');
      authStatusEl.textContent = 'Conectate con Google para poder cargar movimientos.';
      authBtn.textContent = 'Conectar con Google';
      authBtn.onclick = signInGoogle;
    } else if (!isAuthorized()) {
      authBarEl.classList.add('unauthorized');
      authStatusEl.textContent = 'La cuenta ' + currentUser.email + ' no está autorizada.';
      authBtn.textContent = 'Cerrar sesión';
      authBtn.onclick = signOutGoogle;
    } else {
      authBarEl.classList.remove('unauthorized');
      authStatusEl.textContent = 'Conectado como ' + (currentUser.displayName || currentUser.email) + '.';
      authBtn.textContent = 'Cerrar sesión';
      authBtn.onclick = signOutGoogle;
    }
  }
  function signInGoogle() {
    if (!firebase.auth) return;
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(function (err) {
      console.error(err);
      if (err && err.code === 'auth/popup-closed-by-user') return;
      var msg = 'No se pudo iniciar sesión con Google.';
      if (err) {
        if (err.code === 'auth/unauthorized-domain') {
          msg = 'Este dominio no está autorizado en Firebase (Authentication → Settings → Authorized domains).';
        } else if (err.code === 'auth/operation-not-allowed') {
          msg = 'Google no está habilitado como método de inicio de sesión en tu proyecto de Firebase (Authentication → Sign-in method).';
        } else if (err.code === 'auth/popup-blocked') {
          msg = 'El navegador bloqueó la ventana de Google. Permití popups para este sitio e intentá de nuevo.';
        } else if (err.code === 'auth/network-request-failed') {
          msg = 'Falló la conexión con Google. Revisá tu internet e intentá de nuevo.';
        }
      }
      showToast(msg, true);
    });
  }
  function signOutGoogle() {
    if (!firebase.auth) return;
    firebase.auth().signOut();
  }
  function initAuth() {
    if (!ALLOWED_EMAILS.length) return;
    if (!firebase.auth) {
      console.warn('firebase-auth-compat.js no está cargado.');
      return;
    }
    firebase.auth().onAuthStateChanged(function (user) {
      currentUser = user;
      updateAuthUi();
    });
  }

  // ---------- Mode / currency UI ----------
  function setUiForMode(mode) {
    modeButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-mode') === mode ? 'true' : 'false');
    });
    if (mode === 'settlement') {
      payerToggleEl.hidden = true;
      categoryRowEl.hidden = true;
      directionToggleEl.hidden = false;
      currencyToggleEl.hidden = false;
      descEl.placeholder = 'Transferencia, efectivo, Mercado Pago… (opcional)';
    } else {
      payerToggleEl.hidden = false;
      categoryRowEl.hidden = false;
      directionToggleEl.hidden = true;
      currencyToggleEl.hidden = true;
      rateRowEl.hidden = true;
      rateStatusEl.hidden = true;
      amountLabelEl.textContent = 'Monto';
      descEl.placeholder = 'Supermercado, nafta, alquiler…';
      selectedCurrency = 'ARS';
      currencyButtons.forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-currency') === 'ARS' ? 'true' : 'false');
      });
    }
  }

  function renderRateHint() {
    var usd = parseFloat(amountEl.value);
    var rate = parseFloat(rateEl.value);
    if (!(rate > 0)) { rateStatusEl.hidden = true; return; }
    var parts = [];
    if (rateAutoFilled) {
      parts.push(casaLabel(dolarCasaEl.value) + ' del ' + dfmt.format(parseLocalDate(dateEl.value || todayStr())) + ': ' + money(rate) + '/US$');
    }
    if (usd > 0) parts.push('≈ ' + money(usd * rate) + ' en total');
    if (!parts.length) { rateStatusEl.hidden = true; return; }
    rateStatusEl.hidden = false;
    rateStatusEl.textContent = parts.join(' · ');
  }

  function setUiForCurrency(currency) {
    currencyButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-currency') === currency ? 'true' : 'false');
    });
    if (currency === 'USD') {
      amountLabelEl.textContent = 'Monto (US$)';
      rateRowEl.hidden = false;
      settlementHintEl.hidden = true;
      autoFetchRate();
    } else {
      amountLabelEl.textContent = 'Monto';
      rateRowEl.hidden = true;
      rateStatusEl.hidden = true;
    }
  }

  // ---------- Automatic USD/ARS exchange rate ----------
  function fetchRate(dateStr, casa) {
    var isToday = dateStr === todayStr();
    var url;
    if (isToday) {
      url = 'https://dolarapi.com/v1/dolares/' + casa;
    } else {
      var parts = dateStr.split('-');
      url = 'https://api.argentinadatos.com/v1/cotizaciones/dolares/' + casa + '/' + parts[0] + '/' + parts[1] + '/' + parts[2];
    }
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (data) {
      var venta = data && data.venta;
      if (!venta) throw new Error('Respuesta sin cotización de venta');
      return Number(venta);
    });
  }

  function autoFetchRate() {
    if (selectedMode !== 'settlement' || selectedCurrency !== 'USD') return;
    var casa = dolarCasaEl.value;
    var date = dateEl.value || todayStr();
    var token = ++fetchToken;
    refreshRateBtn.classList.add('spinning');
    rateStatusEl.hidden = false;
    rateStatusEl.textContent = 'Buscando cotización ' + casaLabel(casa) + '…';
    fetchRate(date, casa).then(function (rate) {
      if (token !== fetchToken) return;
      refreshRateBtn.classList.remove('spinning');
      rateEl.value = rate;
      rateAutoFilled = true;
      renderRateHint();
    }).catch(function (err) {
      if (token !== fetchToken) return;
      refreshRateBtn.classList.remove('spinning');
      console.error(err);
      rateStatusEl.hidden = false;
      rateStatusEl.textContent = 'No pudimos buscar la cotización automáticamente para esa fecha. Ingresala a mano.';
    });
  }

  // ---------- Receipt photo ----------
  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var maxW = 900;
          var scale = Math.min(1, maxW / img.width);
          var canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.62));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  function showReceiptPreview(dataUrl) {
    receiptPreviewImgEl.src = dataUrl;
    receiptPreviewEl.hidden = false;
  }
  function clearReceipt() {
    pendingReceiptData = null;
    receiptInputEl.value = '';
    receiptPreviewEl.hidden = true;
    receiptPreviewImgEl.src = '';
  }
  receiptInputEl.addEventListener('change', function () {
    var file = receiptInputEl.files && receiptInputEl.files[0];
    if (!file) return;
    compressImage(file).then(function (dataUrl) {
      pendingReceiptData = dataUrl;
      showReceiptPreview(dataUrl);
    }).catch(function (err) {
      console.error(err);
      showToast('No se pudo procesar la imagen.', true);
      clearReceipt();
    });
  });
  removeReceiptBtn.addEventListener('click', clearReceipt);

  // ---------- Draft (autosave mientras se escribe) ----------
  var DRAFT_KEY = 'gastos-compartidos-draft';
  var draftLoading = false;
  function saveDraft() {
    if (editingId || draftLoading) return;
    var draft = {
      mode: selectedMode, payer: selectedPayer, direction: selectedDirection,
      currency: selectedCurrency, dolarCasa: dolarCasaEl.value, category: categoryEl.value,
      amount: amountEl.value, rate: rateEl.value, date: dateEl.value, description: descEl.value
    };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) {}
  }
  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  }
  function loadDraft() {
    var raw;
    try { raw = localStorage.getItem(DRAFT_KEY); } catch (e) { return; }
    if (!raw) return;
    var draft;
    try { draft = JSON.parse(raw); } catch (e) { return; }
    if (!draft) return;
    draftLoading = true;
    if (draft.category) categoryEl.value = draft.category;
    if (draft.mode === 'settlement') {
      selectedMode = 'settlement';
      modeButtons.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mode') === 'settlement' ? 'true' : 'false'); });
      setUiForMode('settlement');
      selectDirection(draft.direction || 'delfina-nicolas');
      if (draft.currency === 'USD') {
        selectedCurrency = 'USD';
        currencyButtons.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-currency') === 'USD' ? 'true' : 'false'); });
        amountLabelEl.textContent = 'Monto (US$)';
        rateRowEl.hidden = false;
        if (draft.dolarCasa) dolarCasaEl.value = draft.dolarCasa;
        if (draft.rate) { rateEl.value = draft.rate; rateAutoFilled = false; }
      }
      submitBtnEl.textContent = 'Agregar pago';
    }
    if (draft.amount) amountEl.value = draft.amount;
    if (draft.date) dateEl.value = draft.date;
    if (draft.description) descEl.value = draft.description;
    renderRateHint();
    draftLoading = false;
  }

  // ---------- Form actions ----------
  function resetFormFully() {
    editingId = null;
    editingCreatedAt = null;
    form.reset();
    clearReceipt();
    dateEl.value = todayStr();
    categoryEl.value = 'otros';
    selectedMode = 'expense';
    selectedPayer = 'delfina';
    selectedDirection = 'delfina-nicolas';
    selectedCurrency = 'ARS';
    rateAutoFilled = false;
    dolarCasaEl.value = 'blue';
    setUiForMode('expense');
    payerButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-payer') === 'delfina' ? 'true' : 'false');
    });
    directionButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-direction') === 'delfina-nicolas' ? 'true' : 'false');
    });
    currencyButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-currency') === 'ARS' ? 'true' : 'false');
    });
    modeButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-mode') === 'expense' ? 'true' : 'false');
    });
    submitBtnEl.textContent = 'Agregar gasto';
    settlementHintEl.hidden = true;
    rateStatusEl.hidden = true;
    editBannerEl.hidden = true;
    formTitleEl.textContent = 'Sumar un movimiento';
  }

  function selectDirection(direction) {
    selectedDirection = direction;
    directionButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-direction') === direction ? 'true' : 'false');
    });
  }

  function startEdit(id) {
    var doc = docs.filter(function (d) { return d.id === id; })[0];
    if (!doc) return;
    if (!isAuthorized()) {
      showToast('Necesitás conectarte con una cuenta autorizada para editar.', true);
      return;
    }
    editingId = id;
    editingCreatedAt = doc.createdAt || Date.now();
    settlementHintEl.hidden = true;
    clearReceipt();
    if (doc.receiptData) {
      pendingReceiptData = doc.receiptData;
      showReceiptPreview(doc.receiptData);
    }

    if (doc.kind === 'settlement') {
      selectedMode = 'settlement';
      setUiForMode('settlement');
      modeButtons.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mode') === 'settlement' ? 'true' : 'false'); });
      selectDirection(doc.from + '-' + doc.to);
      selectedCurrency = doc.currency === 'USD' ? 'USD' : 'ARS';
      currencyButtons.forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-currency') === selectedCurrency ? 'true' : 'false');
      });
      if (selectedCurrency === 'USD') {
        amountLabelEl.textContent = 'Monto (US$)';
        rateRowEl.hidden = false;
        if (doc.dolarCasa) dolarCasaEl.value = doc.dolarCasa;
        amountEl.value = doc.amountUsd != null ? doc.amountUsd : doc.amount;
        rateEl.value = doc.rate || '';
        rateAutoFilled = true;
        renderRateHint();
      } else {
        amountLabelEl.textContent = 'Monto';
        rateRowEl.hidden = true;
        rateStatusEl.hidden = true;
        amountEl.value = doc.amount;
      }
    } else {
      selectedMode = 'expense';
      setUiForMode('expense');
      modeButtons.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mode') === 'expense' ? 'true' : 'false'); });
      selectedPayer = doc.payer;
      payerButtons.forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-payer') === doc.payer ? 'true' : 'false');
      });
      categoryEl.value = doc.category || 'otros';
      amountEl.value = doc.amount;
    }

    dateEl.value = doc.date || todayStr();
    descEl.value = doc.description || '';
    submitBtnEl.textContent = 'Guardar cambios';
    formTitleEl.textContent = 'Editar movimiento';
    editBannerEl.hidden = false;
    setStatus('');
    formCardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function addExpense() {
    if (!dbRef) {
      setStatus('No se pudo conectar la base de datos compartida.', true);
      return;
    }
    if (!isAuthorized()) {
      setStatus('Necesitás conectarte con una cuenta de Google autorizada para guardar.', true);
      return;
    }
    var amount = parseFloat(amountEl.value);
    if (!amount || amount <= 0) {
      setStatus('Ingresá un monto válido.', true);
      return;
    }
    var description = descEl.value.trim();
    var date = dateEl.value || todayStr();
    var payload;

    if (selectedMode === 'settlement') {
      var parts = selectedDirection.split('-');
      if (selectedCurrency === 'USD') {
        var rate = parseFloat(rateEl.value);
        if (!rate || rate <= 0) {
          setStatus('Ingresá la cotización (o esperá a que se busque sola).', true);
          return;
        }
        payload = {
          kind: 'settlement', from: parts[0], to: parts[1],
          currency: 'USD', amountUsd: amount, rate: rate, dolarCasa: dolarCasaEl.value,
          amount: amount * rate,
          description: description, date: date
        };
      } else {
        payload = {
          kind: 'settlement', from: parts[0], to: parts[1],
          currency: 'ARS', amount: amount,
          description: description, date: date
        };
      }
    } else {
      payload = { kind: 'expense', payer: selectedPayer, category: categoryEl.value, amount: amount, description: description, date: date };
    }

    if (pendingReceiptData) payload.receiptData = pendingReceiptData;

    var wasEditing = !!editingId;
    payload.createdAt = wasEditing ? (editingCreatedAt || Date.now()) : Date.now();

    submitBtnEl.disabled = true;
    setStatus('');

    var writeOp = wasEditing ? dbRef.child(editingId).set(payload) : dbRef.push(payload);

    writeOp.then(function () {
      submitBtnEl.disabled = false;
      resetFormFully();
      clearDraft();
      showToast(wasEditing ? 'Cambios guardados.' : (payload.kind === 'settlement' ? 'Pago agregado.' : 'Gasto agregado.'));
    }).catch(function (err) {
      submitBtnEl.disabled = false;
      console.error(err);
      setStatus('No se pudo guardar. Probá de nuevo.', true);
    });
  }

  function removeExpense(id) {
    if (!dbRef || !id) return;
    if (!isAuthorized()) {
      showToast('Necesitás conectarte con una cuenta autorizada para eliminar.', true);
      return;
    }
    var doc = docs.filter(function (d) { return d.id === id; })[0];
    if (!doc) return;
    var snapshot = {};
    Object.keys(doc).forEach(function (k) { if (k !== 'id') snapshot[k] = doc[k]; });
    if (id === editingId) resetFormFully();
    dbRef.child(id).remove().then(function () {
      showToast('Movimiento eliminado.', {
        actionLabel: 'Deshacer',
        duration: 5000,
        onAction: function () {
          dbRef.child(id).set(snapshot).catch(function (err) {
            console.error(err);
            showToast('No se pudo deshacer.', true);
          });
        }
      });
    }).catch(function (err) {
      console.error(err);
      showToast('No se pudo eliminar ese movimiento.', true);
    });
  }

  function updateSuggestions() {
    var seen = {};
    var list = [];
    docs.forEach(function (d) {
      var desc = (d.description || '').trim();
      if (desc && !seen[desc]) { seen[desc] = true; list.push(desc); }
    });
    list.sort(function (a, b) { return a.localeCompare(b, 'es'); });
    descSuggestionsEl.innerHTML = list.slice(0, 30).map(function (v) {
      return '<option value="' + escapeHtml(v) + '"></option>';
    }).join('');
  }

  function updateCategoryFilterOptions() {
    var present = {};
    docs.forEach(function (d) { if (d.category) present[d.category] = true; });
    var cats = Object.keys(present);
    var current = categoryFilterEl.value || 'all';
    var html = '<option value="all">Todas las categorías</option>' + cats.map(function (c) {
      return '<option value="' + c + '">' + escapeHtml(categoryLabel(c)) + '</option>';
    }).join('');
    if (categoryFilterEl.innerHTML !== html) {
      categoryFilterEl.innerHTML = html;
      categoryFilterEl.value = cats.indexOf(current) !== -1 || current === 'all' ? current : 'all';
    }
  }

  function matchesFilter(d) {
    if (activeCategory !== 'all' && d.category !== activeCategory) return false;
    if (activeFilter === 'all') return true;
    if (activeFilter === 'settlement') return d.kind === 'settlement';
    if (activeFilter === 'delfina') {
      return (d.kind !== 'settlement' && d.payer === 'delfina') ||
        (d.kind === 'settlement' && (d.from === 'delfina' || d.to === 'delfina'));
    }
    if (activeFilter === 'nicolas') {
      return (d.kind !== 'settlement' && d.payer === 'nicolas') ||
        (d.kind === 'settlement' && (d.from === 'nicolas' || d.to === 'nicolas'));
    }
    return true;
  }

  // ---------- CSV export ----------
  function csvEscape(v) {
    v = (v === undefined || v === null) ? '' : String(v);
    if (/[",\n;]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
    return v;
  }
  function exportCsv() {
    if (!docs.length) { showToast('No hay movimientos para exportar.', true); return; }
    var rows = [['Fecha', 'Tipo', 'Quién / Dirección', 'Categoría', 'Descripción', 'Moneda', 'Monto US$', 'Cotización', 'Monto ARS']];
    docs.slice().sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); }).forEach(function (d) {
      if (d.kind === 'settlement') {
        rows.push([
          d.date || '', 'Pago directo',
          (d.from === 'delfina' ? 'Delfina' : 'Nicolás') + ' → ' + (d.to === 'delfina' ? 'Delfina' : 'Nicolás'),
          '', d.description || '', d.currency || 'ARS',
          d.currency === 'USD' ? d.amountUsd : '', d.currency === 'USD' ? d.rate : '', d.amount
        ]);
      } else {
        rows.push([
          d.date || '', 'Gasto compartido', d.payer === 'delfina' ? 'Delfina' : 'Nicolás',
          d.category ? categoryLabel(d.category) : '', d.description || '', 'ARS', '', '', d.amount
        ]);
      }
    });
    var csv = rows.map(function (r) { return r.map(csvEscape).join(','); }).join('\r\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'gastos-compartidos-' + todayStr() + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ---------- Balance chart (SVG, sin librerías) ----------
  function renderBalanceChart(ascPoints) {
    if (ascPoints.length < 2) { chartWrapEl.hidden = true; return; }
    chartWrapEl.hidden = false;
    var w = 600, h = 70, pad = 4;
    var values = ascPoints.map(function (p) { return p.cum; });
    var min = Math.min(0, Math.min.apply(null, values));
    var max = Math.max(0, Math.max.apply(null, values));
    if (min === max) { min -= 1; max += 1; }
    var xStep = ascPoints.length > 1 ? (w - pad * 2) / (ascPoints.length - 1) : 0;
    function xAt(i) { return pad + i * xStep; }
    function yAt(v) { return h - pad - ((v - min) / (max - min)) * (h - pad * 2); }
    var path = ascPoints.map(function (p, i) {
      return (i === 0 ? 'M' : 'L') + xAt(i).toFixed(1) + ',' + yAt(p.cum).toFixed(1);
    }).join(' ');
    var zeroY = yAt(0).toFixed(1);
    chartHolderEl.innerHTML =
      '<svg viewBox="0 0 ' + w + ' ' + h + '" class="balance-chart" preserveAspectRatio="none">' +
        '<line x1="' + pad + '" y1="' + zeroY + '" x2="' + (w - pad) + '" y2="' + zeroY + '" class="chart-zero" />' +
        '<path d="' + path + '" class="chart-line" fill="none" />' +
      '</svg>';
  }

  // ---------- Rendering ----------
  function rowHtml(d) {
    var dateLabel = d.date ? dfmt.format(parseLocalDate(d.date)) : '';
    var receiptBtn = d.receiptData
      ? '<button type="button" class="row-edit receipt-btn" data-receipt="' + d.id + '" aria-label="Ver ticket" title="Ver ticket">📷</button>'
      : '';
    var actions =
      '<div class="row-actions">' + receiptBtn +
        '<button class="row-edit" data-id="' + d.id + '" aria-label="Editar movimiento">✎</button>' +
        '<button class="row-del" data-id="' + d.id + '" aria-label="Eliminar movimiento">×</button>' +
      '</div>';

    if (d.kind === 'settlement') {
      var fromLabel = d.from === 'delfina' ? 'Delfina' : 'Nicolás';
      var toLabel = d.to === 'delfina' ? 'Delfina' : 'Nicolás';
      var note = d.description ? d.description : 'Pago directo';
      var metaBits = [escapeHtml(note)];
      if (d.currency === 'USD') {
        metaBits.push(usdFmt.format(Math.round(d.amountUsd)) + ' a ' + money(d.rate) + '/US$' + (d.dolarCasa ? ' (' + casaLabel(d.dolarCasa) + ')' : ''));
      }
      if (dateLabel) metaBits.push(dateLabel);
      return (
        '<div class="row" data-id="' + d.id + '">' +
          '<span class="tag settlement">→</span>' +
          '<div class="row-main">' +
            '<div class="row-desc">' + fromLabel + ' → ' + toLabel + '</div>' +
            '<div class="row-meta">' + metaBits.join(' · ') + '</div>' +
          '</div>' +
          '<span class="row-amt">' + money(d.amount) + '</span>' +
          actions +
        '</div>'
      );
    }

    var payerLabel = d.payer === 'delfina' ? 'Delfina' : 'Nicolás';
    var desc = d.description ? d.description : 'Sin descripción';
    var metaBits2 = [payerLabel];
    if (d.category) metaBits2.push(categoryLabel(d.category));
    if (dateLabel) metaBits2.push(dateLabel);
    return (
      '<div class="row" data-id="' + d.id + '">' +
        '<span class="tag ' + d.payer + '"></span>' +
        '<div class="row-main">' +
          '<div class="row-desc">' + escapeHtml(desc) + '</div>' +
          '<div class="row-meta">' + metaBits2.join(' · ') + '</div>' +
        '</div>' +
        '<span class="row-amt">' + money(d.amount) + '</span>' +
        actions +
      '</div>'
    );
  }

  function render() {
    var totalDelfina = 0, totalNicolas = 0;
    var asc = docs.slice().sort(function (a, b) {
      if (a.date !== b.date) return (a.date || '') < (b.date || '') ? -1 : 1;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
    var cum = 0;
    var closingByMonth = {};
    var chartPoints = [];
    asc.forEach(function (d) {
      var amt = Number(d.amount) || 0;
      if (d.kind === 'settlement') {
        if (d.from === 'delfina') cum += amt;
        else if (d.from === 'nicolas') cum -= amt;
      } else {
        if (d.payer === 'delfina') { totalDelfina += amt; cum += amt / 2; }
        else if (d.payer === 'nicolas') { totalNicolas += amt; cum -= amt / 2; }
      }
      var mk = (d.date || '').slice(0, 7);
      if (mk) closingByMonth[mk] = cum;
      chartPoints.push({ cum: cum });
    });
    var net = cum;
    lastNet = net;
    statDelfinaEl.textContent = money(totalDelfina);
    statNicolasEl.textContent = money(totalNicolas);
    renderBalanceChart(chartPoints);

    balanceLineEl.classList.remove('owes-delfina', 'owes-nicolas', 'settled');
    if (!loaded) {
      balanceLineEl.textContent = 'Conectando…';
    } else if (Math.abs(net) < 1) {
      balanceLineEl.classList.add('settled');
      balanceLineEl.textContent = 'Están a mano';
    } else if (net > 0) {
      balanceLineEl.classList.add('owes-delfina');
      balanceLineEl.innerHTML = 'Nicolás le debe <span class="amt">' + money(net) + '</span> a Delfina';
    } else {
      balanceLineEl.classList.add('owes-nicolas');
      balanceLineEl.innerHTML = 'Delfina le debe <span class="amt">' + money(-net) + '</span> a Nicolás';
    }

    updateSuggestions();
    updateCategoryFilterOptions();

    if (!loaded) {
      ledgerEl.innerHTML = '<div class="empty">Conectando…</div>';
      return;
    }
    if (docs.length === 0) {
      ledgerEl.innerHTML = '<div class="empty">Todavía no cargaron ningún movimiento.<br>Sumá el primero desde el formulario.</div>';
      return;
    }

    var visible = docs.filter(matchesFilter);
    if (visible.length === 0) {
      ledgerEl.innerHTML = '<div class="empty">No hay movimientos para este filtro.</div>';
      return;
    }

    var byMonth = {};
    visible.forEach(function (d) {
      var mk = (d.date || '').slice(0, 7) || 'sin-fecha';
      if (!byMonth[mk]) byMonth[mk] = [];
      byMonth[mk].push(d);
    });
    var monthKeys = Object.keys(byMonth).sort().reverse();
    monthKeys.forEach(function (mk, i) {
      if (!(mk in expandedMonths)) expandedMonths[mk] = (i === 0);
    });

    var html = monthKeys.map(function (mk) {
      var groupDocs = byMonth[mk].slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      var label = mk === 'sin-fecha' ? 'Sin fecha' : monthLabel(mk);
      var closing = closingLabel(closingByMonth[mk] || 0);
      var rowsHtml = groupDocs.map(rowHtml).join('');
      var expanded = !!expandedMonths[mk];
      return (
        '<div class="month-group' + (expanded ? ' expanded' : '') + '" data-month="' + mk + '">' +
          '<button type="button" class="month-toggle" data-month="' + mk + '">' +
            '<span class="month-toggle-left">' +
              '<span class="month-name">' + label + '</span>' +
              '<span class="month-count">' + groupDocs.length + (groupDocs.length === 1 ? ' movimiento' : ' movimientos') + '</span>' +
            '</span>' +
            '<span class="month-toggle-right">' +
              '<span class="month-closing ' + closing.cls + '">' + closing.text + '</span>' +
              '<span class="chevron">▶</span>' +
            '</span>' +
          '</button>' +
          '<div class="month-rows">' + rowsHtml + '</div>' +
        '</div>'
      );
    }).join('');
    ledgerEl.innerHTML = html;

    ledgerEl.querySelectorAll('.month-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mk = btn.getAttribute('data-month');
        expandedMonths[mk] = !expandedMonths[mk];
        var group = btn.closest('.month-group');
        if (group) group.classList.toggle('expanded', expandedMonths[mk]);
      });
    });
    ledgerEl.querySelectorAll('.row-del').forEach(function (btn) {
      btn.addEventListener('click', function () { removeExpense(btn.getAttribute('data-id')); });
    });
    ledgerEl.querySelectorAll('.row-edit:not(.receipt-btn)').forEach(function (btn) {
      btn.addEventListener('click', function () { startEdit(btn.getAttribute('data-id')); });
    });
    ledgerEl.querySelectorAll('.receipt-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var d = docs.filter(function (x) { return x.id === btn.getAttribute('data-receipt'); })[0];
        if (d && d.receiptData) window.open(d.receiptData, '_blank');
      });
    });
  }

  // ---------- Event wiring ----------
  payerButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectedPayer = btn.getAttribute('data-payer');
      payerButtons.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      saveDraft();
    });
  });

  directionButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectedDirection = btn.getAttribute('data-direction');
      directionButtons.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      saveDraft();
    });
  });

  currencyButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectedCurrency = btn.getAttribute('data-currency');
      amountEl.value = '';
      rateEl.value = '';
      rateAutoFilled = false;
      setUiForCurrency(selectedCurrency);
      saveDraft();
    });
  });

  modeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectedMode = btn.getAttribute('data-mode');
      setUiForMode(selectedMode);
      submitBtnEl.textContent = editingId ? 'Guardar cambios' : (selectedMode === 'settlement' ? 'Agregar pago' : 'Agregar gasto');
      if (selectedMode === 'settlement' && !editingId) {
        if (Math.abs(lastNet) > 0.5 && selectedCurrency === 'ARS') {
          var debtor = lastNet > 0 ? 'nicolas' : 'delfina';
          var creditor = lastNet > 0 ? 'delfina' : 'nicolas';
          selectDirection(debtor + '-' + creditor);
          if (!amountEl.value) amountEl.value = Math.abs(lastNet).toFixed(2).replace(/\.00$/, '');
          settlementHintEl.hidden = false;
        } else {
          settlementHintEl.hidden = true;
        }
      } else {
        settlementHintEl.hidden = true;
      }
      setStatus('');
      saveDraft();
    });
  });

  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      activeFilter = btn.getAttribute('data-filter');
      filterButtons.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      render();
    });
  });

  categoryFilterEl.addEventListener('change', function () {
    activeCategory = categoryFilterEl.value;
    render();
  });

  exportCsvBtn.addEventListener('click', exportCsv);

  fabBtn.addEventListener('click', function () {
    formCardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () { amountEl.focus(); }, 300);
  });

  dolarCasaEl.addEventListener('change', function () { autoFetchRate(); saveDraft(); });
  dateEl.addEventListener('change', function () {
    if (selectedMode === 'settlement' && selectedCurrency === 'USD') autoFetchRate();
    saveDraft();
  });
  refreshRateBtn.addEventListener('click', autoFetchRate);
  amountEl.addEventListener('input', function () {
    if (selectedMode === 'settlement' && selectedCurrency === 'USD') renderRateHint();
    saveDraft();
  });
  rateEl.addEventListener('input', function () {
    rateAutoFilled = false;
    if (selectedMode === 'settlement' && selectedCurrency === 'USD') renderRateHint();
    saveDraft();
  });
  descEl.addEventListener('input', saveDraft);
  categoryEl.addEventListener('change', saveDraft);

  cancelEditBtn.addEventListener('click', function () {
    resetFormFully();
    setStatus('');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    addExpense();
  });

  // ---------- PWA ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  // ---------- Boot ----------
  populateCategorySelect();
  dateEl.value = todayStr();
  resetFormFully();
  loadDraft();
  initTheme();
  initGate();
})();
