// --- 1. Environmental Controls & Global States ---
const timeSlider = document.getElementById('time-slider');
const skyLayer = document.getElementById('sky-layer');
const starsLayer = document.getElementById('stars-layer');

const sizzleSound = new Audio('sizzling-Sound.mp3');
const successSound = new Audio('completed-Sound.mp3');
const failSound = new Audio('burnt-Sound.mp3');

// --- Global Keybinds ---
document.addEventListener('keydown', (e) => {
    // Check if the key pressed was 'Escape'
    if (e.key === 'Escape') {
        // Redirect back to the hub page. 
        // Note: Change 'index.html' if you named your main hub file something else.
        window.location.href = '../index.html'; 
    }
});

// ==================================================

let currentSliderOpacity = 0;
let gameWon = false;
const starsArray = [];

function generateTextCoordinates(text) {
    const points = [];
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    // Scale size down slightly so it maps tightly to monitor widths
    tempCanvas.width = 600;
    tempCanvas.height = 150;
    
    tempCtx.font = "bold 80px 'Courier New'";
    tempCtx.fillStyle = "#ffffff";
    tempCtx.textAlign = "center";
    tempCtx.textBaseline = "middle";
    tempCtx.fillText(text, tempCanvas.width / 2, tempCanvas.height / 2);
    
    const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Scan pixel vectors (stepping by 7 pixels prevents cluttered overlap)
    for (let y = 0; y < tempCanvas.height; y += 7) {
        for (let x = 0; x < tempCanvas.width; x += 7) {
            const index = (y * tempCanvas.width + x) * 4;
            if (imgData.data[index] > 128) {
                points.push({ x: x, y: y });
            }
        }
    }
    return points;
}

function initStarfield() {
    const targets = generateTextCoordinates("OAK WOOD");
    const totalStars = Math.max(targets.length, 120); // Ensures an active star density
    
    for (let i = 0; i < totalStars; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        
        // Randomly scatter elements uniformly across the screen canvas initial states
        const startX = Math.random() * window.innerWidth;
        const startY = Math.random() * window.innerHeight;
        star.style.left = startX + 'px';
        star.style.top = startY + 'px';
        
        let targetX = null;
        let targetY = null;
        
        // Map specific stars directly to coordinate trajectories 
        if (i < targets.length) {
            star.dataset.isConstellation = "true";
            // Centers coordinates horizonally and anchors them tightly to the upper 18% viewport margin
            targetX = (window.innerWidth / 2 - 300) + targets[i].x;
            targetY = (window.innerHeight * 0.10) + targets[i].y;
            
            star.dataset.tx = targetX - startX;
            star.dataset.ty = targetY - startY;
        } else {
            star.dataset.isConstellation = "false";
        }
        
        starsLayer.appendChild(star);
        starsArray.push(star);
    }
}

function triggerConstellationAssembling() {
    starsArray.forEach(star => {
        if (star.dataset.isConstellation === "true") {
            star.classList.add('constellation');
            // Shift translation positions programmatically
            star.style.transform = `translate(${star.dataset.tx}px, ${star.dataset.ty}px)`;
        } else {
            // Fade ambient stars downward slightly to draw contrast directly to the word
            star.style.opacity = currentSliderOpacity * 0.2;
        }
    });
}

window.addEventListener('load', initStarfield);

// --- 3. Furnace Core Mechanics ---
const smeltBtn = document.getElementById('smelt-btn');
const timerDisplay = document.getElementById('timer-display');
const statusMessage = document.getElementById('status-message');
const furnaceGui = document.getElementById('furnace-gui'); 
const emberLayer = document.getElementById('ember-layer');

let startTime = 0;
let timerInterval = null;
let emberInterval = null;
let isHeating = false;

function spawnEmber() {
    const ember = document.createElement('div');
    ember.classList.add('ember');
    
    // Spawn randomly along the width of the furnace
    ember.style.left = `calc(50% + ${(Math.random() - 0.5) * 300}px)`;
    emberLayer.appendChild(ember);
    
    // Force a reflow, then apply the upward transform to trigger CSS transition
    requestAnimationFrame(() => {
        // Fly upward randomly between 100px and 250px
        const floatHeight = Math.random() * 150 + 100;
        ember.style.transform = `translateY(-${floatHeight}px)`;
        ember.style.backgroundColor = '#555'; // Cools to ash color as it flies
        ember.style.opacity = '0';
    });
    
    // Clean up DOM element after animation finishes
    setTimeout(() => ember.remove(), 1000);
}

