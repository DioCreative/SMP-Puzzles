// ==========================================
// CONFIGURAÇÃO DA QUEST 2
// ==========================================

// 1. ANTI-BATOTA: Payload encriptado por XOR (chave 0x5A)
// Evita que a palavra seja lida em texto simples no DevTools (F12)
const CIPHER_PAYLOAD = [28, 8, 21, 20, 14, 19, 31, 8, 111, 17];
const CIPHER_KEY = 0x5A;
let decryptedSecret = null;

function decryptSecret() {
    return CIPHER_PAYLOAD.map(byte => String.fromCharCode(byte ^ CIPHER_KEY)).join('');
}

// 3 Balizas escondidas no limite de 5000 blocos
const BEACONS = [
    { id: 1, name: "α", x: 0, y: -120, targetFreq: 340, locked: false, label: "NORTE" },
    { id: 2, name: "β", x: 130, y: 50, targetFreq: 680, locked: false, label: "ESTE" },
    { id: 3, name: "γ", x: -110, y: 80, targetFreq: 520, locked: false, label: "SUDOESTE" }
];

// --- Carregamento do Mapa do Mundo ---
const worldMapImg = new Image();
worldMapImg.src = 'worldmap.png';
let worldMapLoaded = false;
worldMapImg.onload = () => { worldMapLoaded = true; };

// --- Retornar ao Hub com [ESC] ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.location.href = '../index.html';
    }
});

// ==========================================
// 2. SISTEMA DE ÁUDIO & ESTÁTICA PROCEDURAL (Web Audio API)
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let audioInitialized = false;

let noiseNode = null;
let noiseGain = null;
let toneOsc = null;
let toneGain = null;

function initRadioSynthesizer() {
    if (audioInitialized) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Gerador de Ruído Branco (Estática de rádio)
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    noiseNode.loop = true;

    // Filtro Passa-Banda (dá a textura de rádio analógico militar)
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950, audioCtx.currentTime);
    filter.Q.setValueAtTime(1.2, audioCtx.currentTime);

    noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0, audioCtx.currentTime);

    noiseNode.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    noiseNode.start();

    // Oscilador Senoidal (Tom puro da baliza)
    toneOsc = audioCtx.createOscillator();
    toneOsc.type = 'sine';
    toneOsc.frequency.setValueAtTime(440, audioCtx.currentTime);

    toneGain = audioCtx.createGain();
    toneGain.gain.setValueAtTime(0, audioCtx.currentTime);

    toneOsc.connect(toneGain);
    toneGain.connect(audioCtx.destination);
    toneOsc.start();

    audioInitialized = true;
}

// Bips adicionais de feedback tátil
function playBeep(freq = 600, duration = 0.08) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playSuccessJingle() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    [440, 554, 659, 880].forEach((note, index) => {
        setTimeout(() => playBeep(note, 0.25), index * 120);
    });
}

// Modula o equilíbrio entre ruído branco e tom harmónico em tempo real
function updateRadioAudio(dist, freqDiff, targetFreq) {
    if (!audioInitialized) return;
    const now = audioCtx.currentTime;

    // Se estiver a menos de 45px de uma baliza detetada
    if (dist < 45) {
        // Normaliza a proximidade de frequência (0 = perfeito, 1 = longe)
        const proximity = Math.min(Math.max(freqDiff / 80, 0), 1);

        // Mais perto da frequência = menos estática, tom mais alto
        const targetNoiseVol = 0.005 + (proximity * 0.035);
        const targetToneVol = (1 - proximity) * 0.08;

        noiseGain.gain.setTargetAtTime(targetNoiseVol, now, 0.05);
        toneGain.gain.setTargetAtTime(targetToneVol, now, 0.05);
        toneOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
    } else {
        // Fora do alcance: silêncio ou estática residual impercetível
        noiseGain.gain.setTargetAtTime(0, now, 0.08);
        toneGain.gain.setTargetAtTime(0, now, 0.08);
    }
}

// --- Fundo Ambiente de Partículas do Vazio ---
const voidCanvas = document.getElementById('void-canvas');
const vCtx = voidCanvas.getContext('2d');
voidCanvas.width = window.innerWidth;
voidCanvas.height = window.innerHeight;

