// --- Configuration ---
const API_BASE = '/api';

// --- State Management ---
const state = {
    token: localStorage.getItem('luxe_token'),
    user: null,
    currentDesign: null,
    currentTshirtColor: '#1a1a1a',
    history: []
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
    myOrdersBtn: document.getElementById('my-orders-btn'),
    
    // Main UI
    tshirtImg: document.getElementById('tshirt-base-img'),
    colorBtns: document.querySelectorAll('.color-btn'),
    promptInput: document.getElementById('prompt-input'),
    generateBtn: document.getElementById('generate-btn'),
    btnLoader: document.getElementById('btn-loader'),
    designWrapper: document.getElementById('design-wrapper'),
    generatedImage: document.getElementById('generated-image'),
    resizeHandle: document.getElementById('resize-handle'),
    buyNowBtn: document.getElementById('buy-now-btn'),
    
    // Archives Modal
    archivesBtn: document.getElementById('archives-btn'),
    archivesModal: document.getElementById('archives-modal'),
    closeArchivesBtn: document.getElementById('close-archives-btn'),
    archivesGrid: document.getElementById('archives-grid'),
    emptyArchives: document.getElementById('empty-archives'),

    // Orders Modal
    ordersModal: document.getElementById('orders-modal'),
    closeOrdersBtn: document.getElementById('close-orders-btn'),
    ordersList: document.getElementById('orders-list'),
    emptyOrders: document.getElementById('empty-orders'),
    shopNowBtn: document.getElementById('shop-now-btn')
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
    DOM.myOrdersBtn.addEventListener('click', handleMyOrders);

    // Archives Modal
    DOM.archivesBtn.addEventListener('click', () => {
        DOM.archivesModal.classList.remove('hidden');
        renderHistory();
    });
    
    DOM.closeArchivesBtn.addEventListener('click', () => {
        DOM.archivesModal.classList.add('hidden');
    });
    
    // Orders Modal
    DOM.closeOrdersBtn.addEventListener('click', () => {
        DOM.ordersModal.classList.add('hidden');
    });

    if (DOM.shopNowBtn) {
        DOM.shopNowBtn.addEventListener('click', () => {
            DOM.ordersModal.classList.add('hidden');
        });
    }

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === DOM.archivesModal) {
            DOM.archivesModal.classList.add('hidden');
        }
        if (e.target === DOM.ordersModal) {
            DOM.ordersModal.classList.add('hidden');
        }
    });

    // Color buttons
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

    // Generate button
    DOM.generateBtn.addEventListener('click', generateDesign);
    
    // Buy Now button
    DOM.buyNowBtn.addEventListener('click', handleBuyNow);
}

// --- Authentication Functions ---
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });

        if (response.ok) {
            state.user = await response.json();
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
    if(DOM.authModal) DOM.authModal.classList.remove('hidden');
}

function hideAuthModal() {
    if(DOM.authModal) DOM.authModal.classList.add('hidden');
}

function showApp() {
    hideAuthModal();
    if(DOM.logoutBtn) DOM.logoutBtn.classList.remove('hidden');
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

async function handleMyOrders() {
    if (!state.token) {
        showAuthModal();
        return;
    }

    DOM.ordersModal.classList.remove('hidden');
    DOM.ordersList.innerHTML = '<div class="p-12 text-center text-gray-500 text-sm">Loading orders...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/orders`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });

        if (response.ok) {
            const orders = await response.json();
            renderOrders(orders);
        } else {
            const data = await response.json();
            DOM.ordersList.innerHTML = `<div class="p-12 text-center text-red-500 text-sm">${data.error || 'Failed to load orders'}</div>`;
        }
    } catch (error) {
        console.error('Failed to load orders:', error);
        DOM.ordersList.innerHTML = '<div class="p-12 text-center text-red-500 text-sm">Connection error</div>';
    }
}

