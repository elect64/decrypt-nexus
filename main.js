// ================================
// APP.JS — CORE APPLICATION
// ================================

const NS = 'decrypt_control_';

// ================================
// STORAGE UTILITIES
// ================================
const store = {
  get: (k, def = null) => {
    try { const v = localStorage.getItem(NS + k); return v !== null ? JSON.parse(v) : def; }
    catch { return def; }
  },
  set: (k, v) => {
    try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch {}
  }
};

// ================================
// XP SYSTEM
// ================================
const XP = {
  current: 0,
  init() {
    this.current = store.get('xp', 0);
    this.render();
  },
  add(amt) {
    this.current += amt;
    store.set('xp', this.current);
    this.render();
  },
  render() {
    const el = document.getElementById('xp-display');
    const nav = document.getElementById('nav-xp');
    if (el) el.textContent = this.current.toLocaleString();
    if (nav) nav.textContent = 'XP ' + this.current.toLocaleString();
  }
};

// ================================
// ACHIEVEMENTS
// ================================
const ACHIEVEMENTS_DEF = [
  { id: 'system_online', title: 'System Online', desc: 'Opened the control deck for the first time.' },
  { id: 'first_break', title: 'First Break', desc: 'Completed your first Lockbreak level.' },
  { id: 'code_runner', title: 'Code Runner', desc: 'Completed a Code Rush round.' },
  { id: 'grid_walker', title: 'Grid Walker', desc: 'Completed a Grid level.' },
  { id: 'triple_threat', title: 'Triple Threat', desc: 'Played all three games.' },
  { id: 'unlocked', title: 'Unlocked', desc: 'Earned 500 XP across all activities.' },
];

const Achievements = {
  unlocked: [],
  init() {
    this.unlocked = store.get('achievements', []);
    this.render();
    if (!this.unlocked.includes('system_online')) {
      setTimeout(() => this.unlock('system_online'), 3000);
    }
  },
  unlock(id) {
    if (this.unlocked.includes(id)) return;
    this.unlocked.push(id);
    store.set('achievements', this.unlocked);
    const def = ACHIEVEMENTS_DEF.find(a => a.id === id);
    if (def) this.toast(def);
    this.render();
    XP.add(50);
  },
  checkXP() {
    if (XP.current >= 500) this.unlock('unlocked');
  },
  checkTriple() {
    const gs = store.get('games_played_set', []);
    if (gs.includes('lb') && gs.includes('cr') && gs.includes('tg')) this.unlock('triple_threat');
  },
  toast(def) {
    const t = document.getElementById('achievement-toast');
    document.getElementById('toast-title').textContent = def.title;
    document.getElementById('toast-desc').textContent = def.desc;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
    playSound('achievement');
  },
  render() {
    const el = document.getElementById('achievement-count');
    if (el) el.textContent = this.unlocked.length + ' / ' + ACHIEVEMENTS_DEF.length + ' achievements';
  }
};

function markGamePlayed(id) {
  let s = store.get('games_played_set', []);
  if (!s.includes(id)) { s.push(id); store.set('games_played_set', s); }
  Achievements.checkTriple();
}

// ================================
// THEME SYSTEM
// ================================
const THEMES = ['dark', 'light', 'system'];
const Theme = {
  current: 'dark',
  init() {
    this.current = store.get('theme', 'dark');
    this.apply();
  },
  apply() {
    const html = document.documentElement;
    const btn = document.getElementById('theme-btn');
    const mbtn = document.getElementById('mob-theme-btn');
    let effective = this.current;
    if (this.current === 'system') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    html.setAttribute('data-theme', effective);
    const label = this.current.charAt(0).toUpperCase() + this.current.slice(1);
    if (btn) btn.textContent = label;
    if (mbtn) mbtn.textContent = 'Theme: ' + label;
  }
};

function cycleTheme() {
  const idx = THEMES.indexOf(Theme.current);
  Theme.current = THEMES[(idx + 1) % THEMES.length];
  store.set('theme', Theme.current);
  Theme.apply();
  playSound('click');
}