function spawnSmokeBurst() {
    for (let i = 0; i < 25; i++) {
        const smoke = document.createElement('div');
        smoke.classList.add('smoke');
        smoke.style.left = `calc(50% + ${(Math.random() - 0.5) * 200}px)`;
        emberLayer.appendChild(smoke);
        
        requestAnimationFrame(() => {
            const spreadX = (Math.random() - 0.5) * 300;
            const floatHeight = Math.random() * 200 + 100;
            smoke.style.transform = `translate(${spreadX}px, -${floatHeight}px) scale(${Math.random() * 2 + 1})`;
            smoke.style.opacity = '0';
        });
        
        setTimeout(() => smoke.remove(), 1500);
    }
}

function updateFurnaceImage(time) {
    if (time >= 8.10) return 'furnace img11.png';
    if (time >= 8.00) return 'furnace img10.png';
    if (time >= 7.80) return 'furnace img9.png';
    if (time >= 7.00) return 'furnace img8.png';
    if (time >= 6.00) return 'furnace img7.png';
    if (time >= 5.00) return 'furnace img6.png';
    if (time >= 4.00) return 'furnace img5.png';
    if (time >= 3.00) return 'furnace img4.png';
    if (time >= 2.00) return 'furnace img3.png';
    if (time >= 1.00) return 'furnace img2.png';
    return 'furnace img1.png';
}

function updateTimer() {
    const elapsedTime = (Date.now() - startTime) / 1000;
    timerDisplay.innerText = elapsedTime.toFixed(2) + "s";
    furnaceGui.src = updateFurnaceImage(elapsedTime);
}

function startHeating(e) {
    if(e.type === 'touchstart') e.preventDefault(); 
    if (gameWon) return;

    sizzleSound.loop = true; // Loops until they let go
    sizzleSound.play();

    isHeating = true;
    startTime = Date.now();
    statusMessage.innerText = "Heating...";
    statusMessage.style.color = "#d35400";
    timerDisplay.style.color = "#d35400";
    furnaceGui.src = 'furnace img1.png'; 
    
    timerInterval = setInterval(updateTimer, 10);
    
    // Spawn an ember every 60 milliseconds
    emberInterval = setInterval(spawnEmber, 60);
}

function stopHeating(e) {
    if(e.type === 'touchend') e.preventDefault();
    if (!isHeating || gameWon) return;
    
    document.querySelector('.puzzle-container').classList.add('shake-animation');
    setTimeout(() => {
        document.querySelector('.puzzle-container').classList.remove('shake-animation');
    }, 300);

    sizzleSound.pause();
    sizzleSound.currentTime = 0; // Reset the sound

    isHeating = false;
    clearInterval(timerInterval);
    clearInterval(emberInterval);
    
    const finalTime = (Date.now() - startTime) / 1000;
    
    if (finalTime >= 7.9 && finalTime <= 8.10) {
        successSound.play();
        timerDisplay.innerText = "8.00s";
        timerDisplay.style.color = "#27ae60"; 
        statusMessage.innerText = "SUCCESS. Look to the sky.";
        statusMessage.style.color = "#27ae60";
        smeltBtn.style.backgroundColor = "#27ae60";
        smeltBtn.innerText = "FORGE SECURED";
        
        furnaceGui.src = 'furnace img10.png'; 
        gameWon = true;
        triggerConstellationAssembling();
    } else {
        failSound.play();
        timerDisplay.innerText = finalTime.toFixed(2) + "s";
        timerDisplay.style.color = "#c0392b"; 
        statusMessage.style.color = "#c0392b";
        
        if (finalTime < 7.95) {
            statusMessage.innerText = "FAILED: Heat released too early.";
            furnaceGui.src = 'furnace img1.png'; 
        } else {
            statusMessage.innerText = "FAILED: The porkchop burned to ash.";
            furnaceGui.src = 'furnace img11.png'; 
            spawnSmokeBurst(); // Trigger massive smoke cloud on burn
        }
    }
}

smeltBtn.addEventListener('mousedown', startHeating);
document.addEventListener('mouseup', stopHeating);
smeltBtn.addEventListener('touchstart', startHeating);
document.addEventListener('touchend', stopHeating);


// ==================================================================