function renderOrders(orders) {
    if (orders.length === 0) {
        DOM.emptyOrders.classList.remove('hidden');
        DOM.ordersList.classList.add('hidden');
        return;
    }

    DOM.emptyOrders.classList.add('hidden');
    DOM.ordersList.classList.remove('hidden');
    DOM.ordersList.innerHTML = '';

    orders.forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        const statusColors = {
            'draft': 'bg-gray-500/20 text-gray-400',
            'payment_pending': 'bg-yellow-500/20 text-yellow-500',
            'paid': 'bg-green-500/20 text-green-500',
            'production': 'bg-blue-500/20 text-blue-500',
            'shipped': 'bg-indigo-500/20 text-indigo-500',
            'delivered': 'bg-green-600/20 text-green-400'
        };

        const statusLabel = order.status.replace('_', ' ').toUpperCase();

        // Use finalized_image_url (full mockup with t-shirt) first, fallback to processed_image_url
        let displayImageUrl = order.finalized_image_url || order.processed_image_url;
        
        // Debug logging
        console.log(`Order ${order.id}: finalized=${order.finalized_image_url ? '✓' : 'null'}, processed=${order.processed_image_url ? '✓' : 'null'}, using=${displayImageUrl ? 'finalized' : 'none'}`);

        // Ensure URL is valid and absolute
        if (displayImageUrl && !displayImageUrl.startsWith('http')) {
            // Fallback for relative paths if any
            displayImageUrl = displayImageUrl.startsWith('/') ? displayImageUrl : `/${displayImageUrl}`;
        }

        const orderCard = document.createElement('div');
        orderCard.className = 'bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden flex flex-col md:flex-row min-h-[120px]';
        
        orderCard.innerHTML = `
            <div class="w-full md:w-32 bg-[#0f0f0f] flex items-center justify-center p-2 shrink-0">
                ${displayImageUrl ? 
                    `<img src="${displayImageUrl}" 
                          class="max-w-full max-h-full object-contain drop-shadow-lg" 
                          alt="Order Design"
                          onerror="this.src='assets/black-tshirt.png'; this.style.opacity='0.5';">` : 
                    `<div class="w-full h-full bg-gray-800 flex items-center justify-center text-[10px] text-gray-500">NO IMAGE</div>`
                }
            </div>
            <div class="flex-1 p-4 flex flex-col justify-between">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <div class="text-[10px] text-gray-500 uppercase tracking-widest mb-1">${date}</div>
                        <h4 class="text-white text-sm font-medium">Order #${order.id.slice(0, 8).toUpperCase()}</h4>
                        <div class="text-[10px] text-gray-500 mt-1 italic truncate max-w-[200px]">"${order.prompt}"</div>
                    </div>
                    <span class="text-[10px] px-2 py-1 rounded ${statusColors[order.status] || 'bg-gray-500/20 text-gray-400'} font-medium tracking-widest uppercase shrink-0">
                        ${statusLabel}
                    </span>
                </div>
                <div class="flex justify-between items-end">
                    <div class="text-xs text-gray-400">
                        <span class="uppercase font-bold">${order.tshirt_size}</span> • ${order.tshirt_quantity} Unit${order.tshirt_quantity > 1 ? 's' : ''}
                    </div>
                    <div class="text-yellow-600 font-medium tracking-widest text-sm">
                        ₹${(order.amount_in_paise / 100).toFixed(2)}
                    </div>
                </div>
            </div>
        `;
        
        DOM.ordersList.appendChild(orderCard);
    });
}

function showAuthError(message) {
    if(DOM.authError) {
        DOM.authError.textContent = message;
        DOM.authError.classList.remove('hidden');
    }
}

