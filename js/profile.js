// ============================================
// PROFILE FUNCTIONALITY
// ============================================
const PROFILE_API_BASE = 'http://localhost:3000';
const ADDRESSES_API = `${PROFILE_API_BASE}/addresses`;
const ORDERS_API = `${PROFILE_API_BASE}/orders`;

function getUserId() {
    return localStorage.getItem('userId') || 'guest';
}

// ============================================
// LOAD USER ADDRESSES
// ============================================
async function loadUserAddresses() {
    try {
        const response = await fetch(`${ADDRESSES_API}?userId=${getUserId()}`);
        if (!response.ok) throw new Error('Failed to fetch addresses');
        const addresses = await response.json();

        const addressesGrid = document.querySelector('.z_addresses_grid');
        if (!addressesGrid) return;

        // Clear existing addresses (keep add button)
        const existingCards = addressesGrid.querySelectorAll('.z_address_card');
        existingCards.forEach(card => card.remove());

        if (addresses.length === 0) {
            // Show message if no addresses
            const noAddressesMsg = document.createElement('div');
            noAddressesMsg.className = 'z_no_addresses';
            noAddressesMsg.innerHTML = `
                <p>No addresses found. Add your first address!</p>
            `;
            addressesGrid.insertBefore(noAddressesMsg, addressesGrid.querySelector('.z_btn_add_address'));
            return;
        }

        // Render each address
        addresses.forEach(address => {
            const addressCard = createAddressCard(address);
            addressesGrid.insertBefore(addressCard, addressesGrid.querySelector('.z_btn_add_address'));
        });

    } catch (error) {
        console.error('Load addresses error:', error);
    }
}

// ============================================
// CREATE ADDRESS CARD
// ============================================
function createAddressCard(address) {
    const card = document.createElement('div');
    card.className = address.isDefault ? 'z_address_card z_default' : 'z_address_card';
    card.dataset.addressId = address.id;

    const addressDetails = [
        address.fullName,
        address.address,
        address.address2,
        `${address.city}, ${address.state} ${address.pincode}`,
        address.country,
        address.phone
    ].filter(line => line && line.trim()).join('<br>');

    card.innerHTML = `
        ${address.isDefault ? '<span class="z_address_badge">Default</span>' : ''}
        <div class="z_address_type">${address.type || 'Home'}</div>
        <div class="z_address_details">
            ${addressDetails}
        </div>
        <div class="z_address_actions">
            <a href="#" class="z_edit_address" data-id="${address.id}">Edit</a>
            ${!address.isDefault ? `<a href="#" class="z_set_default" data-id="${address.id}">Set as Default</a>` : ''}
            <a href="#" class="z_delete_address" data-id="${address.id}">Delete</a>
        </div>
    `;

    // Add event listeners
    card.querySelector('.z_edit_address')?.addEventListener('click', (e) => {
        e.preventDefault();
        editAddress(address.id);
    });

    card.querySelector('.z_set_default')?.addEventListener('click', (e) => {
        e.preventDefault();
        setDefaultAddress(address.id);
    });

    card.querySelector('.z_delete_address')?.addEventListener('click', (e) => {
        e.preventDefault();
        deleteAddress(address.id);
    });

    return card;
}

// ============================================
// ADD NEW ADDRESS
// ============================================
async function addNewAddress(addressData) {
    try {
        const response = await fetch(ADDRESSES_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(addressData)
        });

        if (!response.ok) throw new Error('Failed to add address');

        const newAddress = await response.json();
        console.log('Address added:', newAddress);

        // Reload addresses
        await loadUserAddresses();

        // Hide form
        hideAddressForm();

        // // alert('Address added successfully!');

    } catch (error) {
        console.error('Add address error:', error);
        alert('Failed to add address. Please try again.');
    }
}

// ============================================
// EDIT ADDRESS
// ============================================
function editAddress(addressId) {
    // Find address data
    fetch(`${ADDRESSES_API}/${addressId}`)
        .then(response => response.json())
        .then(address => {
            // Fill form with address data
            document.getElementById('addrFullName').value = address.fullName || '';
            document.getElementById('addrPhone').value = address.phone || '';
            document.getElementById('addrLine1').value = address.address || '';
            document.getElementById('addrLine2').value = address.address2 || '';
            document.getElementById('addrCity').value = address.city || '';
            document.getElementById('addrState').value = address.state || '';
            document.getElementById('addrZip').value = address.pincode || '';
            document.getElementById('addrCountry').value = address.country || '';
            document.getElementById('addrType').value = address.type || 'Home';
            document.getElementById('addrDefault').value = address.isDefault ? 'yes' : 'no';

            // Show form
            showAddressForm();

            // Change form to edit mode
            const form = document.getElementById('addAddressForm');
            form.dataset.editId = addressId;
            form.querySelector('button[type="submit"]').textContent = 'Update Address';
        })
        .catch(error => {
            console.error('Edit address error:', error);
            alert('Failed to load address for editing.');
        });
}

