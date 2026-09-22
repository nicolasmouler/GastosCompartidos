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

  var form = document.getElementById('expenseForm');
  var formCardEl = document.getElementById('formCard');
  var amountEl = document.getElementById('amount');
  var amountLabelEl = document.getElementById('amountLabel');
  var dateEl = document.getElementById('date');
  var descEl = document.getElementById('description');
  var descSuggestionsEl = document.getElementById('descSuggestions');
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
  var expandedMonths = {};
  var dbRef = null;
  var docs = [];
  var loaded = false;
  var lastNet = 0; // > 0: Nicolás owes Delfina. < 0: Delfina owes Nicolás.
  var editingId = null;
  var editingCreatedAt = null;

  var CASA_LABELS = { blue: 'Blue', oficial: 'Oficial', bolsa: 'MEP', contadoconliqui: 'CCL', mayorista: 'Mayorista', cripto: 'Cripto' };
  function casaLabel(casa) { return CASA_LABELS[casa] || casa; }

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
  function showToast(msg, isError) {
    var el = document.createElement('div');
    el.className = 'toast' + (isError ? ' error' : '');
    el.textContent = msg;
    toastStackEl.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 200);
    }, 2400);
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
  }

  // ---------- Mode / currency UI ----------
  function setUiForMode(mode) {
    modeButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-mode') === mode ? 'true' : 'false');
    });
    if (mode === 'settlement') {
      payerToggleEl.hidden = true;
      directionToggleEl.hidden = false;
      currencyToggleEl.hidden = false;
      descEl.placeholder = 'Transferencia, efectivo, Mercado Pago… (opcional)';
    } else {
      payerToggleEl.hidden = false;
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

  // ---------- Form actions ----------
  function resetFormFully() {
    editingId = null;
    editingCreatedAt = null;
    form.reset();
    dateEl.value = todayStr();
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
    editingId = id;
    editingCreatedAt = doc.createdAt || Date.now();
    settlementHintEl.hidden = true;

    if (doc.kind === 'settlement') {
      selectedMode = 'settlement';
      setUiForMode('settlement');
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
      selectedPayer = doc.payer;
      payerButtons.forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-payer') === doc.payer ? 'true' : 'false');
      });
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
      payload = { kind: 'expense', payer: selectedPayer, amount: amount, description: description, date: date };
    }

    var wasEditing = !!editingId;
    payload.createdAt = wasEditing ? (editingCreatedAt || Date.now()) : Date.now();

    submitBtnEl.disabled = true;
    setStatus('');

    var writeOp = wasEditing ? dbRef.child(editingId).set(payload) : dbRef.push(payload);

    writeOp.then(function () {
      submitBtnEl.disabled = false;
      resetFormFully();
      showToast(wasEditing ? 'Cambios guardados.' : (payload.kind === 'settlement' ? 'Pago agregado.' : 'Gasto agregado.'));
    }).catch(function (err) {
      submitBtnEl.disabled = false;
      console.error(err);
      setStatus('No se pudo guardar. Probá de nuevo.', true);
    });
  }

  function removeExpense(id) {
    if (!dbRef || !id) return;
    if (id === editingId) resetFormFully();
    dbRef.child(id).remove().catch(function (err) {
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

  function matchesFilter(d) {
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

  // ---------- Rendering ----------
  function rowHtml(d) {
    var dateLabel = d.date ? dfmt.format(parseLocalDate(d.date)) : '';
    var actions =
      '<div class="row-actions">' +
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
    return (
      '<div class="row" data-id="' + d.id + '">' +
        '<span class="tag ' + d.payer + '"></span>' +
        '<div class="row-main">' +
          '<div class="row-desc">' + escapeHtml(desc) + '</div>' +
          '<div class="row-meta">' + payerLabel + (dateLabel ? ' · ' + dateLabel : '') + '</div>' +
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
    });
    var net = cum;
    lastNet = net;
    statDelfinaEl.textContent = money(totalDelfina);
    statNicolasEl.textContent = money(totalNicolas);

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
    ledgerEl.querySelectorAll('.row-edit').forEach(function (btn) {
      btn.addEventListener('click', function () { startEdit(btn.getAttribute('data-id')); });
    });
  }

  // ---------- Event wiring ----------
  payerButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectedPayer = btn.getAttribute('data-payer');
      payerButtons.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
    });
  });

  directionButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectedDirection = btn.getAttribute('data-direction');
      directionButtons.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
    });
  });

  currencyButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectedCurrency = btn.getAttribute('data-currency');
      amountEl.value = '';
      rateEl.value = '';
      rateAutoFilled = false;
      setUiForCurrency(selectedCurrency);
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
    });
  });

  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      activeFilter = btn.getAttribute('data-filter');
      filterButtons.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      render();
    });
  });

  dolarCasaEl.addEventListener('change', autoFetchRate);
  dateEl.addEventListener('change', function () {
    if (selectedMode === 'settlement' && selectedCurrency === 'USD') autoFetchRate();
  });
  refreshRateBtn.addEventListener('click', autoFetchRate);
  amountEl.addEventListener('input', function () {
    if (selectedMode === 'settlement' && selectedCurrency === 'USD') renderRateHint();
  });
  rateEl.addEventListener('input', function () {
    rateAutoFilled = false;
    if (selectedMode === 'settlement' && selectedCurrency === 'USD') renderRateHint();
  });

  cancelEditBtn.addEventListener('click', function () {
    resetFormFully();
    setStatus('');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    addExpense();
  });

  // ---------- Boot ----------
  dateEl.value = todayStr();
  resetFormFully();
  initTheme();
  initGate();
})();
