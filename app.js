'use strict';

(function () {
  var versions = {
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
  };

  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  var iframe = document.getElementById('play-frame');
  var stats = document.getElementById('version-stats');
  var panel = document.getElementById('panel-game');
  var playBtn = document.getElementById('play-btn');

  function versionFromHash() {
    var hash = (location.hash || '#astra').replace(/^#/, '').toLowerCase();
    return versions[hash] ? hash : 'astra';
  }

  function select(id, options) {
    var opts = options || {};
    var data = versions[id];
    if (!data) return;

    tabs.forEach(function (tab) {
      var on = tab.getAttribute('data-version') === id;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      if (on && opts.focusTab) tab.focus();
    });

    panel.setAttribute('aria-labelledby', 'tab-' + id);
    iframe.setAttribute('title', data.iframeTitle);
    stats.textContent = data.stats;

    if (iframe.getAttribute('src') !== data.src) {
      iframe.setAttribute('src', data.src);
    }

    if (opts.updateHash !== false && location.hash !== '#' + id) {
      history.replaceState(null, '', '#' + id);
    }
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () {
      select(tab.getAttribute('data-version'));
    });

    tab.addEventListener('keydown', function (event) {
      var key = event.key;
      var nextIndex = index;

      if (key === 'ArrowRight' || key === 'ArrowDown') {
        nextIndex = (index + 1) % tabs.length;
      } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
        nextIndex = (index - 1 + tabs.length) % tabs.length;
      } else if (key === 'Home') {
        nextIndex = 0;
      } else if (key === 'End') {
        nextIndex = tabs.length - 1;
      } else if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        select(tab.getAttribute('data-version'));
        return;
      } else {
        return;
      }

      event.preventDefault();
      select(tabs[nextIndex].getAttribute('data-version'), { focusTab: true });
    });
  });

  playBtn.addEventListener('click', function () {
    iframe.focus();
    try {
      if (iframe.contentWindow) iframe.contentWindow.focus();
    } catch (err) {}
  });

  window.addEventListener('hashchange', function () {
    select(versionFromHash(), { updateHash: false });
  });

  select(versionFromHash());
})();
