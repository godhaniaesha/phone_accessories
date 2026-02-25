// ============================================
// API CONFIG
// ============================================
const API_BASE = 'http://localhost:3000';
const CART_API = `${API_BASE}/carts`;
const PRODUCTS_API = `${API_BASE}/products`;
const COUPONS_API = `${API_BASE}/coupons`;

// db.json cart format (nested):
// {
//   "id": "c6bb",
//   "userId": "b356",
//   "items": [
//     {"id": "1", "quantity": 6}
//   ]
// }

function getUserId() {
    return localStorage.getItem('userId') || 'guest';
}

// ============================================
// CORE API FUNCTIONS
// ============================================

// GET - Current user ni cart with full product details
async function getCart() {
    try {
        const userId = getUserId();

        // Get all carts and then filter by userId (string compare) to avoid any type-mismatch issues
        const cartResponse = await fetch(CART_API);
        if (!cartResponse.ok) throw new Error('Failed to fetch cart');
        const allCarts = await cartResponse.json();

        const userCarts = Array.isArray(allCarts)
            ? allCarts.filter(c => String(c.userId) === String(userId))
            : [];

        if (userCarts.length === 0) return [];

        // If multiple carts exist for the same user, always use the first one
        const userCart = userCarts[0];
        if (!userCart.items || userCart.items.length === 0) return [];

        // Get all products
        const productsResponse = await fetch(PRODUCTS_API);
        if (!productsResponse.ok) throw new Error('Failed to fetch products');
        const allProducts = await productsResponse.json();

        // Map cart items with product details
        return userCart.items.map(cartItem => {
            const product = allProducts.find(p => p.id === cartItem.id);
            if (!product) return null;

            return {
                cartId: userCart.id,
                productId: product.id,
                name: product.ProductTitle,
                price: product.currentPrice,
                image: product.image,
                quantity: cartItem.quantity || 1
            };
        }).filter(item => item !== null);
    } catch (error) {
        console.error('getCart error:', error);
        return [];
    }
}

// POST - Create new cart or add item to existing cart
async function postCartItem(productId, quantity = 1) {
    try {
        const userId = getUserId();

        // Check if user has existing cart (fetch all and filter by userId to be safe)
        const allCarts = await fetch(CART_API).then(r => r.json());
        const existingCarts = Array.isArray(allCarts)
            ? allCarts.filter(c => String(c.userId) === String(userId))
            : [];

        if (existingCarts.length > 0) {
            // Add item to existing cart
            const cart = existingCarts[0];
            const existingItem = cart.items.find(item => item.id === productId);

            if (existingItem) {
                // Update quantity
                existingItem.quantity += quantity;
                const response = await fetch(`${CART_API}/${cart.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: cart.items })
                });
                return await response.json();
            } else {
                // Add new item
                cart.items.push({ id: productId, quantity });
                const response = await fetch(`${CART_API}/${cart.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: cart.items })
                });
                return await response.json();
            }
        } else {
            // Create new cart
            const newCart = {
                id: 'cart_' + Date.now().toString(36),
                userId: userId,
                items: [{ id: productId, quantity }]
            };
            const response = await fetch(CART_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCart)
            });
            return await response.json();
        }
    } catch (error) {
        console.error('postCartItem error:', error);
    }
}

// PATCH - Update cart items
async function patchCartItem(cartId, productId, quantity) {
    try {
        // Get current cart
        const cartResponse = await fetch(`${CART_API}/${cartId}`);
        const cart = await cartResponse.json();

        // Find and update item
        const itemIndex = cart.items.findIndex(item => item.id === productId);
        if (itemIndex !== -1) {
            if (quantity <= 0) {
                // Remove item
                cart.items.splice(itemIndex, 1);
            } else {
                // Update quantity
                cart.items[itemIndex].quantity = quantity;
            }
        }

        // Save updated cart
        const response = await fetch(`${CART_API}/${cartId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: cart.items })
        });
        return await response.json();
    } catch (error) {
        console.error('patchCartItem error:', error);
    }
}

// DELETE - Remove item from cart
async function deleteCartItem(cartId, productId) {
    try {
        // Get current cart
        const cartResponse = await fetch(`${CART_API}/${cartId}`);
        const cart = await cartResponse.json();

        // Remove item
        cart.items = cart.items.filter(item => item.id !== productId);

        // Save updated cart
        await fetch(`${CART_API}/${cartId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: cart.items })
        });
    } catch (error) {
        console.error('deleteCartItem error:', error);
    }
}

// ============================================
// ADD TO CART
// Nested format ma POST karo
// ============================================
async function addToCart(id, name, price, image, quantity = 1) {
    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';

    if (!isLoggedIn) {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.classList.add('z_open');
        }
        return false;
    }

    await postCartItem(id, quantity);
    updateCartUI();
    return true;
}

// Expose as window function
window.addToCart = addToCart;
window.cartAddToCart = addToCart;

