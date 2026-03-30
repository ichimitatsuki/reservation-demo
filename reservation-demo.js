/**
 * 予約デモ PoC（単体動作・既存LPのJSとは読み込まないため干渉なし）
 */
(function () {
  'use strict';

  function data() {
    return window.RESERVATION_DATA;
  }

  var WEEKDAY_JP = ['日', '月', '火', '水', '木', '金', '土'];

  var state = {
    storeId: null,
    selectedDate: null,
    dayOfWeek: null,
    lesson: null,
    name: '',
    tel: ''
  };

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function toYMD(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function parseYMD(ymd) {
    var p = String(ymd).split('-');
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  }

  function formatDateShortJa(d) {
    return (d.getMonth() + 1) + '/' + d.getDate() + '（' + WEEKDAY_JP[d.getDay()] + '）';
  }

  function formatDateLongJa(ymd) {
    var d = parseYMD(ymd);
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日（' + WEEKDAY_JP[d.getDay()] + '）';
  }

  function isClosedDateForStore(d, storeId) {
    if (!storeId) return false;
    var w = d.getDay();
    if (storeId === 'meieki' && w === 1) return true;
    if (storeId === 'sakae' && w === 5) return true;
    return false;
  }

  function lessonEqual(a, b) {
    if (!a || !b) return false;
    return a.time === b.time && a.name === b.name;
  }

  function setNext2Enabled(on) {
    var el = document.getElementById('rv-next-2');
    if (el) el.disabled = !on;
  }

  function setNext3Enabled(on) {
    var el = document.getElementById('rv-next-3');
    if (el) el.disabled = !on;
  }

  var STEP_COUNT = 6;

  function getCurrentStep() {
    var el = document.querySelector('.rv-step.is-current');
    return el ? parseInt(el.getAttribute('data-step'), 10) : 1;
  }

  function goToStep(stepNum) {
    var n = Math.max(1, Math.min(STEP_COUNT, stepNum));
    document.querySelectorAll('.rv-step').forEach(function (section) {
      section.classList.toggle('is-current', parseInt(section.getAttribute('data-step'), 10) === n);
    });
    if (n === 2) {
      renderDateOptions();
      setNext2Enabled(!!state.selectedDate);
    }
    if (n === 3) renderLessonList();
    if (n === 6) renderSummaryAndLineLink();
  }

  function renderStoreOptions() {
    var container = document.getElementById('rv-store-options');
    if (!container) return;
    container.innerHTML = '';
    var stores = data().getStores();
    Object.keys(stores).forEach(function (id) {
      var s = stores[id];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rv-option-btn';
      btn.setAttribute('data-store-id', id);
      btn.textContent = s.name;
      btn.addEventListener('click', function () {
        container.querySelectorAll('.rv-option-btn').forEach(function (b) { b.classList.remove('is-selected'); });
        btn.classList.add('is-selected');
        state.storeId = id;
        state.selectedDate = null;
        state.dayOfWeek = null;
        state.lesson = null;
        setNext2Enabled(false);
        goToStep(2);
      });
      container.appendChild(btn);
    });
  }

  function renderDateOptions() {
    var container = document.getElementById('rv-date-options');
    if (!container) return;
    container.innerHTML = '';
    var start = new Date();
    start.setHours(0, 0, 0, 0);
    var i;
    for (i = 0; i < 14; i++) {
      var d = new Date(start.getTime());
      d.setDate(start.getDate() + i);
      var ymd = toYMD(d);
      var isClosed = isClosedDateForStore(d, state.storeId);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rv-option-btn rv-option-btn--date';
      btn.setAttribute('data-date', ymd);
      if (isClosed) {
        btn.disabled = true;
        btn.classList.add('is-disabled');
        btn.textContent = formatDateShortJa(d) + ' 定休日';
      } else {
        btn.textContent = formatDateShortJa(d);
        if (state.selectedDate === ymd) {
          btn.classList.add('is-selected');
        }
        btn.addEventListener('click', function (ev) {
          var target = ev.currentTarget;
          var dateStr = target.getAttribute('data-date');
          var picked = parseYMD(dateStr);
          var prev = state.selectedDate;
          container.querySelectorAll('.rv-option-btn').forEach(function (b) {
            if (!b.disabled) b.classList.remove('is-selected');
          });
          target.classList.add('is-selected');
          state.selectedDate = dateStr;
          state.dayOfWeek = picked.getDay();
          if (prev !== dateStr) {
            state.lesson = null;
          }
          setNext2Enabled(true);
        });
      }
      container.appendChild(btn);
    }
  }

  function renderLessonList() {
    var sub = document.getElementById('rv-lesson-step-sub');
    var list = document.getElementById('rv-lesson-list');
    if (!sub || !list) return;
    var storeName = data().getStoreName(state.storeId);
    var datePart = state.selectedDate ? formatDateShortJa(parseYMD(state.selectedDate)) : '';
    sub.textContent = storeName + '・' + datePart + 'のレッスン';
    list.innerHTML = '';
    var lessons = data().getLessons(state.storeId, state.dayOfWeek);
    var inList = lessons.some(function (l) {
      return lessonEqual(state.lesson, l);
    });
    if (state.lesson && !inList) {
      state.lesson = null;
    }

    var hasSelectedLesson = false;
    lessons.forEach(function (l) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rv-lesson-btn';
      if (lessonEqual(state.lesson, l)) {
        btn.classList.add('is-selected');
        hasSelectedLesson = true;
      }
      btn.innerHTML = '<span class="rv-lesson-time">' + escapeHtml(l.time) + '</span>' + escapeHtml(l.name);
      btn.addEventListener('click', function () {
        list.querySelectorAll('.rv-lesson-btn').forEach(function (b) { b.classList.remove('is-selected'); });
        btn.classList.add('is-selected');
        state.lesson = l;
        setNext3Enabled(true);
      });
      list.appendChild(btn);
    });
    setNext3Enabled(hasSelectedLesson && state.lesson != null);
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function buildLinePasteMessage() {
    var storeName = data().getStoreName(state.storeId);
    var visitLine = state.selectedDate ? formatDateLongJa(state.selectedDate) : '';
    var lesson = state.lesson;
    var time = lesson ? lesson.time : '';
    var lessonName = lesson ? lesson.name : '';
    var lessonLine = lessonName + (time ? ' ' + time : '');
    return (
      '[体験レッスン仮予約]\n' +
      '店舗：' + storeName + '\n' +
      '来店希望日：' + visitLine + '\n' +
      '希望レッスン：' + lessonLine + '\n' +
      'お名前：' + (state.name || '') + '\n' +
      '電話番号：' + (state.tel || '')
    );
  }

  /** LINE公式のチャット起動（oaMessage）が実用的なのは主にスマートフォン */
  function canUseLineOaDeepLink() {
    var ua = navigator.userAgent || '';
    if (/Android|iPhone|iPod/i.test(ua)) return true;
    if (/iPad/i.test(ua)) return true;
    if (typeof navigator.platform === 'string' && /iPad/.test(navigator.platform)) return true;
    try {
      if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
    } catch (e) { /* ignore */ }
    return false;
  }

  function renderSummaryAndLineLink() {
    var el = document.getElementById('rv-summary');
    var link = document.getElementById('rv-line-link');
    var sub = document.getElementById('rv-line-friend-sub');
    var hint = document.querySelector('.rv-line-send-hint');
    if (!el || !link) return;
    var storeName = data().getStoreName(state.storeId);
    var visitVal = state.selectedDate ? formatDateLongJa(state.selectedDate) : '';
    var lesson = state.lesson;
    var rows = [
      { label: '店舗', value: storeName },
      { label: '来店希望日', value: visitVal },
      { label: '希望レッスン', value: lesson ? lesson.name + ' ' + lesson.time : '' },
      { label: 'お名前', value: state.name },
      { label: '電話番号', value: state.tel }
    ];
    var dl = document.createElement('dl');
    rows.forEach(function (r) {
      var dt = document.createElement('dt');
      dt.textContent = r.label;
      var dd = document.createElement('dd');
      dd.textContent = r.value;
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
    el.innerHTML = '';
    var title = document.createElement('p');
    title.className = 'rv-summary-title';
    title.textContent = 'ご予約内容';
    el.appendChild(title);
    el.appendChild(dl);
    var msg = buildLinePasteMessage();
    var useLineApp = canUseLineOaDeepLink();
    if (useLineApp && typeof data().buildOaMessageHref === 'function') {
      link.href = data().buildOaMessageHref(msg);
      link.textContent = 'LINEで仮予約を完了する';
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      if (hint) hint.textContent = 'LINEを開いたらそのまま送信';
    } else {
      link.href = 'reservation-pc-line.html';
      link.textContent = 'LINEお友だち追加';
      link.setAttribute('target', '_self');
      link.removeAttribute('rel');
      if (hint) {
        hint.innerHTML = 'PC版LINEでは送信まで進めません。<br>下のボタンからQRをご確認ください。';
      }
    }
    if (sub && typeof data().getLineUrl === 'function') {
      sub.href = useLineApp
        ? (data().getLineUrl(state.storeId) || 'https://lin.ee/sQ5iTts')
        : 'reservation-pc-line.html';
    }
  }

  function bindNavigation() {
    var back2 = document.getElementById('rv-back-2');
    if (back2) back2.addEventListener('click', function () { goToStep(1); });
    var next2 = document.getElementById('rv-next-2');
    if (next2) {
      next2.addEventListener('click', function () {
        if (state.selectedDate) goToStep(3);
      });
    }
    var back3 = document.getElementById('rv-back-3');
    if (back3) back3.addEventListener('click', function () { goToStep(2); });
    var next3 = document.getElementById('rv-next-3');
    if (next3) {
      next3.addEventListener('click', function () {
        if (state.lesson) goToStep(4);
      });
    }
    document.getElementById('rv-back-4').addEventListener('click', function () { goToStep(3); });
    document.getElementById('rv-next-4').addEventListener('click', function () {
      var input = document.getElementById('rv-input-name');
      if (input && input.value.trim()) {
        state.name = input.value.trim();
        goToStep(5);
      }
    });
    document.getElementById('rv-back-5').addEventListener('click', function () { goToStep(4); });
    document.getElementById('rv-submit').addEventListener('click', function () {
      var input = document.getElementById('rv-input-tel');
      if (input && input.value.trim()) {
        state.tel = input.value.trim();
        goToStep(6);
      }
    });

    var reset = document.getElementById('rv-reset-demo');
    if (reset) {
      reset.addEventListener('click', function () {
        state.storeId = null;
        state.selectedDate = null;
        state.dayOfWeek = null;
        state.lesson = null;
        state.name = '';
        state.tel = '';

        setNext2Enabled(false);
        setNext3Enabled(false);

        var nameInput = document.getElementById('rv-input-name');
        if (nameInput) nameInput.value = '';
        var telInput = document.getElementById('rv-input-tel');
        if (telInput) telInput.value = '';

        var summary = document.getElementById('rv-summary');
        if (summary) summary.innerHTML = '';

        renderStoreOptions();
        goToStep(1);
      });
    }
  }

  function injectStepProgress() {
    document.querySelectorAll('.rv-step').forEach(function (section) {
      var step = parseInt(section.getAttribute('data-step'), 10);
      if (isNaN(step) || section.querySelector('.rv-progress')) return;
      var title = section.querySelector('.rv-step-title');
      if (!title || !title.parentNode) return;
      var wrap = document.createElement('div');
      wrap.className = 'rv-progress';
      wrap.setAttribute('aria-label', 'ステップ進行状況');
      var i;
      for (i = 1; i <= 6; i++) {
        var dot = document.createElement('span');
        dot.className = 'rv-dot' + (i === step ? ' is-active' : '');
        dot.setAttribute('aria-hidden', 'true');
        wrap.appendChild(dot);
      }
      title.parentNode.insertBefore(wrap, title.nextSibling);
    });
  }

  function init() {
    injectStepProgress();
    renderStoreOptions();
    bindNavigation();
  }

  function onScheduleUpdated() {
    var step = getCurrentStep();
    if (step === 3) renderLessonList();
    if (step === 6) renderSummaryAndLineLink();
  }

  function startApp() {
    if (!data()) {
      console.error('reservation-data.js を先に読み込んでください');
      return;
    }
    init();
    document.addEventListener('reservationDataUpdated', onScheduleUpdated);
  }

  function kickOff() {
    if (!data()) {
      document.addEventListener('reservationDataReady', kickOff, { once: true });
      return;
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startApp, { once: true });
    } else {
      startApp();
    }
  }

  kickOff();
})();
