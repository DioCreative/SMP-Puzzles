// --- 1. Matrix Digital Rain Effect ---
const canvas = document.getElementById('matrixCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Mixing standard characters with Greek symbols to match your image
const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+><?αβγδεζηθικλμνξοπρστυφχψω';
const fontSize = 16;
const columns = canvas.width / fontSize;

const drops = [];
for (let x = 0; x < columns; x++) {
    drops[x] = 1;
}

function drawMatrix() {
    // Drawing a translucent black rectangle over the old frame creates the fading trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0F0'; // Matrix Green
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // Reset the drop to the top randomly once it falls off screen
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

// Renders a new frame every 33 milliseconds (~30 FPS)
setInterval(drawMatrix, 33);

// Recalculates canvas size if the player resizes their browser window
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// ==============================
// PASSWORD PROMPT

// --- 2. Password Modal Logic ---
const quest1Link = document.getElementById('quest1-link');
const passwordModal = document.getElementById('password-modal');
const vaultInput = document.getElementById('vault-input');
const btnSubmit = document.getElementById('btn-submit');
const btnCancel = document.getElementById('btn-cancel');
const modalError = document.getElementById('modal-error');

// 1. Open the Modal
quest1Link.addEventListener('click', (e) => {
    e.preventDefault(); 
    passwordModal.classList.remove('hidden'); // Shows the modal
    vaultInput.value = ''; // Clears any old typing
    modalError.innerText = ''; // Clears old errors
    vaultInput.focus(); // Automatically puts the typing cursor in the box
});

// 2. Close the Modal (Cancel button or Escape key)
function closeModal() {
    passwordModal.classList.add('hidden');
}

btnCancel.addEventListener('click', closeModal);

// Allow pressing 'Escape' to close the modal if it is open
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !passwordModal.classList.contains('hidden')) {
        closeModal();
    }
});

// 3. Verify the Code
// 3. Verify the Code (Secured with SHA-256)
async function submitCode() {
    const guess = vaultInput.value.toUpperCase().trim();
    if (guess === "") return;

    // The pre-calculated SHA-256 hash for the word "VANGUARD"
    const targetHash = "3207560f609cc63e244e4bee9c96ccf849189c9017581f26c62939879e903c37";

    try {
        // Encode the player's guess into a byte array
        const encoder = new TextEncoder();
        const data = encoder.encode(guess);
        
        // Ask the browser's crypto engine to hash the data
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        
        // Convert the raw buffer into a readable hexadecimal string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const inputHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Compare the hashes
        if (inputHash === targetHash) {
            // Success
            window.location.href = "Quest1/quest1.html"; 
        } else {
            // Failure
            modalError.innerText = "ACCESS DENIED. INVALID DECRYPTION KEY.";
            vaultInput.value = ''; 
            vaultInput.focus();
        }
    } catch (error) {
        console.error("Encryption error:", error);
        modalError.innerText = "SYSTEM ERROR. CRYPTO MODULE OFFLINE.";
    }
}

// Trigger submit when clicking the button
btnSubmit.addEventListener('click', submitCode);

// Trigger submit when pressing the 'Enter' key inside the input box
vaultInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        submitCode();
    }
});