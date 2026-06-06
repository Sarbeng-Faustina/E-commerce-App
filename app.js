/**
 * E-Millenial Store (EMS) - Application Logic
 * Separated operations into individual, distinct functions.
 */

// 1. CONSTANTS & APPLICATION STATE
const PAYSTACK_PUBLIC_KEY = 'pk_test_f91b470fda0413f1a5e30f9dfe82a4b2cfa25c73'; // Sandbox test key
const CURRENCY_SYMBOL = 'GH₵';
const CURRENCY_CODE = 'GHS';

// Static products matching the mock UI and image assets
const PRODUCTS = [
    {
        id: 1,
        name: "SAMSUNG TV",
        price: 4500.00,
        image: "Images/product1.png"
    },
    {
        id: 2,
        name: "PIXEL 4a",
        price: 1800.00,
        image: "Images/product2.png"
    },
    {
        id: 3,
        name: "PS 5",
        price: 6500.00,
        image: "Images/product3.png"
    },
    {
        id: 4,
        name: "MACBOOK AIR",
        price: 7500.00,
        image: "Images/product4.png"
    },
    {
        id: 5,
        name: "APPLE WATCH",
        price: 1200.00,
        image: "Images/product5.png"
    },
    {
        id: 6,
        name: "AIR PODS",
        price: 850.00,
        image: "Images/product6.png"
    }
];

// Reactive array of cart items: { id: number, quantity: number }
let cart = [];

// 2. DOM ELEMENT SELECTORS
let productsGrid;
let cartTriggerBtn;
let cartDrawer;
let cartOverlay;
let cartCloseBtn;
let cartItemsList;
let cartTotalValue;
let cartBadgeCount;
let checkoutForm;
let customerNameInput;
let customerEmailInput;
let customerPhoneInput;
let nameError;
let emailError;
let phoneError;
let btnPaystackCheckout;
let successModal;
let successRefCode;
let btnSuccessClose;

// 3. PERSISTENCE LAYER FUNCTIONS
/**
 * Load cart from browser's local storage.
 */
function loadCartFromStorage() {
    const storedCart = localStorage.getItem('ems_cart_items');
    if (storedCart) {
        try {
            cart = JSON.parse(storedCart);
        } catch (error) {
            cart = [];
            console.error("Failed to parse cart storage:", error);
        }
    }
}

/**
 * Save current cart status to browser's local storage.
 */
function saveCartToStorage() {
    localStorage.setItem('ems_cart_items', JSON.stringify(cart));
}

// 4. RENDERING & UI FUNCTIONS
/**
 * Dynamically generate product card components and append to grid.
 */
function renderProducts() {
    if (!productsGrid) return;

    productsGrid.innerHTML = '';

    PRODUCTS.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('data-product-id', product.id);

        const isInCart = cart.some(item => item.id === product.id);
        const buttonText = isInCart ? "REMOVE FROM CART" : "ADD TO CART";
        const buttonClass = isInCart ? "btn-add-to-cart in-cart" : "btn-add-to-cart";

        card.innerHTML = `
            <div class="product-image-wrapper">
                <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy">
            </div>
            <h3 class="product-title">${product.name}</h3>
            <p class="product-price">${CURRENCY_SYMBOL} ${product.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <button class="${buttonClass}" data-id="${product.id}">${buttonText}</button>
        `;

        productsGrid.appendChild(card);
    });
}

/**
 * Slide the shopping cart drawer in or out of view.
 * @param {boolean} isOpen 
 */
function toggleCartDrawer(isOpen) {
    if (!cartDrawer || !cartOverlay) return;

    if (isOpen) {
        cartDrawer.classList.add('active');
        cartOverlay.classList.add('active');
        cartDrawer.setAttribute('aria-hidden', 'false');
        document.body.classList.add('drawer-open');
    } else {
        cartDrawer.classList.remove('active');
        cartOverlay.classList.remove('active');
        cartDrawer.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('drawer-open');
    }
}

/**
 * Calculate total quantity of items inside the cart.
 * @returns {number}
 */
function getCartTotalCount() {
    return cart.reduce((total, item) => total + item.quantity, 0);
}

/**
 * Calculate sum total of product prices inside the cart.
 * @returns {number}
 */
