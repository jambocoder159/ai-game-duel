/* 柑仔的晚霞航空信 — 單頁 HTML5 Canvas 遊戲（無建置步驟、無外部資源） */
(() => {
  'use strict';

  // ---------- 基本設定 ----------
  const W = 960, H = 640;               // 邏輯解析度（3:2，與背景圖同比例）
  const HUD_H = 58;
  const PLAY_TOP = HUD_H + 34, PLAY_BOTTOM = H - 44;
  const MAX_LIVES = 3;
  const STAMPS_PER_LETTER = 5;
  const LETTERS_PER_BONUS = 4;
  const ROLL_TIME = 0.55, ROLL_COOLDOWN = 2.4;
  const FONT = '"Noto Sans TC","PingFang TC","Microsoft JhengHei","Heiti TC","Noto Sans CJK TC",sans-serif';
  const BEST_KEY = 'kamaAirmail.best';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const btnPause = document.getElementById('btnPause');
  const btnMute = document.getElementById('btnMute');
  const btnDash = document.getElementById('btnDash');
  const live = document.getElementById('live');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- 素材 ----------
  const ASSETS = {
    player: '../../assets/player.png',
    cloud: '../../assets/cloud.png',
    stamp: '../../assets/stamp.png',
    background: '../../assets/background.webp',
    title: '../../assets/title.webp',
  };
  const img = {};
  function loadImages() {
    return Promise.all(Object.entries(ASSETS).map(([key, src]) => new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => { img[key] = im; resolve(); };
      im.onerror = () => reject(new Error(src));
      im.src = src;
    })));
  }

  // ---------- 音效（WebAudio 合成，不使用外部檔案） ----------
  let audioCtx = null, muted = false;
  function ensureAudio() {
    if (audioCtx || muted) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    } catch (e) { audioCtx = null; }
  }
  function beep(freq, dur, type, vol, slideTo) {
    if (muted || !audioCtx) return;
    try {
      const t = audioCtx.currentTime;
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol || 0.06, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* 音效失敗不影響遊戲 */ }
  }
  const sfx = {
    stamp: (n) => beep(620 + Math.min(n, 12) * 45, 0.09, 'square', 0.05),
    letter: () => { beep(660, 0.12, 'triangle', 0.09); setTimeout(() => beep(990, 0.18, 'triangle', 0.09), 110); },
    hit: () => beep(220, 0.35, 'sawtooth', 0.09, 60),
    roll: () => beep(300, 0.3, 'triangle', 0.07, 900),
    puff: () => beep(500, 0.15, 'sine', 0.08, 1200),
    over: () => { beep(440, 0.25, 'triangle', 0.09, 220); setTimeout(() => beep(220, 0.5, 'triangle', 0.09, 110), 240); },
  };

  // ---------- 狀態 ----------
  let state = 'loading';     // loading | error | title | playing | paused | gameover
  let best = 0;
  try { best = parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) { best = 0; }

  const player = { x: 200, y: 320, vx: 0, vy: 0, tilt: 0, invuln: 0, roll: 0, cooldown: 0 };
  let clouds, stamps, popups, ghosts;
  let score, lives, streak, letterStamps, letters, totalStamps, puffed, distance;
  let time, bgX, cloudTimer, stampTimer, shake, overTimer, newBest, uiTime = 0;

  const keys = Object.create(null);
  const drag = { id: null, lastX: 0, lastY: 0 };

  function announce(text) { live.textContent = text; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function resetGame() {
    player.x = 200; player.y = (PLAY_TOP + PLAY_BOTTOM) / 2;
    player.vx = player.vy = player.tilt = 0;
    player.invuln = 1.2; player.roll = 0; player.cooldown = 0;
    clouds = []; stamps = []; popups = []; ghosts = [];
    score = 0; lives = MAX_LIVES; streak = 0; letterStamps = 0; letters = 0;
    totalStamps = 0; puffed = 0; distance = 0;
    time = 0; cloudTimer = 1.6; stampTimer = 0.6; shake = 0; overTimer = 0; newBest = false;
  }

  function startGame() {
    ensureAudio();
    resetGame();
    state = 'playing';
    syncButtons();
    announce('遊戲開始。生命 3。');
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      drag.id = null;
      announce('已暫停。');
    } else if (state === 'paused') {
      state = 'playing';
      lastT = 0;
      announce('繼續遊戲。');
    }
    syncButtons();
  }

  function gameOver() {
    state = 'gameover';
    overTimer = 0;
    drag.id = null;
    if (score > best) {
      best = score; newBest = true;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) { /* 忽略 */ }
    }
    sfx.over();
    syncButtons();
    announce(`遊戲結束。分數 ${score}，寄出 ${letters} 封信。按 Enter 或點一下畫面重新開始。`);
  }

  function syncButtons() {
    btnPause.textContent = state === 'paused' ? '繼續' : '暫停';
    btnPause.disabled = !(state === 'playing' || state === 'paused');
    btnPause.style.visibility = btnPause.disabled ? 'hidden' : 'visible';
    btnDash.hidden = state !== 'playing';
    btnMute.textContent = muted ? '音效關' : '音效開';
    btnMute.setAttribute('aria-pressed', String(muted));
  }

  // ---------- 難度 ----------
  function worldSpeed() { return 230 + Math.min(time, 120) * 1.9; }           // px/s
  function cloudInterval() { return Math.max(0.5, 1.35 - time * 0.009); }     // s

  // ---------- 生成 ----------
  function spawnCloud() {
    const scale = rand(0.72, 1.12);
    const w = 132 * scale, h = w * (148 / 160);
    let y = rand(PLAY_TOP + 10, PLAY_BOTTOM - 10);
    // 避免與剛生成的雷雲疊在同一高度，保留可通過的空隙
    const last = clouds[clouds.length - 1];
    if (last && last.x > W - 220 && Math.abs(last.baseY - y) < 120) {
      y = last.baseY + (last.baseY > (PLAY_TOP + PLAY_BOTTOM) / 2 ? -1 : 1) * rand(170, 250);
      y = clamp(y, PLAY_TOP, PLAY_BOTTOM);
    }
    const r = Math.random();
    let kind = 'drift';
    if (time > 12 && r < 0.35) kind = 'bob';
    else if (time > 28 && r < 0.5) kind = 'rush';
    clouds.push({
      x: W + w, y, baseY: y, w, h, kind,
      speedMul: kind === 'rush' ? 1.55 : rand(0.92, 1.12),
      phase: rand(0, Math.PI * 2), amp: kind === 'bob' ? rand(40, 85) : rand(3, 8),
      freq: kind === 'bob' ? rand(1.4, 2.2) : 2.5,
      dead: false,
    });
  }

  function spawnStamps() {
    const n = 5;
    const gap = 74;
    const type = Math.floor(Math.random() * 4);
    const margin = 90;
    const y0 = rand(PLAY_TOP + margin, PLAY_BOTTOM - margin);
    const dir = Math.random() < 0.5 ? -1 : 1;
    for (let i = 0; i < n; i++) {
      let y = y0;
      if (type === 1) y = y0 + dir * (i - 2) * 34;                              // 斜線
      else if (type === 2) y = y0 + Math.sin(i / (n - 1) * Math.PI * 2) * 60;    // 波浪
      else if (type === 3) y = y0 - dir * Math.sin(i / (n - 1) * Math.PI) * 80;  // 拱形
      stamps.push({
        x: W + 60 + i * gap, y: clamp(y, PLAY_TOP, PLAY_BOTTOM),
        phase: i * 0.6, taken: false,
      });
    }
  }

  function popup(text, x, y, color) {
    popups.push({ text, x, y, life: 1, color: color || '#fff6e6' });
  }

  // ---------- 更新 ----------
  function tryRoll() {
    if (state !== 'playing' || player.roll > 0 || player.cooldown > 0) return;
    player.roll = ROLL_TIME;
    player.cooldown = ROLL_TIME + ROLL_COOLDOWN;
    sfx.roll();
  }

  function update(dt) {
    time += dt;
    const speed = worldSpeed();
    distance += speed * dt / 20;
    bgX += speed * 0.16 * dt;

    // --- 玩家移動（鍵盤） ---
    let ax = 0, ay = 0;
    if (keys.ArrowLeft || keys.KeyA) ax -= 1;
    if (keys.ArrowRight || keys.KeyD) ax += 1;
    if (keys.ArrowUp || keys.KeyW) ay -= 1;
    if (keys.ArrowDown || keys.KeyS) ay += 1;
    if (ax && ay) { ax *= 0.7071; ay *= 0.7071; }
    const MOVE = 360;
    const k = Math.min(1, dt * 11);
    if (drag.id === null) {
      player.vx += (ax * MOVE - player.vx) * k;
      player.vy += (ay * MOVE - player.vy) * k;
      player.x += player.vx * dt;
      player.y += player.vy * dt;
    }
    player.x = clamp(player.x, 70, W - 80);
    player.y = clamp(player.y, PLAY_TOP, PLAY_BOTTOM);
    player.tilt += (clamp(player.vy / MOVE, -1, 1) * 0.28 - player.tilt) * Math.min(1, dt * 9);
    if (drag.id !== null) { player.vx *= 0.8; player.vy *= Math.pow(0.02, dt); }

    if (player.invuln > 0) player.invuln -= dt;
    if (player.roll > 0) player.roll = Math.max(0, player.roll - dt);
    if (player.cooldown > 0) player.cooldown = Math.max(0, player.cooldown - dt);
    btnDash.classList.toggle('cooling', player.cooldown > 0);

    // --- 生成 ---
    cloudTimer -= dt;
    if (cloudTimer <= 0) { spawnCloud(); cloudTimer = cloudInterval() * rand(0.75, 1.25); }
    stampTimer -= dt;
    if (stampTimer <= 0) { spawnStamps(); stampTimer = rand(2.0, 3.0) * (260 / speed + 0.45); }

    // --- 雷雲 ---
    const rolling = player.roll > 0;
    for (const c of clouds) {
      c.x -= speed * c.speedMul * dt;
      c.y = clamp(c.baseY + Math.sin(time * c.freq + c.phase) * c.amp, PLAY_TOP - 20, PLAY_BOTTOM + 20);
      if (c.x < -c.w) { c.dead = true; continue; }
      // 碰撞：玩家橢圓 vs 雷雲圓形（判定範圍比圖略小，較寬容）
      const cr = c.w * 0.3;
      const dx = (c.x - (player.x + 4)) / (44 + cr);
      const dy = ((c.y - c.h * 0.08) - (player.y + 4)) / (22 + cr);
      if (dx * dx + dy * dy < 1) {
        if (rolling) {
          c.dead = true; puffed++;
          const pts = 30 * comboMul();
          score += pts;
          ghosts.push({ kind: 'cloud', x: c.x, y: c.y, w: c.w, h: c.h, life: 1 });
          popup(`吹散！+${pts}`, c.x, c.y - 30, '#d9c7ff');
          sfx.puff();
        } else if (player.invuln <= 0) {
          hitPlayer();
          if (state !== 'playing') return;
        }
      }
    }
    clouds = clouds.filter(c => !c.dead);

    // --- 郵票 ---
    for (const s of stamps) {
      s.x -= speed * dt;
      const dx = s.x - player.x, dy = s.y - player.y;
      if (!s.taken && dx * dx / (78 * 78) + dy * dy / (56 * 56) < 1) {
        s.taken = true;
        collectStamp(s);
      }
    }
    stamps = stamps.filter(s => !s.taken && s.x > -60);

    // --- 特效 ---
    for (const p of popups) { p.life -= dt * 1.1; p.y -= 38 * dt; }
    popups = popups.filter(p => p.life > 0);
    for (const g of ghosts) g.life -= dt * (g.kind === 'cloud' ? 2.4 : 2.2);
    ghosts = ghosts.filter(g => g.life > 0);
    if (shake > 0) shake = Math.max(0, shake - dt);
  }

  function comboMul() { return Math.min(5, 1 + Math.floor(streak / 5)); }

  function collectStamp(s) {
    streak++; totalStamps++; letterStamps++;
    const pts = 10 * comboMul();
    score += pts;
    sfx.stamp(streak);
    ghosts.push({ kind: 'stamp', x: s.x, y: s.y, life: 1 });
    if (letterStamps >= STAMPS_PER_LETTER) {
      letterStamps = 0; letters++;
      score += 100;
      sfx.letter();
      if (letters % LETTERS_PER_BONUS === 0) {
        if (lives < MAX_LIVES) {
          lives++;
          popup('信件寄出！+100　生命 +1', player.x + 40, player.y - 50, '#ffe27a');
          announce(`寄出第 ${letters} 封信，生命加一。`);
        } else {
          score += 200;
          popup('信件寄出！+100　滿命獎勵 +200', player.x + 40, player.y - 50, '#ffe27a');
        }
      } else {
        popup('信件寄出！+100', player.x + 40, player.y - 50, '#ffe27a');
      }
    } else {
      popup(`+${pts}`, s.x, s.y - 24);
    }
  }

  function hitPlayer() {
    lives--;
    streak = 0;
    player.invuln = 2.0;
    shake = reduceMotion ? 0 : 0.35;
    sfx.hit();
    popup('被雷雲電到了！', player.x + 20, player.y - 50, '#ffb3a8');
    if (lives <= 0) gameOver();
    else announce(`被雷雲擊中，剩下 ${lives} 條生命。`);
  }

  // ---------- 繪圖 ----------
  function text(str, x, y, size, color, align, weight) {
    ctx.font = `${weight || 700} ${size}px ${FONT}`;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size * 0.16);
    ctx.strokeStyle = 'rgba(28,12,36,.9)';
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color || '#fff6e6';
    ctx.fillText(str, x, y);
  }

  function panel(x, y, w, h, alpha) {
    ctx.fillStyle = `rgba(30,14,42,${alpha == null ? 0.84 : alpha})`;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#ffd35c';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  }

  function drawBackground() {
    // 背景圖不是無縫圖，所以用「正向／鏡像」交替拼接達成無縫捲動
    const off = ((bgX % (W * 2)) + W * 2) % (W * 2);
    for (let i = 0; i < 3; i++) {
      const x = Math.round(i * W - off);
      if (x >= W || x + W <= 0) continue;
      if (i % 2 === 0) {
        ctx.drawImage(img.background, x, 0, W, H);
      } else {
        ctx.save();
        ctx.translate(x + W, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img.background, 0, 0, W, H);
        ctx.restore();
      }
    }
  }

  function drawPlayer() {
    const pw = 128, ph = 84;
    if (player.invuln > 0 && player.roll <= 0 && state === 'playing' && Math.floor(player.invuln * 10) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }
    ctx.save();
    ctx.translate(player.x, player.y + Math.sin(uiTime * 4) * 2.5);
    let ang = player.tilt;
    if (player.roll > 0) ang += (1 - player.roll / ROLL_TIME) * Math.PI * 2;
    ctx.rotate(ang);
    ctx.drawImage(img.player, -pw / 2, -ph / 2, pw, ph);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawWorld() {
    drawBackground();
    // 郵票
    for (const s of stamps) {
      const bob = Math.sin(uiTime * 3.2 + s.phase) * 4;
      ctx.drawImage(img.stamp, s.x - 28, s.y - 27 + bob, 56, 54);
    }
    // 收集殘影（縮放淡出的郵票／雷雲圖片）
    for (const g of ghosts) {
      ctx.globalAlpha = Math.max(0, g.life) * 0.8;
      if (g.kind === 'stamp') {
        const s = 56 * (1 + (1 - g.life) * 0.9);
        ctx.drawImage(img.stamp, g.x - s / 2, g.y - s / 2 - (1 - g.life) * 30, s, s * 134 / 140);
      } else {
        const k = 1 + (1 - g.life) * 0.6;
        ctx.drawImage(img.cloud, g.x - g.w * k / 2, g.y - g.h * k / 2, g.w * k, g.h * k);
      }
      ctx.globalAlpha = 1;
    }
    drawPlayer();
    for (const c of clouds) ctx.drawImage(img.cloud, c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
    for (const p of popups) {
      ctx.globalAlpha = clamp(p.life * 1.6, 0, 1);
      text(p.text, clamp(p.x, 90, W - 150), Math.max(HUD_H + 18, p.y), 22, p.color, 'center');
      ctx.globalAlpha = 1;
    }
  }

  function drawHUD() {
    ctx.fillStyle = 'rgba(30,14,42,.86)';
    ctx.fillRect(0, 0, W, HUD_H);
    ctx.fillStyle = '#ffd35c';
    ctx.fillRect(0, HUD_H - 3, W, 3);
    const cy = HUD_H / 2 - 1;

    // 生命（用玩家圖示）
    text('生命', 12, cy, 17, '#ffe9c4');
    for (let i = 0; i < MAX_LIVES; i++) {
      ctx.globalAlpha = i < lives ? 1 : 0.22;
      ctx.drawImage(img.player, 54 + i * 50, cy - 16, 48, 31.5);
    }
    ctx.globalAlpha = 1;

    // 分數
    text('分數', 214, cy, 17, '#ffe9c4');
    text(String(score).padStart(6, '0'), 254, cy, 26, '#ffffff');

    // 信件進度（5 張郵票 = 1 封信）
    text('信件', 368, cy, 17, '#ffe9c4');
    for (let i = 0; i < STAMPS_PER_LETTER; i++) {
      ctx.globalAlpha = i < letterStamps ? 1 : 0.25;
      ctx.drawImage(img.stamp, 408 + i * 29, cy - 14, 29, 28);
    }
    ctx.globalAlpha = 1;
    text(`已寄 ${letters} 封`, 560, cy, 17, '#ffffff');

    // 連擊
    const mul = comboMul();
    text(`連擊 ×${mul}`, 652, cy, 19, mul > 1 ? '#ffe27a' : '#ffe9c4');

    // 翻滾量表
    const gx = 14, gy = H - 30, gw = 170, gh = 16;
    const ready = player.cooldown <= 0;
    const fill = ready ? 1 : 1 - player.cooldown / (ROLL_TIME + ROLL_COOLDOWN);
    ctx.fillStyle = 'rgba(30,14,42,.86)';
    ctx.fillRect(gx - 6, gy - 8, gw + 150, gh + 16);
    ctx.fillStyle = '#4a2f58';
    ctx.fillRect(gx, gy, gw, gh);
    ctx.fillStyle = ready ? '#ffd35c' : '#c9a6ff';
    ctx.fillRect(gx, gy, gw * fill, gh);
    ctx.strokeStyle = '#fff6e6'; ctx.lineWidth = 2;
    ctx.strokeRect(gx, gy, gw, gh);
    text(ready ? '翻滾就緒（空白鍵）' : '翻滾冷卻中…', gx + gw + 8, gy + gh / 2 + 1, 15, ready ? '#ffffff' : '#e3d2ff');
  }

  function drawTitle() {
    ctx.drawImage(img.title, 0, 0, W, H);
    panel(28, 26, 470, 322);
    text('柑仔的晚霞航空信', 52, 74, 46, '#ffe27a');
    text('紙飛機郵差貓的港町黃昏任務', 54, 120, 21, '#ffffff', 'left', 500);
    const lines = [
      '．收集晚霞郵票，每 5 張寄出一封信',
      '．閃開雷雲！被電到 3 次任務就結束',
      '．翻滾中無敵，還能把雷雲吹散加分',
      '．方向鍵／WASD 移動，空白鍵翻滾',
      '．P 或 Esc 暫停，M 開關音效',
      '．觸控：拖曳移動，點「翻滾」鈕衝刺',
    ];
    lines.forEach((l, i) => text(l, 50, 162 + i * 29, 19, '#fff6e6', 'left', 500));

    panel(W / 2 - 300, H - 96, 600, 64, 0.88);
    if (Math.floor(uiTime * 1.6) % 4 !== 3 || reduceMotion) {
      text('按 Enter／空白鍵，或點一下畫面開始', W / 2, H - 64, 26, '#ffffff', 'center');
    }
    if (best > 0) text(`最高分 ${best}`, W - 24, H - 122, 20, '#ffe27a', 'right');
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(20,8,30,.62)';
    ctx.fillRect(0, 0, W, H);
    panel(W / 2 - 240, H / 2 - 110, 480, 220);
    text('已暫停', W / 2, H / 2 - 54, 44, '#ffe27a', 'center');
    text('按 P／Esc 或點一下畫面繼續', W / 2, H / 2 + 8, 22, '#ffffff', 'center', 500);
    text('按 R 重新開始', W / 2, H / 2 + 46, 20, '#fff6e6', 'center', 500);
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(20,8,30,.66)';
    ctx.fillRect(0, 0, W, H);
    const pw = 540, ph = 380, px = W / 2 - pw / 2, py = H / 2 - ph / 2;
    panel(px, py, pw, ph, 0.92);
    text('任務結束', W / 2, py + 52, 44, '#ffe27a', 'center');
    text(`分數　${score}`, W / 2, py + 116, 32, '#ffffff', 'center');
    text(newBest ? '刷新最高分！' : `最高分　${best}`, W / 2, py + 158, 22, newBest ? '#ffe27a' : '#fff6e6', 'center');
    ctx.drawImage(img.stamp, px + 70, py + 190, 40, 38);
    text(`郵票 ${totalStamps} 張　寄出 ${letters} 封信`, px + 124, py + 210, 21, '#fff6e6', 'left', 500);
    ctx.drawImage(img.cloud, px + 70, py + 234, 40, 37);
    text(`吹散雷雲 ${puffed} 朵　飛行 ${Math.floor(distance)} 公尺`, px + 124, py + 254, 21, '#fff6e6', 'left', 500);
    if (overTimer > 0.7 && (Math.floor(uiTime * 1.6) % 4 !== 3 || reduceMotion)) {
      text('按 Enter／R，或點一下畫面再飛一次', W / 2, py + ph - 48, 24, '#ffffff', 'center');
    }
  }

  function draw() {
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, W, H);

    if (state === 'loading' || state === 'error') {
      ctx.fillStyle = '#2a1838';
      ctx.fillRect(0, 0, W, H);
      text(state === 'loading' ? '載入中…' : '圖片載入失敗，請確認 assets 資料夾後重新整理', W / 2, H / 2, 26, '#ffffff', 'center');
      return;
    }
    if (state === 'title') { drawTitle(); return; }

    ctx.save();
    if (shake > 0 && state === 'playing') ctx.translate(rand(-6, 6) * shake / 0.35, rand(-6, 6) * shake / 0.35);
    drawWorld();
    ctx.restore();
    drawHUD();
    if (state === 'paused') drawPaused();
    else if (state === 'gameover') drawGameOver();
  }

  // ---------- 主迴圈 ----------
  let lastT = 0;
  function frame(t) {
    const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0;
    lastT = t;
    uiTime += dt;
    if (state === 'playing') update(dt);
    else if (state === 'gameover') {
      overTimer += dt;
      for (const p of popups) { p.life -= dt; p.y -= 38 * dt; }
      popups = popups.filter(p => p.life > 0);
    }
    draw();
    requestAnimationFrame(frame);
  }

  // ---------- 畫布縮放 ----------
  let renderScale = 1;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderScale = clamp((rect.width || W) * dpr / W, 0.5, 2);
    const cw = Math.round(W * renderScale), ch = Math.round(H * renderScale);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  // ---------- 輸入：鍵盤 ----------
  const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Enter']);
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const onButton = e.target instanceof HTMLButtonElement;
    if (onButton && (e.code === 'Enter' || e.code === 'Space')) return;   // 讓按鈕自己處理
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys[e.code] = true;

    switch (e.code) {
      case 'Enter':
        if (state === 'title') startGame();
        else if (state === 'gameover' && overTimer > 0.7) startGame();
        else if (state === 'paused') togglePause();
        break;
      case 'Space':
        if (state === 'title') startGame();
        else if (state === 'playing') tryRoll();
        else if (state === 'gameover' && overTimer > 0.7) startGame();
        break;
      case 'KeyP':
      case 'Escape':
        togglePause();
        break;
      case 'KeyR':
        if (state === 'gameover' || state === 'paused') startGame();
        break;
      case 'KeyM':
        toggleMute();
        break;
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  function clearKeys() { for (const k in keys) keys[k] = false; }

  // 失去焦點或切到背景時自動暫停
  window.addEventListener('blur', () => { clearKeys(); if (state === 'playing') togglePause(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearKeys(); if (state === 'playing') togglePause(); }
  });

  // ---------- 輸入：觸控／滑鼠（Pointer Events） ----------
  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (e.pointerType === 'mouse') canvas.focus({ preventScroll: true });
    ensureAudio();
    if (state === 'title') { startGame(); return; }
    if (state === 'gameover') { if (overTimer > 0.7) startGame(); return; }
    if (state === 'paused') { togglePause(); return; }
    if (state !== 'playing') return;
    if (drag.id !== null && e.pointerId !== drag.id) { tryRoll(); return; }   // 第二指輕點 = 翻滾
    const p = toCanvas(e);
    drag.id = e.pointerId; drag.lastX = p.x; drag.lastY = p.y;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== drag.id || state !== 'playing') return;
    e.preventDefault();
    const p = toCanvas(e);
    const dx = (p.x - drag.lastX) * 1.15, dy = (p.y - drag.lastY) * 1.15;   // 略為放大，手指不用移太遠
    drag.lastX = p.x; drag.lastY = p.y;
    player.x = clamp(player.x + dx, 70, W - 80);
    player.y = clamp(player.y + dy, PLAY_TOP, PLAY_BOTTOM);
    player.vy = clamp(player.vy + dy * 22, -360, 360);    // 只用來驅動傾斜動畫
  });
  function endDrag(e) { if (e.pointerId === drag.id) drag.id = null; }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---------- 按鈕 ----------
  function toggleMute() {
    muted = !muted;
    if (!muted) ensureAudio();
    syncButtons();
    announce(muted ? '音效已關閉。' : '音效已開啟。');
  }
  btnPause.addEventListener('click', () => { togglePause(); btnPause.blur(); });
  btnMute.addEventListener('click', () => { toggleMute(); btnMute.blur(); });
  btnDash.addEventListener('pointerdown', (e) => { e.preventDefault(); tryRoll(); });
  btnDash.addEventListener('click', (e) => { if (e.detail === 0) tryRoll(); btnDash.blur(); });  // 鍵盤啟動

  // ---------- 啟動 ----------
  bgX = 0;
  resetGame();
  resize();
  syncButtons();
  requestAnimationFrame(frame);
  loadImages().then(() => {
    state = 'title';
    syncButtons();
    announce('柑仔的晚霞航空信。按 Enter 或點一下畫面開始。');
  }).catch((err) => {
    state = 'error';
    console.error('圖片載入失敗：', err && err.message);
    announce('圖片載入失敗。');
  });

  // 供自動化測試讀取狀態（不影響遊戲）
  window.__kama = {
    snapshot: () => ({
      state, score, lives, streak, letters, letterStamps, totalStamps, puffed, time,
      player: { x: player.x, y: player.y, roll: player.roll, cooldown: player.cooldown, invuln: player.invuln },
      clouds: clouds.map(c => ({ x: c.x, y: c.y, w: c.w })),
      stamps: stamps.map(s => ({ x: s.x, y: s.y })),
    }),
  };
})();
