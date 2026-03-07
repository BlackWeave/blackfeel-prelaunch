// --- Configuration ---
const API_BASE = '/api';

// --- State Management ---
const state = {
    token: localStorage.getItem('luxe_token'),
    user: null,
    generationsLeft: 5,
    currentDesign: null,
    currentTshirtColor: '#1a1a1a',
    history: [],
    drag: {
        isDragging: false,
        isResizing: false,
        startX: 0,
        startY: 0
    }
};

// --- DOM Elements ---
const DOM = {
    // Auth
    authModal: document.getElementById('auth-modal'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    loginBtn: document.getElementById('login-btn'),
    registerName: document.getElementById('register-name'),
    registerEmail: document.getElementById('register-email'),
    registerPassword: document.getElementById('register-password'),
    registerBtn: document.getElementById('register-btn'),
    showRegisterBtn: document.getElementById('show-register-btn'),
    showLoginBtn: document.getElementById('show-login-btn'),
    authError: document.getElementById('auth-error'),
    logoutBtn: document.getElementById('logout-btn'),
    
    // Main UI
    tshirtImg: document.getElementById('tshirt-base-img'),
    colorBtns: document.querySelectorAll('.color-btn'),
    promptInput: document.getElementById('prompt-input'),
    generateBtn: document.getElementById('generate-btn'),
    btnLoader: document.getElementById('btn-loader'),
    rateLimitDisplay: document.getElementById('rate-limit-display'),
    designWrapper: document.getElementById('design-wrapper'),
    generatedImage: document.getElementById('generated-image'),
    historyList: document.getElementById('history-list'),
    emptyHistory: document.getElementById('empty-history'),
    resizeHandle: document.getElementById('resize-handle')
};

// --- Initialization ---
async function init() {
    setupEventListeners();
    
    if (state.token) {
        await checkAuth();
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    // Auth buttons
    DOM.loginBtn.addEventListener('click', handleLogin);
    DOM.registerBtn.addEventListener('click', handleRegister);
    DOM.showRegisterBtn.addEventListener('click', () => {
        DOM.loginForm.classList.add('hidden');
        DOM.registerForm.classList.remove('hidden');
        DOM.authError.classList.add('hidden');
    });
    DOM.showLoginBtn.addEventListener('click', () => {
        DOM.registerForm.classList.add('hidden');
        DOM.loginForm.classList.remove('hidden');
        DOM.authError.classList.add('hidden');
    });
    DOM.logoutBtn.addEventListener('click', handleLogout);
    
    // Color buttons
    DOM.colorBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newImageSrc = e.target.dataset.src;
            DOM.tshirtImg.style.opacity = 0.5;
            setTimeout(() => {
                DOM.tshirtImg.src = newImageSrc;
                DOM.tshirtImg.style.opacity = 1;
            }, 150);
            
            // Update color state
            const colorMap = {
                'assets/black-tshirt.png': '#1a1a1a',
                'assets/white-tshirt.png': '#f5f5f5',
                'assets/blue-tshirt.png': '#1e3a8a',
                'assets/red-tshirt.png': '#7f1d1d'
            };
            state.currentTshirtColor = colorMap[newImageSrc] || '#1a1a1a';
        });
    });
    
    // Generate button
    DOM.generateBtn.addEventListener('click', generateDesign);
    
    // Drag and resize
    DOM.designWrapper.addEventListener('mousedown', handleDragStart);
    DOM.resizeHandle.addEventListener('mousedown', handleResizeStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    
    // Touch support
    DOM.designWrapper.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
}

// --- Authentication Functions ---
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        
        if (response.ok) {
            state.user = await response.json();
            state.generationsLeft = 5 - state.user.generationsUsed;
            showApp();
            loadHistory();
        } else {
            localStorage.removeItem('luxe_token');
            state.token = null;
            showAuthModal();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showAuthModal();
    }
}

function showAuthModal() {
    DOM.authModal.classList.remove('hidden');
}

function hideAuthModal() {
    DOM.authModal.classList.add('hidden');
}

function showApp() {
    hideAuthModal();
    DOM.logoutBtn.classList.remove('hidden');
    updateUI();
}

async function handleLogin() {
    const email = DOM.loginEmail.value;
    const password = DOM.loginPassword.value;
    
    if (!email || !password) {
        showAuthError('Please fill all fields');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            state.token = data.token;
            state.user = data.user;
            localStorage.setItem('luxe_token', state.token);
            state.generationsLeft = 5 - state.user.generationsUsed;
            showApp();
            loadHistory();
        } else {
            showAuthError(data.error || 'Login failed');
        }
    } catch (error) {
        showAuthError('Connection error');
    }
}

async function handleRegister() {
    const name = DOM.registerName.value;
    const email = DOM.registerEmail.value;
    const password = DOM.registerPassword.value;
    
    if (!name || !email || !password) {
        showAuthError('Please fill all fields');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            state.token = data.token;
            state.user = data.user;
            localStorage.setItem('luxe_token', state.token);
            state.generationsLeft = 5 - state.user.generationsUsed;
            showApp();
            loadHistory();
        } else {
            showAuthError(data.error || 'Registration failed');
        }
    } catch (error) {
        showAuthError('Connection error');
    }
}

function handleLogout() {
    localStorage.removeItem('luxe_token');
    state.token = null;
    state.user = null;
    state.currentDesign = null;
    state.history = [];
    window.location.reload();
}

function showAuthError(message) {
    DOM.authError.textContent = message;
    DOM.authError.classList.remove('hidden');
}

function updateUI() {
    if (state.user) {
        DOM.rateLimitDisplay.textContent = state.generationsLeft;
        
        if (state.generationsLeft <= 0) {
            DOM.generateBtn.disabled = true;
            DOM.generateBtn.querySelector('span').textContent = 'Limit Reached';
        }
    }
}

