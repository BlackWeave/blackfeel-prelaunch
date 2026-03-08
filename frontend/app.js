// --- Configuration ---
const API_BASE = '/api';

// --- State Management ---
const state = {
    token: localStorage.getItem('luxe_token'),
    user: null,
    generationsLeft: 5,
    currentDesign: null,
    currentTshirtColor: '#1a1a1a',
    history: []
};

// --- DOM Elements ---
const DOM = {
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
    resizeHandle: document.getElementById('resize-handle'),
    buyNowBtn: document.getElementById('buy-now-btn')
};

// --- Initialization ---
async function init() {
    setupEventListeners();
    initInteractJS();
    
    if (state.token) {
        await checkAuth();
    }
}

// --- Event Listeners ---
function setupEventListeners() {
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
    
    DOM.colorBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newImageSrc = e.target.dataset.src;
            DOM.tshirtImg.style.opacity = 0.5;
            setTimeout(() => {
                DOM.tshirtImg.src = newImageSrc;
                DOM.tshirtImg.style.opacity = 1;
            }, 150);
            
            const colorMap = {
                'assets/black-tshirt.png': '#1a1a1a',
                'assets/white-tshirt.png': '#f5f5f5',
                'assets/blue-tshirt.png': '#1e3a8a',
                'assets/red-tshirt.png': '#7f1d1d'
            };
            state.currentTshirtColor = colorMap[newImageSrc] || '#1a1a1a';
        });
    });
    
    DOM.generateBtn.addEventListener('click', generateDesign);
    DOM.buyNowBtn.addEventListener('click', handleBuyNow);
}

// --- RESTORED AUTH HANDLERS ---
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        if (response.ok) {
            state.user = await response.json();
            state.generationsLeft = 5 - state.user.generationsUsed;
            DOM.authModal.classList.add('hidden');
            DOM.logoutBtn.classList.remove('hidden');
            updateUI();
            loadHistory();
        } else {
            localStorage.removeItem('luxe_token');
            state.token = null;
            DOM.authModal.classList.remove('hidden');
        }
    } catch (error) {
        DOM.authModal.classList.remove('hidden');
    }
}

async function handleLogin() {
    const email = DOM.loginEmail.value;
    const password = DOM.loginPassword.value;
    if (!email || !password) return showAuthError('Please fill all fields');

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            state.token = data.token;
            localStorage.setItem('luxe_token', data.token);
            window.location.reload();
        } else {
            showAuthError(data.error || 'Login failed');
        }
    } catch (e) { showAuthError('Connection error'); }
}

async function handleRegister() {
    const name = DOM.registerName.value;
    const email = DOM.registerEmail.value;
    const password = DOM.registerPassword.value;
    if (!name || !email || !password) return showAuthError('Please fill all fields');

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await response.json();
        if (response.ok) {
            state.token = data.token;
            localStorage.setItem('luxe_token', data.token);
            window.location.reload();
        } else {
            showAuthError(data.error || 'Registration failed');
        }
    } catch (e) { showAuthError('Connection error'); }
}

function handleLogout() {
    localStorage.removeItem('luxe_token');
    window.location.reload();
}

function showAuthError(msg) {
    DOM.authError.textContent = msg;
    DOM.authError.classList.remove('hidden');
}

function updateUI() {
    DOM.rateLimitDisplay.textContent = state.generationsLeft;
    if (state.generationsLeft <= 0) DOM.generateBtn.disabled = true;
    if (state.currentDesign) DOM.buyNowBtn.classList.remove('hidden');
}

