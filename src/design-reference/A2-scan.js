/* ============================================================
   FaceScan A2 — interações da landing + scan fullscreen
   ============================================================ */

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─── Intro curtain ─── */
const intro = document.getElementById('intro');
setTimeout(() => {
  intro.classList.add('hidden');
  setTimeout(() => intro.remove(), 1100);
}, reduce ? 400 : 2200);

/* ─── Nav scrolled ─── */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
});

/* ─── Scroll reveal ─── */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('in'), i * 70);
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.step, .metric-tile').forEach(el => io.observe(el));

/* ─── Timecode animado no hero ─── */
(function timecodeLoop(){
  if (reduce) return;
  const tc = document.getElementById('timecode');
  if (!tc) return;
  let ms = 12480;
  setInterval(() => {
    ms += 90;
    const total = ms;
    const m = String(Math.floor(total/60000)).padStart(2,'0');
    const s = String(Math.floor((total%60000)/1000)).padStart(2,'0');
    const mss = String(total%1000).padStart(3,'0');
    const roi = 88 + Math.round(Math.sin(total/800)*5 + Math.random()*2);
    tc.textContent = `00:${m}:${s}.${mss} · ROI ${roi}%`;
  }, 90);
})();

/* ─── Hero readouts animados suaves ─── */
(function heroLoop() {
  if (reduce) return;
  const bpm = document.getElementById('h-bpm');
  const stress = document.getElementById('h-stress');
  const score = document.getElementById('h-score');
  let t = 0;
  setInterval(() => {
    t++;
    if (bpm) bpm.innerHTML = (70 + Math.round(Math.sin(t / 5) * 3 + Math.random() * 2)) + '<span class="u">bpm</span>';
    if (stress) stress.textContent = 30 + Math.round(Math.sin(t / 7) * 4 + Math.random() * 2);
    if (score) score.textContent = 82 + Math.round(Math.sin(t / 9) * 3);
  }, 1200);
})();

/* ============================================================
   SCAN FULLSCREEN
   ============================================================ */
const scanFull = document.getElementById('scanFull');
const scanClose = document.getElementById('scanClose');
const scanPrestart = document.getElementById('scanPrestart');
const scanResult = document.getElementById('scanResult');
const scanContact = document.getElementById('scanContact');
const scanSuccess = document.getElementById('scanSuccess');
const startBtn = document.getElementById('startScanBtn');
const webcam = document.getElementById('webcam');
const videoFallback = document.getElementById('videoFallback');
const ringFill = document.getElementById('ringFill');
const countNum = document.getElementById('countNum');
const scanCountdown = document.getElementById('scanCountdown');
const scanStatusLine = document.getElementById('scanStatusLine');
const scanStep = document.getElementById('scanStep');

let stream = null;
let scanTimer = null;

/* ring circumference */
const RING_R = 290;
const RING_C = 2 * Math.PI * RING_R;
ringFill.setAttribute('stroke-dasharray', RING_C);
ringFill.setAttribute('stroke-dashoffset', RING_C);

function openScan() {
  scanFull.classList.add('open');
  scanFull.setAttribute('aria-hidden', 'false');
  scanPrestart.classList.remove('hidden');
  scanResult.classList.remove('show');
  scanContact.classList.remove('show');
  scanSuccess.classList.remove('show');
  scanCountdown.style.opacity = '0';
  scanStatusLine.style.opacity = '0';
  document.body.style.overflow = 'hidden';
  scanStep.textContent = 'Preparando câmera';
  requestCamera();
}

function closeScan() {
  scanFull.classList.remove('open');
  scanFull.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
  stopCamera();
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  webcam.srcObject = null;
}

async function requestCamera() {
  videoFallback.style.display = 'flex';
  webcam.style.display = 'none';
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
      audio: false
    });
    webcam.srcObject = stream;
    webcam.style.display = 'block';
    videoFallback.style.display = 'none';
  } catch (err) {
    console.warn('Camera denied:', err);
    videoFallback.style.display = 'flex';
  }
}