// ================================
// SOUND SYSTEM
// ================================
const Sound = {
  enabled: false,
  ctx: null,
  init() {
    this.enabled = store.get('sound', false);
    this.render();
  },
  render() {
    const btn = document.getElementById('sound-btn');
    const mbtn = document.getElementById('mob-sound-btn');
    const label = this.enabled ? 'Sound On' : 'Sound Off';
    if (btn) btn.textContent = label;
    if (mbtn) mbtn.textContent = label;
  },
  play(type) {
    if (!this.enabled) return;
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      const sounds = {
        click: { freq: 800, dur: 0.05, vol: 0.1, type: 'sine' },
        unlock: { freq: [400, 600, 800], dur: 0.3, vol: 0.12, type: 'sine' },
        success: { freq: [523, 659, 784], dur: 0.4, vol: 0.1, type: 'sine' },
        fail: { freq: [300, 200], dur: 0.3, vol: 0.08, type: 'sawtooth' },
        achievement: { freq: [523, 659, 784, 1047], dur: 0.6, vol: 0.08, type: 'sine' },
      };
      const s = sounds[type] || sounds.click;
      const freq = Array.isArray(s.freq) ? s.freq[0] : s.freq;
      o.type = s.type;
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      if (Array.isArray(s.freq)) {
        s.freq.forEach((f, i) => o.frequency.setValueAtTime(f, ctx.currentTime + i * (s.dur / s.freq.length)));
      }
      g.gain.setValueAtTime(s.vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + s.dur);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + s.dur);
    } catch {}
  }
};

function playSound(type) { Sound.play(type); }

function toggleSound() {
  Sound.enabled = !Sound.enabled;
  store.set('sound', Sound.enabled);
  Sound.render();
  if (Sound.enabled) playSound('click');
}

// ================================
// SYSTEM LAUNCHERS
// ================================
const PLATFORMS = [
  'https://decrypt-hq.vercel.app',
  'https://decrypt-hq.vercel.app/register.html?v=1.1',
  'https://decrypt-terminal.vercel.app',
  'https://decrypt-email-terminal.vercel.app',
  'https://decpp.vercel.app',
  'https://decrypt-command-center.vercel.app/',
];

function launch(url) {
  window.open(url, '_blank', 'noopener');
  playSound('click');
}

function launchByIndex(i) {
  if (PLATFORMS[i]) launch(PLATFORMS[i]);
}

// ================================
// STATUS CHECKS
// ================================
function checkStatuses() {
  // Due to CORS, we cannot reliably ping external URLs from the browser.
  // Mark all as "Status Unverified" per spec to never fake operational data.
  const statusBadges = document.querySelectorAll('[id^="st-"]');
  statusBadges.forEach(el => {
    el.textContent = 'Unverified';
    el.className = 'status-badge unverified';
  });

  const sysStatuses = document.querySelectorAll('.sys-status');
  sysStatuses.forEach(el => {
    el.querySelector('.sys-status-text').textContent = 'Unverified';
    el.className = 'sys-status unverified';
  });
}

// ================================
// KEYBOARD SHORTCUTS
// ================================
function openKbModal() {
  document.getElementById('kb-modal').classList.add('open');
}
function closeKbModal() {
  document.getElementById('kb-modal').classList.remove('open');
}

document.addEventListener('keydown', e => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  switch (e.key) {
    case '1': launchByIndex(0); break;
    case '2': launchByIndex(1); break;
    case '3': launchByIndex(2); break;
    case '4': launchByIndex(3); break;
    case '5': launchByIndex(4); break;
    case '6': launchByIndex(5); break;
    case 'g': case 'G': scrollTo('playground'); break;
    case 't': case 'T': cycleTheme(); break;
    case 'h': case 'H': scrollTo('hero'); break;
    case 's': case 'S': toggleSound(); break;
    case '?': openKbModal(); break;
    case 'Escape': closeKbModal(); closeMobileMenu(); break;
  }
});