// --- Design Generation ---
async function generateDesign() {
    const prompt = DOM.promptInput.value.trim();
    if (!prompt) {
        alert('Please describe your design vision');
        return;
    }
    
    setLoadingState(true);
    
    try {
        const response = await fetch(`${API_BASE}/designs/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({
                prompt: prompt,
                tshirtColor: state.currentTshirtColor
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Generation failed');
        }
        
        const imageUrl = data.imageUrl;
        
        // Preload image
        await new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageUrl;
        });
        
        handleNewDesign(imageUrl, prompt, data);
        
    } catch (error) {
        console.error('Generation failed:', error);
        alert(error.message || 'Failed to generate design');
    } finally {
        setLoadingState(false);
    }
}

function setLoadingState(isLoading) {
    DOM.generateBtn.disabled = isLoading;
    if (isLoading) {
        DOM.btnLoader.classList.remove('hidden');
    } else {
        DOM.btnLoader.classList.add('hidden');
    }
}

// --- History & Canvas Logic ---
function handleNewDesign(url, promptText, data) {
    const newDesign = {
        id: Date.now(),
        url: url,
        prompt: promptText,
        scale: 1,
        x: 0,
        y: 0
    };
    
    state.history.unshift(newDesign);
    if (state.history.length > 5) state.history.pop();
    
    state.generationsLeft = data.generationsLeft;
    DOM.rateLimitDisplay.textContent = state.generationsLeft;
    
    if (state.generationsLeft <= 0) {
        DOM.generateBtn.disabled = true;
        DOM.generateBtn.querySelector('span').textContent = 'Limit Reached';
    }
    
    renderHistory();
    loadDesignToCanvas(newDesign);
}

function loadDesignToCanvas(design) {
    state.currentDesign = design;
    DOM.generatedImage.src = design.url;
    DOM.designWrapper.classList.remove('hidden');
    applyTransform(design.x, design.y, design.scale);
}

function restoreFromHistory(id) {
    const design = state.history.find(d => d.id === id);
    if (design) loadDesignToCanvas(design);
}

function renderHistory() {
    if (DOM.emptyHistory) DOM.emptyHistory.remove();
    DOM.historyList.innerHTML = '';
    
    state.history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'aspect-square rounded overflow-hidden cursor-pointer border border-white/10 hover:border-yellow-600 transition-colors';
        div.onclick = () => restoreFromHistory(item.id);
        
        const img = document.createElement('img');
        img.src = item.url;
        img.className = 'w-full h-full object-cover';
        
        div.appendChild(img);
        DOM.historyList.appendChild(div);
    });
}

async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE}/designs/history`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            state.history = data.designs || [];
            state.generationsLeft = 5 - data.generationsUsed;
            DOM.rateLimitDisplay.textContent = state.generationsLeft;
            
            if (state.history.length > 0) {
                renderHistory();
            }
        }
    } catch (error) {
        console.error('Failed to load history:', error);
    }
}

// --- Drag & Resize Engine ---
function applyTransform(x, y, scale) {
    DOM.designWrapper.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    if (state.currentDesign) {
        state.currentDesign.x = x;
        state.currentDesign.y = y;
        state.currentDesign.scale = scale;
    }
}

function handleDragStart(e) {
    if (e.target === DOM.resizeHandle) return;
    state.drag.isDragging = true;
    state.drag.startX = e.clientX - state.currentDesign.x;
    state.drag.startY = e.clientY - state.currentDesign.y;
    e.preventDefault();
}

function handleResizeStart(e) {
    state.drag.isResizing = true;
    state.drag.startX = e.clientX;
    state.drag.startY = e.clientY;
    e.preventDefault();
    e.stopPropagation();
}

function handleMove(e) {
    if (!state.currentDesign) return;
    
    if (state.drag.isDragging) {
        const newX = e.clientX - state.drag.startX;
        const newY = e.clientY - state.drag.startY;
        applyTransform(newX, newY, state.currentDesign.scale);
    } else if (state.drag.isResizing) {
        const dx = e.clientX - state.drag.startX;
        const dy = e.clientY - state.drag.startY;
        const delta = (dx + dy) / 2;
        let newScale = state.currentDesign.scale + (delta * 0.005);
        newScale = Math.max(0.3, Math.min(newScale, 2.5));
        applyTransform(state.currentDesign.x, state.currentDesign.y, newScale);
    }
}

function handleTouchStart(e) {
    if (e.target === DOM.resizeHandle) {
        state.drag.isResizing = true;
        state.drag.startX = e.touches[0].clientX;
        state.drag.startY = e.touches[0].clientY;
    } else {
        state.drag.isDragging = true;
        state.drag.startX = e.touches[0].clientX - state.currentDesign.x;
        state.drag.startY = e.touches[0].clientY - state.currentDesign.y;
    }
    e.preventDefault();
}

function handleTouchMove(e) {
    if (!state.currentDesign) return;
    
    if (state.drag.isDragging) {
        const newX = e.touches[0].clientX - state.drag.startX;
        const newY = e.touches[0].clientY - state.drag.startY;
        applyTransform(newX, newY, state.currentDesign.scale);
    } else if (state.drag.isResizing) {
        const dx = e.touches[0].clientX - state.drag.startX;
        const dy = e.touches[0].clientY - state.drag.startY;
        const delta = (dx + dy) / 2;
        let newScale = state.currentDesign.scale + (delta * 0.005);
        newScale = Math.max(0.3, Math.min(newScale, 2.5));
        applyTransform(state.currentDesign.x, state.currentDesign.y, newScale);
    }
    e.preventDefault();
}

function handleEnd() {
    state.drag.isDragging = false;
    state.drag.isResizing = false;
}

// Start the app
init();