// ============================================
// UPDATE ADDRESS
// ============================================
async function updateAddress(addressId, addressData) {
    try {
        const response = await fetch(`${ADDRESSES_API}/${addressId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(addressData)
        });

        if (!response.ok) throw new Error('Failed to update address');

        const updatedAddress = await response.json();
        console.log('Address updated:', updatedAddress);

        // Reload addresses
        await loadUserAddresses();

        // Hide form
        hideAddressForm();

        // alert('Address updated successfully!');

    } catch (error) {
        console.error('Update address error:', error);
        alert('Failed to update address. Please try again.');
    }
}

// ============================================
// SET DEFAULT ADDRESS
// ============================================
async function setDefaultAddress(addressId) {
    try {
        // Get all user addresses
        const response = await fetch(`${ADDRESSES_API}?userId=${getUserId()}`);
        const addresses = await response.json();

        // Set all addresses to non-default
        await Promise.all(
            addresses.map(address =>
                fetch(`${ADDRESSES_API}/${address.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isDefault: false })
                })
            )
        );

        // Set selected address as default
        await fetch(`${ADDRESSES_API}/${addressId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isDefault: true })
        });

        // Reload addresses
        await loadUserAddresses();

        // alert('Default address updated!');

    } catch (error) {
        console.error('Set default address error:', error);
        alert('Failed to set default address.');
    }
}

// ============================================
// DELETE ADDRESS
// ============================================
async function deleteAddress(addressId) {
    if (!confirm('Are you sure you want to delete this address?')) {
        return;
    }

    try {
        const response = await fetch(`${ADDRESSES_API}/${addressId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete address');

        console.log('Address deleted:', addressId);

        // Reload addresses
        await loadUserAddresses();

        // alert('Address deleted successfully!');

    } catch (error) {
        console.error('Delete address error:', error);
        alert('Failed to delete address.');
    }
}

// ============================================
// FORM HANDLERS
// ============================================
function showAddressForm() {
    const form = document.getElementById('addAddressForm');
    const addBtn = document.getElementById('addAddressBtn');

    if (form) form.style.display = 'block';
    if (addBtn) addBtn.style.display = 'none';
}

function truncateText(text, maxLength = 25) {
    if (!text) return '';
    return text.length > maxLength
        ? text.substring(0, maxLength) + '...'
        : text;
}


function hideAddressForm() {
    const form = document.getElementById('addAddressForm');
    const addBtn = document.getElementById('addAddressBtn');

    if (form) {
        form.style.display = 'none';
        form.reset();
        delete form.dataset.editId;
        form.querySelector('button[type="submit"]').textContent = 'Save Address';
    }
    if (addBtn) addBtn.style.display = 'block';
}

// ============================================
// LOAD USER ORDERS
// ============================================
async function loadUserOrders() {
    try {
        const response = await fetch(`${ORDERS_API}?userId=${getUserId()}`);
        if (!response.ok) throw new Error('Failed to fetch orders');
        const orders = await response.json();

        const ordersList = document.querySelector('.z_orders_list');
        if (!ordersList) return;

        // Clear existing orders
        ordersList.innerHTML = '';

        if (orders.length === 0) {
            // Show message if no orders
            ordersList.innerHTML = `
                <div class="z_no_orders" style="text-align: center; padding: 40px; color: #999;">
                    <i class="fa-solid fa-box-open" style="font-size: 3rem; margin-bottom: 15px; display: block;"></i>
                    <p>No orders found. Start shopping to see your orders here!</p>
                </div>
            `;
            return;
        }

        // Get all products for image mapping
        const productsResponse = await fetch(`${PROFILE_API_BASE}/products`);
        const allProducts = await productsResponse.json();

        // Sort orders by date (newest first)
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Render each order with product details
        orders.forEach(order => {
            // Add product details to order items
            const orderItemsWithDetails = order.items.map(item => {
                const product = allProducts.find(p => p.id === item.productId);
                return {
                    ...item,
                    image: product ? product.image : 'https://via.placeholder.com/60?text=Product',
                    name: product ? product.ProductTitle : `Product ${item.productId}`
                };
            });

            const orderCard = createOrderCard({
                ...order,
                items: orderItemsWithDetails
            });
            ordersList.appendChild(orderCard);
        });

    } catch (error) {
        console.error('Load orders error:', error);
        const ordersList = document.querySelector('.z_orders_list');
        if (ordersList) {
            ordersList.innerHTML = `
                <div class="z_orders_error" style="text-align: center; padding: 40px; color: #dc3545;">
                    <i class="fa-solid fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 15px; display: block;"></i>
                    <p>Failed to load orders. Please try again later.</p>
                </div>
            `;
        }
    }
}