function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// ================================
// NAVIGATION
// ================================
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('mobile-menu').classList.add('open');
});
document.getElementById('mobile-menu-close').addEventListener('click', closeMobileMenu);
function closeMobileMenu() {
  document.getElementById('mobile-menu').classList.remove('open');
}

// ================================
// CUSTOM CURSOR
// ================================
const cursor = document.getElementById('cursor');
const cursorRing = document.getElementById('cursor-ring');
let mx = -100, my = -100, rx = -100, ry = -100;

document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

function animateCursor() {
  cursor.style.left = mx + 'px';
  cursor.style.top = my + 'px';
  rx += (mx - rx) * 0.12;
  ry += (my - ry) * 0.12;
  cursorRing.style.left = rx + 'px';
  cursorRing.style.top = ry + 'px';
  requestAnimationFrame(animateCursor);
}
animateCursor();

document.addEventListener('mouseover', e => {
  if (e.target.closest('button, a, [onclick]')) document.body.classList.add('cursor-hover');
});
document.addEventListener('mouseout', e => {
  if (e.target.closest('button, a, [onclick]')) document.body.classList.remove('cursor-hover');
});

// ================================
// INTRO SEQUENCE
// ================================
function runIntro() {
  const intro = document.getElementById('intro');
  const skip = document.getElementById('intro-skip');
  const initialized = store.get('initialized', false);

  if (initialized) intro.classList.add('short');

  function dismiss() {
    intro.classList.add('hidden');
    setTimeout(() => { intro.style.display = 'none'; }, 700);
    if (!initialized) {
      store.set('initialized', true);
    }
  }

  skip.addEventListener('click', dismiss);

  const delay = initialized ? 1600 : 2800;
  setTimeout(dismiss, delay);
}

// ================================
// INTERSECTION OBSERVER — REVEALS
// ================================
function initReveal() {
  if (!window.IntersectionObserver) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    return;
  }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

// ================================
// SYSTEM INIT
// ================================
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  Sound.init();
  XP.init();
  Achievements.init();
  runIntro();
  initReveal();
  checkStatuses();
  updateAllStats();
});


// ================================
// GAMES.JS — ALL GAME LOGIC
// ================================

// ================================
// GAME STORAGE
// ================================
const GS = {
  get: (k) => store.get('games_' + k, null),
  set: (k, v) => store.set('games_' + k, v),
};

function updateAllStats() {
  // Lockbreak
  document.getElementById('lb-best').textContent = GS.get('lb_best') || 0;
  document.getElementById('lb-played').textContent = GS.get('lb_played') || 0;
  document.getElementById('lb-streak').textContent = GS.get('lb_streak') || 0;
  // Code Rush
  document.getElementById('cr-best').textContent = GS.get('cr_best') || 0;
  document.getElementById('cr-played').textContent = GS.get('cr_played') || 0;
  document.getElementById('cr-streak').textContent = GS.get('cr_streak') || 0;
  // The Grid
  document.getElementById('tg-best').textContent = GS.get('tg_best') || 0;
  document.getElementById('tg-played').textContent = GS.get('tg_played') || 0;
  document.getElementById('tg-level').textContent = GS.get('tg_best_level') || 1;
}

function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }

// ================================
// LOCKBREAK
// ================================
const LB = (() => {
  const TOTAL_LEVELS = 5;
  let level = 0, score = 0, sessionStreak = 0;
  let sequence = [], playerInput = [], options = [];
  let phase = 'show'; // show | input

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789!@#$%';

  function makeSequence(len) {
    const pool = chars.split('').sort(() => Math.random() - 0.5).slice(0, len + 4);
    const seq = [];
    for (let i = 0; i < len; i++) seq.push(pool[i]);
    // options = seq + 4 distractors, shuffled
    return { seq, opts: [...pool].sort(() => Math.random() - 0.5) };
  }

  function renderSeq() {
    const el = document.getElementById('lb-seq');
    el.innerHTML = sequence.map(c => `<div class="lb-cell active">${c}</div>`).join('');
  }

  function renderInput() {
    const el = document.getElementById('lb-input');
    el.innerHTML = playerInput.map((c, i) =>
      `<div class="lb-input-cell selected">${c || '_'}</div>`
    ).join('');
    // Empty slots
    const remaining = sequence.length - playerInput.length;
    for (let i = 0; i < remaining; i++) {
      el.innerHTML += `<div class="lb-input-cell">_</div>`;
    }
  }

  function renderOptions() {
    const el = document.getElementById('lb-opts');
    el.innerHTML = options.map(c =>
      `<button class="lb-opt" onclick="LB.pick('${c}')">${c}</button>`
    ).join('');
  }

  function renderProgress() {
    const el = document.getElementById('lb-progress');
    el.innerHTML = Array.from({ length: TOTAL_LEVELS }, (_, i) =>
      `<div class="lb-progress-dot ${i < level ? 'done' : i === level ? 'current' : ''}"></div>`
    ).join('');
  }

  function showLevel() {
    phase = 'show';
    const len = 3 + level; // level 0=3, level 4=7
    const { seq, opts } = makeSequence(len);
    sequence = seq;
    options = opts;
    playerInput = [];

    renderSeq();
    renderInput();
    renderOptions();
    renderProgress();

    document.getElementById('lb-msg').textContent = 'Remember the sequence.';
    document.getElementById('lb-input-label').textContent = 'Memorize the sequence';

    // Hide options during show phase
    document.getElementById('lb-opts').style.visibility = 'hidden';
    document.getElementById('lb-input').style.visibility = 'hidden';

    // After 2s, hide sequence and allow input
    setTimeout(() => {
      phase = 'input';
      document.getElementById('lb-seq').innerHTML = sequence.map(() => `<div class="lb-cell">?</div>`).join('');
      document.getElementById('lb-input-label').textContent = 'Reconstruct the sequence';
      document.getElementById('lb-opts').style.visibility = 'visible';
      document.getElementById('lb-input').style.visibility = 'visible';
      document.getElementById('lb-msg').textContent = 'Select the characters in the correct order.';
    }, 2200 + level * 300);
  }

  return {
    start() {
      level = 0; score = 0; sessionStreak = 0;
      hide('lb-intro'); hide('lb-result');
      show('lb-game');
      markGamePlayed('lb');
      showLevel();
    },

    pick(c) {
      if (phase !== 'input') return;
      if (playerInput.length >= sequence.length) return;
      playerInput.push(c);
      renderInput();

      // Check if done
      if (playerInput.length === sequence.length) {
        setTimeout(() => this.check(), 300);
      }
    },

    check() {
      const seqEl = document.getElementById('lb-seq');
      const correct = playerInput.every((c, i) => c === sequence[i]);
      seqEl.innerHTML = sequence.map((c, i) => {
        const cls = playerInput[i] === c ? 'correct' : 'wrong';
        return `<div class="lb-cell ${cls}">${c}</div>`;
      }).join('');

      if (correct) {
        const pts = (level + 1) * 100 + sessionStreak * 20;
        score += pts;
        sessionStreak++;
        document.getElementById('lb-msg').textContent = `Correct! +${pts} XP`;
        playSound('success');
        XP.add(pts);
        Achievements.checkXP();

        if (level === 0) Achievements.unlock('first_break');

        level++;
        if (level >= TOTAL_LEVELS) {
          setTimeout(() => this.finish(true), 900);
        } else {
          setTimeout(() => showLevel(), 1100);
        }
      } else {
        document.getElementById('lb-msg').textContent = 'Incorrect. Sequence failed.';
        playSound('fail');
        setTimeout(() => this.finish(false), 1000);
      }
    },

    finish(won) {
      hide('lb-game');
      show('lb-result');
      document.getElementById('lb-final-score').textContent = score;
      document.getElementById('lb-result-msg').textContent = won ? 'All levels cleared.' : `Reached level ${level + 1} of ${TOTAL_LEVELS}.`;

      const best = GS.get('lb_best') || 0;
      if (score > best) GS.set('lb_best', score);
      GS.set('lb_played', (GS.get('lb_played') || 0) + 1);
      const streak = GS.get('lb_streak') || 0;
      GS.set('lb_streak', won ? streak + 1 : 0);
      updateAllStats();
    },

    quit() {
      hide('lb-game'); hide('lb-result');
      show('lb-intro');
    }
  };
})();