timeSlider.addEventListener('input', (e) => {
    const value = e.target.value;
    currentSliderOpacity = value / 100;
    
    // Top gradient color: Sky Blue to Dark Night Sky
    const topR = Math.floor(135 - (135 * currentSliderOpacity));
    const topG = Math.floor(206 - (206 * currentSliderOpacity));
    const topB = Math.floor(235 - (185 * currentSliderOpacity)); 
    
    // Bottom gradient color: White Horizon to Faint Orange Twilight
    // Day = rgb(224, 246, 255) | Night = rgb(80, 30, 0)
    const botR = Math.floor(224 - (144 * currentSliderOpacity));
    const botG = Math.floor(246 - (216 * currentSliderOpacity));
    const botB = Math.floor(255 - (255 * currentSliderOpacity)); 
    
    skyLayer.style.background = `linear-gradient(to bottom, rgb(${topR},${topG},${topB}), rgb(${botR},${botG},${botB}))`;
    
    starsArray.forEach(star => {
        star.style.opacity = currentSliderOpacity;
    });

    // Fade in Fireflies at night
    fireflyLayer.style.opacity = currentSliderOpacity;

    // --- Dynamic Tree Lighting & Backlight Glow ---
    const trees = document.querySelectorAll('.bg-tree');
    
    // 1. Calculate how dark the tree gets (1.0 at day, 0.15 at night)
    const treeBrightness = 1 - (0.85 * currentSliderOpacity); 
    
    // 2. Calculate the opacity of the orange glow (0 at day, up to 0.7 at night)
    const glowAlpha = 0.3 * currentSliderOpacity;
    
    trees.forEach(tree => {
        // We combine BOTH filters here. 
        // The drop-shadow uses X: 0px, Y: -10px (to push the glow upwards behind the leaves), 
        // Blur: 25px, and a vibrant sunset orange (rgba: 255, 120, 0) that fades in.
        tree.style.filter = `
            brightness(${treeBrightness}) 
            drop-shadow(0px -5px 5px rgba(255, 120, 0, ${glowAlpha}))
        `;
    });
});

// =======================================

// --- Ambient Firefly Physics ---
const fireflyLayer = document.getElementById('firefly-layer');
const fireflyData = [];

// 1. Track the mouse position
let mouseX = -1000;
let mouseY = -1000;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

function initFireflies() {
    const totalFireflies = 45;
    for (let i = 0; i < totalFireflies; i++) {
        const firefly = document.createElement('div');
        firefly.classList.add('firefly');
        
        // Spawn randomly across the screen, biased toward the bottom half
        const startX = Math.random() * window.innerWidth;
        const startY = window.innerHeight - (Math.random() * window.innerHeight * 0.4); 
        
        firefly.style.left = `${startX}px`;
        firefly.style.top = `${startY}px`; 
        
        firefly.style.animationDuration = `${Math.random() * 3 + 2}s`;
        firefly.style.animationDelay = `${Math.random() * 5}s`;
        
        fireflyLayer.appendChild(firefly);
        
        // Store physics properties for each bug
        fireflyData.push({
            el: firefly,
            x: 0, 
            y: 0, 
            vx: 0, 
            vy: 0, 
            wanderX: (Math.random() - 0.5) * 50, 
            wanderY: (Math.random() - 0.5) * 50,
            // UPDATED: Lowered the base wandering speed significantly
            speed: Math.random() * 0.004 + 0.002 
        });
    }
    
    requestAnimationFrame(animateFireflies);
}

function animateFireflies() {
    fireflyData.forEach(f => {
        const rect = f.el.getBoundingClientRect();
        const absoluteX = rect.left + rect.width / 2;
        const absoluteY = rect.top + rect.height / 2;

        const dx = mouseX - absoluteX;
        const dy = mouseY - absoluteY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If the mouse is within 150px, scatter!
        if (distance < 150) {
            const angle = Math.atan2(dy, dx);
            const force = (150 - distance) / 150; 
            
            // UPDATED: Lowered the multiplier from 1.5 to 0.5 for a gentler push
            f.vx -= Math.cos(angle) * force * 0.2;
            f.vy -= Math.sin(angle) * force * 0.2;
        } else {
            // Gently drift toward their random wander points
            f.vx += (f.wanderX - f.x) * f.speed;
            f.vy += (f.wanderY - f.y) * f.speed;

            if (Math.random() < 0.01) {
                f.wanderX = (Math.random() - 0.5) * 150;
                f.wanderY = (Math.random() - 0.5) * 150;
            }
        }

        // UPDATED: Increased friction drag (0.92 -> 0.85) so they don't slide as far
        f.vx *= 0.85;
        f.vy *= 0.85;

        f.x += f.vx;
        f.y += f.vy;

        f.el.style.setProperty('--tx', `${f.x}px`);
        f.el.style.setProperty('--ty', `${f.y}px`);
    });

    requestAnimationFrame(animateFireflies);
}

// Update your existing window load event:
window.addEventListener('load', () => {
    initStarfield();
    initFireflies();
});