document.querySelectorAll('[data-start-scan]').forEach(b => b.addEventListener('click', openScan));
scanClose.addEventListener('click', closeScan);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && scanFull.classList.contains('open')) closeScan();
});

/* ─── Start scan (depois do prestart) ─── */
startBtn.addEventListener('click', () => {
  scanPrestart.classList.add('hidden');
  scanCountdown.style.opacity = '1';
  scanStatusLine.style.opacity = '1';
  scanStep.textContent = 'Scan em andamento';
  runScan();
});

const STATUS_SEQ = [
  [0, 'Detectando rosto…'],
  [0.1, 'Travando ROI. Respire normalmente.'],
  [0.22, 'Calibrando sinal rPPG…'],
  [0.4, 'Extraindo batimento cardíaco…'],
  [0.58, 'Calculando variabilidade (HRV)…'],
  [0.74, 'Estimando estresse e respiração…'],
  [0.9, 'Finalizando análise…'],
  [0.99, 'Pronto.']
];

const SCAN_DURATION = 10000; // 10s de demo (countdown mostra 60→0)

function runScan() {
  const start = performance.now();
  const lmBpm = document.getElementById('lm-bpm');
  const lmHrv = document.getElementById('lm-hrv');
  const lmStress = document.getElementById('lm-stress');
  let lastIdx = -1;

  scanTimer = setInterval(() => {
    const t = Math.min(1, (performance.now() - start) / SCAN_DURATION);
    ringFill.setAttribute('stroke-dashoffset', RING_C - t * RING_C);
    countNum.textContent = Math.max(0, Math.ceil(60 - t * 60));

    for (let i = STATUS_SEQ.length - 1; i >= 0; i--) {
      if (t >= STATUS_SEQ[i][0]) {
        if (i !== lastIdx) {
          scanStatusLine.textContent = STATUS_SEQ[i][1];
          lastIdx = i;
        }
        break;
      }
    }

    if (t > 0.22) {
      lmBpm.classList.add('on');
      lmBpm.querySelector('.v').innerHTML = (70 + Math.round(Math.sin(t * 8) * 4 + Math.random() * 2)) + '<span class="u">bpm</span>';
    }
    if (t > 0.45) {
      lmHrv.classList.add('on');
      lmHrv.querySelector('.v').innerHTML = (45 + Math.round(Math.sin(t * 5) * 5 + Math.random() * 2)) + '<span class="u">ms</span>';
    }
    if (t > 0.65) {
      lmStress.classList.add('on');
      lmStress.querySelector('.v').innerHTML = (32 + Math.round(Math.sin(t * 4) * 4 + Math.random() * 2)) + '<span class="u">%</span>';
    }

    if (t >= 1) {
      clearInterval(scanTimer);
      scanTimer = null;
      setTimeout(showResult, 700);
    }
  }, 90);
}

