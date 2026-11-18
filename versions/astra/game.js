'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const stage = $('stage'), cover = $('cover'), launch = $('launch');
  const pictures = {}, keys = new Set(), held = new Set();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = 60, height = 450;
  let width = 1200, mode = 'title', loaded = false, lastFrame = 0;
  let time = 0, score = 0, lives = 3, chain = 0, nextWave = 0, wave = 0;
  let entities = [], effects = [], flash = 0, invincible = 0, drag = null;
  let player = {x:.19, y:.53, tilt:0}, best = 0, sound = true, audio;
  try {
    best = Math.max(0, Number(localStorage.getItem('sunset-mail-best')) || 0);
    sound = localStorage.getItem('sunset-mail-sound') !== 'off';
  } catch {}
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pad = n => String(n).padStart(5, '0');
  const spriteSize = () => Math.min(89, width * .145);
  const icon = name => '<svg aria-hidden="true"><use href="#' + name + '"/></svg>';

  function resize() {
    const box = stage.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    width = height * box.width / box.height;
    canvas.width = Math.round(box.width*dpr);
    canvas.height = Math.round(box.height*dpr);
    ctx.setTransform(canvas.width/width, 0, 0, canvas.height/height, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  new ResizeObserver(resize).observe(stage);
  function hud() {
    $('score').textContent = pad(score);
    $('best').textContent = pad(best);
    $('hearts').innerHTML = Array.from({length:3}, (_,i) =>
      '<svg aria-hidden="true" class="' + (i < lives ? '' : 'empty-heart') + '"><use href="#heart"/></svg>').join('');
    $('hearts').setAttribute('aria-label', '剩餘 ' + lives + ' 顆愛心');
    $('chain').textContent = '集章 ' + chain + '／3';
  }
  function audioLabel() {
    $('audio').innerHTML = icon(sound ? 'sound' : 'mute') + '<span>音效' + (sound ? '開啟' : '關閉') + '</span>';
    $('audio').setAttribute('aria-pressed', String(sound));
  }
  function wakeAudio() {
    if (!sound) return;
    try {
      if (!audio) audio = new AudioContext();
      if (audio.state === 'suspended') audio.resume().catch(()=>{});
    } catch {}
  }
  function tone(freq, length, delay=0, type='sine') {
    if (!sound || !audio || audio.state !== 'running') return;
    const osc = audio.createOscillator(), gain = audio.createGain(), start = audio.currentTime + delay;
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.exponentialRampToValueAtTime(.055,start+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,start+length);
    osc.connect(gain); gain.connect(audio.destination);
    osc.start(start); osc.stop(start+length+.01);
  }
  $('audio').onclick = () => {
    sound = !sound; audioLabel();
    try { localStorage.setItem('sunset-mail-sound', sound ? 'on' : 'off'); } catch {}
    if (sound) {wakeAudio(); tone(523,.12);}
  };
  const full = $('fullscreen');
  if (!document.fullscreenEnabled) full.hidden = true;
  full.onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { $('announce').textContent = '瀏覽器無法切換全螢幕。'; }
  };
  document.addEventListener('fullscreenchange', () => {
    full.title = document.fullscreenElement ? '離開全螢幕' : '全螢幕';
    full.setAttribute('aria-label', full.title);
  });
  function setMode(value) {
    mode = value; keys.clear(); drag = null;
    stage.dataset.state = value;
    $('state').textContent = {title:'準備起飛', play:'飛行中', paused:'暫停飛行', lost:'航班結束', won:'順利抵達'}[value];
    cover.hidden = value === 'play';
    $('flight-tools').hidden = value !== 'play';
    cover.classList.toggle('interlude', value !== 'title');
    if (value === 'play') { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); return; }
    if (value === 'title') return;
    const paused = value === 'paused', won = value === 'won';
    $('headline').textContent = paused ? '飛行暫停' : won ? '郵件送達！' : '迫降海灣';
    $('description').textContent = paused ? '休息一下，準備好了就繼續飛往燈塔。' :
      (won ? '柑仔將夕陽送到了日落燈塔。' : '愛心已用完，柑仔期待下一班出航。') + ' 本班得分 ' + score + ' 分。';
    launch.querySelector('strong').textContent = paused ? '繼續飛行' : '再次起飛';
    $('announce').textContent = $('headline').textContent + '。' + $('description').textContent;
    launch.focus({preventScroll:true});
  }
  function start() {
    if (!loaded) return;
    wakeAudio();
    time = 0; score = 0; lives = 3; chain = 0; wave = 0; nextWave = .65;
    entities = []; effects = []; invincible = 0; flash = 0;
    player = {x:.19, y:.53, tilt:0};
    // The first stamp is already visible on takeoff.
    spawn('stamp',.59,.53);
    hud(); $('route-progress').style.left = '0%'; setMode('play');
    $('announce').textContent = '起飛！收集郵票，躲開雷雲。';
    tone(392,.13);tone(523,.16,.11);
  }
  function togglePause() {
    if (mode === 'play') setMode('paused');
    else if (mode === 'paused') {wakeAudio(); setMode('play');}
  }
  function finish(won) {
    if (score > best) {
      best = score;
      try {localStorage.setItem('sunset-mail-best', String(best));} catch {}
    }
    if (won) {tone(523,.22);tone(659,.22,.14);tone(784,.32,.28);}
    setMode(won ? 'won' : 'lost'); hud();
  }
  launch.onclick = () => mode === 'paused' ? togglePause() : start();
  $('pause').onclick = togglePause;
  function onBlur() {keys.clear(); held.clear(); drag=null; if (mode==='play') setMode('paused');}
  window.addEventListener('blur',onBlur);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)onBlur();});
  const directions = {ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0],ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1]};
  window.addEventListener('keydown',e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code in directions && mode==='play') {e.preventDefault();keys.add(e.code);return;}
    if (['KeyP','Escape'].includes(e.code) && ['play','paused'].includes(mode)) {
      e.preventDefault();if(!e.repeat && !held.has(e.code))togglePause();held.add(e.code);
    } else if ((e.code==='Enter' || e.code==='Space') && mode!=='play' &&
      (document.activeElement.tagName!=='BUTTON' || document.activeElement===launch)) {
      e.preventDefault();
      if (!e.repeat && loaded) launch.click();
    } else if (e.code==='KeyR' && ['lost','won'].includes(mode) && !e.repeat) start();
  });
  window.addEventListener('keyup',e=>{keys.delete(e.code);held.delete(e.code);});
  canvas.addEventListener('pointerdown',e=>{
    if (mode!=='play' || drag!==null) return;
    canvas.setPointerCapture(e.pointerId);
    drag={id:e.pointerId, lastX:e.clientX, lastY:e.clientY, x:player.x, y:player.y};
  });
  canvas.addEventListener('pointermove',e=>{
    if (!drag || drag.id!==e.pointerId) return;
    const box=canvas.getBoundingClientRect();
    drag.x=clamp(drag.x+(e.clientX-drag.lastX)/box.width,.035,.965);
    drag.y=clamp(drag.y+(e.clientY-drag.lastY)/box.height,.06,.94);
    drag.lastX=e.clientX; drag.lastY=e.clientY;
  });
  const release=e=>{if(drag?.id===e.pointerId)drag=null;};
  canvas.addEventListener('pointerup',release);
  canvas.addEventListener('pointercancel',release);
  canvas.addEventListener('lostpointercapture',release);

  function spawn(kind,x,y) {
    entities.push({kind,x,y,base:y,phase:Math.random()*6.28,dead:false});
  }
  function addWave() {
    const line=[.53,.33,.53,.70,.41,.24,.62,.78];
    const y=wave<line.length ? line[wave] : .17+Math.random()*.65;
    if (wave%3===2) spawn('cloud',1.08,wave%6===2 ? .53 : y);
    else {
      spawn('stamp',1.08,y);
      if (time>13 && wave%3===1) spawn('cloud',1.08,y>.50 ? y-.33 : y+.33);
    }
    wave++;
    nextWave+=Math.max(.9,1.49-time*.007);
  }
  function label(text,color,x,y) {effects.push({text,color,x,y,life:.95});}
  function contact(e) {
    e.dead=true;
    if (e.kind==='stamp') {
      chain++;score+=100;
      if (chain===3) {
        chain=0;score+=150;label('郵戳獎勵 ＋250','#fff4a1',e.x,e.y);
        tone(523,.15);tone(659,.15,.09);tone(784,.2,.18);
      } else {label('＋100','#ffedaa',e.x,e.y);tone(660,.11);tone(880,.14,.08);}
    } else {
      lives--;chain=0;invincible=1.65;flash=.17;
      label('－1','#ffc3b1',player.x,player.y);tone(140,.2,0,'triangle');
      $('announce').textContent='撞到雷雲，剩餘 '+lives+' 顆愛心。';
      if (!lives) finish(false);
    }
    hud();
  }
  function update(dt) {
    time+=dt; invincible=Math.max(0,invincible-dt);flash=Math.max(0,flash-dt);
    let dx=0,dy=0;
    for(const key of keys){dx+=directions[key][0];dy+=directions[key][1];}
    const len=Math.max(1,Math.hypot(dx,dy)), prevY=player.y;
    const speed=Math.min(405,width*.85);
    player.x+=dx/len*speed*dt/width;player.y+=dy/len*335*dt/height;
    if(drag){
      const tx=(drag.x-player.x)*width,ty=(drag.y-player.y)*height;
      const blend=Math.min(1, dt*680/Math.max(.1,Math.hypot(tx,ty)));
      player.x+=tx*blend/width;player.y+=ty*blend/height;
    }
    const size=spriteSize();
    player.x=clamp(player.x,(size*.5+4)/width,1-(size*.5+4)/width);
    player.y=clamp(player.y,(size*.34+4)/height,1-(size*.34+4)/height);
    player.tilt+=(clamp((player.y-prevY)/dt,-1,1)*.14-player.tilt)*Math.min(1,dt*10);
    if(time>=nextWave)addWave();
    const drift=.205+.083*Math.min(time/duration,1);
    for(const e of entities){
      e.x-=dt*drift;
      if (!reducedMotion) e.y=e.base+Math.sin(time*(e.kind==='cloud'?1.7:2.4)+e.phase)*(e.kind==='cloud'?.024:.008);
      const ew=objectSize(e.kind);
      const rx=size*.32+ew*(e.kind==='cloud'?.33:.47),ry=size*.23+ew*.34;
      if(!e.dead && (e.kind==='stamp'||invincible===0) &&
         (((player.x-e.x)*width/rx)**2+((player.y-e.y)*height/ry)**2)<1){
        contact(e);if(mode!=='play')break;
      }
      if(e.x < -ew/width && !e.dead){e.dead=true;if(e.kind==='stamp' && chain){chain=0;hud();}}
    }
    entities=entities.filter(e=>!e.dead);
    for(const f of effects){f.life-=dt; f.y-=dt*.065;}
    effects=effects.filter(f=>f.life>0);
    $('route-progress').style.left='calc('+ Math.min(100,time/duration*100) +'% - '+Math.min(16,time/duration*16)+'px)';
    if(time>=duration && mode==='play')finish(true);
  }
  function objectSize(kind){return kind==='cloud'?Math.min(69,width*.115):Math.min(42,width*.085);}
  function drawSprite(im,x,y,w,angle=0) {
    const h=w*im.height/im.width;
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();
  }
  function render() {
    const bg=pictures.background;
    const scale=Math.max(width/bg.width,height/bg.height);
    const w=bg.width*scale,h=bg.height*scale;
    ctx.drawImage(bg,(width-w)*(.35+time/duration*.3),(height-h)*.72,w,h);
    for(const e of entities)drawSprite(pictures[e.kind],e.x*width,e.y*height,objectSize(e.kind));
    ctx.globalAlpha=invincible>0?.62:1;
    const bob=reducedMotion?0:Math.sin(time*4)*1.8;
    drawSprite(pictures.player,player.x*width,player.y*height+bob,spriteSize(),player.tilt);
    ctx.globalAlpha=1;
    for(const f of effects){
      ctx.save();ctx.globalAlpha=Math.min(1,f.life*3);ctx.fillStyle=f.color;
      ctx.strokeStyle='#38263a';ctx.lineWidth=4;ctx.lineJoin='round';
      ctx.font='bold 20px "Noto Sans CJK TC", sans-serif';ctx.textAlign='center';
      const x=clamp(f.x*width,72,width-72),y=Math.max(26,f.y*height-32);
      ctx.strokeText(f.text,x,y);ctx.fillText(f.text,x,y);ctx.restore();
    }
    if(flash>0 && !reducedMotion){ctx.fillStyle='rgba(238,107,94,'+(flash*.95)+')';ctx.fillRect(0,0,width,height);}
  }
  function frame(ts) {
    const dt=Math.min(.045,(ts-lastFrame)/1000); lastFrame=ts;
    if(mode==='play'){update(dt);render();}
    requestAnimationFrame(frame);
  }
  async function boot(){
    hud();audioLabel();setMode('title');resize();
    try {
      await Promise.all([
        ['title','../../assets/title.webp'],
        ['background','../../assets/background.webp'],
        ['player','../../assets/player.png'],
        ['stamp','../../assets/stamp.png'],
        ['cloud','../../assets/cloud.png']
      ].map(async ([name,src])=>{
        const im=new Image();im.src=src;await im.decode();pictures[name]=im;
      }));
      loaded=true;launch.disabled=false;requestAnimationFrame(frame);
    } catch {
      $('description').textContent='無法載入飛行圖像，請重新整理頁面。';
      $('announce').textContent=$('description').textContent;
    }
  }
  boot();
})();