function updateUI() {
    if (state.user) {
        // Show BUY NOW button if there's a current design
        if (state.currentDesign) {
            DOM.buyNowBtn.classList.remove('hidden');
        } else {
            DOM.buyNowBtn.classList.add('hidden');
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
        id: data.designId,
        url: url,
        prompt: promptText,
        scale: 1,
        x: 0,
        y: 0
    };

    state.history.unshift(newDesign);
    if (state.history.length > 5) state.history.pop();

    renderHistory();
    loadDesignToCanvas(newDesign);
}

function loadDesignToCanvas(design) {
    state.currentDesign = design;
    DOM.generatedImage.src = design.url;
    DOM.designWrapper.classList.remove('hidden');
    applyTransform(design.x, design.y, design.scale);
    
    // Show BUY NOW button
    if (DOM.buyNowBtn) {
        DOM.buyNowBtn.classList.remove('hidden');
    }
}

function restoreFromHistory(id) {
    const design = state.history.find(d => d.id === id);
    if (design) {
        const normalizedDesign = {
            ...design,
            url: design.url || design.processed_image_url,
            // Reset position and scale for a fresh start
            x: 0,
            y: 0,
            scale: 1
        };
        loadDesignToCanvas(normalizedDesign);
        // Close modal after selection
        DOM.archivesModal.classList.add('hidden');
    }
}

function renderHistory() {
    // Clear grid
    if (DOM.archivesGrid) DOM.archivesGrid.innerHTML = '';

    // Handle Empty State
    if (state.history.length === 0) {
        if (DOM.emptyArchives) DOM.emptyArchives.classList.remove('hidden');
        if (DOM.archivesGrid) DOM.archivesGrid.classList.add('hidden');
        return;
    } else {
        if (DOM.emptyArchives) DOM.emptyArchives.classList.add('hidden');
        if (DOM.archivesGrid) DOM.archivesGrid.classList.remove('hidden');
    }

    state.history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'aspect-square rounded overflow-hidden cursor-pointer border border-white/10 hover:border-yellow-600 transition-colors';

        div.onclick = () => restoreFromHistory(item.id);

        const img = document.createElement('img');
        img.src = item.url || item.processed_image_url;
        img.className = 'w-full h-full object-cover';
        img.alt = 'Design Archive';

        div.appendChild(img);
        DOM.archivesGrid.appendChild(div);
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

            renderHistory();
        }
    } catch (error) {
        console.error('Failed to load history:', error);
    }
}

// --- BUY NOW / Checkout Logic ---

// Finalize design by "baking" t-shirt + design composite
// async function handleFinalize() {
//     if (!state.currentDesign) {
//         throw new Error('No design to finalize');
//     }

//     try {
//         const canvas = document.createElement('canvas');
//         canvas.width = 1000;
//         canvas.height = 1200;
//         const ctx = canvas.getContext('2d');

//         // 1. Load and Draw the T-Shirt Mockup First
//         const tshirtImg = new Image();
//         tshirtImg.src = DOM.tshirtImg.src;
//         await new Promise((resolve) => (tshirtImg.onload = resolve));
//         ctx.drawImage(tshirtImg, 0, 0, 1000, 1200);

//         // 2. Draw the AI Design on top
//         const designImg = new Image();
//         designImg.crossOrigin = 'anonymous';
//         designImg.src = state.currentDesign.url;
        
//         await new Promise((resolve, reject) => {
//             designImg.onload = resolve;
//             designImg.onerror = () => {
//                 console.warn('CORS failed, retrying without crossOrigin constraint...');
//                 designImg.crossOrigin = null;
//                 designImg.src = state.currentDesign.url + '?t=' + Date.now();
//                 designImg.onload = resolve;
//                 designImg.onerror = reject;
//             };
//         });

//         const centerX = 500 + (state.currentDesign.x * 2);
//         const centerY = 600 + (state.currentDesign.y * 2);
//         const dWidth = 400 * state.currentDesign.scale * 2;
//         const dHeight = 400 * state.currentDesign.scale * 2;

//         ctx.drawImage(
//             designImg,
//             centerX - dWidth / 2,
//             centerY - dHeight / 2,
//             dWidth,
//             dHeight
//         );

//         return canvas.toDataURL('image/jpeg', 0.9);
//     } catch (error) {
//         console.error('Baking failed:', error);
//         throw new Error('Failed to process design image. Please try regenerating or contact support if issue persists.');
//     }
// }

// app.js