function showResult() {
  scanStep.textContent = 'Resultado';
  const bpm = 72 + Math.floor(Math.random() * 6 - 3);
  const hrv = 48 + Math.floor(Math.random() * 8 - 4);
  const spo2 = 97 + Math.floor(Math.random() * 3);
  const stress = 28 + Math.floor(Math.random() * 12);
  const resp = 14 + Math.floor(Math.random() * 3 - 1);
  const bpSys = 115 + Math.floor(Math.random() * 10);
  const bpDia = 74 + Math.floor(Math.random() * 6);

  const hrvS = Math.min(100, (hrv / 60) * 100);
  const stressS = 100 - stress;
  const bpmS = 100 - Math.abs(bpm - 72) * 3;
  const spo2S = Math.max(0, (spo2 - 90) * 10);
  const score = Math.max(55, Math.min(96, Math.round(hrvS * 0.3 + stressS * 0.3 + bpmS * 0.2 + spo2S * 0.2)));

  scanResult.classList.add('show');
  stopCamera(); // libera câmera depois do scan

  /* ring — usa getTotalLength pra garantir precisão */
  const fillBig = document.getElementById('scoreFillBig');
  const circBig = fillBig.getTotalLength ? fillBig.getTotalLength() : 2 * Math.PI * 115;
  // estado inicial: vazio, sem transition
  fillBig.style.transition = 'none';
  fillBig.style.strokeDasharray = circBig;
  fillBig.style.strokeDashoffset = circBig;
  // força reflow
  void fillBig.getBoundingClientRect();
  // aguarda 2 frames pra garantir que o browser processou o estado inicial antes de reativar transition
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fillBig.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(.22,.61,.36,1)';
      fillBig.style.strokeDashoffset = circBig - (score / 100) * circBig;
    });
  });

  /* count-up */
  const n = document.getElementById('scoreNumBig');
  let v = 0;
  const step = Math.max(1, Math.round(score / 40));
  const up = setInterval(() => {
    v += step;
    if (v >= score) { v = score; clearInterval(up); }
    n.textContent = v;
  }, 40);

  /* band */
  const band = document.getElementById('scoreBandBig');
  const bandLbl = document.getElementById('scoreBandLbl');
  band.classList.remove('warn', 'danger');
  let adj = 'indo bem.';
  if (score >= 80) { bandLbl.textContent = 'Faixa verde · Ótimo'; adj = 'indo muito bem.'; }
  else if (score >= 65) { bandLbl.textContent = 'Faixa verde · Bom'; adj = 'indo bem.'; }
  else if (score >= 55) { bandLbl.textContent = 'Faixa amarela · Atenção'; band.classList.add('warn'); adj = 'precisando de atenção.'; }
  else { bandLbl.textContent = 'Faixa vermelha · Risco'; band.classList.add('danger'); adj = 'em alerta.'; }
  document.getElementById('resultAdjective').textContent = adj;

  document.getElementById('rBpm').innerHTML = bpm + '<span class="u">bpm</span>';
  document.getElementById('rHrv').innerHTML = hrv + '<span class="u">ms</span>';
  document.getElementById('rStress').innerHTML = stress + '<span class="u">%</span>';
  document.getElementById('rSpo2').innerHTML = spo2 + '<span class="u">%</span>';
  document.getElementById('rResp').innerHTML = resp + '<span class="u">rpm</span>';
  document.getElementById('rBp').textContent = bpSys + '/' + bpDia;
}

/* ─── Result actions ─── */
document.getElementById('wantReport').addEventListener('click', () => {
  scanResult.classList.remove('show');
  scanContact.classList.add('show');
  scanStep.textContent = 'Contato';
});
document.getElementById('rescan').addEventListener('click', () => {
  scanResult.classList.remove('show');
  scanPrestart.classList.remove('hidden');
  scanCountdown.style.opacity = '0';
  scanStatusLine.style.opacity = '0';
  countNum.textContent = '60';
  ringFill.setAttribute('stroke-dashoffset', RING_C);
  document.querySelectorAll('.scan-live .lm').forEach(l => {
    l.classList.remove('on');
    const v = l.querySelector('.v');
    const u = v.querySelector('.u')?.outerHTML || '';
    v.innerHTML = '—' + u;
  });
  scanStep.textContent = 'Preparando câmera';
  requestCamera();
});
document.getElementById('backFromContact').addEventListener('click', () => {
  scanContact.classList.remove('show');
  scanResult.classList.add('show');
  scanStep.textContent = 'Resultado';
});

document.getElementById('contactForm').addEventListener('submit', e => {
  e.preventDefault();
  scanContact.classList.remove('show');
  scanSuccess.classList.add('show');
  scanStep.textContent = 'Concluído';
});
document.getElementById('successClose').addEventListener('click', closeScan);

/* ─── Easter egg ─── */
console.log('%c impulso+ %cFaceScan ', 'background:#0A0A0A;color:#F6F3EE;font:500 14px Inter;padding:4px 8px;border-radius:4px 0 0 4px;', 'background:#0066FF;color:#fff;font:500 14px Inter;padding:4px 8px;border-radius:0 4px 4px 0;');
console.log('%c Curioso como isso funciona? contato@impulsomais.app', 'color:#6B6B6B;font:400 12px Inter;');