function getCartTotalSum() {
    return cart.reduce((sum, item) => {
        const product = PRODUCTS.find(p => p.id === item.id);
        return sum + (product ? product.price * item.quantity : 0);
    }, 0);
}

/**
 * Update dynamic items inside the navbar badge and the cart listing drawer.
 */
function updateCartUI() {
    // 1. Update Navbar badge count
    const totalCount = getCartTotalCount();
    if (cartBadgeCount) {
        cartBadgeCount.textContent = totalCount;
    }

    // 2. Render cart items inside drawer
    if (!cartItemsList) return;

    if (cart.length === 0) {
        cartItemsList.innerHTML = `
            <div class="empty-cart-view">
                <div class="empty-cart-icon">🛒</div>
                <p class="empty-cart-text">Your cart is empty.</p>
            </div>
        `;
        // Disable checkout submit button
        if (btnPaystackCheckout) {
            btnPaystackCheckout.disabled = true;
        }
    } else {
        cartItemsList.innerHTML = '';

        cart.forEach(item => {
            const product = PRODUCTS.find(p => p.id === item.id);
            if (!product) return;

            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';

            itemElement.innerHTML = `
                <div class="cart-item-img-box">
                    <img src="${product.image}" alt="${product.name}" class="cart-item-img">
                </div>
                <div class="cart-item-details">
                    <h4 class="cart-item-name">${product.name}</h4>
                    <p class="cart-item-price">${CURRENCY_SYMBOL} ${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <div class="cart-item-controls">
                        <div class="quantity-controller">
                            <button class="qty-btn btn-decrease" data-id="${product.id}">-</button>
                            <span class="qty-val">${item.quantity}</span>
                            <button class="qty-btn btn-increase" data-id="${product.id}">+</button>
                        </div>
                        <button class="cart-item-remove-btn btn-remove" data-id="${product.id}">
                            Remove
                        </button>
                    </div>
                </div>
            `;

            cartItemsList.appendChild(itemElement);
        });

        if (btnPaystackCheckout) {
            btnPaystackCheckout.disabled = false;
        }
    }

    // 3. Update total amount inside drawer
    const totalSum = getCartTotalSum();
    if (cartTotalValue) {
        cartTotalValue.textContent = `${CURRENCY_SYMBOL} ${totalSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // 4. Update the products grid button states
    updateProductButtonsState();
}

/**
 * Efficiently update existing product buttons state in the grid
 * without fully rebuilding the grid elements.
 */
function updateProductButtonsState() {
    if (!productsGrid) return;

    const buttons = productsGrid.querySelectorAll('.btn-add-to-cart');
    buttons.forEach(button => {
        const productId = parseInt(button.getAttribute('data-id'));
        const isInCart = cart.some(item => item.id === productId);

        if (isInCart) {
            button.textContent = "REMOVE FROM CART";
            button.className = "btn-add-to-cart in-cart";
        } else {
            button.textContent = "ADD TO CART";
            button.className = "btn-add-to-cart";
        }
    });
}

/**
 * Visual micro-animation to indicate item has been successfully added to cart.
 */
function animateCartBadge() {
    if (!cartTriggerBtn) return;

    cartTriggerBtn.classList.add('bounce');
    setTimeout(() => {
        cartTriggerBtn.classList.remove('bounce');
    }, 400);
}

// 5. EVENT HANDLERS & OPERATIONS
/**
 * Add a selected product to the cart.
 * @param {number} productId 
 */
function addToCart(productId) {
    const parsedId = parseInt(productId);
    const existingItem = cart.find(item => item.id === parsedId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id: parsedId, quantity: 1 });
    }

    saveCartToStorage();
    updateCartUI();
    animateCartBadge();
}

/**
 * Remove a selected product entirely from the cart.
 * @param {number} productId 
 */
function removeFromCart(productId) {
    const parsedId = parseInt(productId);
    cart = cart.filter(item => item.id !== parsedId);

    saveCartToStorage();
    updateCartUI();
}

/**
 * Handle quantity changes (increment or decrement) for an item in the cart.
 * @param {number} productId 
 * @param {string} operation ('increase' | 'decrease')
 */
function changeQuantity(productId, operation) {
    const parsedId = parseInt(productId);
    const item = cart.find(item => item.id === parsedId);

    if (!item) return;

    if (operation === 'increase') {
        item.quantity += 1;
    } else if (operation === 'decrease') {
        item.quantity -= 1;
        if (item.quantity <= 0) {
            removeFromCart(parsedId);
            return;
        }
    }

    saveCartToStorage();
    updateCartUI();
}

// 6. VALIDATION & TRANSACTION MANAGEMENT
/**
 * Validate customer checkout input elements.
 * @returns {boolean} True if checkout form elements pass basic validations.
 */
function validateCheckoutForm() {
    let isValid = true;

    // Check Full Name
    const name = customerNameInput.value.trim();
    const nameGroup = customerNameInput.parentElement;
    if (name === "") {
        nameGroup.classList.add('invalid');
        isValid = false;
    } else {
        nameGroup.classList.remove('invalid');
    }

    // Check Email
    const email = customerEmailInput.value.trim();
    const emailGroup = customerEmailInput.parentElement;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email === "" || !emailRegex.test(email)) {
        emailGroup.classList.add('invalid');
        isValid = false;
    } else {
        emailGroup.classList.remove('invalid');
    }

    // Check Phone Number
    const phone = customerPhoneInput.value.trim();
    const phoneGroup = customerPhoneInput.parentElement;
    const phoneRegex = /^[0-9+\s()-]{7,15}$/;
    if (phone === "" || !phoneRegex.test(phone)) {
        phoneGroup.classList.add('invalid');
        isValid = false;
    } else {
        phoneGroup.classList.remove('invalid');
    }

    return isValid;
}

/**
 * Setup and initialize the Paystack Inline checkout iframe.
 * Uses GHS as specified and compiles the cart total.
 */
function payWithPaystack(event) {
    event.preventDefault(); // Stop native HTML submit

    // Guard: Prevent checkout if cart is empty
    if (cart.length === 0) {
        alert("Your cart is empty. Please add items to your cart before checking out.");
        return;
    }

    if (!validateCheckoutForm()) return;

    const email = customerEmailInput.value.trim();
    const name = customerNameInput.value.trim();
    const phone = customerPhoneInput.value.trim();
    const totalAmount = getCartTotalSum();

    // Paystack expects amount in minor units (Pesewas / Cents / Kobo). Multiply by 100.
    const amountInPesewas = Math.round(totalAmount * 100);

    // Disable submit action button & display progress state
    btnPaystackCheckout.disabled = true;
    const originalBtnText = btnPaystackCheckout.textContent;
    btnPaystackCheckout.textContent = "INITIALIZING CHEKOUT...";

    // Generate simple custom transaction reference
    const txRef = 'EMS-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    // Check if PaystackPop library is loaded properly
    if (typeof PaystackPop === 'undefined') {
        alert("Unable to connect to Paystack payment gateway. Please verify your internet connection and try again.");
        btnPaystackCheckout.disabled = false;
        btnPaystackCheckout.textContent = originalBtnText;
        return;
    }

    const paystack = new PaystackPop();
    paystack.newTransaction({
        key: PAYSTACK_PUBLIC_KEY,
        email: email,
        amount: amountInPesewas,
        currency: CURRENCY_CODE,
        ref: txRef,
        metadata: {
            phone: phone,
            custom_fields: [
                {
                    display_name: "Customer Name",
                    variable_name: "customer_name",
                    value: name
                },
                {
                    display_name: "Phone Number",
                    variable_name: "customer_phone",
                    value: phone
                },
                {
                    display_name: "Items Quantity",
                    variable_name: "items_qty",
                    value: getCartTotalCount()
                }
            ]
        },
        onSuccess: function (transaction) {
            // Callback execution on successful processing
            showPaymentSuccess(transaction.reference);
        },
        onCancel: function () {
            // Callback execution if payment frame is closed without completing
            btnPaystackCheckout.disabled = false;
            btnPaystackCheckout.textContent = originalBtnText;
        }
    });
}

/**
 * Render custom success modal box, empty active state, and reset UI components.
 * @param {string} transactionRef 
 */
function showPaymentSuccess(transactionRef) {
    // 1. Close checkout cart drawer
    toggleCartDrawer(false);

    // 2. Empty cart array and localStorage
    cart = [];
    saveCartToStorage();
    updateCartUI();

    // 3. Clear customer details form fields
    if (checkoutForm) {
        checkoutForm.reset();
    }

    // 4. Update success modal elements and show modal
    if (successRefCode && successModal) {
        successRefCode.textContent = transactionRef;
        successModal.classList.add('active');
    }
}

// 7. BOOTSTRAP INITIALIZATION
/**
 * Select DOM components, configure event routing, and pull cached datasets.
 */
function initApp() {
    // A. Bind DOM variables
    productsGrid = document.getElementById('products-grid-container');
    cartTriggerBtn = document.getElementById('cart-trigger');
    cartDrawer = document.getElementById('cart-drawer');
    cartOverlay = document.getElementById('cart-overlay');
    cartCloseBtn = document.getElementById('cart-close');
    cartItemsList = document.getElementById('cart-items-list');
    cartTotalValue = document.getElementById('cart-total-value');
    cartBadgeCount = document.getElementById('cart-badge-count');
    checkoutForm = document.getElementById('checkout-form');
    customerNameInput = document.getElementById('customer-name');
    customerEmailInput = document.getElementById('customer-email');
    customerPhoneInput = document.getElementById('customer-phone');
    nameError = document.getElementById('name-error');
    emailError = document.getElementById('email-error');
    phoneError = document.getElementById('phone-error');
    btnPaystackCheckout = document.getElementById('btn-paystack-checkout');
    successModal = document.getElementById('success-modal');
    successRefCode = document.getElementById('success-ref-code');
    btnSuccessClose = document.getElementById('btn-success-close');

    // B. Render the gadget listing
    renderProducts();

    // C. Hydrate cart from browser cache
    loadCartFromStorage();
    updateCartUI();

    // D. Attach Event Listeners
    // Toggle cart drawer events
    if (cartTriggerBtn) {
        cartTriggerBtn.addEventListener('click', () => toggleCartDrawer(true));
    }
    if (cartCloseBtn) {
        cartCloseBtn.addEventListener('click', () => toggleCartDrawer(false));
    }
    if (cartOverlay) {
        cartOverlay.addEventListener('click', () => toggleCartDrawer(false));
    }

    // Dynamic add-to-cart clicks from the products grid
    if (productsGrid) {
        productsGrid.addEventListener('click', (event) => {
            if (event.target.classList.contains('btn-add-to-cart')) {
                const productId = parseInt(event.target.getAttribute('data-id'));
                const isInCart = cart.some(item => item.id === productId);
                if (isInCart) {
                    removeFromCart(productId);
                } else {
                    addToCart(productId);
                }
            }
        });
    }

    // Quantity controllers inside the cart list drawer
    if (cartItemsList) {
        cartItemsList.addEventListener('click', (event) => {
            const target = event.target;
            const productId = target.getAttribute('data-id');

            if (target.classList.contains('btn-increase')) {
                changeQuantity(productId, 'increase');
            } else if (target.classList.contains('btn-decrease')) {
                changeQuantity(productId, 'decrease');
            } else if (target.classList.contains('btn-remove')) {
                removeFromCart(productId);
            }
        });
    }

    // Inputs blur/focus error state validations
    if (customerNameInput) {
        customerNameInput.addEventListener('blur', () => {
            if (customerNameInput.value.trim() !== "") {
                customerNameInput.parentElement.classList.remove('invalid');
            }
        });
    }
    if (customerEmailInput) {
        customerEmailInput.addEventListener('blur', () => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailRegex.test(customerEmailInput.value.trim())) {
                customerEmailInput.parentElement.classList.remove('invalid');
            }
        });
    }
    if (customerPhoneInput) {
        customerPhoneInput.addEventListener('blur', () => {
            const phoneRegex = /^[0-9+\s()-]{7,15}$/;
            if (phoneRegex.test(customerPhoneInput.value.trim())) {
                customerPhoneInput.parentElement.classList.remove('invalid');
            }
        });
    }

    // Paystack Checkout Form execution
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', payWithPaystack);
    }

    // Close successful checkout modal popup
    if (btnSuccessClose && successModal) {
        btnSuccessClose.addEventListener('click', () => {
            successModal.classList.remove('active');
            // Restore default Paystack button state if checkout form text remained altered
            if (btnPaystackCheckout) {
                btnPaystackCheckout.disabled = false;
                btnPaystackCheckout.textContent = "PAY WITH PAYSTACK";
            }
        });
    }
}

// 8. BOOTSTRAP TRIGGER ON DOM READY
document.addEventListener('DOMContentLoaded', initApp);