async function handleFinalize() {
    if (!state.currentDesign) return null;

    try {
        const canvas = document.createElement('canvas');
        // Production dimensions for the printer
        const CANVAS_WIDTH = 2000;
        const CANVAS_HEIGHT = 2400;
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
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

        // 1. Draw the T-shirt to fill the entire production canvas
        ctx.drawImage(tshirtImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 2. Calculate the exact UI scale factor
        // We determine how much larger the canvas is compared to the UI element
        const uiWidth = DOM.tshirtImg.clientWidth;
        const uiHeight = DOM.tshirtImg.clientHeight;
        const scaleX = CANVAS_WIDTH / uiWidth;
        const scaleY = CANVAS_HEIGHT / uiHeight;

        // 3. Map the design size and position using these factors
        // This ensures the design stays perfectly "within the shirt"
        const finalWidth = (DOM.generatedImage.clientWidth * state.currentDesign.scale) * scaleX;
        const finalHeight = (DOM.generatedImage.clientHeight * state.currentDesign.scale) * scaleY;

        // Calculate center based on the relative offset from the UI
        const finalX = (CANVAS_WIDTH / 2) + (state.currentDesign.x * scaleX);
        const finalY = (CANVAS_HEIGHT / 2) + (state.currentDesign.y * scaleY);

        // 4. Draw the design
        ctx.drawImage(
            designImg, 
            finalX - (finalWidth / 2), 
            finalY - (finalHeight / 2), 
            finalWidth, 
            finalHeight
        );

        return canvas.toDataURL('image/jpeg', 0.95);
    } catch (error) {
        console.error("Baking failed:", error);
        return null;
    }
}

async function finalizeDesignOnServer() {
    try {
        const finalImageBase64 = await handleFinalize();

        const response = await fetch(`${API_BASE}/designs/${state.currentDesign.id}/finalize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({ finalImage: finalImageBase64 })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to finalize design');
        }

        state.currentDesign.finalizedImageUrl = data.finalizedImageUrl;
        state.currentDesign.is_finalized = true;

        return data.finalizedImageUrl;
    } catch (error) {
        console.error('Finalize error:', error);
        throw error;
    }
}

async function handleBuyNow() {
    if (!state.currentDesign) {
        alert('Please generate or select a design first');
        return;
    }

    if (!state.token) {
        showAuthModal();
        return;
    }

    showSizeModal();
}

function showSizeModal() {
    const modal = document.createElement('div');
    modal.id = 'size-modal';
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-sm">
            <h3 class="serif text-xl mb-2">Select Size</h3>
            <p class="text-sm text-gray-400 mb-6">Choose your T-shirt size</p>
            <div class="grid grid-cols-2 gap-3 mb-6">
                <button class="size-btn bg-[#111] border border-white/10 rounded-lg p-4 text-white hover:border-yellow-600 transition" data-size="S">S</button>
                <button class="size-btn bg-[#111] border border-white/10 rounded-lg p-4 text-white hover:border-yellow-600 transition" data-size="M">M</button>
                <button class="size-btn bg-[#111] border border-white/10 rounded-lg p-4 text-white hover:border-yellow-600 transition" data-size="L">L</button>
                <button class="size-btn bg-[#111] border border-white/10 rounded-lg p-4 text-white hover:border-yellow-600 transition" data-size="XL">XL</button>
                <button class="size-btn bg-[#111] border border-white/10 rounded-lg p-4 text-white hover:border-yellow-600 transition" data-size="XXL">XXL</button>
            </div>
            <div class="flex gap-3">
                <button id="cancel-size-btn" class="flex-1 bg-[#111] hover:bg-[#222] text-gray-400 py-3 rounded-lg transition">Cancel</button>
                <button id="proceed-buy-btn" class="flex-1 bg-yellow-600 hover:bg-yellow-700 text-black font-semibold py-3 rounded-lg transition">Proceed</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    let selectedSize = null;

    modal.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.querySelectorAll('.size-btn').forEach(b => b.classList.remove('border-yellow-600', 'bg-[#222]'));
            btn.classList.add('border-yellow-600', 'bg-[#222]');
            selectedSize = btn.dataset.size;
        });
    });

    document.getElementById('cancel-size-btn').addEventListener('click', () => {
        modal.remove();
    });

    document.getElementById('proceed-buy-btn').addEventListener('click', async () => {
        if (!selectedSize) {
            alert('Please select a size');
            return;
        }
        
        modal.remove();
        showShippingModal(selectedSize);
    });
}

function showShippingModal(size) {
    const modal = document.getElementById('shipping-modal');
    modal.classList.remove('hidden');

    // Clear any previous inputs
    document.getElementById('ship-name').value = '';
    document.getElementById('ship-email').value = '';
    document.getElementById('ship-address').value = '';

    const saveBtn = document.getElementById('save-order-btn');
    saveBtn.disabled = false;
    saveBtn.textContent = 'SAVE & PROCEED';

    saveBtn.onclick = async () => {
        const name = document.getElementById('ship-name').value.trim();
        const email = document.getElementById('ship-email').value.trim();
        const address = document.getElementById('ship-address').value.trim();

        if (!name || !email || !address) {
            alert('Please fill all fields');
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Processing...';

        try {
            // 1. Bake the image and upload to Cloudflare
            const finalizedImageUrl = await finalizeDesignOnServer();

            // 2. Save to local DB
            const response = await fetch(`${API_BASE}/orders/manual`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.token}`
                },
                body: JSON.stringify({
                    designId: state.currentDesign.id,
                    size,
                    name,
                    email,
                    address,
                    finalizedImageUrl
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save order');
            }

            // 3. Hide shipping modal, show success modal
            modal.classList.add('hidden');
            document.getElementById('success-modal').classList.remove('hidden');
        } catch (err) {
            console.error('Order save error:', err);
            alert('Error saving order: ' + err.message);
            saveBtn.disabled = false;
            saveBtn.textContent = 'SAVE & PROCEED';
        }
    };
}

// --- Professional Drag & Resize Engine (Interact.js) ---
function initInteractJS() {
    if (!state.currentDesign) {
        state.currentDesign = { x: 0, y: 0, scale: 1 };
    }

    interact('#design-wrapper')
        .draggable({
            inertia: true,
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true
                })
            ],
            autoScroll: true,
            listeners: {
                move: dragMoveListener,
            }
        });

    DOM.resizeHandle.addEventListener('mousedown', initResize);
    DOM.resizeHandle.addEventListener('touchstart', initResize, { passive: false });
}