// ============================================
// CREATE ORDER CARD
// ============================================
function createOrderCard(order) {
    console.log(order, "order");
    const card = document.createElement('div');
    card.className = 'z_order_card';

    // Format date
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    // Get status class
    const statusClass = getStatusClass(order.orderStatus);

    // Format order items
    const orderItemsHtml = order.items.map(item => `
        <div class="z_order_item">
        <div class="z_order_item_grp_1">
            <img src="${item.image}" alt="Product" class="z_order_item_image">
            <div class="z_order_item_details">
                <div class="z_order_item_name" title="${item.name}">
                    ${truncateText(item.name, 25)}
                </div>
                <div class="z_order_item_meta">Qty: ${item.quantity} | Price: $${item.price}</div>
            </div>
        </div>
        <div class="z_order_item_price">$${(item.price * item.quantity).toFixed(2)}</div>
        </div>
    `).join('');

    card.innerHTML = `
        <div class="z_order_header">
            <div>
                <span class="z_order_id">Order #${order.id}</span>
                <span class="z_order_date">${orderDate}</span>
            </div>
            <span class="z_order_status ${statusClass}">${order.orderStatus}</span>
        </div>
        <div class="z_order_body">
            <div class="z_order_items">
                ${orderItemsHtml}
            </div>
        </div>
        <div class="z_order_footer">
            <div class="z_order_total">Total: <span>$${order.totalAmount.toFixed(2)}</span></div>
            <div class="z_order_payment">
                <small>Payment: ${order.paymentMethod} | ${order.paymentStatus}</small>
            </div>
            <button class="z_btn_view_order" onclick="viewOrderDetails('${order.id}')">View Details</button>
        </div>
    `;

    return card;
}

// ============================================
// GET STATUS CLASS
// ============================================
function getStatusClass(status) {
    const statusMap = {
        'Processing': 'z_processing',
        'Shipped': 'z_shipped',
        'Delivered': 'z_delivered',
        'Cancelled': 'z_cancelled',
        'Pending': 'z_pending'
    };
    return statusMap[status] || 'z_pending';
}

// ============================================
// VIEW ORDER DETAILS
// ============================================
function viewOrderDetails(orderId) {
    // Find the order from the current orders
    const ordersList = document.querySelector('.z_orders_list');
    const orderCards = ordersList.querySelectorAll('.z_order_card');

    let targetOrder = null;
    orderCards.forEach(card => {
        const orderIdElement = card.querySelector('.z_order_id');
        if (orderIdElement && orderIdElement.textContent.includes(orderId)) {
            targetOrder = {
                id: orderId,
                date: card.querySelector('.z_order_date').textContent,
                status: card.querySelector('.z_order_status').textContent,
                items: Array.from(card.querySelectorAll('.z_order_item')).map(item => ({
                    name: item.querySelector('.z_order_item_name').textContent,
                    quantity: item.querySelector('.z_order_item_meta').textContent.split(' | ')[0].replace('Qty: ', ''),
                    price: item.querySelector('.z_order_item_meta').textContent.split(' | ')[1].replace('Price: $', ''),
                    image: item.querySelector('.z_order_item_image').src
                })),
                total: card.querySelector('.z_order_total span').textContent,
                payment: card.querySelector('.z_order_payment small').textContent
            };
        }
    });

    if (!targetOrder) return;

    // Create and show modal
    showOrderModal(targetOrder);
}

let orderModalScrollY = 0;

function lockBodyScrollForModal() {
    orderModalScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${orderModalScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
}

function unlockBodyScrollForModal() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo(0, orderModalScrollY);
}