// --- Design Generation ---
async function generateDesign() {
    const prompt = DOM.promptInput.value.trim();
    if (!prompt) return alert('Please describe your vision');
    
    DOM.generateBtn.disabled = true;
    DOM.btnLoader.classList.remove('hidden');
    
    try {
        const response = await fetch(`${API_BASE}/designs/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({ prompt, tshirtColor: state.currentTshirtColor })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        handleNewDesign(data.imageUrl, prompt, data);
    } catch (error) {
        alert(error.message);
    } finally {
        DOM.generateBtn.disabled = false;
        DOM.btnLoader.classList.add('hidden');
    }
}

function handleNewDesign(url, promptText, data) {
    const newDesign = { id: data.designId, url, prompt: promptText, scale: 1, x: 0, y: 0 };
    state.history.unshift(newDesign);
    state.generationsLeft = 5 - data.generationsUsed;
    renderHistory();
    loadDesignToCanvas(newDesign);
    updateUI();
}

function loadDesignToCanvas(design) {
    // Normalize the design object for consistent state
    state.currentDesign = {
        ...design,
        url: design.url || design.processed_image_url
    };

    DOM.generatedImage.src = state.currentDesign.url;
    DOM.designWrapper.classList.remove('hidden');
    
    // Maintain previous position if it exists, otherwise center it
    const pos = design.design_position || { x: 0, y: 0, scale: 1 };
    applyTransform(pos.x, pos.y, pos.scale);
    
    renderHistory(); // Refresh history to update the active ring
    updateUI();
}

function renderHistory() {
    DOM.historyList.innerHTML = '';
    
    if (state.history.length === 0) {
        DOM.historyList.innerHTML = '<div class="col-span-4 text-center text-gray-500 text-xs py-8">No designs yet</div>';
        return;
    }

    state.history.forEach(item => {
        const div = document.createElement('div');
        // Add active ring if this is the currently selected design
        const isActive = state.currentDesign?.id === item.id;
        div.className = `aspect-square rounded-lg overflow-hidden cursor-pointer border border-white/10 hover:border-yellow-600 transition ${isActive ? 'ring-2 ring-yellow-500' : ''}`;
        
        div.onclick = () => loadDesignToCanvas(item);
        
        const img = document.createElement('img');
        // FIX: Check both property names
        img.src = item.url || item.processed_image_url; 
        img.className = 'w-full h-full object-cover';
        
        div.appendChild(img);
        DOM.historyList.appendChild(div);
    });
}

async function loadHistory() {
    const response = await fetch(`${API_BASE}/designs/history`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (response.ok) {
        const data = await response.json();
        state.history = data.designs || [];
        renderHistory();
    }
}

// --- Finalize & Checkout ---
async function handleFinalize() {
    if (!state.currentDesign) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 2000; canvas.height = 2400; 
    const ctx = canvas.getContext('2d');

    const tshirtImg = new Image();
    tshirtImg.src = DOM.tshirtImg.src;
    const designImg = new Image();
    designImg.crossOrigin = "anonymous";
    designImg.src = state.currentDesign.url;

    await Promise.all([
        new Promise(res => tshirtImg.onload = res),
        new Promise(res => designImg.onload = res)
    ]);

    ctx.drawImage(tshirtImg, 0, 0, 2000, 2400);
    const centerX = 1000 + (state.currentDesign.x * 4); 
    const centerY = 1200 + (state.currentDesign.y * 4);
    const dWidth = 800 * state.currentDesign.scale;
    const dHeight = 800 * state.currentDesign.scale;
    ctx.drawImage(designImg, centerX - (dWidth/2), centerY - (dHeight/2), dWidth, dHeight);

    return canvas.toDataURL('image/jpeg', 0.95);
}

async function finalizeDesignOnServer() {
    const finalImageBase64 = await handleFinalize();
    if (!finalImageBase64) throw new Error('Baking failed');

    const response = await fetch(`${API_BASE}/designs/${state.currentDesign.id}/finalize`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({ finalImage: finalImageBase64 })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data.finalizedImageUrl;
}

function handleBuyNow() {
    if (!state.currentDesign) return;
    showSizeModal();
}

function showSizeModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-md p-8">
            <h2 class="text-xl font-semibold text-white text-center mb-6 serif">Select Size</h2>
            <div class="grid grid-cols-2 gap-3 mb-6">
                ${['S', 'M', 'L', 'XL', 'XXL'].map(s => `<button class="size-btn bg-[#111] border border-white/10 rounded-lg p-4 text-white hover:border-yellow-600 transition" data-size="${s}">${s}</button>`).join('')}
            </div>
            <div class="flex gap-3">
                <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-[#111] text-gray-400 py-3 rounded-lg">Cancel</button>
                <button id="proceed-btn" class="flex-1 bg-yellow-600 text-black font-semibold py-3 rounded-lg">Proceed</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    let selectedSize = null;
    modal.querySelectorAll('.size-btn').forEach(btn => {
        btn.onclick = () => {
            modal.querySelectorAll('.size-btn').forEach(b => b.classList.remove('border-yellow-600'));
            btn.classList.add('border-yellow-600');
            selectedSize = btn.dataset.size;
        };
    });

    document.getElementById('proceed-btn').onclick = async () => {
        if (!selectedSize) return alert('Select a size');
        const btn = document.getElementById('proceed-btn');
        btn.disabled = true; btn.textContent = 'Baking Proof...';
        try {
            await finalizeDesignOnServer();
            modal.remove();
            initiateCheckout(selectedSize);
        } catch (e) { alert(e.message); btn.disabled = false; }
    };
}

async function initiateCheckout(size) {
    try {
        const orderRes = await fetch(`${API_BASE}/orders/buy-now`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
            body: JSON.stringify({ designId: state.currentDesign.id, tshirtSize: size })
        });
        const orderData = await orderRes.json();
        
        const payRes = await fetch(`${API_BASE}/orders/initiate-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
            body: JSON.stringify({ orderId: orderData.orderId })
        });
        const payData = await payRes.json();

        const options = {
            key: payData.key,
            amount: payData.amount,
            currency: payData.currency,
            order_id: payData.razorpayOrderId,
            handler: (res) => verifyPayment(res, orderData.orderId),
            theme: { color: '#ca8a04' }
        };
        new Razorpay(options).open();
    } catch (e) { alert('Checkout failed'); }
}