// ================================
// CODE RUSH
// ================================
const CR = (() => {
  const PROMPTS = [
    'DECRYPT', 'UNLOCK', 'ACCESS GRANTED', 'KNOWLEDGE FLOWS',
    'SYSTEM READY', 'BREAK THE CODE', 'SIGNAL CLEAR', 'CONTROL DECK',
    'KNOWLEDGE IS POWER', 'THE GRID IS LIVE', 'OPEN THE VAULT',
    'SEQUENCE COMPLETE', 'DECODE NOW', 'ENCRYPTED', 'TRANSMIT',
    'RUN THE SYSTEM', 'CORE ONLINE', 'DATA STREAM', 'PUSH THE SIGNAL',
    'OVERRIDE COMPLETE', 'EXECUTE', 'NETWORK UP', 'CLEAR CHANNEL',
  ];

  let score = 0, round = 0, combo = 0, totalChars = 0, correctChars = 0;
  let currentPrompt = '', timer = null, timeLeft = 0;
  let active = false;

  const MAX_ROUNDS = 8;
  const BASE_TIME = 10;

  function getTimeForRound(r) { return Math.max(4, BASE_TIME - r * 0.7); }

  function newRound() {
    round++;
    if (round > MAX_ROUNDS) { finish(); return; }

    currentPrompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    timeLeft = getTimeForRound(round);
    const input = document.getElementById('cr-input');
    input.value = '';
    input.focus();
    renderPrompt('');
    document.getElementById('cr-round').textContent = round;
    document.getElementById('cr-score-live').textContent = score;
    document.getElementById('cr-combo').textContent = combo;
    updateTimer();
    startTimer();
  }

  function renderPrompt(typed) {
    const el = document.getElementById('cr-prompt-display');
    el.innerHTML = currentPrompt.split('').map((c, i) => {
      let cls = 'cr-char pending';
      if (i < typed.length) cls = typed[i] === c ? 'cr-char correct' : 'cr-char wrong';
      return `<span class="${cls}">${c}</span>`;
    }).join('');
  }

  function updateTimer() {
    const pct = (timeLeft / getTimeForRound(round)) * 100;
    const bar = document.getElementById('cr-bar');
    bar.style.width = pct + '%';
    bar.className = 'cr-timer-bar' + (pct < 30 ? ' danger' : '');
    document.getElementById('cr-time-label').textContent = Math.ceil(timeLeft) + 's';
  }

  function startTimer() {
    clearInterval(timer);
    const step = 0.1;
    timer = setInterval(() => {
      if (!active) { clearInterval(timer); return; }
      timeLeft -= step;
      updateTimer();
      if (timeLeft <= 0) {
        clearInterval(timer);
        combo = 0;
        playSound('fail');
        document.getElementById('cr-combo').textContent = combo;
        setTimeout(newRound, 400);
      }
    }, step * 1000);
  }

  return {
    start() {
      score = 0; round = 0; combo = 0; totalChars = 0; correctChars = 0;
      active = true;
      hide('cr-intro'); hide('cr-result');
      show('cr-game');
      markGamePlayed('cr');
      const input = document.getElementById('cr-input');
      input.oninput = () => this.handleInput();
      newRound();
    },

    handleInput() {
      if (!active) return;
      const typed = document.getElementById('cr-input').value.toUpperCase();
      renderPrompt(typed);
      totalChars = Math.max(totalChars, typed.length);
      correctChars = typed.split('').filter((c, i) => c === currentPrompt[i]).length;

      if (typed === currentPrompt) {
        clearInterval(timer);
        const timeBonus = Math.round(timeLeft * 10);
        const pts = 100 + timeBonus + combo * 25;
        score += pts;
        combo++;
        playSound('success');
        document.getElementById('cr-score-live').textContent = score;
        document.getElementById('cr-combo').textContent = combo;
        XP.add(pts);
        Achievements.checkXP();
        Achievements.unlock('code_runner');
        setTimeout(newRound, 350);
      }
    },

    quit() {
      active = false;
      clearInterval(timer);
      hide('cr-game'); hide('cr-result');
      show('cr-intro');
    }
  };

  function finish() {
    active = false;
    clearInterval(timer);
    hide('cr-game');
    show('cr-result');
    document.getElementById('cr-final-score').textContent = score;
    const acc = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 0;
    document.getElementById('cr-accuracy').textContent = acc + '%';

    const best = GS.get('cr_best') || 0;
    if (score > best) GS.set('cr_best', score);
    GS.set('cr_played', (GS.get('cr_played') || 0) + 1);
    GS.set('cr_streak', (GS.get('cr_streak') || 0) + 1);
    updateAllStats();
  }

  // Patch finish into return
  CR.finish = finish;
  return CR;
})();