// ============================================
// SHOW ORDER MODAL
// ============================================
function showOrderModal(order) {
    const existingModal = document.getElementById('orderModal');
    if (existingModal) existingModal.remove();

    // Create modal HTML
    const modalHtml = `
        <div class="z_order_modal_overlay" id="orderModal">
            <div class="z_order_modal">
                <div class="z_order_modal_header">
                    <h3>Order Details #${order.id}</h3>
                    <button class="z_order_modal_close" onclick="closeOrderModal()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div class="z_order_modal_body">
                    <div class="z_order_modal_section">
                        <h4>Order Information</h4>
                        <div class="z_order_info_grid">
                            <div class="z_order_info_item">
                                <label>Order ID:</label>
                                <span>#${order.id}</span>
                            </div>
                            <div class="z_order_info_item">
                                <label>Date:</label>
                                <span>${order.date}</span>
                            </div>
                            <div class="z_order_info_item">
                                <label>Status:</label>
                                <span class="z_order_status">${order.status}</span>
                            </div>
                            <div class="z_order_info_item">
                                <label>Payment:</label>
                                <span>${order.payment}</span>
                            </div>
                            <div class="z_order_info_item">
                                <label>Total Amount:</label>
                                <span class="z_order_total_amount">${order.total}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="z_order_modal_section">
                        <h4>Order Items</h4>
                        <div class="z_order_modal_items">
                            ${order.items.map(item => `
                                <div class="z_order_modal_item">
                                    <img src="${item.image}" alt="${item.name}" class="z_order_modal_item_image">
                                    <div class="z_order_modal_item_details">
                                        <div class="z_order_modal_item_name">${item.name}</div>
                                        <div class="z_order_modal_item_meta">
                                            Quantity: ${item.quantity} | Price: $${item.price}
                                        </div>
                                        <div class="z_order_modal_item_total">
                                            $${(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    lockBodyScrollForModal();

    // Add overlay click to close
    document.getElementById('orderModal').addEventListener('click', function (e) {
        if (e.target === this) {
            closeOrderModal();
        }
    });

    document.addEventListener('keydown', handleOrderModalEscClose);
}

// ============================================
// LOAD USER WISHLIST
// ============================================
async function loadUserWishlist() {
    try {
        const userId = getUserId();
        const response = await fetch(`${PROFILE_API_BASE}/wishlists?userId=${userId}`);
        const wishlists = await response.json();

        const wishlistGrid = document.querySelector('.z_wishlist_grid');
        if (!wishlistGrid) return;

        wishlistGrid.innerHTML = '';

        if (wishlists.length === 0 || wishlists[0].productIds.length === 0) {
            wishlistGrid.innerHTML = `
                <div class="z_no_wishlist" style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">
                    <i class="fa-solid fa-heart-crack" style="font-size: 3rem; margin-bottom: 15px; display: block;"></i>
                    <p>Your wishlist is empty. Explore products to add them here!</p>
                </div>
            `;
            return;
        }

        const productIds = wishlists[0].productIds;

        // Fetch all products to get details for wishlisted items
        const prodRes = await fetch(`${PROFILE_API_BASE}/products`);
        const allProducts = await prodRes.json();

        productIds.forEach(pid => {
            const product = allProducts.find(p => String(p.id) === String(pid));
            if (product) {
                const card = createWishlistCard(product);
                wishlistGrid.appendChild(card);
            }
        });

    } catch (error) {
        console.error('Load wishlist error:', error);
    }
}

// ============================================
// CREATE WISHLIST CARD
// ============================================
function createWishlistCard(product) {
    const card = document.createElement('div');
    card.className = 'z_wishlist_card';
    card.dataset.id = product.id;

    const originalPrice = product.OldPrice ? `<span class="z_wishlist_original_price">$${product.OldPrice}</span>` : '';

    card.innerHTML = `
        <img src="${product.image}" alt="${product.ProductTitle}" class="z_wishlist_image">
        <div class="z_wishlist_body">
            <div class="z_wishlist_name" title="${product.ProductTitle}">${truncateText(product.ProductTitle, 35)}</div>
            <div class="z_wishlist_price">
                <span class="z_wishlist_current_price">$${product.currentPrice}</span>
                ${originalPrice}
            </div>
            <div class="z_wishlist_actions">
                <button class="z_btn_add_to_cart" onclick="addToCartFromWishlist('${product.id}')">Add to Cart</button>
                <button class="z_btn_remove_wishlist" onclick="handleRemoveFromWishlist('${product.id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `;

    return card;
}

// Helper functions for wishlist actions
window.handleRemoveFromWishlist = async function (productId) {
    // if (confirm('Remove this item from your wishlist?')) {
        const success = await window.removeFromWishlist(productId);
        if (success) {
            loadUserWishlist(); // Refresh grid
        }
    // }
}

window.addToCartFromWishlist = async function (productId) {
    try {
        const pid = String(productId);
        let product = null;
        const res = await fetch(`${PROFILE_API_BASE}/products/${pid}`);
        if (res.ok) {
            product = await res.json();
        }
        let name = '';
        let price = 0;
        let image = '';
        if (product && product.id) {
            name = product.ProductTitle || '';
            price = parseFloat(product.currentPrice) || 0;
            image = product.image || '';
        } else {
            const card = document.querySelector(`.z_wishlist_card[data-id="${pid}"]`);
            if (card) {
                name = card.querySelector('.z_wishlist_name')?.textContent?.trim() || '';
                const priceText = card.querySelector('.z_wishlist_current_price')?.textContent?.replace('$', '') || '0';
                price = parseFloat(priceText) || 0;
                image = card.querySelector('.z_wishlist_image')?.getAttribute('src') || '';
            }
        }
        if (window.addToCart) {
            const ok = await window.addToCart(pid, name, price, image, 1);
            if (ok) {
                await window.removeFromWishlist(pid);
                const cardEl = document.querySelector(`.z_wishlist_card[data-id="${pid}"]`);
                if (cardEl) {
                    cardEl.remove();
                }
                const grid = document.querySelector('.z_wishlist_grid');
                if (grid && grid.children.length === 0) {
                    loadUserWishlist();
                }
                if (window.updateWishlistBadge) window.updateWishlistBadge();
                if (window.updateCartUI) window.updateCartUI();
            }
        }
    } catch (e) {
        console.error('addToCartFromWishlist error:', e);
    }
}


// ============================================
// CLOSE ORDER MODAL
// ============================================
function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.remove();
    }
    unlockBodyScrollForModal();
    document.removeEventListener('keydown', handleOrderModalEscClose);
}