async function verifyPayment(res, orderId) {
    const verify = await fetch(`${API_BASE}/payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
        body: JSON.stringify({
            razorpayOrderId: res.razorpay_order_id,
            razorpayPaymentId: res.razorpay_payment_id,
            razorpaySignature: res.razorpay_signature
        })
    });
    if (verify.ok) alert('✅ Order placed successfully!');
}

// --- Interact.js Engine ---
function initInteractJS() {
    interact('#design-wrapper').draggable({
        inertia: true,
        modifiers: [interact.modifiers.restrictRect({ restriction: 'parent', endOnly: true })],
        listeners: { move: dragMoveListener }
    });
    DOM.resizeHandle.onmousedown = initResize;
}

let rStartY = 0, rStartScale = 1;
function initResize(e) {
    e.preventDefault(); e.stopPropagation();
    rStartY = e.clientY;
    rStartScale = state.currentDesign.scale || 1;
    window.onmousemove = resizeMoveListener;
    window.onmouseup = () => window.onmousemove = null;
}

function resizeMoveListener(e) {
    const deltaY = rStartY - e.clientY;
    const newScale = Math.max(0.3, Math.min(2.5, rStartScale + (deltaY * 0.01)));
    applyTransform(state.currentDesign.x, state.currentDesign.y, newScale);
}

function dragMoveListener(event) {
    const scale = state.currentDesign.scale || 1;
    applyTransform(state.currentDesign.x + (event.dx / scale), state.currentDesign.y + (event.dy / scale), scale);
}

function applyTransform(x, y, scale) {
    if (state.currentDesign) {
        state.currentDesign.x = x; state.currentDesign.y = y; state.currentDesign.scale = scale;
    }
    DOM.designWrapper.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
}

init();