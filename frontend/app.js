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
    rateLimitDisplay: document.getElementById('rate-limit-display'),
    designWrapper: document.getElementById('generated-image-container'),
    generatedImage: document.getElementById('generated-image'),
    resizeHandle: document.getElementById('resize-handle'), // Restored
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
    initInteractJS(); // Restored interact.js initialization

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

            // Manage active state manually for CSS rings
            DOM.colorBtns.forEach(b => b.classList.remove('is-active'));
            btn.classList.add('is-active');

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
    if(DOM.buyNowBtn) {
        DOM.buyNowBtn.addEventListener('click', handleBuyNow);
    }
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
            'draft': 'background: rgba(107, 114, 128, 0.2); color: #9ca3af;',
            'payment_pending': 'background: rgba(234, 179, 8, 0.2); color: #eab308;',
            'paid': 'background: rgba(34, 197, 94, 0.2); color: #22c55e;',
            'production': 'background: rgba(59, 130, 246, 0.2); color: #3b82f6;',
            'shipped': 'background: rgba(99, 102, 241, 0.2); color: #6366f1;',
            'delivered': 'background: rgba(22, 163, 74, 0.2); color: #4ade80;'
        };

        const statusLabel = order.status.replace('_', ' ').toUpperCase();
        
        let displayImageUrl = order.finalized_image_url || order.processed_image_url;
        if (displayImageUrl && !displayImageUrl.startsWith('http')) {
            displayImageUrl = displayImageUrl.startsWith('/') ? displayImageUrl : `/${displayImageUrl}`;
        }

        const orderCard = document.createElement('div');
        orderCard.style.cssText = 'background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; display: flex; flex-direction: row; min-height: 120px; margin-bottom: 12px;';
        
        orderCard.innerHTML = `
            <div style="width: 120px; background: #e5e7eb; display: flex; align-items: center; justify-content: center; padding: 8px; flex-shrink: 0;">
                ${displayImageUrl ? 
                    `<img src="${displayImageUrl}" 
                          style="max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));" 
                          alt="Order Design"
                          onerror="this.src='assets/black-tshirt.png'; this.style.opacity='0.5';">` : 
                    `<div style="width: 100%; height: 100%; background: #d1d5db; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #6b7280;">NO IMAGE</div>`
                }
            </div>
            <div style="flex: 1; padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                        <div style="font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">${date}</div>
                        <h4 style="color: #111827; font-size: 14px; font-weight: 500; margin: 0;">Order #${order.id.slice(0, 8).toUpperCase()}</h4>
                        <div style="font-size: 11px; color: #6b7280; margin-top: 4px; font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">"${order.prompt}"</div>
                    </div>
                    <span style="font-size: 10px; padding: 4px 8px; border-radius: 4px; ${statusColors[order.status] || 'background: rgba(107, 114, 128, 0.2); color: #9ca3af;'} font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; flex-shrink: 0;">
                        ${statusLabel}
                    </span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <div style="font-size: 12px; color: #4b5563;">
                        <span style="text-transform: uppercase; font-weight: bold; color: #111827;">${order.tshirt_size}</span> • ${order.tshirt_quantity} Unit${order.tshirt_quantity > 1 ? 's' : ''}
                    </div>
                    <div style="color: #111827; font-weight: 600; letter-spacing: 0.05em; font-size: 14px;">
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
        if(DOM.rateLimitDisplay) {
            DOM.rateLimitDisplay.textContent = `Number of Designs left: ${state.generationsLeft}`;
        }

        if (state.generationsLeft <= 0) {
            DOM.generateBtn.disabled = true;
            DOM.generateBtn.querySelector('.btn-primary-text').textContent = 'Limit Reached';
        }

        // Show BUY NOW button if there's a current design
        if (state.currentDesign && DOM.buyNowBtn) {
            DOM.buyNowBtn.classList.remove('hidden');
        } else if (DOM.buyNowBtn) {
            DOM.buyNowBtn.classList.add('hidden');
        }
    }
}

// --- Professional Drag & Resize Engine (Interact.js) ---
function initInteractJS() {
    if (!state.currentDesign) {
        state.currentDesign = { x: 0, y: 0, scale: 1 };
    }

    interact('#generated-image-container')
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

    if(DOM.resizeHandle) {
        DOM.resizeHandle.addEventListener('mousedown', initResize);
        DOM.resizeHandle.addEventListener('touchstart', initResize, { passive: false });
    }
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
    // Prepend the CSS translate(-50%, -50%) to preserve the absolute center positioning
    DOM.designWrapper.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0) scale(${scale})`;
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
        DOM.generateBtn.querySelector('.btn-primary-text').textContent = 'Generating...';
    } else {
        DOM.btnLoader.classList.add('hidden');
        DOM.generateBtn.querySelector('.btn-primary-text').textContent = 'Generate';
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

    if (data && data.generationsLeft !== undefined) {
        state.generationsLeft = data.generationsLeft;
        if(DOM.rateLimitDisplay) {
            DOM.rateLimitDisplay.textContent = `Number of Designs left: ${state.generationsLeft}`;
        }

        if (state.generationsLeft <= 0) {
            DOM.generateBtn.disabled = true;
            DOM.generateBtn.querySelector('.btn-primary-text').textContent = 'Limit Reached';
        }
    }

    renderHistory();
    loadDesignToCanvas(newDesign);
}