const voidParticles = Array.from({ length: 60 }, () => ({
    x: Math.random() * voidCanvas.width,
    y: Math.random() * voidCanvas.height,
    size: Math.random() * 2 + 0.5,
    speedY: (Math.random() - 0.5) * 0.3
}));

function animateVoid() {
    vCtx.clearRect(0, 0, voidCanvas.width, voidCanvas.height);
    vCtx.fillStyle = "rgba(0, 255, 102, 0.25)";
    voidParticles.forEach(p => {
        p.y += p.speedY;
        if (p.y < 0) p.y = voidCanvas.height;
        if (p.y > voidCanvas.height) p.y = 0;
        vCtx.fillRect(p.x, p.y, p.size, p.size);
    });
    requestAnimationFrame(animateVoid);
}
animateVoid();

// --- Elementos de Interface ---
const radar = document.getElementById('radarCanvas');
const ctx = radar.getContext('2d');
const coordsHud = document.getElementById('coords-hud');
const freqSlider = document.getElementById('freq-slider');
const freqVal = document.getElementById('freq-val');
const lockBtn = document.getElementById('lock-btn');
const systemMsg = document.getElementById('system-msg');
const borderStatus = document.getElementById('border-status');
const rewardModal = document.getElementById('reward-modal');
const secretWordDisplay = document.getElementById('secret-word-display');
const btnCopy = document.getElementById('btn-copy');

let mouseRelX = 0;
let mouseRelY = 0;
let isMouseInside = false;

// Estado da mira (toggle)
let probeX = null;
let probeY = null;
let isPinned = false;

let currentActiveBeacon = null;
let radarAngle = 0;

// ==========================================
// 3. ANIMAÇÃO DE EXPANSÃO SUAVE & SHOCKWAVES
// ==========================================
let currentRadius = 80;
let targetRadius = 80;
const shockwaves = [];

function triggerShockwave() {
    shockwaves.push({
        size: currentRadius,
        alpha: 1.0
    });
}

// Atualização de Frequência
freqSlider.addEventListener('input', (e) => {
    initRadioSynthesizer();
    freqVal.innerText = `${e.target.value} kHz`;
    checkProximity();
});

// Movimento do rato sobre o radar
radar.addEventListener('mousemove', (e) => {
    initRadioSynthesizer();
    const rect = radar.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    mouseRelX = e.clientX - rect.left - centerX;
    mouseRelY = e.clientY - rect.top - centerY;
    isMouseInside = true;

    if (!isPinned) {
        const mcX = Math.round(mouseRelX * 30);
        const mcZ = Math.round(mouseRelY * 30);
        coordsHud.innerText = `SCANNER: X: ${mcX} | Z: ${mcZ}`;
        checkProximity();
    }
});

// Toggle no clique (Travar / Destravar)
radar.addEventListener('click', (e) => {
    initRadioSynthesizer();

    if (isPinned) {
        isPinned = false;
        probeX = null;
        probeY = null;
        playBeep(420, 0.05);

        const mcX = Math.round(mouseRelX * 30);
        const mcZ = Math.round(mouseRelY * 30);
        coordsHud.innerText = `SCANNER: X: ${mcX} | Z: ${mcZ}`;
        checkProximity();
    } else {
        const rect = radar.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        probeX = e.clientX - rect.left - centerX;
        probeY = e.clientY - rect.top - centerY;
        isPinned = true;
        playBeep(880, 0.05);

        const mcX = Math.round(probeX * 30);
        const mcZ = Math.round(probeY * 30);
        coordsHud.innerText = `LOCKED: X: ${mcX} | Z: ${mcZ}`;
        checkProximity();
    }
});

radar.addEventListener('mouseleave', () => {
    isMouseInside = false;
    if (!isPinned) {
        currentActiveBeacon = null;
        lockBtn.disabled = true;
        updateRadioAudio(999, 999, 440);
    }
});

