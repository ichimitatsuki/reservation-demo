/**
 * reservation-data.js
 * Googleスプレッドシートからスケジュールを取得し、フォームに提供する。
 * 取得失敗時はフォールバックデータを使用。
 *
 * ■ スケジュール更新方法
 *   Googleスプレッドシート「sola_schedule」の各シートを編集するだけ。
 *   このファイルは触らなくてOK。
 *
 * ■ LINE OA ID: @pif1465v（両店舗共通）
 *   本番切り替え時は LINE_OA_BASIC_ID を変更してください。
 */
(function (global) {
  'use strict';

  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyxVCDkEzMcvIjHURasgERlIthy3vjNNW31pdbuJA86veWi6z8NsGovTKarjUwCbwe9OQ/exec';
  var LINE_OA_BASIC_ID = '@pif1465v';
  var LINE_URL = 'https://lin.ee/sQ5iTts';

  var STORES = {
    meieki: { id: 'meieki', name: '名駅店', lineUrl: LINE_URL },
    sakae:  { id: 'sakae',  name: '栄店',  lineUrl: LINE_URL }
  };

  var DAYS = [
    { value: 0, label: '日曜日' }, { value: 1, label: '月曜日' },
    { value: 2, label: '火曜日' }, { value: 3, label: '水曜日' },
    { value: 4, label: '木曜日' }, { value: 5, label: '金曜日' },
    { value: 6, label: '土曜日' }
  ];

  // ── フォールバックデータ（スプレッドシート取得失敗時に使用） ──
  var FALLBACK_LESSONS = {
    meieki: {
      0: [{ time: '09:40', name: 'リラックス' }, { time: '11:20', name: '疲労回復' }, { time: '13:00', name: '太陽礼拝フロー' }],
      1: [],
      2: [{ time: '09:30', name: 'リラックス' }, { time: '11:30', name: 'リフレッシュ' }, { time: '18:10', name: 'スタイルアップ' }, { time: '19:50', name: 'リラックス' }, { time: '21:10', name: '疲労回復' }],
      3: [{ time: '09:30', name: '初級 マットピラティス' }, { time: '11:30', name: '肩甲骨ヨガ' }, { time: '18:10', name: 'ブリージング' }, { time: '19:50', name: '骨盤調整' }, { time: '21:10', name: '睡眠のためのヨガ（30分）' }],
      4: [{ time: '09:30', name: 'トータルケアヨガ' }, { time: '11:30', name: '太陽礼拝フロー' }, { time: '18:10', name: 'トータルケアヨガ' }, { time: '19:50', name: '骨盤調整' }, { time: '21:10', name: 'ヒーリング' }],
      5: [{ time: '09:30', name: '骨盤リラックス' }, { time: '11:30', name: 'シェイプ' }, { time: '18:10', name: 'デトックス' }, { time: '19:50', name: '脂肪燃焼' }],
      6: [{ time: '08:00', name: '整体ヨガ' }, { time: '09:40', name: '代謝UP' }, { time: '11:20', name: '骨盤調整' }, { time: '13:00', name: 'コアヨガ' }, { time: '14:30', name: 'トータルケアヨガ' }]
    },
    sakae: {
      0: [{ time: '10:00', name: '太陽礼拝フロー' }, { time: '11:40', name: 'お腹シェイプ' }, { time: '13:20', name: '骨盤調整' }, { time: '14:50', name: 'リフレッシュ' }, { time: '16:30', name: '肩甲骨ヨガ' }],
      1: [{ time: '10:30', name: 'リフレッシュ' }, { time: '12:30', name: 'デトックス' }, { time: '14:10', name: 'リラックス' }, { time: '18:10', name: '太陽礼拝フロー' }, { time: '19:50', name: '骨盤リラックス' }, { time: '21:10', name: 'ナイトヨガ' }],
      2: [{ time: '10:30', name: 'ブリージング' }, { time: '12:30', name: '脂肪燃焼' }, { time: '14:10', name: 'マットピラティス' }, { time: '17:40', name: 'ハタヨガベーシック' }, { time: '18:40', name: 'ヒーリング' }, { time: '19:40', name: '太陽礼拝フロー' }],
      3: [{ time: '10:30', name: 'リフレッシュ' }, { time: '12:30', name: '骨盤リラックス' }, { time: '14:10', name: 'スタイルアップ' }, { time: '18:10', name: 'リフレッシュ' }, { time: '19:50', name: 'デトックス' }],
      4: [{ time: '10:30', name: '太陽礼拝フロー' }, { time: '12:30', name: '整体ヨガ' }, { time: '14:10', name: 'むくみ改善ヨガ' }, { time: '17:40', name: 'マットピラティス' }, { time: '18:40', name: '美ボディ' }, { time: '19:40', name: '骨盤調整' }, { time: '21:10', name: 'リラックス' }],
      5: [],
      6: [{ time: '08:30', name: '太陽礼拝フロー' }, { time: '10:00', name: 'デトックス' }, { time: '11:40', name: 'リセットヨガ' }, { time: '13:20', name: 'スタイルアップ' }, { time: '14:50', name: '骨盤リラックス' }, { time: '16:30', name: 'トータルケアヨガ' }, { time: '18:00', name: 'リラックス' }]
    }
  };

  // ── 公開インターフェースを生成 ────────────────────────────
  function buildInterface(lessons) {
    return {
      getStores: function () { return STORES; },
      getDays: function () { return DAYS; },
      getStoreName: function (storeId) { return STORES[storeId] ? STORES[storeId].name : ''; },
      getLineUrl: function (storeId) { return STORES[storeId] ? STORES[storeId].lineUrl : LINE_URL; },
      getLessons: function (storeId, dayOfWeek) {
        if (!lessons[storeId]) return [];
        return lessons[storeId][String(dayOfWeek)] || lessons[storeId][dayOfWeek] || [];
      },
      buildOaMessageHref: function (msg) {
        return 'https://line.me/R/oaMessage/' + LINE_OA_BASIC_ID + '/?' + encodeURIComponent(msg || '');
      },
      getLineOaBasicId: function () { return LINE_OA_BASIC_ID; }
    };
  }

  // ── フォールバックで即座に初期化（ボタンを必ず表示） ────
  global.RESERVATION_DATA = buildInterface(FALLBACK_LESSONS);
  document.dispatchEvent(new Event('reservationDataReady'));

  // ── バックグラウンドでスプレッドシートを取得・サイレント更新（JSONP） ────
  // fetchはiOS Safariでブロックされることがあるため、scriptタグ方式（JSONP）を使用
  // CORSの制限を受けずiOS含む全ブラウザで動作する
  global._solaCallback = function (data) {
    global.RESERVATION_DATA = buildInterface(data);
    delete global._solaCallback;
  };
  var s = document.createElement('script');
  s.src = APPS_SCRIPT_URL + '?callback=_solaCallback&t=' + Date.now();
  s.onerror = function () { delete global._solaCallback; }; // 失敗時はフォールバックのまま
  document.head.appendChild(s);

})(typeof window !== 'undefined' ? window : this);