// Patch finish — closure fix
{
  const _crStart = CR.start.bind(CR);
  const _crQuit = CR.quit.bind(CR);
  // finish is called internally via round counter
}

// Simpler, self-contained Code Rush rewrite to avoid closure issue:
const CR2 = {
  PROMPTS: [
    'DECRYPT','UNLOCK','ACCESS GRANTED','KNOWLEDGE FLOWS',
    'SYSTEM READY','BREAK THE CODE','SIGNAL CLEAR','CONTROL DECK',
    'KNOWLEDGE IS POWER','THE GRID IS LIVE','OPEN THE VAULT',
    'SEQUENCE COMPLETE','DECODE NOW','ENCRYPTED','TRANSMIT',
    'RUN THE SYSTEM','CORE ONLINE','DATA STREAM','PUSH THE SIGNAL',
    'OVERRIDE COMPLETE','EXECUTE','NETWORK UP','CLEAR CHANNEL'
  ],
  score:0, round:0, combo:0, totalChars:0, correctChars:0,
  prompt:'', timer:null, timeLeft:0, active:false,
  MAX_ROUNDS:8, BASE_TIME:10,

  getTime(r){ return Math.max(4, this.BASE_TIME - r*0.7); },

  start(){
    this.score=0; this.round=0; this.combo=0; this.totalChars=0; this.correctChars=0; this.active=true;
    hide('cr-intro'); hide('cr-result'); show('cr-game');
    markGamePlayed('cr');
    const inp = document.getElementById('cr-input');
    inp.oninput = () => CR2.handleInput();
    this.newRound();
  },

  newRound(){
    this.round++;
    if(this.round > this.MAX_ROUNDS){ this.finish(); return; }
    this.prompt = this.PROMPTS[Math.floor(Math.random()*this.PROMPTS.length)];
    this.timeLeft = this.getTime(this.round);
    const inp = document.getElementById('cr-input');
    inp.value=''; inp.focus();
    this.renderPrompt('');
    document.getElementById('cr-round').textContent = this.round;
    document.getElementById('cr-score-live').textContent = this.score;
    document.getElementById('cr-combo').textContent = this.combo;
    this.updateTimer();
    this.startTimer();
  },

  renderPrompt(typed){
    const el = document.getElementById('cr-prompt-display');
    if(!el) return;
    el.innerHTML = this.prompt.split('').map((c,i)=>{
      let cls='cr-char pending';
      if(i<typed.length) cls = typed[i]===c?'cr-char correct':'cr-char wrong';
      return `<span class="${cls}">${c}</span>`;
    }).join('');
  },

  updateTimer(){
    const pct=(this.timeLeft/this.getTime(this.round))*100;
    const bar=document.getElementById('cr-bar');
    if(!bar) return;
    bar.style.width=pct+'%';
    bar.className='cr-timer-bar'+(pct<30?' danger':'');
    const tl=document.getElementById('cr-time-label');
    if(tl) tl.textContent=Math.ceil(this.timeLeft)+'s';
  },

  startTimer(){
    clearInterval(this.timer);
    const step=0.1;
    this.timer=setInterval(()=>{
      if(!this.active){ clearInterval(this.timer); return; }
      this.timeLeft-=step;
      this.updateTimer();
      if(this.timeLeft<=0){
        clearInterval(this.timer);
        this.combo=0;
        playSound('fail');
        const cc=document.getElementById('cr-combo');
        if(cc) cc.textContent=0;
        setTimeout(()=>this.newRound(), 400);
      }
    }, step*1000);
  },

  handleInput(){
    if(!this.active) return;
    const typed = document.getElementById('cr-input').value.toUpperCase();
    this.renderPrompt(typed);
    this.totalChars = Math.max(this.totalChars, typed.length);
    this.correctChars = typed.split('').filter((c,i)=>c===this.prompt[i]).length;
    if(typed===this.prompt){
      clearInterval(this.timer);
      const tb=Math.round(this.timeLeft*10);
      const pts=100+tb+this.combo*25;
      this.score+=pts; this.combo++;
      playSound('success');
      document.getElementById('cr-score-live').textContent=this.score;
      document.getElementById('cr-combo').textContent=this.combo;
      XP.add(pts); Achievements.checkXP(); Achievements.unlock('code_runner');
      setTimeout(()=>this.newRound(), 350);
    }
  },

  finish(){
    this.active=false; clearInterval(this.timer);
    hide('cr-game'); show('cr-result');
    document.getElementById('cr-final-score').textContent=this.score;
    const acc=this.totalChars>0?Math.round((this.correctChars/this.totalChars)*100):0;
    document.getElementById('cr-accuracy').textContent=acc+'%';
    const best=GS.get('cr_best')||0;
    if(this.score>best) GS.set('cr_best',this.score);
    GS.set('cr_played',(GS.get('cr_played')||0)+1);
    GS.set('cr_streak',(GS.get('cr_streak')||0)+1);
    updateAllStats();
  },

  quit(){
    this.active=false; clearInterval(this.timer);
    hide('cr-game'); hide('cr-result'); show('cr-intro');
  }
};