// Verificação de proximidade e modulação de áudio
function checkProximity() {
    if (!isPinned && !isMouseInside) {
        lockBtn.disabled = true;
        updateRadioAudio(999, 999, 440);
        return;
    }

    const checkX = isPinned ? probeX : mouseRelX;
    const checkY = isPinned ? probeY : mouseRelY;
    const currentFreq = parseInt(freqSlider.value, 10);
    currentActiveBeacon = null;

    let closestDist = 999;
    let closestDiff = 999;
    let closestTargetFreq = 440;

    for (const b of BEACONS) {
        if (b.locked) continue;

        const dist = Math.hypot(checkX - b.x, checkY - b.y);
        const freqDiff = Math.abs(currentFreq - b.targetFreq);

        if (dist < closestDist) {
            closestDist = dist;
            closestDiff = freqDiff;
            closestTargetFreq = b.targetFreq;
        }

        if (dist < 25) {
            if (freqDiff < 30) {
                currentActiveBeacon = b;
                lockBtn.disabled = false;
                systemMsg.innerText = `> RESONANCE DETECTED: Beacon ${b.name} (${b.label}) ready to sync!`;
                systemMsg.style.color = "#00ffcc";
                updateRadioAudio(dist, freqDiff, b.targetFreq);
                return;
            } else {
                systemMsg.innerText = `> SIGNAL INTERFERENCE! Adjust frequency near ${Math.round(b.targetFreq / 50) * 50} kHz...`;
                systemMsg.style.color = "#ffaa00";
                lockBtn.disabled = true;
                updateRadioAudio(dist, freqDiff, b.targetFreq);
                return;
            }
        }
    }

    updateRadioAudio(closestDist, closestDiff, closestTargetFreq);
    lockBtn.disabled = true;

    if (isPinned) {
        systemMsg.innerText = "> Target locked. Click anywhere on radar to release cursor.";
    } else {
        systemMsg.innerText = "> Searching uncharted sector... Click to pin target.";
    }
    systemMsg.style.color = "#88aa99";
}

// Sincronizar Baliza
lockBtn.addEventListener('click', () => {
    if (!currentActiveBeacon) return;

    currentActiveBeacon.locked = true;
    playBeep(920, 0.2);

    const chip = document.getElementById(`beacon-${currentActiveBeacon.id}`);
    chip.classList.add('active');
    chip.innerText = `BEACON ${currentActiveBeacon.name}: SYNCED`;

    // 3. Expansão fluida & Disparo de pulso elétrico
    targetRadius += 25;
    triggerShockwave();

    isPinned = false;
    probeX = null;
    probeY = null;
    lockBtn.disabled = true;
    updateRadioAudio(999, 999, 440);

    checkVictory();
});

function checkVictory() {
    const allLocked = BEACONS.every(b => b.locked);
    if (allLocked) {
        playSuccessJingle();
        borderStatus.innerText = "BARRIER DEACTIVATED [+5000M]";
        borderStatus.style.color = "#00ffcc";
        document.querySelector('.pulse-dot').style.background = "#00ffcc";
        
        systemMsg.innerText = "> ALL BEACONS LINKED. WORLD EXPANDED SUCCESSFULLY.";
        systemMsg.style.color = "#00ffcc";

        // 1. Decifra a palavra apenas após vencer
        decryptedSecret = decryptSecret();
        secretWordDisplay.innerText = decryptedSecret;

        setTimeout(() => {
            rewardModal.classList.remove('hidden');
        }, 1200);
    } else {
        systemMsg.innerText = "> Beacon linked! Search for next anomaly...";
        systemMsg.style.color = "#00ff66";
    }
}

// Botão de copiar
btnCopy.addEventListener('click', () => {
    if (!decryptedSecret) return;
    navigator.clipboard.writeText(decryptedSecret).then(() => {
        btnCopy.innerText = "COPIED!";
        setTimeout(() => btnCopy.innerText = "COPY", 2000);
    });
});