function loadDesignToCanvas(design) {
    state.currentDesign = design;
    DOM.generatedImage.src = design.url;
    DOM.designWrapper.classList.remove('hidden');
    
    // Apply position constraints
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
        const img = document.createElement('img');
        img.src = item.url || item.processed_image_url;
        img.alt = 'Design Archive';
        img.onclick = () => restoreFromHistory(item.id);

        DOM.archivesGrid.appendChild(img);
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
            if(data.generationsUsed !== undefined) {
                state.generationsLeft = 5 - data.generationsUsed;
                if(DOM.rateLimitDisplay) {
                    DOM.rateLimitDisplay.textContent = `Number of Designs left: ${state.generationsLeft}`;
                }
            }

            renderHistory();
        }
    } catch (error) {
        console.error('Failed to load history:', error);
    }
}

// --- BUY NOW / Checkout Logic ---
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
        const uiWidth = DOM.tshirtImg.clientWidth;
        const uiHeight = DOM.tshirtImg.clientHeight;
        const scaleX = CANVAS_WIDTH / uiWidth;
        const scaleY = CANVAS_HEIGHT / uiHeight;

        // 3. Map the design size and position using these factors
        const safeScale = state.currentDesign.scale || 1;
        const finalWidth = (DOM.generatedImage.clientWidth * safeScale) * scaleX;
        const finalHeight = (DOM.generatedImage.clientHeight * safeScale) * scaleY;

        // Calculate center based on the relative offset from the UI
        const offsetX = state.currentDesign.x || 0;
        const offsetY = state.currentDesign.y || 0;
        
        const finalX = (CANVAS_WIDTH / 2) + (offsetX * scaleX);
        const finalY = (CANVAS_HEIGHT / 2) + (offsetY * scaleY);

        // 4. Draw the design perfectly mapped to canvas coordinates
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
    modal.className = 'modal-root';
    
    // Inline styling added purely to match the UI aesthetic
    modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-panel" style="max-width: 380px;">
            <h3 class="serif modal-title" style="margin-bottom: 8px;">Select Size</h3>
            <p class="modal-subcopy" style="margin-bottom: 24px;">Choose your T-shirt size</p>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px;">
                <button class="size-btn btn-secondary" data-size="S" style="margin-top:0;">S</button>
                <button class="size-btn btn-secondary" data-size="M" style="margin-top:0;">M</button>
                <button class="size-btn btn-secondary" data-size="L" style="margin-top:0;">L</button>
                <button class="size-btn btn-secondary" data-size="XL" style="margin-top:0;">XL</button>
                <button class="size-btn btn-secondary" data-size="XXL" style="margin-top:0; grid-column: span 2;">XXL</button>
            </div>
            <div style="display: flex; gap: 12px;">
                <button id="cancel-size-btn" class="btn-secondary" style="margin-top:0; flex: 1;">Cancel</button>
                <button id="proceed-buy-btn" class="btn-primary" style="flex: 1;">Proceed</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    let selectedSize = null;

    modal.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.querySelectorAll('.size-btn').forEach(b => {
                b.style.borderColor = '#d1d5db';
                b.style.backgroundColor = '#ffffff';
                b.style.color = '#111827';
            });
            btn.style.borderColor = '#111827';
            btn.style.backgroundColor = '#111827';
            btn.style.color = '#ffffff';
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
        
        const proceedBtn = document.getElementById('proceed-buy-btn');
        proceedBtn.disabled = true;
        proceedBtn.textContent = 'Finalizing...';
        
        try {
            await finalizeDesignOnServer();
            modal.remove();
            initiateCheckout(selectedSize);
        } catch (error) {
            alert('Failed to finalize design: ' + error.message);
            proceedBtn.disabled = false;
            proceedBtn.textContent = 'Proceed';
        }
    });
}

async function initiateCheckout(tshirtSize) {
    try {
        const orderResponse = await fetch(`${API_BASE}/orders/buy-now`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({
                designId: state.currentDesign.id,
                tshirtSize: tshirtSize,
                quantity: 1
            })
        });

        const orderData = await orderResponse.json();

        if (!orderResponse.ok) {
            throw new Error(orderData.error || 'Failed to create order');
        }

        const paymentResponse = await fetch(`${API_BASE}/orders/initiate-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({
                orderId: orderData.orderId
            })
        });

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
            throw new Error(paymentData.error || 'Failed to initiate payment');
        }

        const options = {
            key: paymentData.key,
            amount: paymentData.amount,
            currency: paymentData.currency,
            name: 'March Studio',
            description: 'Custom Designed T-Shirt',
            order_id: paymentData.razorpayOrderId,
            handler: function(response) {
                verifyPayment(response, orderData.orderId);
            },
            prefill: {
                name: state.user?.name || '',
                email: state.user?.email || '',
                contact: state.user?.phone || ''
            },
            theme: {
                color: '#111827'
            }
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function(response) {
            alert('Payment failed: ' + response.error.description);
        });
        rzp.open();

    } catch (error) {
        console.error('Checkout error:', error);
        alert(error.message || 'Failed to proceed with checkout');
    }
}

async function verifyPayment(paymentResponse, orderId) {
    try {
        const response = await fetch(`${API_BASE}/payments/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({
                razorpayOrderId: paymentResponse.razorpay_order_id,
                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                razorpaySignature: paymentResponse.razorpay_signature
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert('Payment successful! Your order has been placed.');
        } else {
            throw new Error(data.error || 'Payment verification failed');
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        alert(error.message || 'Payment verification failed');
    }
}

// Start the app
init();