// ============================================
// REMOVE FROM CART
// ============================================
async function removeFromCart(cartId, productId) {
    await deleteCartItem(cartId, productId);
    renderCartPage();
}

// ============================================
// UPDATE QUANTITY
// ============================================
async function updateQuantity(cartId, productId, quantity) {
    await patchCartItem(cartId, productId, quantity);
    renderCartPage();
}

// ============================================
// UPDATE CART UI (badge + offcanvas)
// ============================================
async function updateCartUI() {
    const cart = await getCart();

    // Badge update
    const badge = document.getElementById('cartBadge');
    if (badge) {
        const totalQty = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        badge.textContent = totalQty;
        badge.style.display = totalQty > 0 ? 'flex' : 'none';
    }

    // Offcanvas open hoy to refresh karo
    const cartPanel = document.getElementById('cartPanel');
    if (cartPanel && cartPanel.classList.contains('z_open')) {
        loadOffcanvasCart(cart);
    }

    // Cart page par hoy to re-render karo
    if (window.location.pathname.endsWith('Cart.html')) {
        renderCartPage(cart);
    }
}

// ============================================
// OFFCANVAS MINI-CART
// ============================================
async function loadOffcanvasCart(cart = null) {
    const container = document.getElementById('cartItemsContainer');
    const subtotalEl = document.getElementById('cartSubtotal');
    if (!container) return;

    if (!cart) cart = await getCart();

    // Badge sync
    const badge = document.getElementById('cartBadge');
    if (badge) {
        const totalQty = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        badge.textContent = totalQty;
        badge.style.display = totalQty > 0 ? 'flex' : 'none';
    }

    // Empty state
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="z_cart_empty" style="text-align:center; padding:40px 20px; color:#999;">
                <i class="fa-solid fa-bag-shopping" style="font-size:2.5rem; margin-bottom:12px; display:block;"></i>
                <p>Your cart is empty.</p>
            </div>`;
        if (subtotalEl) subtotalEl.textContent = '$0.00';
        return;
    }

    // Items render (nested format with product details)
    let total = 0;
    container.innerHTML = cart.map(item => {
        const qty = item.quantity || 1;
        const price = parseFloat(item.price) || 0;
        total += qty * price;

        // 🔥 Truncate product name (25 characters)
        const maxLength = 22;
        const productName = item.name.length > maxLength
            ? item.name.substring(0, maxLength) + "..."
            : item.name;

        return `
    <div class="z_cart_item" data-cart-id="${item.cartId}" data-product-id="${item.productId}">
        <a href="/productDetails.html?id=${item.productId}">
            <img src="${item.image || ''}" alt="${productName}" class="z_item_image" onerror="this.style.display='none'" />
        </a>
        <div class="z_item_details">
            <h4>${productName}</h4>
            ${item.color ? `<p class="z_item_meta"><span class="z_label">Color:</span> ${item.color}</p>` : ''}
            ${item.size ? `<p class="z_item_meta"><span class="z_label">Size:</span> ${item.size}</p>` : ''}
        </div>
        <div class="z_item_action">
            <a href="#" class="z_remove_link" data-cart-id="${item.cartId}" data-product-id="${item.productId}">Remove</a>
            <p class="z_item_price">${qty} x $${price.toFixed(2)}</p>
        </div>
    </div>`;
    }).join('');


    if (subtotalEl) subtotalEl.textContent = '$' + total.toFixed(2);

    // Remove button events
    container.querySelectorAll('.z_remove_link').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            await deleteCartItem(btn.getAttribute('data-cart-id'), btn.getAttribute('data-product-id'));
            loadOffcanvasCart(await getCart());
        });
    });
}

// ============================================
// CART PAGE RENDER (Cart.html)
// ============================================
async function renderCartPage(cart = null) {
    const cartTable = document.querySelector('.z_cart_table');
    if (!cartTable) return;

    if (!cart) cart = await getCart();

    const head = cartTable.querySelector('.z_cart_table_head');
    let cartHTML = '';

    if (cart.length === 0) {
        cartHTML = `
        <div class="z_cart_row d-block text-center">
            <div class="z_cart_empty">
                <img src="/Image/image.png" alt="Empty Cart">
            </div>
            <p>Your cart is empty</p>
        </div>`;
    } else {
        cart.forEach(product => {
            const qty = product.quantity || 1;
            const price = parseFloat(product.price) || 0;
            const total = qty * price;
            cartHTML += `
            <div class="z_cart_row" data-cart-id="${product.cartId}" data-product-id="${product.productId}" data-price="${price}">
                <div class="z_cart_product">
                    <img class="z_cart_product_img" src="${product.image}" alt="${product.name}">
                    <div class="z_cart_product_info">
                       <h4>${product.name.length > 25 ? product.name.substring(0, 25) + '...' : product.name}</h4>
                        <button class="z_cart_remove" data-cart-id="${product.cartId}" data-product-id="${product.productId}">Remove</button>
                    </div>
                </div>
                <div class="z_cart_price" data-label="Price">$${price.toFixed(2)}</div>
                <div class="z_cart_qty" data-label="Quantity">
                    <button class="z_qty_btn" data-qty="-1" data-cart-id="${product.cartId}" data-product-id="${product.productId}" data-current="${qty}">-</button>
                    <span class="z_qty_value">${qty}</span>
                    <button class="z_qty_btn" data-qty="1"  data-cart-id="${product.cartId}" data-product-id="${product.productId}" data-current="${qty}">+</button>
                </div>
                <div class="z_cart_total" data-label="Total">$${total.toFixed(2)}</div>
            </div>`;
        });
    }

    cartTable.innerHTML = '';
    if (head) cartTable.appendChild(head);
    cartTable.innerHTML += cartHTML;

    addCartPageEventListeners();
    updateCartSummary(cart);
}

function addCartPageEventListeners() {
    document.querySelectorAll('.z_cart_remove').forEach(button => {
        button.addEventListener('click', (e) => {
            removeFromCart(e.target.dataset.cartId, e.target.dataset.productId);
        });
    });

    document.querySelectorAll('.z_qty_btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const cartId = e.target.dataset.cartId;
            const productId = e.target.dataset.productId;
            const current = parseInt(e.target.dataset.current, 10);
            const change = parseInt(e.target.dataset.qty, 10);
            updateQuantity(cartId, productId, current + change);
        });
    });
}

function updateCartSummary(cart) {
    const subtotal = cart.reduce((acc, p) => acc + ((parseFloat(p.price) || 0) * (p.quantity || 1)), 0);
    const discount = parseFloat(localStorage.getItem('discount') || 0);
    const shipping = 0;
    const total = Math.max(0, subtotal - discount + shipping);

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('zSubtotal', `$${subtotal.toFixed(2)}`);
    set('zDiscount', `-$${discount.toFixed(2)}`);
    set('zShipping', `$${shipping.toFixed(2)}`);
    set('zTotal', `$${total.toFixed(2)}`);
}

// ============================================
// COUPONS
// ============================================
async function fetchAndDisplayCoupons() {
    try {
        const coupons = await (await fetch(COUPONS_API)).json();
        const dropdown = document.querySelector('.z_coupons_dropdown');
        if (!dropdown) return;
        coupons.forEach(coupon => {
            const opt = document.createElement('option');
            opt.value = coupon.code;
            opt.textContent = `${coupon.code} - ${coupon.description}`;
            dropdown.appendChild(opt);
        });
    } catch (err) {
        console.error('fetchAndDisplayCoupons error:', err);
    }
}

async function applyCoupon(couponCode) {
    try {
        const coupons = await (await fetch(COUPONS_API)).json();
        const coupon = coupons.find(c => c.code === couponCode);
        const cart = await getCart();
        const subtotal = cart.reduce((acc, p) => acc + ((parseFloat(p.price) || 0) * (p.quantity || 1)), 0);

        if (coupon) {
            if (subtotal >= (coupon.min_purchase || 0)) {
                let discount = coupon.type === 'percentage'
                    ? (subtotal * coupon.discount) / 100
                    : coupon.discount;
                localStorage.setItem('discount', discount);
                alert('Coupon applied successfully!');
            } else {
                alert(`Minimum purchase $${coupon.min_purchase} required.`);
                localStorage.setItem('discount', 0);
            }
        } else {
            alert('Invalid coupon code.');
            localStorage.setItem('discount', 0);
        }
        updateCartSummary(cart);
    } catch (err) {
        console.error('applyCoupon error:', err);
    }
}

// ============================================
// DOMContentLoaded
// ============================================
// ============================================
// GLOBAL CLICK DELEGATION FOR LOGIN CHECK
// ============================================
document.addEventListener('click', (e) => {
    const btn = e.target.closest('[class*="add-cart"], [class*="add_cart"]');
    if (btn) {
        const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
        if (!isLoggedIn) {
            e.preventDefault();
            e.stopPropagation();
            const loginModal = document.getElementById('loginModal');
            if (loginModal) {
                loginModal.classList.add('z_open');
            }
        }
    }
}, true); // Use capture to intercept before other handlers

document.addEventListener('DOMContentLoaded', async () => {
    // Har page par badge update karo
    updateCartUI();

    if (window.location.pathname.endsWith('Cart.html')) {
        await renderCartPage();
        await fetchAndDisplayCoupons();

        const dropdown = document.querySelector('.z_coupons_dropdown');
        if (dropdown) {
            dropdown.addEventListener('change', (e) => {
                if (e.target.value) {
                    applyCoupon(e.target.value);
                } else {
                    localStorage.setItem('discount', 0);
                    getCart().then(cart => updateCartSummary(cart));
                }
            });
        }
    }
});