// Override CR references with CR2
const CR_FINAL = CR2;
// Rebind onclick in HTML elements to use CR2
window.CR = CR2;

// ================================
// THE GRID
// ================================
const TG = {
  level:0, score:0, size:3,
  pattern:[], userPattern:[],
  phase:'show', active:false,
  showTimer:null,

  getLevelConfig(l){
    if(l<3) return {size:3, cells:Math.min(4+l, 6)};
    if(l<6) return {size:4, cells:Math.min(6+l, 10)};
    return {size:5, cells:Math.min(10+l, 18)};
  },

  start(){
    this.level=0; this.score=0; this.active=true;
    hide('tg-intro'); hide('tg-result'); show('tg-game');
    markGamePlayed('tg');
    this.nextLevel();
  },

  nextLevel(){
    const cfg = this.getLevelConfig(this.level);
    this.size = cfg.size;
    this.pattern = this.generatePattern(cfg.size, cfg.cells);
    this.userPattern = [];
    this.phase='show';

    document.getElementById('tg-level-live').textContent = this.level+1;
    document.getElementById('tg-score-live').textContent = this.score;
    document.getElementById('tg-phase').textContent = 'Memorize';
    document.getElementById('tg-remaining').textContent = '';
    this.renderGrid(true);

    const showTime = 1500 + this.level * 200;
    this.showTimer = setTimeout(()=>{
      this.phase='input';
      document.getElementById('tg-phase').textContent = 'Reproduce';
      document.getElementById('tg-remaining').textContent = `${this.pattern.length} cells to select`;
      this.renderGrid(false);
    }, showTime);
  },

  generatePattern(size, count){
    const all = [];
    for(let r=0;r<size;r++) for(let c=0;c<size;c++) all.push(r*size+c);
    const shuffled = all.sort(()=>Math.random()-0.5);
    return shuffled.slice(0, count);
  },

  renderGrid(showPattern){
    const el = document.getElementById('tg-grid');
    const total = this.size*this.size;
    el.style.gridTemplateColumns = `repeat(${this.size},1fr)`;
    el.innerHTML = '';
    for(let i=0;i<total;i++){
      const cell = document.createElement('div');
      cell.className='tg-cell';
      if(showPattern && this.pattern.includes(i)) cell.classList.add('lit');
      if(!showPattern && this.userPattern.includes(i)) cell.classList.add('user-lit');
      if(!showPattern && this.phase==='input'){
        cell.onclick=()=>this.toggleCell(i);
        cell.style.cursor='pointer';
      }
      el.appendChild(cell);
    }
  },

  toggleCell(idx){
    if(this.phase!=='input') return;
    const already = this.userPattern.indexOf(idx);
    if(already>=0){
      this.userPattern.splice(already,1);
    } else {
      this.userPattern.push(idx);
    }
    this.renderGrid(false);
    const rem = this.pattern.length - this.userPattern.length;
    document.getElementById('tg-remaining').textContent = rem > 0 ? `${rem} more to select` : 'Ready — confirm below';

    if(this.userPattern.length>=this.pattern.length){
      setTimeout(()=>this.checkPattern(), 300);
    }
  },

  checkPattern(){
    const sortedPattern = [...this.pattern].sort((a,b)=>a-b);
    const sortedUser = [...this.userPattern].sort((a,b)=>a-b);
    const correct = JSON.stringify(sortedPattern)===JSON.stringify(sortedUser);

    // Reveal result
    const cells = document.querySelectorAll('.tg-cell');
    cells.forEach((cell,i)=>{
      cell.onclick=null;
      const inPattern=this.pattern.includes(i);
      const inUser=this.userPattern.includes(i);
      cell.classList.remove('user-lit','lit');
      if(inPattern && inUser) cell.classList.add('correct-lit');
      else if(inPattern && !inUser) cell.classList.add('lit');
      else if(!inPattern && inUser) cell.classList.add('wrong-lit');
    });

    if(correct){
      const pts=(this.level+1)*150;
      this.score+=pts;
      document.getElementById('tg-score-live').textContent=this.score;
      document.getElementById('tg-phase').textContent='Correct!';
      playSound('success');
      XP.add(pts); Achievements.checkXP(); Achievements.unlock('grid_walker');
      this.level++;
      setTimeout(()=>this.nextLevel(), 1200);
    } else {
      document.getElementById('tg-phase').textContent='Incorrect.';
      playSound('fail');
      setTimeout(()=>this.finish(), 1200);
    }
  },

  finish(){
    this.active=false;
    hide('tg-game'); show('tg-result');
    document.getElementById('tg-final-score').textContent=this.score;
    document.getElementById('tg-result-msg').textContent=`Completed ${this.level} level${this.level!==1?'s':''}.`;
    const best=GS.get('tg_best')||0;
    if(this.score>best) GS.set('tg_best',this.score);
    const bl=GS.get('tg_best_level')||1;
    if(this.level+1>bl) GS.set('tg_best_level',this.level+1);
    GS.set('tg_played',(GS.get('tg_played')||0)+1);
    updateAllStats();
  },

  quit(){
    this.active=false;
    clearTimeout(this.showTimer);
    hide('tg-game'); hide('tg-result'); show('tg-intro');
  }
};

// Expose to global
window.LB = LB;
window.TG = TG;
