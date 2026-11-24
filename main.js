/* =========================================================
   VICTORIO · FÍSICA 2 · DE GOMA
   ========================================================= */
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------
     AUDIO — boings sintetizados (sin archivos)
     --------------------------------------------------------- */
  let actx = null;
  const audio = () => {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    if (actx.state === "suspended") actx.resume();
    return actx;
  };

  function boing(strength = 1) {
    const ctx = audio();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    osc.type = "triangle";
    const base = 140 + Math.random() * 60;
    osc.frequency.setValueAtTime(base * 2.6, t);
    osc.frequency.exponentialRampToValueAtTime(base, t + 0.35);
    lfo.frequency.setValueAtTime(18, t);
    lfo.frequency.linearRampToValueAtTime(6, t + 0.5);
    lfoGain.gain.setValueAtTime(40 * strength, t);
    lfoGain.gain.exponentialRampToValueAtTime(1, t + 0.55);
    lfo.connect(lfoGain).connect(osc.frequency);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.22 * Math.min(1, strength), t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t); lfo.start(t);
    osc.stop(t + 0.62); lfo.stop(t + 0.62);
  }

  function zap() {
    const ctx = audio();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.06);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.18);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.21);
  }

  /* ---------------------------------------------------------
     LETRAS DE GOMA — resortes acoplados
     --------------------------------------------------------- */
  const letters = [...document.querySelectorAll("#rubber span")].map((el, i) => ({
    el, i, x: 0, y: reduceMotion ? 0 : -window.innerHeight * 0.8 - i * 90,
    vx: 0, vy: 0, dragging: false, sx: 0, sy: 0,
  }));

  const K = 0.075;        // constante del resorte (Hooke manda saludos)
  const DAMP = 0.86;      // amortiguamiento
  const COUPLE = [1, 0.42, 0.16, 0.05];
  let active = null;

  letters.forEach((L) => {
    L.el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      L.el.setPointerCapture(e.pointerId);
      L.dragging = true;
      L.el.classList.add("grabbed");
      L.sx = e.clientX - L.x;
      L.sy = e.clientY - L.y;
      active = L;
      audio();
    });
    L.el.addEventListener("pointermove", (e) => {
      if (!L.dragging) return;
      const dx = e.clientX - L.sx;
      const dy = e.clientY - L.sy;
      // resistencia elástica: cuanto más estirás, más cuesta
      const d = Math.hypot(dx, dy) || 1;
      const max = Math.min(window.innerWidth, 900) * 0.45;
      const f = max * Math.tanh(d / max) / d;
      L.vx = dx * f - L.x;
      L.vy = dy * f - L.y;
      L.x = dx * f;
      L.y = dy * f;
    });
    const release = () => {
      if (!L.dragging) return;
      L.dragging = false;
      L.el.classList.remove("grabbed");
      active = null;
      const d = Math.hypot(L.x, L.y);
      if (d > 20) boing(Math.min(1.4, d / 160));
    };
    L.el.addEventListener("pointerup", release);
    L.el.addEventListener("pointercancel", release);
  });

  function stepLetters() {
    for (const L of letters) {
      if (L.dragging) continue;
      let tx = 0, ty = 0;
      if (active) {
        const dist = Math.abs(active.i - L.i);
        const c = COUPLE[dist] || 0;
        tx = active.x * c;
        ty = active.y * c;
      }
      L.vx = (L.vx + (tx - L.x) * K) * DAMP;
      L.vy = (L.vy + (ty - L.y) * K) * DAMP;
      L.x += L.vx;
      L.y += L.vy;
    }
    for (const L of letters) {
      const d = Math.hypot(L.x, L.y);
      const v = Math.hypot(L.vx, L.vy);
      const ang = Math.atan2(L.y, L.x);
      const vang = Math.atan2(L.vy, L.vx);
      // se estira en dirección del desplazamiento y se aplasta con la velocidad
      const stretch = 1 + Math.min(d / 180, 1.1);
      const squash = 1 + Math.min(v / 40, 0.5);
      const useAng = L.dragging ? ang : vang;
      const s = L.dragging ? stretch : squash;
      L.el.style.transform =
        `translate(${L.x.toFixed(1)}px, ${L.y.toFixed(1)}px) ` +
        `rotate(${useAng}rad) scale(${s.toFixed(3)}, ${(1 / Math.sqrt(s)).toFixed(3)}) rotate(${-useAng}rad)`;
    }
  }

  // de vez en cuando una letra se mueve sola, porque puede
  if (!reduceMotion) {
    setInterval(() => {
      if (active) return;
      const L = letters[Math.floor(Math.random() * letters.length)];
      L.vy -= 14 + Math.random() * 10;
      L.vx += (Math.random() - 0.5) * 10;
    }, 2600);
  }

  /* ---------------------------------------------------------
     CAMPO ELÉCTRICO — el cursor es una carga +q
     --------------------------------------------------------- */
  const canvas = document.getElementById("field");
  const hero = document.querySelector(".hero");
  const tag = document.getElementById("chargeTag");
  const ctx2d = canvas.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  const charges = [
    { x: 0.5, y: 0.5, q: +1, mouse: true },
    { x: 0.12, y: 0.82, q: -0.7 },
    { x: 0.88, y: 0.2, q: -0.7 },
    { x: 0.82, y: 0.86, q: -0.5 },
    { x: 0.15, y: 0.15, q: -0.5 },
  ];
  let mouseIn = false;
  let tAuto = 0;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx2d.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx2d.fillStyle = "#170A33";
    ctx2d.fillRect(0, 0, W, H);
  }
  resize();
  window.addEventListener("resize", resize);

  hero.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" && active) return;
    const r = hero.getBoundingClientRect();
    charges[0].x = (e.clientX - r.left) / W;
    charges[0].y = (e.clientY - r.top) / H;
    mouseIn = true;
    tag.style.opacity = "1";
    tag.style.left = `${e.clientX - r.left + 26}px`;
    tag.style.top = `${e.clientY - r.top - 18}px`;
  });
  hero.addEventListener("pointerleave", () => {
    mouseIn = false;
    tag.style.opacity = "0";
  });

  const N = window.innerWidth < 700 ? 140 : 320;
  const parts = [];
  const spawn = (p) => {
    const c = charges[0];
    const a = Math.random() * Math.PI * 2;
    p.x = c.x * W + Math.cos(a) * 14;
    p.y = c.y * H + Math.sin(a) * 14;
    p.age = 0;
    p.life = 120 + Math.random() * 160;
    p.hue = Math.random() < 0.2 ? "#FF6FA3" : Math.random() < 0.1 ? "#FFE14D" : "#3DF5FF";
    return p;
  };
  for (let i = 0; i < N; i++) {
    const p = spawn({});
    p.age = Math.random() * p.life;
    parts.push(p);
  }

  function field(x, y) {
    let ex = 0, ey = 0;
    for (const c of charges) {
      const dx = x - c.x * W;
      const dy = y - c.y * H;
      const r2 = dx * dx + dy * dy + 80;
      const inv = c.q / (r2 * Math.sqrt(r2));
      ex += dx * inv;
      ey += dy * inv;
    }
    return [ex, ey];
  }

  function stepField() {
    if (!mouseIn) {
      tAuto += 0.008;
      charges[0].x = 0.5 + Math.cos(tAuto) * 0.22;
      charges[0].y = 0.5 + Math.sin(tAuto * 1.3) * 0.2;
    }
    ctx2d.fillStyle = "rgba(23, 10, 51, 0.12)";
    ctx2d.fillRect(0, 0, W, H);
    ctx2d.lineWidth = 1.6;
    for (const p of parts) {
      const [ex, ey] = field(p.x, p.y);
      const m = Math.hypot(ex, ey) || 1;
      const sp = 2.6;
      const nx = p.x + (ex / m) * sp;
      const ny = p.y + (ey / m) * sp;
      ctx2d.strokeStyle = p.hue;
      ctx2d.globalAlpha = Math.min(1, (1 - p.age / p.life) * 1.4) * 0.8;
      ctx2d.beginPath();
      ctx2d.moveTo(p.x, p.y);
      ctx2d.lineTo(nx, ny);
      ctx2d.stroke();
      p.x = nx; p.y = ny; p.age++;
      let dead = p.age > p.life || p.x < -10 || p.y < -10 || p.x > W + 10 || p.y > H + 10;
      for (let i = 1; i < charges.length && !dead; i++) {
        if (Math.hypot(p.x - charges[i].x * W, p.y - charges[i].y * H) < 10) dead = true;
      }
      if (dead) spawn(p);
    }
    ctx2d.globalAlpha = 1;
    // dibujar las cargas negativas
    ctx2d.font = "bold 20px VT323, monospace";
    ctx2d.textAlign = "center";
    ctx2d.textBaseline = "middle";
    for (let i = 1; i < charges.length; i++) {
      const c = charges[i];
      ctx2d.fillStyle = "#FF6FA3";
      ctx2d.beginPath();
      ctx2d.arc(c.x * W, c.y * H, 11, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.fillStyle = "#170A33";
      ctx2d.fillText("−", c.x * W, c.y * H + 1);
    }
    // carga positiva
    const c0 = charges[0];
    ctx2d.fillStyle = "#3DF5FF";
    ctx2d.beginPath();
    ctx2d.arc(c0.x * W, c0.y * H, 9, 0, Math.PI * 2);
    ctx2d.fill();
  }

  let heroVisible = true;
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe(hero);

  if (reduceMotion) {
    for (let i = 0; i < 200; i++) stepField();
  }

  function loop() {
    stepLetters();
    if (heroVisible && !reduceMotion) stepField();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ---------------------------------------------------------
     REVEAL al scrollear
     --------------------------------------------------------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ---------------------------------------------------------
     VOLTÍMETRO
     --------------------------------------------------------- */
  const ticks = document.querySelector(".g-ticks");
  for (let i = 0; i <= 20; i++) {
    const a = Math.PI + (i / 20) * Math.PI;
    const r1 = 120, r2 = i % 2 === 0 ? 104 : 112;
    const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.setAttribute("x1", 150 + Math.cos(a) * r1);
    l.setAttribute("y1", 160 + Math.sin(a) * r1);
    l.setAttribute("x2", 150 + Math.cos(a) * r2);
    l.setAttribute("y2", 160 + Math.sin(a) * r2);
    ticks.appendChild(l);
  }

  const meter = document.getElementById("meter");
  const lcd = document.getElementById("lcd");
  const meterIO = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    meterIO.disconnect();
    meter.classList.add("go");
    const start = performance.now();
    const dur = reduceMotion ? 1 : 2600;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = t < 0.4 ? t / 0.4 * 5.5 : t < 0.5 ? 5.5 - (t - 0.4) * 20 : 3.5 + Math.pow((t - 0.5) / 0.5, 3) * 9999;
      lcd.textContent = `${eased.toFixed(2)} V`;
      if (t < 1) requestAnimationFrame(tick);
      else {
        lcd.textContent = "∞ V";
        meter.classList.add("done");
        zap();
        burst(window.innerWidth / 2, meter.getBoundingClientRect().top + 120, ["💥", "⚡", "🔥"], 14);
      }
    };
    requestAnimationFrame(tick);
  }, { threshold: 0.6 });
  meterIO.observe(meter);

  /* ---------------------------------------------------------
     MAXWELL — dar vuelta tarjetas
     --------------------------------------------------------- */
  document.querySelectorAll(".mx-card").forEach((card) => {
    card.addEventListener("click", () => {
      card.classList.toggle("flipped");
      if (card.classList.contains("flipped")) zap();
    });
  });

  /* ---------------------------------------------------------
     CONFETI DE EMOJIS
     --------------------------------------------------------- */
  const fx = document.getElementById("fx");
  function burst(x, y, set = ["⚡", "🧲", "🍀", "🦆", "✨", "🔋", "🧠", "💯"], n = 16) {
    if (reduceMotion) n = Math.min(n, 4);
    for (let i = 0; i < n; i++) {
      const b = document.createElement("span");
      b.className = "bit";
      b.textContent = set[Math.floor(Math.random() * set.length)];
      fx.appendChild(b);
      const a = Math.random() * Math.PI * 2;
      const sp = 6 + Math.random() * 10;
      let vx = Math.cos(a) * sp, vy = Math.sin(a) * sp - 8;
      let px = x, py = y, rot = 0, vr = (Math.random() - 0.5) * 30, life = 0;
      const size = 1.2 + Math.random() * 1.8;
      b.style.fontSize = `${size}rem`;
      const step = () => {
        vy += 0.45; vx *= 0.985;
        px += vx; py += vy; rot += vr; life++;
        b.style.transform = `translate(${px}px, ${py}px) rotate(${rot}deg)`;
        b.style.opacity = String(Math.max(0, 1 - life / 90));
        if (life < 90 && py < window.innerHeight + 60) requestAnimationFrame(step);
        else b.remove();
      };
      requestAnimationFrame(step);
    }
  }

  /* ---------------------------------------------------------
     BOTÓN DE CARGA POSITIVA
     --------------------------------------------------------- */
  const btn = document.getElementById("chargeBtn");
  const countEl = document.getElementById("count");
  const toast = document.getElementById("toast");
  const msgs = [
    "Carga recibida.",
    "Victorio +1 de suerte.",
    "Conservación de la buena onda: cumplida.",
    "Faraday aprueba este mensaje.",
    "El campo de aprobación se intensifica.",
    "Capacitor de confianza: cargado al 100%.",
    "Gauss calculó el flujo de suerte: enorme.",
    "La resistencia es inútil (literal, es 0 Ω).",
    "Ya está. La hace de goma.",
  ];
  let count = Number(localStorage.getItem("victorio-q") || 0);
  countEl.textContent = count;
  btn.addEventListener("click", (e) => {
    count++;
    localStorage.setItem("victorio-q", String(count));
    countEl.textContent = count;
    toast.textContent = msgs[(count - 1) % msgs.length];
    const r = btn.getBoundingClientRect();
    const x = e.clientX || r.left + r.width / 2;
    const y = e.clientY || r.top + r.height / 2;
    burst(x, y);
    boing(1);
    if (count % 10 === 0) {
      burst(window.innerWidth * 0.2, window.innerHeight * 0.4, ["💯", "🎉", "⚡"], 24);
      burst(window.innerWidth * 0.8, window.innerHeight * 0.4, ["💯", "🎉", "⚡"], 24);
    }
  });

  // click en las letras sin arrastrar también tira chispas
  document.getElementById("rubber").addEventListener("dblclick", (e) => burst(e.clientX, e.clientY));

  /* ---------------------------------------------------------
     EL DIARIO DE LA GOMA — las noticias caen y golpean
     --------------------------------------------------------- */
  const npDate = document.getElementById("npDate");
  if (npDate) {
    const d = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    npDate.textContent = d.charAt(0).toUpperCase() + d.slice(1);
  }

  function thud(big = false) {
    const ctx = audio();
    if (!ctx || ctx.state !== "running") return;
    const t = ctx.currentTime;
    // cuerpo grave
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(big ? 120 : 160, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    g.gain.setValueAtTime(big ? 0.5 : 0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.26);
    // golpe de papel (ruido filtrado)
    const len = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const n = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    const ng = ctx.createGain();
    n.buffer = buf;
    f.type = "lowpass"; f.frequency.value = 1800;
    ng.gain.value = big ? 0.5 : 0.3;
    n.connect(f).connect(ng).connect(ctx.destination);
    n.start(t);
  }

  const paper = document.getElementById("paper");
  function splatter(story) {
    const w = story.offsetWidth, h = story.offsetHeight;
    const count = reduceMotion ? 0 : 10;
    for (let i = 0; i < count; i++) {
      const dot = document.createElement("span");
      dot.className = "ink";
      const side = Math.random();
      const x = side < 0.5 ? Math.random() * w : (side < 0.75 ? -6 : w + 2);
      const y = side < 0.5 ? (Math.random() < 0.5 ? -6 : h + 2) : Math.random() * h;
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;
      story.appendChild(dot);
      const ang = Math.atan2(y - h / 2, x - w / 2);
      const dist = 18 + Math.random() * 30;
      const s = 0.4 + Math.random() * 0.9;
      dot.animate(
        [
          { transform: `translate(0,0) scale(${s})`, opacity: 0.85 },
          { transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist}px) scale(${s * 0.3})`, opacity: 0 },
        ],
        { duration: 450 + Math.random() * 250, easing: "cubic-bezier(.2,.8,.3,1)" }
      ).onfinish = () => dot.remove();
    }
  }

  function land(story) {
    story.classList.remove("slam");
    story.classList.add("landed");
    const big = story.classList.contains("np-lead");
    paper.classList.remove("shake");
    void paper.offsetWidth; // reinicia la animación
    paper.classList.add("shake");
    splatter(story);
    thud(big);
    if (navigator.vibrate) navigator.vibrate(big ? [40, 30, 60] : 35);
  }

  // cola: si entran varias a la vez, caen de a una con ritmo
  const slamQueue = [];
  let slamming = false;
  function nextSlam() {
    const story = slamQueue.shift();
    if (!story) { slamming = false; return; }
    slamming = true;
    story.classList.add("slam");
    story.addEventListener("animationend", function onEnd(e) {
      if (e.target !== story || e.animationName !== "slam") return;
      story.removeEventListener("animationend", onEnd);
      land(story);
      setTimeout(nextSlam, 160);
    });
  }

  const stories = document.querySelectorAll(".paper .story");
  if (reduceMotion) {
    stories.forEach((s) => s.classList.add("landed"));
  } else {
    const storyIO = new IntersectionObserver((entries) => {
      entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        .forEach((e) => {
          storyIO.unobserve(e.target);
          slamQueue.push(e.target);
        });
      if (!slamming) nextSlam();
    }, { threshold: 0.35, rootMargin: "0px 0px -8% 0px" });
    stories.forEach((s) => storyIO.observe(s));
  }

  /* ---------------------------------------------------------
     VIDEO · YO PUEDO
     --------------------------------------------------------- */
  const ypSec = document.getElementById("yopuedo");
  const ypVideo = document.getElementById("ypVideo");
  const ypSound = document.getElementById("ypSound");
  if (ypVideo) {
    const pop = () => {
      ypSec.classList.remove("pop");
      void ypSec.offsetWidth;
      ypSec.classList.add("pop");
    };
    // rebota cada vez que el video vuelve a empezar
    let lastT = 0;
    ypVideo.addEventListener("timeupdate", () => {
      if (ypVideo.currentTime < lastT - 1) {
        pop();
        if (!ypVideo.muted) {
          const r = ypVideo.getBoundingClientRect();
          burst(r.left + r.width / 2, r.top + r.height * 0.3, ["💪", "⚡", "🔥", "💯"], 12);
        }
      }
      lastT = ypVideo.currentTime;
    });
    // solo se reproduce cuando está en pantalla
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { ypVideo.play().catch(() => {}); pop(); }
      else ypVideo.pause();
    }, { threshold: 0.3 }).observe(ypVideo);

    ypSound.addEventListener("click", (e) => {
      const on = ypVideo.muted;
      ypVideo.muted = !on;
      ypSound.setAttribute("aria-pressed", String(on));
      ypSound.querySelector(".yp-sound-ico").textContent = on ? "🔊" : "🔇";
      ypSound.querySelector(".yp-sound-txt").textContent = on ? "Sonando" : "Tocá para escucharlo";
      if (on) {
        ypVideo.currentTime = 0;
        ypVideo.play().catch(() => {});
        pop();
        burst(e.clientX, e.clientY, ["💪", "⚡", "🔥", "💯"], 16);
      }
    });
  }

  /* ---------------------------------------------------------
     POPUP victorio.exe
     --------------------------------------------------------- */
  const win = document.getElementById("win");
  let winShown = false;
  const showWin = () => {
    if (winShown) return;
    winShown = true;
    win.hidden = false;
    zap();
  };
  const brain = document.querySelector(".brain");
  const winIO = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { setTimeout(showWin, 1200); winIO.disconnect(); }
  }, { threshold: 0.5 });
  winIO.observe(brain);
  win.querySelectorAll("[data-close]").forEach((b) => {
    b.addEventListener("click", (e) => {
      win.hidden = true;
      if (b.textContent.trim() !== "×") burst(e.clientX, e.clientY, ["✅", "💯", "⚡"], 14);
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !win.hidden) win.hidden = true;
  });
})();