// Renderização do Radar
function drawRadar() {
    ctx.fillStyle = "#020b05";
    ctx.fillRect(0, 0, radar.width, radar.height);

    const cx = radar.width / 2;
    const cy = radar.height / 2;

    // 3. Interpolação suave (Lerp) do raio da barreira
    currentRadius += (targetRadius - currentRadius) * 0.06;

    const boxX = cx - currentRadius;
    const boxY = cy - currentRadius;
    const boxSize = currentRadius * 2;

    // --- 1. Mapa do Mundo Dentro da Barreira ---
    if (worldMapLoaded) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(boxX, boxY, boxSize, boxSize);
        ctx.clip();

        ctx.imageSmoothingEnabled = false;
        ctx.filter = "brightness(0.65) contrast(1.4) sepia(100%) hue-rotate(80deg) saturate(320%)";
        ctx.globalAlpha = 0.55;

        ctx.drawImage(worldMapImg, boxX, boxY, boxSize, boxSize);

        ctx.fillStyle = "rgba(0, 25, 10, 0.25)";
        ctx.fillRect(boxX, boxY, boxSize, boxSize);

        ctx.restore();
    }

    // --- 2. Grelha Circular e Cardinal ---
    ctx.strokeStyle = "rgba(0, 255, 102, 0.12)";
    ctx.lineWidth = 1;

    for (let r = 30; r < 200; r += 35) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, radar.height);
    ctx.moveTo(0, cy); ctx.lineTo(radar.width, cy);
    ctx.stroke();

    // --- 3. Linha de Varredura (Sweep) ---
    radarAngle += 0.02;
    const sweepX = cx + Math.cos(radarAngle) * 200;
    const sweepY = cy + Math.sin(radarAngle) * 200;
    ctx.strokeStyle = "rgba(0, 255, 102, 0.22)";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(sweepX, sweepY);
    ctx.stroke();

    // --- 4. Renderização das Ondas de Choque (Shockwaves) ---
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.size += 1.8;
        sw.alpha -= 0.02;

        if (sw.alpha <= 0) {
            shockwaves.splice(i, 1);
        } else {
            ctx.save();
            ctx.strokeStyle = `rgba(0, 255, 204, ${sw.alpha})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(cx - sw.size, cy - sw.size, sw.size * 2, sw.size * 2);
            ctx.restore();
        }
    }

    // --- 5. Contorno da Barreira ---
    ctx.strokeStyle = BEACONS.every(b => b.locked) ? "#00ffcc" : "rgba(255, 50, 50, 0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxSize, boxSize);

    // Spawn (0, 0)
    ctx.fillStyle = "#00ff66";
    ctx.fillRect(cx - 3, cy - 3, 6, 6);

    // --- 6. Balizas ---
    const activeCheckX = isPinned ? probeX : (isMouseInside ? mouseRelX : -9999);
    const activeCheckY = isPinned ? probeY : (isMouseInside ? mouseRelY : -9999);

    BEACONS.forEach(b => {
        const bx = cx + b.x;
        const by = cy + b.y;

        if (b.locked) {
            ctx.fillStyle = "#00ffcc";
            ctx.shadowColor = "#00ffcc";
            ctx.shadowBlur = 10;
            ctx.fillRect(bx - 4, by - 4, 8, 8);
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#00ffcc";
            ctx.font = "10px monospace";
            ctx.fillText(`BEACON ${b.name}`, bx + 8, by + 4);
        } else {
            const dist = Math.hypot(activeCheckX - b.x, activeCheckY - b.y);
            if (dist < 45) {
                ctx.strokeStyle = "rgba(255, 170, 0, 0.7)";
                ctx.beginPath();
                ctx.arc(bx, by, 8, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    });

    // --- 7. Mira do Jogador (Quadrado Branco com Toggle) ---
    if (isPinned && probeX !== null) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx + probeX - 6, cy + probeY - 6, 12, 12);
        
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(cx + probeX - 1, cy + probeY - 1, 2, 2);

        if (isMouseInside) {
            ctx.strokeStyle = "rgba(0, 255, 102, 0.35)";
            ctx.lineWidth = 1;
            ctx.strokeRect(cx + mouseRelX - 6, cy + mouseRelY - 6, 12, 12);
        }
    } else if (isMouseInside) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx + mouseRelX - 6, cy + mouseRelY - 6, 12, 12);
    }

    requestAnimationFrame(drawRadar);
}
drawRadar();