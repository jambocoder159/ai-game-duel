'use strict';

(function () {
  var rounds = {
    r1: {
      note: '第一回合：GPT-6.2 Astra 自己生 5 張圖並寫出《夕陽郵航》，Claude Fable 5.2 只拿同一組素材、沒看 Astra 的程式，寫出《柑仔的晚霞航空信》。',
      labels: { astra: '夕陽郵航', fable: '晚霞航空信' },
      versions: {
        astra: {
          src: 'versions/astra/index.html',
          iframeTitle: '夕陽郵航，GPT-6.2 Astra 做的遊戲',
          stats: 'GPT-6.2 Astra　生圖加寫程式　｜　13 分 44 秒　｜　game.js 262 行　｜　介入 1 次'
        },
        fable: {
          src: 'versions/fable/index.html',
          iframeTitle: '柑仔的晚霞航空信，Claude Fable 5.2 做的遊戲',
          stats: 'Claude Fable 5.2　只用同一組素材寫程式　｜　6 分 35 秒　｜　game.js 665 行　｜　介入 0 次'
        }
      }
    },
    r2: {
      note: '第二回合：同一份題目《Lantern Drift》天燈漂流，兩邊都照 GG-skills v4.0 技能包從零做（React 19 + TypeScript、四語、預載與 fallback）。時限各 45 分鐘，Fable 跑到 47 分鐘上限被停下，我介入 1 次請它收尾。Fable 沒有生圖工具，它的圖是透過 Codex 呼叫 GPT 圖片生成畫的。',
      labels: { astra: 'GPT-6.2 Astra', fable: 'Claude Fable 5.2' },
      versions: {
        astra: {
          src: 'versions/r2-astra/index.html',
          iframeTitle: 'Lantern Drift 天燈漂流，GPT-6.2 Astra 做的版本',
          stats: 'GPT-6.2 Astra　木刻套色畫風、自己生圖　｜　42 分 11 秒　｜　src 1,473 行　｜　介入 0 次'
        },
        fable: {
          src: 'versions/r2-fable/index.html',
          iframeTitle: 'Lantern Drift 天燈漂流，Claude Fable 5.2 做的版本',
          stats: 'Claude Fable 5.2　分層剪紙畫風、圖由 GPT 生成　｜　撞到 47 分上限，收尾再 3 分　｜　src 1,947 行　｜　介入 1 次'
        }
      }
    }
  };

  var roundTabs = Array.prototype.slice.call(document.querySelectorAll('[data-round]'));
  var versionTabs = Array.prototype.slice.call(document.querySelectorAll('[data-version]'));
  var roundPanel = document.getElementById('round-panel');
  var note = document.getElementById('round-note');
  var iframe = document.getElementById('play-frame');
  var stats = document.getElementById('version-stats');
  var panel = document.getElementById('panel-game');
  var playBtn = document.getElementById('play-btn');
  var state = { round: 'r2', version: 'astra' };

  function parseHash() {
    var h = (location.hash || '').replace(/^#/, '').toLowerCase();
    if (h === 'astra' || h === 'fable') return { round: 'r1', version: h };
    var m = /^(r1|r2)(?:-(astra|fable))?$/.exec(h);
    if (m) return { round: m[1], version: m[2] || 'astra' };
    return { round: 'r2', version: 'astra' };
  }

  function markTabs(list, attr, value, focus) {
    list.forEach(function (tab) {
      var on = tab.getAttribute(attr) === value;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      if (on && focus) tab.focus();
    });
  }

  function render(next, opts) {
    var o = opts || {};
    var round = rounds[next.round];
    if (!round || !round.versions[next.version]) return;
    state = { round: next.round, version: next.version };
    var data = round.versions[next.version];

    markTabs(roundTabs, 'data-round', next.round, o.focus === 'round');
    markTabs(versionTabs, 'data-version', next.version, o.focus === 'version');
    versionTabs.forEach(function (tab) {
      tab.textContent = round.labels[tab.getAttribute('data-version')];
    });

    roundPanel.setAttribute('aria-labelledby', 'round-' + next.round);
    panel.setAttribute('aria-labelledby', 'tab-' + next.version);
    note.textContent = round.note;
    stats.textContent = data.stats;
    iframe.setAttribute('title', data.iframeTitle);
    if (iframe.getAttribute('src') !== data.src) iframe.setAttribute('src', data.src);

    var hash = '#' + next.round + '-' + next.version;
    if (o.updateHash !== false && location.hash !== hash) history.replaceState(null, '', hash);
  }

  function wireTabs(list, attr, kind) {
    list.forEach(function (tab, index) {
      function pick(value, focus) {
        var next = { round: state.round, version: state.version };
        next[kind] = value;
        if (kind === 'round') next.version = 'astra';
        render(next, { focus: focus ? kind : null });
      }
      tab.addEventListener('click', function () { pick(tab.getAttribute(attr)); });
      tab.addEventListener('keydown', function (event) {
        var key = event.key;
        var nextIndex = index;
        if (key === 'ArrowRight' || key === 'ArrowDown') nextIndex = (index + 1) % list.length;
        else if (key === 'ArrowLeft' || key === 'ArrowUp') nextIndex = (index - 1 + list.length) % list.length;
        else if (key === 'Home') nextIndex = 0;
        else if (key === 'End') nextIndex = list.length - 1;
        else if (key === 'Enter' || key === ' ') { event.preventDefault(); pick(tab.getAttribute(attr)); return; }
        else return;
        event.preventDefault();
        pick(list[nextIndex].getAttribute(attr), true);
      });
    });
  }

  wireTabs(roundTabs, 'data-round', 'round');
  wireTabs(versionTabs, 'data-version', 'version');

  playBtn.addEventListener('click', function () {
    panel.scrollIntoView({ block: 'start', behavior: 'smooth' });
    iframe.focus({ preventScroll: true });
    try { if (iframe.contentWindow) iframe.contentWindow.focus(); } catch (err) {}
  });

  window.addEventListener('hashchange', function () {
    render(parseHash(), { updateHash: false });
  });

  render(parseHash(), { updateHash: Boolean(location.hash) });
})();
