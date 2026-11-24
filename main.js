/* =========================================================
   INFORME N.º 10 · ENSAYO DE GOMA
   ========================================================= */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ---------------------------------------------------------
     SONIDO — todo sintetizado, arranca apagado
     --------------------------------------------------------- */
  const Sound = {
    on: false,
    ctx: null,
    get() {
      if (!this.on) return null;
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    },
  };

  function noise(ctx, dur) {
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    const n = ctx.createBufferSource();
    n.buffer = buf;
    return n;
  }

  function boing(strength = 1) {
    const ctx = Sound.get(); if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    osc.type = "triangle";
    const base = 120 + Math.random() * 60;
    osc.frequency.setValueAtTime(base * 2.6, t);
    osc.frequency.exponentialRampToValueAtTime(base, t + 0.35);
    lfo.frequency.setValueAtTime(18, t);
    lfo.frequency.linearRampToValueAtTime(6, t + 0.5);
    lg.gain.setValueAtTime(40 * strength, t);
    lg.gain.exponentialRampToValueAtTime(1, t + 0.55);
    lfo.connect(lg).connect(osc.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2 * Math.min(1, strength), t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6 + strength * 0.2);
    osc.connect(g).connect(ctx.destination);
    osc.start(t); lfo.start(t);
    osc.stop(t + 0.9); lfo.stop(t + 0.9);
  }

  function zap() {
    const ctx = Sound.get(); if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(1760, t + 0.06);
    o.frequency.exponentialRampToValueAtTime(220, t + 0.18);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.21);
  }

  function thud(big = false) {
    const ctx = Sound.get(); if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(big ? 120 : 160, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    g.gain.setValueAtTime(big ? 0.5 : 0.32, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.26);
    const n = noise(ctx, 0.12), f = ctx.createBiquadFilter(), ng = ctx.createGain();
    f.type = "lowpass"; f.frequency.value = 1800;
    ng.gain.value = big ? 0.45 : 0.28;
    n.connect(f).connect(ng).connect(ctx.destination);
    n.start(t);
  }

  function clack() {
    const ctx = Sound.get(); if (!ctx) return;
    const t = ctx.currentTime;
    const n = noise(ctx, 0.06), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = "bandpass"; f.frequency.value = 2400; f.Q.value = 3;
    g.gain.value = 0.6;
    n.connect(f).connect(g).connect(ctx.destination);
    n.start(t);
  }

  function crash() {
    const ctx = Sound.get(); if (!ctx) return;
    const t = ctx.currentTime;
    // metal que se parte
    [310, 467, 733, 1190].forEach((fr, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(fr, t);
      o.frequency.exponentialRampToValueAtTime(fr * 0.7, t + 0.8);
      g.gain.setValueAtTime(0.05 / (i + 1), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + 1);
    });
    const n = noise(ctx, 0.5), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = "highpass"; f.frequency.value = 900;
    g.gain.value = 0.35;
    n.connect(f).connect(g).connect(ctx.destination);
    n.start(t);
    setTimeout(() => boing(1.6), 120);
  }

  // crujido continuo de la máquina, atado a la tensión
  let creak = null;
  function creakStop() {
    if (!creak) return;
    const c = creak; creak = null;
    const t = c.ctx.currentTime;
    c.g.gain.cancelScheduledValues(t);
    c.g.gain.setValueAtTime(c.g.gain.value, t);
    c.g.gain.linearRampToValueAtTime(0, t + 0.06);
    c.lg.gain.cancelScheduledValues(t);
    c.lg.gain.setValueAtTime(0, t);
    try { c.o.stop(t + 0.08); c.lfo.stop(t + 0.08); } catch (_) { /* ya parado */ }
  }
  function creakSet(level) {
    const ctx = Sound.get();
    if (!ctx || level <= 0) { creakStop(); return; }
    if (!creak) {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      const lfo = ctx.createOscillator(), lg = ctx.createGain(), out = ctx.createGain();
      o.type = "sawtooth"; f.type = "bandpass"; f.Q.value = 6;
      // el temblor modula una ganancia intermedia, nunca por encima de cero
      g.gain.value = 0; lg.gain.value = 0; out.gain.value = 0.5;
      lfo.frequency.value = 9;
      lfo.connect(lg).connect(out.gain);
      o.connect(f).connect(g).connect(out).connect(ctx.destination);
      o.start(); lfo.start();
      creak = { ctx, o, f, g, lfo, lg, out };
    }
    const t = ctx.currentTime;
    creak.o.frequency.setTargetAtTime(55 + level * 140, t, 0.05);
    creak.f.frequency.setTargetAtTime(300 + level * 1500, t, 0.05);
    creak.g.gain.setTargetAtTime(0.02 + level * 0.06, t, 0.05);
    creak.lfo.frequency.setTargetAtTime(6 + level * 20, t, 0.05);
    creak.lg.gain.setTargetAtTime(0.25 + level * 0.25, t, 0.05);
  }

  const sndBtn = $("#snd");
  if (sndBtn) {
    sndBtn.addEventListener("click", () => {
      Sound.on = !Sound.on;
      sndBtn.setAttribute("aria-pressed", String(Sound.on));
      sndBtn.setAttribute("aria-label", Sound.on ? "Desactivar sonido" : "Activar sonido");
      $("#sndState").textContent = Sound.on ? "on" : "off";
      if (Sound.on) boing(0.8);
      else creakSet(0);
    });
  }

  /* ---------------------------------------------------------
     TOAST
     --------------------------------------------------------- */
  const toastEl = $("#toast");
  let toastT;
  function toast(msg, ms = 2600) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove("show"), ms);
  }

  /* ---------------------------------------------------------
     PARTÍCULAS — virutas de goma, cargas, chispas y tuercas
     --------------------------------------------------------- */
  const fx = $("#fx");
  const live = [];
  let fxRunning = false;
  function burst(x, y, { n = 16, kinds = ["crumb", "crumb", "plus", "bolt"], power = 1, up = 8 } = {}) {
    if (!fx) return;
    if (reduceMotion) n = Math.min(n, 4);
    for (let i = 0; i < n; i++) {
      const el = document.createElement("span");
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      el.className = `bit ${kind}`;
      if (kind === "plus") el.textContent = "+";
      if (kind === "crumb") { el.style.width = `${rand(6, 14)}px`; el.style.height = `${rand(5, 9)}px`; }
      fx.appendChild(el);
      const a = Math.random() * Math.PI * 2;
      const sp = rand(5, 13) * power;
      live.push({ el, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - up * power, r: rand(0, 360), vr: rand(-25, 25), life: 0, max: rand(60, 100) });
    }
    if (!fxRunning) { fxRunning = true; requestAnimationFrame(stepFx); }
  }
  function stepFx() {
    for (let i = live.length - 1; i >= 0; i--) {
      const p = live[i];
      p.vy += 0.5; p.vx *= 0.985;
      p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life++;
      p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg)`;
      p.el.style.opacity = String(clamp(1.4 - p.life / p.max, 0, 1));
      if (p.life > p.max || p.y > window.innerHeight + 40) { p.el.remove(); live.splice(i, 1); }
    }
    if (live.length) requestAnimationFrame(stepFx);
    else fxRunning = false;
  }

  /* ---------------------------------------------------------
     LETRAS DE GOMA — resortes acoplados (carátula)
     --------------------------------------------------------- */
  const rubberEl = $("#rubber");
  const letters = rubberEl ? $$("span", rubberEl).map((el, i) => ({
    el, i, x: 0, y: reduceMotion ? 0 : -window.innerHeight * 1.2 - i * 70,
    vx: 0, vy: 0, dragging: false, sx: 0, sy: 0, landed: reduceMotion,
  })) : [];
  const K = 0.075, DAMP = 0.86, COUPLE = [1, 0.42, 0.16, 0.05];
  let active = null;
  let dropping = false;
  let attempts = 0;

  const heroNote = $("#heroNote"), heroNoteTxt = $("#heroNoteTxt");
  const noteLines = [
    [5, "dejá de intentar.<br />no se rompe."],
    [12, "en serio.<br />ya lo probó un laboratorio."],
    [25, "ok, lo estás disfrutando.<br />no pasa nada."],
  ];

  letters.forEach((L) => {
    L.el.addEventListener("pointerdown", (e) => {
      if (!dropping) return;
      e.preventDefault();
      L.el.setPointerCapture(e.pointerId);
      L.dragging = true;
      L.el.classList.add("grabbed");
      L.sx = e.clientX - L.x; L.sy = e.clientY - L.y;
      active = L;
    });
    L.el.addEventListener("pointermove", (e) => {
      if (!L.dragging) return;
      const dx = e.clientX - L.sx, dy = e.clientY - L.sy;
      const d = Math.hypot(dx, dy) || 1;
      const max = Math.min(window.innerWidth, 900) * 0.45;
      const f = max * Math.tanh(d / max) / d; // cuanto más estirás, más cuesta
      L.vx = dx * f - L.x; L.vy = dy * f - L.y;
      L.x = dx * f; L.y = dy * f;
    });
    const release = () => {
      if (!L.dragging) return;
      L.dragging = false;
      L.el.classList.remove("grabbed");
      active = null;
      const d = Math.hypot(L.x, L.y);
      if (d > 20) boing(Math.min(1.4, d / 160));
      const max = Math.min(window.innerWidth, 900) * 0.45;
      if (d > max * 0.6) {
        attempts++;
        const line = noteLines.find(([n]) => n === attempts);
        if (line && heroNoteTxt) {
          heroNoteTxt.innerHTML = line[1];
          heroNote.classList.add("angry");
        }
      }
    };
    L.el.addEventListener("pointerup", release);
    L.el.addEventListener("pointercancel", release);
  });

  function stepLetters() {
    for (const L of letters) {
      if (L.dragging) continue;
      let tx = 0, ty = 0;
      if (active) {
        const c = COUPLE[Math.abs(active.i - L.i)] || 0;
        tx = active.x * c; ty = active.y * c;
      }
      const prevVy = L.vy;
      L.vx = (L.vx + (tx - L.x) * K) * DAMP;
      L.vy = (L.vy + (ty - L.y) * K) * DAMP;
      L.x += L.vx; L.y += L.vy;
      // aterrizaje: primer cruce por el piso => boing chiquito
      if (!L.landed && L.y > -2 && prevVy > 0) {
        L.landed = true;
        if (L.i === letters.length - 1) {
          setTimeout(() => {
            const g = $("#goma");
            if (g) { g.classList.remove("boing"); void g.offsetWidth; g.classList.add("boing"); }
          }, 250);
        }
      }
    }
    for (const L of letters) {
      const d = Math.hypot(L.x, L.y), v = Math.hypot(L.vx, L.vy);
      const ang = L.dragging ? Math.atan2(L.y, L.x) : Math.atan2(L.vy, L.vx);
      const s = L.dragging ? 1 + Math.min(d / 180, 1.1) : 1 + Math.min(v / 40, 0.5);
      L.el.style.transform =
        `translate(${L.x.toFixed(1)}px, ${L.y.toFixed(1)}px) rotate(${ang}rad) scale(${s.toFixed(3)}, ${(1 / Math.sqrt(s)).toFixed(3)}) rotate(${-ang}rad)`;
    }
  }

  function dropLetters() {
    letters.forEach((L) => {
      L.y = reduceMotion ? 0 : -window.innerHeight * 1.2 - L.i * 70;
      L.x = 0; L.vx = 0; L.vy = 0;
      L.landed = reduceMotion;
    });
    dropping = true;
  }

  // de vez en cuando una letra salta sola, porque puede
  if (!reduceMotion && letters.length) {
    setInterval(() => {
      if (active || !dropping || document.hidden) return;
      const L = letters[Math.floor(Math.random() * letters.length)];
      L.vy -= 14 + Math.random() * 10;
      L.vx += (Math.random() - 0.5) * 10;
    }, 2800);
  }

  const gomaBtn = $("#goma");
  if (gomaBtn) {
    gomaBtn.addEventListener("click", (e) => {
      gomaBtn.classList.remove("boing"); void gomaBtn.offsetWidth; gomaBtn.classList.add("boing");
      boing(1);
      burst(e.clientX || innerWidth / 2, e.clientY || innerHeight / 2, { n: 10, kinds: ["crumb"] });
    });
  }

  /* ---------------------------------------------------------
     CAMPO ELÉCTRICO — el cursor es una carga +q
     --------------------------------------------------------- */
  const canvas = $("#field");
  const hero = $(".hero");
  let stepField = () => {};
  let heroVisible = true;
  if (canvas && hero) {
    const tag = $("#chargeTag");
    const c2 = canvas.getContext("2d");
    let W = 0, H = 0;
    const charges = [
      { x: 0.5, y: 0.5, q: +1 },
      { x: 0.1, y: 0.86, q: -0.7 },
      { x: 0.9, y: 0.22, q: -0.7 },
      { x: 0.8, y: 0.9, q: -0.5 },
      { x: 0.18, y: 0.16, q: -0.5 },
    ];
    let mouseIn = false, tAuto = 0;
    const resize = () => {
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      const r = hero.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      c2.setTransform(DPR, 0, 0, DPR, 0, 0);
      c2.fillStyle = "#170A33"; c2.fillRect(0, 0, W, H);
    };
    resize();
    let rT; window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(resize, 120); });

    hero.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      const r = hero.getBoundingClientRect();
      charges[0].x = (e.clientX - r.left) / W;
      charges[0].y = (e.clientY - r.top) / H;
      mouseIn = true;
      tag.style.opacity = "1";
      tag.style.transform = `translate(${e.clientX - r.left + 18}px, ${e.clientY - r.top - 30}px)`;
    });
    hero.addEventListener("pointerleave", () => { mouseIn = false; tag.style.opacity = "0"; });

    const N = window.innerWidth < 700 ? 130 : 300;
    const parts = [];
    const spawn = (p) => {
      const c = charges[0], a = Math.random() * Math.PI * 2;
      p.x = c.x * W + Math.cos(a) * 14; p.y = c.y * H + Math.sin(a) * 14;
      p.age = 0; p.life = 120 + Math.random() * 160;
      p.hue = Math.random() < 0.18 ? "#FF6FA3" : Math.random() < 0.08 ? "#FFE14D" : "#3DF5FF";
      return p;
    };
    for (let i = 0; i < N; i++) { const p = spawn({}); p.age = Math.random() * p.life; parts.push(p); }
    const field = (x, y) => {
      let ex = 0, ey = 0;
      for (const c of charges) {
        const dx = x - c.x * W, dy = y - c.y * H;
        const r2 = dx * dx + dy * dy + 80;
        const inv = c.q / (r2 * Math.sqrt(r2));
        ex += dx * inv; ey += dy * inv;
      }
      return [ex, ey];
    };
    stepField = () => {
      if (!mouseIn) {
        tAuto += 0.008;
        charges[0].x = 0.5 + Math.cos(tAuto) * 0.24;
        charges[0].y = 0.5 + Math.sin(tAuto * 1.3) * 0.2;
      }
      c2.fillStyle = "rgba(23, 10, 51, 0.12)"; c2.fillRect(0, 0, W, H);
      c2.lineWidth = 1.5;
      for (const p of parts) {
        const [ex, ey] = field(p.x, p.y);
        const m = Math.hypot(ex, ey) || 1;
        const nx = p.x + (ex / m) * 2.6, ny = p.y + (ey / m) * 2.6;
        c2.strokeStyle = p.hue;
        c2.globalAlpha = Math.min(1, (1 - p.age / p.life) * 1.4) * 0.7;
        c2.beginPath(); c2.moveTo(p.x, p.y); c2.lineTo(nx, ny); c2.stroke();
        p.x = nx; p.y = ny; p.age++;
        let dead = p.age > p.life || p.x < -10 || p.y < -10 || p.x > W + 10 || p.y > H + 10;
        for (let i = 1; i < charges.length && !dead; i++) {
          if (Math.hypot(p.x - charges[i].x * W, p.y - charges[i].y * H) < 10) dead = true;
        }
        if (dead) spawn(p);
      }
      c2.globalAlpha = 1;
      c2.font = "bold 20px VT323, monospace"; c2.textAlign = "center"; c2.textBaseline = "middle";
      for (let i = 1; i < charges.length; i++) {
        const c = charges[i];
        c2.fillStyle = "#FF6FA3"; c2.beginPath(); c2.arc(c.x * W, c.y * H, 10, 0, Math.PI * 2); c2.fill();
        c2.fillStyle = "#170A33"; c2.fillText("−", c.x * W, c.y * H + 1);
      }
      const c0 = charges[0];
      c2.fillStyle = "#3DF5FF"; c2.beginPath(); c2.arc(c0.x * W, c0.y * H, 8, 0, Math.PI * 2); c2.fill();
    };
    new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe(hero);
    if (reduceMotion) for (let i = 0; i < 220; i++) stepField();
  }

  function loop() {
    if (letters.length && heroVisible) stepLetters();
    if (heroVisible && !reduceMotion && !document.hidden) stepField();
    requestAnimationFrame(loop);
  }

  /* ---------------------------------------------------------
     CARGA — espera las tipografías y suelta las letras
     --------------------------------------------------------- */
  const loader = $("#loader");
  function startShow() {
    if (loader) loader.classList.add("done");
    setTimeout(dropLetters, reduceMotion ? 0 : 180);
  }
  if (loader && !reduceMotion) {
    const band = $(".loader-band i", loader), pct = $("#loaderPct");
    const t0 = performance.now();
    let ready = false;
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    fontsReady.then(() => { ready = true; });
    setTimeout(() => { ready = true; }, 2500);
    const tick = (now) => {
      const el = now - t0;
      const p = ready ? clamp(el / 900, 0, 1) : clamp(el / 2400, 0, 0.85);
      band.style.setProperty("--p", (0.02 + p * 0.98).toFixed(3));
      pct.textContent = Math.round(p * 900);
      if (p >= 1 && ready) startShow();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } else {
    startShow();
  }
  requestAnimationFrame(loop);

  /* ---------------------------------------------------------
     REVELADOS
     --------------------------------------------------------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      io.unobserve(e.target);
    });
  }, { threshold: 0.2 });
  $$("[data-reveal], .sign").forEach((el) => io.observe(el));

  // observaciones: se escriben de a una (se observa la lista, no cada línea recortada)
  const noteList = $(".note-list");
  if (noteList) {
    new IntersectionObserver(([e], obs) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      $$("li", noteList).forEach((li, i) => setTimeout(() => li.classList.add("in"), reduceMotion ? 0 : 300 + i * 1300));
    }, { threshold: 0.25 }).observe(noteList);
  }

  /* ---------------------------------------------------------
     1 · FICHA — anexo confidencial (3 toques al código)
     --------------------------------------------------------- */
  const specCode = $("#specCode"), classified = $("#classified");
  if (specCode && classified) {
    let taps = 0;
    specCode.addEventListener("click", () => {
      taps++;
      specCode.classList.remove("tick"); void specCode.offsetWidth; specCode.classList.add("tick");
      zap();
      if (taps === 1) toast("acceso restringido");
      if (taps === 2) toast("acceso muy restringido");
      if (taps === 3) {
        classified.hidden = false;
        requestAnimationFrame(() => classified.classList.add("open"));
        toast("bueno, pasá");
        thud(false);
      }
    });
  }

  /* ---------------------------------------------------------
     1 · VIDEO · YO PUEDO
     --------------------------------------------------------- */
  const yp = $("#yopuedo"), ypVideo = $("#ypVideo"), ypSound = $("#ypSound");
  if (ypVideo) {
    const pop = () => { yp.classList.remove("pop"); void yp.offsetWidth; yp.classList.add("pop"); };
    let lastT = 0;
    ypVideo.addEventListener("timeupdate", () => {
      if (ypVideo.currentTime < lastT - 1) {
        pop();
        if (!ypVideo.muted) {
          const r = ypVideo.getBoundingClientRect();
          burst(r.left + r.width / 2, r.top + r.height * 0.3, { n: 10 });
        }
      }
      lastT = ypVideo.currentTime;
    });
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (!reduceMotion || !ypVideo.muted) ypVideo.play().catch(() => {}); pop(); }
      else ypVideo.pause();
    }, { threshold: 0.3 }).observe(ypVideo);

    ypSound.addEventListener("click", (e) => {
      const on = ypVideo.muted;
      ypVideo.muted = !on;
      ypSound.setAttribute("aria-pressed", String(on));
      $(".yp-sound-txt", ypSound).textContent = on ? "sonando" : "escuchar la declaración";
      if (on) {
        ypVideo.currentTime = 0;
        ypVideo.play().catch(() => {});
        pop();
        burst(e.clientX, e.clientY, { n: 14 });
      }
    });
  }

  /* ---------------------------------------------------------
     2 · ENSAYO DE TRACCIÓN — el gran momento
     --------------------------------------------------------- */
  const pull = $("#pull");
  if (pull) {
    const sticky = $(".pull-sticky", pull);
    const rig = $("#rig"), world = $("#world");
    const glyphs = $$("#pullWord span");
    const bandPath = $("#bandPath");
    const clampL = $("#clampL"), clampR = $("#clampR");
    const ruler = $("#ruler"), rc = ruler.getContext("2d");
    const lcdF = $("#lcdF"), lcdE = $("#lcdE"), lcdR = $("#lcdR");
    const lcdBox = $(".lcd2", pull);
    const statusEl = $("#pullStatus"), lamp = $("#lamp");

    const SMAX = 10;            // 900 % de elongación
    let rigW = 0, rigH = 0, fs = 100, W = 0, cw = 90, ch = 150;
    let widths = [], centers = [];
    let s = 1, sTarget = 1, sv = 0, cam = 1;
    let broken = false, gripped = false, stamped = false;
    let flyers = null, breakAt = 0;
    let lastStatus = "";

    const measure = () => {
      rigW = rig.clientWidth; rigH = rig.clientHeight;
      fs = Math.min(rigW * (rigW < 600 ? 0.13 : 0.1), rigH * 0.42, 150);
      $("#pullWord").style.fontSize = `${fs}px`;
      cw = fs * 0.78; ch = fs * 1.55;
      rig.style.setProperty("--cw", `${cw}px`);
      rig.style.setProperty("--ch", `${ch}px`);
      widths = glyphs.map((g) => g.offsetWidth);
      // las letras se pisan un poco, como en el título
      const kern = -fs * 0.03;
      W = widths.reduce((a, b) => a + b, 0) + kern * (glyphs.length - 1);
      let x = -W / 2;
      centers = widths.map((w) => { const c = x + w / 2; x += w + kern; return c; });
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      ruler.width = rigW * DPR; ruler.height = 46 * DPR;
      rc.setTransform(DPR, 0, 0, DPR, 0, 0);
    };

    const fmtN = (n) => n < 1000 ? `${Math.round(n)} N` : n < 1e6 ? `${(n / 1000).toFixed(1)} kN` : "sí";
    const status = (txt) => { if (txt !== lastStatus) { statusEl.textContent = txt; lastStatus = txt; } };

    const drawRuler = (c) => {
      rc.clearRect(0, 0, rigW, 46);
      const pxPerCm = W / 24; // la muestra mide 24 cm en reposo (aprox.)
      const screenPerCm = pxPerCm * c;
      const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
      const step = steps.find((st) => st * screenPerCm >= 12) || 1000;
      const major = step * 5;
      const cx = rigW / 2;
      const range = Math.ceil(cx / (step * screenPerCm)) + 1;
      rc.strokeStyle = "rgba(255,246,236,.55)";
      rc.fillStyle = "rgba(255,246,236,.7)";
      rc.font = "16px VT323, monospace";
      rc.textAlign = "center";
      rc.lineWidth = 1.5;
      rc.beginPath(); rc.moveTo(0, 6); rc.lineTo(rigW, 6); rc.stroke();
      for (let k = -range; k <= range; k++) {
        const v = k * step;
        const x = cx + v * screenPerCm;
        const isMajor = v % major === 0;
        rc.beginPath(); rc.moveTo(x, 6); rc.lineTo(x, isMajor ? 22 : 13); rc.stroke();
        if (isMajor) {
          const a = Math.abs(v);
          rc.fillText(a === 0 ? "0" : a < 100 ? `${a} cm` : `${a / 100} m`, x, 38);
        }
      }
    };

    const render = (stress) => {
      const half = (W / 2) * s;
      const pad = fs * 0.12;
      // camara: aleja para que entre todo, hasta un límite; después se sale de cuadro
      const need = 2 * (half + pad + cw * 1.1);
      const camTarget = broken ? 1 : clamp((rigW * 0.94) / need, rigW < 600 ? 0.6 : 0.5, 1);
      cam += (camTarget - cam) * (broken ? 0.08 : 0.25);
      const shx = stress > 0 ? rand(-1, 1) * stress * 5 : 0;
      const shy = stress > 0 ? rand(-1, 1) * stress * 3 : 0;
      world.style.transform = `translate(${shx.toFixed(1)}px, ${shy.toFixed(1)}px) scale(${cam.toFixed(4)})`;

      // letras: se separan y se estiran (volumen ~constante)
      const sx = clamp(1 + (s - 1) * 0.16, 0.6, 2.6);
      const sy = 1 / Math.sqrt(sx);
      glyphs.forEach((g, i) => {
        const x = centers[i] * s - widths[i] / 2;
        const wob = broken ? Math.sin(performance.now() / 70 + i) * clamp(Math.abs(sv) * 2, 0, 8) : 0;
        g.style.transform = `translate(${x.toFixed(1)}px, ${(-fs * 0.56).toFixed(1)}px) rotate(${wob.toFixed(2)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
      });

      // banda de goma con estricción en el medio
      const L = half + pad + (broken ? 0 : cw * 0.35);
      const h0 = fs * 0.34;
      const hm = h0 / Math.pow(Math.max(s, 0.6), 0.75);
      const cy = -hm + h0 / 2;
      bandPath.parentNode.style.opacity = clamp((s - 1.04) / 0.45, 0, 1).toFixed(3);
      bandPath.setAttribute("d",
        `M${-L},${-h0 / 2} Q0,${cy} ${L},${-h0 / 2} L${L},${h0 / 2} Q0,${-cy} ${-L},${h0 / 2} Z`);

      // mordazas
      if (!flyers) {
        const grip = gripped ? 1 : 0;
        const off = (1 - grip) * cw * 1.4;
        const xr = half + pad + cw / 2 + off;
        clampR.style.transform = `translate(${(xr - cw / 2).toFixed(1)}px, ${(-ch / 2).toFixed(1)}px)`;
        clampL.style.transform = `translate(${(-xr - cw / 2).toFixed(1)}px, ${(-ch / 2).toFixed(1)}px)`;
      } else {
        for (const f of flyers) {
          f.vy += 1.1; f.x += f.vx; f.y += f.vy; f.r += f.vr;
          f.el.style.transform = `translate(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px) rotate(${f.r.toFixed(1)}deg)`;
        }
      }
      drawRuler(cam);
    };

    const doBreak = () => {
      broken = true;
      pull.classList.remove("paused", "doubt");
      pull.classList.add("broken");
      rig.classList.remove("hot");
      lcdBox.classList.remove("glitch");
      lamp.classList.remove("on");
      breakAt = performance.now();
      const id = runId;
      // las mordazas salen volando
      const half = (W / 2) * s, pad = fs * 0.12;
      const xr = half + pad;
      flyers = [
        { el: clampR, x: xr, y: -ch / 2, vx: rand(26, 34) / cam, vy: -rand(18, 24) / cam, r: 0, vr: rand(12, 20) },
        { el: clampL, x: -xr - cw, y: -ch / 2, vx: -rand(26, 34) / cam, vy: -rand(16, 22) / cam, r: 0, vr: -rand(12, 20) },
      ];
      sv = -0.6; // tirón inicial hacia adentro
      sticky.classList.remove("quake"); void sticky.offsetWidth; sticky.classList.add("quake");
      creakSet(0);
      crash();
      if (navigator.vibrate) navigator.vibrate([60, 40, 120]);
      const r = rig.getBoundingClientRect();
      const midY = r.top + r.height * 0.46;
      burst(r.left + 20, midY, { n: 12, kinds: ["metal", "nut", "nut"], power: 1.3 });
      burst(r.right - 20, midY, { n: 12, kinds: ["metal", "nut", "nut"], power: 1.3 });
      lcdF.textContent = "ERR"; lcdE.textContent = "ERR"; lcdR.textContent = "—";
      status("Ensayo finalizado. Se rompió la máquina.");
      setTimeout(() => {
        if (id !== runId) return;
        pull.classList.add("stamped");
        stamped = true;
        thud(true);
        burst(innerWidth / 2, r.top + r.height * 0.42, { n: 18, kinds: ["crumb", "crumb", "bolt", "plus"] });
      }, 1100);
      setTimeout(() => {
        if (id !== runId) return;
        clampL.style.visibility = clampR.style.visibility = "hidden";
        flyers = [];
        status("Daños: una máquina. Muestra: intacta, un poco agrandada.");
        lcdF.textContent = "—"; lcdE.textContent = "0 %"; lcdR.textContent = "nunca";
      }, 3200);
    };

    // ---- el ensayo ahora lo dispara un botón y corre solo, con su timing ----
    const goBtn = $("#pullGo"), goTxt = $("#pullGoTxt");
    const T_GRIP = 600, T_STRETCH = 6800, T_PAUSE = 8400; // ms; después, se rompe
    let state = "idle";   // idle | running | broken
    let t0 = 0, runId = 0, animating = false, settleUntil = 0, pullVisible = false;

    const setBtn = (txt, disabled) => {
      goTxt.innerHTML = txt;
      goBtn.disabled = disabled;
      goBtn.classList.toggle("busy", disabled);
    };

    const idleState = () => {
      status("Muestra sujeta. Falta que aprietes el botón rojo.");
      lcdF.textContent = "0 N"; lcdE.textContent = "0 %"; lcdR.textContent = "30 %";
    };

    const stepPull = (now) => {
      let stress = 0;
      if (state === "running") {
        const el = now - t0;
        if (el < T_GRIP) {
          sTarget = 1;
          status("Sujetando muestra.");
        } else if (el < T_STRETCH) {
          if (!gripped) { gripped = true; clack(); }
          const t = (el - T_GRIP) / (T_STRETCH - T_GRIP);
          sTarget = 1 + Math.pow(t, 1.6) * (SMAX - 1);
          stress = clamp(t * 1.1, 0, 1);
          pull.classList.toggle("doubt", s > 4.5);
          rig.classList.toggle("hot", s > 6.5);
          lcdBox.classList.toggle("glitch", s > 7.5);
          lamp.classList.toggle("on", s > 3 && Math.floor(now / (s > 6 ? 90 : 220)) % 2 === 0);
          lcdE.textContent = `${Math.round((s - 1) * 100)} %`;
          lcdF.textContent = fmtN(9.81 * Math.pow(s - 1, 2.6) * 60);
          lcdR.textContent = s < 1.35 ? "30 %" : s < 2.2 ? "120 %" : s < 3.5 ? "250 %" : s < 5 ? "¿500 %?" : s < 7 ? "consultar" : "—";
          status(
            s < 1.35 ? "Iniciando ensayo. Rotura estimada: 30 %." :
            s < 2.2 ? "Superó el 30 %. Recalculando." :
            s < 3.5 ? "Ahora sí. En cualquier momento." :
            s < 5 ? "Esto no figura en el manual." :
            s < 7 ? "Llamando al técnico." :
                    "El técnico tampoco sabe."
          );
          creakSet(pullVisible ? stress : 0);
        } else if (el < T_PAUSE) {
          // la pausa antes del remate
          sTarget = SMAX;
          pull.classList.add("paused");
          pull.classList.remove("doubt");
          rig.classList.remove("hot");
          lcdBox.classList.remove("glitch");
          lamp.classList.remove("on");
          status("…");
          creakSet(0);
        } else {
          s = Math.max(s, sTarget);
          state = "broken";
          settleUntil = now + 4200;
          doBreak();
        }
        s += (sTarget - s) * 0.2;
      } else if (state === "broken") {
        // resorte: vuelve, se pasa, rebota
        sv += -(s - 1) * 0.085;
        sv *= 0.86;
        s += sv;
        if (s < 0.62) { s = 0.62; sv = Math.abs(sv) * 0.45; }
      }
      render(stress);
    };

    const frame = (now) => {
      stepPull(now);
      if (state === "running" || (state === "broken" && now < settleUntil)) requestAnimationFrame(frame);
      else { animating = false; sv = 0; s = state === "broken" ? 1 : s; render(0); }
    };
    const animate = () => { if (!animating) { animating = true; requestAnimationFrame(frame); } };

    const reset = () => {
      runId++;
      state = "idle";
      broken = false; gripped = false; stamped = false;
      flyers = null; s = 1; sv = 0; sTarget = 1; cam = 1;
      pull.classList.remove("broken", "stamped", "paused", "doubt");
      rig.classList.remove("hot"); lcdBox.classList.remove("glitch"); lamp.classList.remove("on");
      clampL.style.visibility = clampR.style.visibility = "";
      creakSet(0);
      idleState();
    };

    const finalState = () => {
      broken = true; gripped = true; s = 1; state = "broken";
      pull.classList.add("broken", "stamped");
      clampL.style.visibility = clampR.style.visibility = "hidden";
      flyers = [];
      status("Ensayo finalizado: 900 % de elongación. Se rompió la máquina. Muestra intacta.");
      lcdF.textContent = "—"; lcdE.textContent = "900 %"; lcdR.textContent = "nunca";
      render(0);
    };

    // tocar la máquina o el nombre también arranca el ensayo
    rig.addEventListener("click", () => { if (state === "idle") goBtn.click(); });
    goBtn.addEventListener("click", () => {
      if (state === "running") return;
      if (state === "broken") reset();
      pull.classList.add("started");
      if (reduceMotion) { finalState(); setBtn("Ensayo<br />terminado", false); return; }
      state = "running";
      t0 = performance.now();
      const id = runId;
      setBtn("Ensa&shy;yando…", true);
      // cuando termina todo, el botón ofrece repetir
      setTimeout(() => { if (id === runId) setBtn("Reparar y<br />repetir", false); }, T_PAUSE + 3600);
      animate();
    });

    const start = () => { measure(); render(0); };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(start);
    start();
    idleState();
    // si se va de la sección a mitad del ensayo, el crujido se calla
    new IntersectionObserver(([e]) => { pullVisible = e.isIntersecting; if (!pullVisible) creakSet(0); }).observe(pull);
    let rT; window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(() => { measure(); render(0); }, 150); });
  }

  /* ---------------------------------------------------------
     3 · VOLTÍMETRO + victorio.exe
     --------------------------------------------------------- */
  const ticks = $(".g-ticks");
  if (ticks) {
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI + (i / 20) * Math.PI;
      const r1 = 120, r2 = i % 2 === 0 ? 104 : 112;
      const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
      l.setAttribute("x1", 150 + Math.cos(a) * r1); l.setAttribute("y1", 160 + Math.sin(a) * r1);
      l.setAttribute("x2", 150 + Math.cos(a) * r2); l.setAttribute("y2", 160 + Math.sin(a) * r2);
      ticks.appendChild(l);
    }
  }
  const win = $("#win");
  let winTimer;
  const closeWin = () => { if (win) win.hidden = true; clearTimeout(winTimer); };
  const showWin = () => {
    if (!win) return;
    const mr = $("#meter").getBoundingClientRect();
    if (mr.bottom < 0 || mr.top > window.innerHeight) return; // ya te fuiste: no molesta
    win.hidden = false;
    zap();
    winTimer = setTimeout(closeWin, 9000);
  };
  if (win) {
    $$("[data-close]", win).forEach((b) => b.addEventListener("click", (e) => {
      closeWin();
      if (b.hasAttribute("data-yay")) burst(e.clientX, e.clientY, { n: 16 });
    }));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !win.hidden) closeWin(); });
  }

  const meter = $("#meter"), lcd = $("#lcd");
  if (meter) {
    const meterIO = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      meterIO.disconnect();
      setTimeout(() => {
        meter.classList.add("measuring");
        const start = performance.now();
        const dur = reduceMotion ? 1 : 2600;
        const tick = (now) => {
          const t = Math.min(1, (now - start) / dur);
          const v = t < 0.4 ? t / 0.4 * 5.5 : t < 0.5 ? 5.5 - (t - 0.4) * 20 : 3.5 + Math.pow((t - 0.5) / 0.5, 3) * 9999;
          lcd.textContent = `${v.toFixed(2)} V`;
          if (t < 1) requestAnimationFrame(tick);
          else {
            lcd.textContent = "∞ V";
            meter.classList.add("done");
            zap();
            const r = meter.querySelector(".meter-box").getBoundingClientRect();
            burst(r.left + r.width * 0.3, r.top + r.height * 0.5, { n: 14, kinds: ["bolt", "bolt", "plus"] });
            setTimeout(showWin, 900);
          }
        };
        requestAnimationFrame(tick);
      }, reduceMotion ? 0 : 700);
    }, { threshold: 0.55 });
    meterIO.observe(meter);
    // si te vas del voltímetro, la ventana se cierra sola
    new IntersectionObserver(([e]) => { if (!e.isIntersecting) closeWin(); }, { threshold: 0 }).observe(meter);
  }

  /* ---------------------------------------------------------
     4 · MARCO TEÓRICO — corrige la birome roja
     --------------------------------------------------------- */
  const sheet = $("#sheet");
  if (sheet) {
    new IntersectionObserver(([e], obs) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      sheet.classList.add("marked");
      if (!reduceMotion) setTimeout(() => thud(false), 3800);
    }, { threshold: 0.3 }).observe(sheet);
  }

  /* ---------------------------------------------------------
     6 · EL DIARIO DE LA GOMA — las notas caen y golpean
     --------------------------------------------------------- */
  const npDate = $("#npDate");
  if (npDate) {
    const d = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    npDate.textContent = d.charAt(0).toUpperCase() + d.slice(1);
  }
  const paper = $("#paper");
  if (paper) {
    const splatter = (story) => {
      if (reduceMotion) return;
      const w = story.offsetWidth, h = story.offsetHeight;
      for (let i = 0; i < 10; i++) {
        const dot = document.createElement("span");
        dot.className = "ink";
        const side = Math.random();
        const x = side < 0.5 ? Math.random() * w : (side < 0.75 ? -6 : w + 2);
        const y = side < 0.5 ? (Math.random() < 0.5 ? -6 : h + 2) : Math.random() * h;
        dot.style.left = `${x}px`; dot.style.top = `${y}px`;
        story.appendChild(dot);
        const ang = Math.atan2(y - h / 2, x - w / 2), dist = 18 + Math.random() * 30, sc = 0.4 + Math.random() * 0.9;
        dot.animate(
          [{ transform: `translate(0,0) scale(${sc})`, opacity: 0.85 },
           { transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist}px) scale(${sc * 0.3})`, opacity: 0 }],
          { duration: 450 + Math.random() * 250, easing: "cubic-bezier(.2,.8,.3,1)" }
        ).onfinish = () => dot.remove();
      }
    };
    const land = (story) => {
      story.classList.remove("slam");
      story.classList.add("landed");
      const big = story.classList.contains("np-lead");
      paper.classList.remove("shake"); void paper.offsetWidth; paper.classList.add("shake");
      splatter(story);
      thud(big);
    };
    const queue = [];
    let slamming = false;
    const next = () => {
      const story = queue.shift();
      if (!story) { slamming = false; return; }
      slamming = true;
      story.classList.add("slam");
      story.addEventListener("animationend", function onEnd(e) {
        if (e.target !== story || e.animationName !== "slam") return;
        story.removeEventListener("animationend", onEnd);
        land(story);
        setTimeout(next, 120);
      });
    };
    const stories = $$(".story", paper);
    if (reduceMotion) stories.forEach((s) => s.classList.add("landed"));
    else {
      const sio = new IntersectionObserver((entries) => {
        entries.filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          .forEach((e) => { sio.unobserve(e.target); queue.push(e.target); });
        if (!slamming) next();
      }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
      stories.forEach((s) => sio.observe(s));
    }
  }

  /* ---------------------------------------------------------
     7 · SELLO DE GOMA
     --------------------------------------------------------- */
  const stamper = $("#stamper"), report = $("#report"), imps = $("#impressions"), stampMsg = $("#stampMsg");
  if (stamper && report) {
    let n = 0, busy = false;
    const msgs = {
      1: "Sellado. Es oficial.",
      2: "Sellado dos veces, por las dudas.",
      3: "Ya está, eh.",
      5: "El sello también es de goma. No se gasta.",
      7: "El informe ya es más sello que informe.",
      10: "Diez sellos. Como la nota.",
      15: "Esto ya es personal.",
      25: "El Comité agradece tu compromiso.",
    };
    const words = ["Aprobado", "Aprobado", "Aprobado", "De goma", "10", "Aprobado", "Ni se despeinó"];
    stamper.addEventListener("click", () => {
      if (busy) return;
      busy = true;
      const rr = report.getBoundingClientRect(), sr = stamper.getBoundingClientRect();
      // destino al azar dentro del informe (zona libre de abajo, o encima de todo a medida que se llena)
      const tx = rand(rr.width * 0.08, rr.width * 0.68);
      const ty = n < 3 ? rand(rr.height * 0.66, rr.height * 0.8) : rand(rr.height * 0.12, rr.height * 0.8);
      const dx = rr.left + tx - (sr.left + sr.width / 2) + 40;
      const dy = rr.top + ty - sr.bottom + 10;
      stamper.style.setProperty("--tx", `${dx}px`);
      stamper.style.setProperty("--ty", `${dy}px`);
      stamper.classList.remove("slam"); void stamper.offsetWidth; stamper.classList.add("slam");
      setTimeout(() => {
        n++;
        const imp = document.createElement("span");
        imp.className = "imp";
        const rot = rand(-16, 12).toFixed(1);
        imp.style.setProperty("--rr", `${rot}deg`);
        imp.style.transform = `rotate(${rot}deg)`;
        imp.textContent = n === 1 ? "Aprobado" : words[Math.floor(Math.random() * words.length)];
        imp.style.left = `${tx - 40}px`;
        imp.style.top = `${ty - 24}px`;
        imps.appendChild(imp);
        thud(n === 1 || n === 10);
        burst(rr.left + tx, rr.top + ty, { n: 8, kinds: ["crumb"], power: 0.7, up: 4 });
        if (msgs[n]) stampMsg.textContent = msgs[n];
        if (n === 10) {
          burst(innerWidth * 0.2, innerHeight * 0.5, { n: 24 });
          burst(innerWidth * 0.8, innerHeight * 0.5, { n: 24 });
        }
      }, reduceMotion ? 0 : 300);
      setTimeout(() => { busy = false; }, reduceMotion ? 50 : 480);
    });
  }

  /* ---------------------------------------------------------
     PIE — repetir ensayo
     --------------------------------------------------------- */
  const again = $("#again");
  if (again) {
    again.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      const waitTop = () => {
        if (window.scrollY < 10) { dropLetters(); }
        else requestAnimationFrame(waitTop);
      };
      requestAnimationFrame(waitTop);
    });
  }

  /* ---------------------------------------------------------
     EASTER EGGS
     --------------------------------------------------------- */
  // escribir "goma" => modo goma · escribir "victorio" => saltan las letras
  let typed = "";
  document.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, textarea")) return;
    if (e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-12);
    if (typed.endsWith("goma")) {
      const on = document.body.classList.toggle("modo-goma");
      toast(on ? "modo goma: activado" : "modo goma: desactivado");
      boing(1.2);
      if (on) setTimeout(() => document.body.classList.remove("modo-goma"), 9000);
    }
    if (typed.endsWith("victorio")) {
      letters.forEach((L, i) => setTimeout(() => { L.vy -= 34; }, i * 60));
      toast("presente");
      boing(1);
    }
  });

  // pestaña: si te vas, el informe te extraña (un poco)
  const baseTitle = document.title;
  document.addEventListener("visibilitychange", () => {
    document.title = document.hidden ? "¿Y? El ensayo sigue." : baseTitle;
  });

  // para el que abre la consola
  try {
    console.log("%c COMITÉ DE CARGAS POSITIVAS %c\nInforme N.º 10 · MAT-VIC-001\nSi estás leyendo esto, estudiá. (Igual la hacés de goma.)",
      "background:#FF6FA3;color:#170A33;font:bold 16px monospace;padding:4px 8px;", "color:#3DF5FF;font:13px monospace;");
  } catch (_) { /* nada */ }
})();