function handleOrderModalEscClose(e) {
    if (e.key === 'Escape') {
        closeOrderModal();
    }
}
// ============================================
// INIT PROFILE
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    // Load addresses on page load
    loadUserAddresses();

    // Add address button click
    document.getElementById('addAddressBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        showAddressForm();
    });

    // Cancel address button click
    document.getElementById('cancelAddressBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        hideAddressForm();
    });

    // Address form submit
    document.getElementById('addAddressForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const addressData = {
            userId: getUserId(),
            fullName: formData.get('addrFullName'),
            phone: formData.get('addrPhone'),
            address: formData.get('addrLine1'),
            address2: formData.get('addrLine2'),
            city: formData.get('addrCity'),
            state: formData.get('addrState'),
            pincode: formData.get('addrZip'),
            country: formData.get('addrCountry'),
            type: formData.get('addrType'),
            isDefault: formData.get('addrDefault') === 'yes'
        };

        const editId = e.target.dataset.editId;
        if (editId) {
            await updateAddress(editId, addressData);
        } else {
            await addNewAddress(addressData);
        }
    });

    // Tab navigation + hash support
    document.querySelectorAll('.z_profile_sidebar_item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();

            const tabId = this.getAttribute('data-tab');
            if (!tabId) return;

            // Remove active class from all sidebar items
            document.querySelectorAll('.z_profile_sidebar_item').forEach(i => i.classList.remove('active'));

            // Add active class to clicked item
            this.classList.add('active');

            // Hide all tab content
            document.querySelectorAll('.z_tab_content').forEach(tab => tab.classList.remove('active'));

            // Show selected tab content
            const tabEl = document.getElementById(tabId);
            if (tabEl) {
                tabEl.classList.add('active');
            }

            // Keep URL in sync (no page reload)
            if (window.location.hash !== `#${tabId}`) {
                history.replaceState(null, '', `#${tabId}`);
            }

            // Load data for selected tab
            if (tabId === 'orders') {
                loadUserOrders();
            } else if (tabId === 'wishlist') {
                loadUserWishlist();
            } else if (tabId === 'addresses') {
                loadUserAddresses();
            }
        });
    });

    // Open tab directly from URL hash (e.g., Profile.html#wishlist)
    const openTabFromHash = () => {
        const tabId = window.location.hash.replace('#', '').trim();
        if (!tabId) return;

        const sidebarItem = document.querySelector(`.z_profile_sidebar_item[data-tab="${tabId}"]`);
        if (sidebarItem) {
            sidebarItem.click();
        }
    };

    openTabFromHash();
    window.addEventListener('hashchange', openTabFromHash);
});