let startY = 0;
let startScale = 1;

function initResize(e) {
    e.preventDefault();
    e.stopPropagation();
    startY = e.clientY || (e.touches && e.touches[0].clientY);
    startScale = state.currentDesign.scale || 1;

    window.addEventListener('mousemove', resizeMoveListener);
    window.addEventListener('touchmove', resizeMoveListener, { passive: false });
    window.addEventListener('mouseup', stopResize);
    window.addEventListener('touchend', stopResize);
}

function resizeMoveListener(e) {
    e.preventDefault();
    if (!state.currentDesign) return;

    const currentY = e.clientY || (e.touches && e.touches[0].clientY);
    const deltaY = startY - currentY;
    let newScale = startScale + (deltaY * 0.01);

    newScale = Math.max(0.3, Math.min(newScale, 2.5));

    applyTransform(state.currentDesign.x, state.currentDesign.y, newScale);
}

function stopResize() {
    window.removeEventListener('mousemove', resizeMoveListener);
    window.removeEventListener('touchmove', resizeMoveListener);
    window.removeEventListener('mouseup', stopResize);
    window.removeEventListener('touchend', stopResize);
}

function dragMoveListener(event) {
    if (!state.currentDesign) return;

    const scale = state.currentDesign.scale || 1;
    state.currentDesign.x += (event.dx / scale);
    state.currentDesign.y += (event.dy / scale);

    applyTransform(state.currentDesign.x, state.currentDesign.y, scale);
}

function applyTransform(x, y, scale) {
    if (state.currentDesign) {
        state.currentDesign.x = x;
        state.currentDesign.y = y;
        state.currentDesign.scale = scale;
    }
    DOM.designWrapper.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
}

// Start the app
init();
