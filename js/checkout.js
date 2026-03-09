// ============================================
// API CONFIG
// ============================================
const API_BASE = 'http://localhost:3000';
const ADDRESSES_API = `${API_BASE}/addresses`;
const CARTS_API = `${API_BASE}/carts`;
const ORDERS_API = `${API_BASE}/orders`;
const PRODUCTS_API = `${API_BASE}/products`;

function getUserId() {
    return localStorage.getItem('userId') || 'guest';
}

let defaultCheckoutAddress = null;
let usingManualAddress = false;
let checkoutAddresses = [];
let isProgrammaticAddressFill = false;

function splitFullName(fullName) {
    const clean = (fullName || '').trim();
    if (!clean) return { firstName: '', lastName: '' };
    const parts = clean.split(/\s+/);
    return {
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ')
    };
}

function normalizeCountryValue(country) {
    const value = (country || '').toString().trim().toLowerCase();
    const countryMap = {
        us: 'US',
        usa: 'US',
        'united states': 'US',
        'united states of america': 'US',
        ca: 'CA',
        canada: 'CA',
        gb: 'GB',
        uk: 'GB',
        'united kingdom': 'GB',
        in: 'IN',
        india: 'IN',
        au: 'AU',
        australia: 'AU'
    };
    return countryMap[value] || '';
}

function setFormFieldValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.value = value || '';
    if (fieldId === 'checkoutCountry') {
        field.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function setDefaultAddressNote(isVisible, text) {
    const note = document.getElementById('defaultAddressNote');
    if (!note) return;
    if (text) note.textContent = text;
    note.style.display = isVisible ? 'block' : 'none';
}

function applyAddressToForm(address, noteText = 'Saved default address is applied.') {
    if (!address) return;

    isProgrammaticAddressFill = true;
    const nameParts = splitFullName(address.fullName);
    setFormFieldValue('firstNameCheckout', nameParts.firstName);
    setFormFieldValue('lastNameCheckout', nameParts.lastName);
    setFormFieldValue('checkoutPhone', address.phone || '');
    setFormFieldValue('checkoutAddress', address.address || '');
    setFormFieldValue('checkoutAddress2', address.address2 || '');
    setFormFieldValue('checkoutCity', address.city || '');
    setFormFieldValue('checkoutState', address.state || '');
    setFormFieldValue('checkoutZip', address.pincode || '');
    setFormFieldValue('checkoutCountry', normalizeCountryValue(address.country));
    isProgrammaticAddressFill = false;

    usingManualAddress = false;
    setDefaultAddressNote(true, noteText);
}

function clearAddressFormForManualEntry() {
    const addressFields = [
        'firstNameCheckout',
        'lastNameCheckout',
        'checkoutPhone',
        'checkoutAddress',
        'checkoutAddress2',
        'checkoutCity',
        'checkoutState',
        'checkoutZip',
        'checkoutCountry'
    ];
    addressFields.forEach((fieldId) => setFormFieldValue(fieldId, ''));
}

async function loadDefaultAddressForCheckout() {
    try {
        const response = await fetch(`${ADDRESSES_API}?userId=${encodeURIComponent(getUserId())}`);
        if (!response.ok) return;

        const addresses = await response.json();
        if (!Array.isArray(addresses) || addresses.length === 0) {
            checkoutAddresses = [];
            defaultCheckoutAddress = null;
            usingManualAddress = true;
            renderSavedAddressList();
            setDefaultAddressNote(false);
            return;
        }

        checkoutAddresses = addresses;
        defaultCheckoutAddress = checkoutAddresses.find((address) => address.isDefault) || checkoutAddresses[0];
        renderSavedAddressList();
        applyAddressToForm(defaultCheckoutAddress);
    } catch (error) {
        console.error('Failed to load default checkout address:', error);
        setDefaultAddressNote(false);
    }
}

function renderSavedAddressList() {
    const listWrap = document.getElementById('savedAddressList');
    const savedWrap = document.getElementById('savedAddressWrap');
    if (!listWrap || !savedWrap) return;

    if (!checkoutAddresses.length) {
        listWrap.innerHTML = '<p style="margin:0; color:#666;">No saved address found.</p>';
        return;
    }

    listWrap.innerHTML = checkoutAddresses.map((address) => {
        const badge = address.isDefault ? '<span style="font-size:12px; font-weight:600; background:#94a691; color:#fff; padding:2px 6px; border-radius:4px;">Default</span>' : '';
        const addressText = [address.address, address.address2, `${address.city || ''}${address.city && address.state ? ', ' : ''}${address.state || ''}`, address.pincode, address.country]
            .filter(Boolean)
            .join(', ');

        return `
            <button type="button" class="z_checkout_btn_cancel saved-address-item"
                data-address-id="${address.id}"
                style="text-align:left; width:100%; background:#fff;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                    <strong style="text-wrap: nowrap; font-size: 16px;">${address.fullName || 'Saved Address'}</strong>
                    ${badge}
                </div>
                <div style="font-size:13px; color:#666; margin-top:3px;">${addressText}</div>
            </button>
        `;
    }).join('');

    listWrap.querySelectorAll('.saved-address-item').forEach((button) => {
        button.addEventListener('click', function () {
            const addressId = this.getAttribute('data-address-id');
            const selected = checkoutAddresses.find((address) => String(address.id) === String(addressId));
            if (!selected) return;

            applyAddressToForm(selected, 'Selected saved address is applied.');
            savedWrap.style.display = 'none';
        });
    });
}

// ============================================
// FORM VALIDATION
// ============================================
function validateCheckoutForm() {
    let isValid = true;

    // Clear previous errors
    document.querySelectorAll('.z_error_msg').forEach(el => el.textContent = '');

    // Email validation
    const email = document.getElementById('checkoutEmail').value.trim();
    const emailError = document.getElementById('checkoutEmailError');
    if (!email) {
        if (emailError) emailError.textContent = 'Email is required';
        isValid = false;
    } else if (!validateEmail(email)) {
        if (emailError) emailError.textContent = 'Please enter a valid email';
        isValid = false;
    }

    // Required fields validation
    const requiredFields = [
        'firstNameCheckout', 'lastNameCheckout', 'checkoutAddress',
        'checkoutCity', 'checkoutZip', 'checkoutCountry'
    ];

    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && !field.value.trim()) {
            const errorElement = document.getElementById(fieldId + 'Error');
            if (errorElement) {
                errorElement.textContent = 'This field is required';
            } else {
                // Create error element if it doesn't exist
                const errorDiv = document.createElement('span');
                errorDiv.className = 'z_error_msg';
                errorDiv.id = fieldId + 'Error';
                errorDiv.textContent = 'This field is required';
                field.parentNode.appendChild(errorDiv);
            }
            isValid = false;
        }
    });

    return isValid;
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ============================================
// PAYMENT METHOD FIELD VISIBILITY
// ============================================
function setupPaymentMethodHandlers() {
    const paymentRadios = document.querySelectorAll('input[name="payment"]');
    const cardFields = document.getElementById('cardFields');

    // Function to show/hide card fields
    function togglePaymentFields() {
        const selectedMethod = document.querySelector('input[name="payment"]:checked').value;

        if (selectedMethod === 'card') {
            cardFields.style.display = 'block';
        } else {
            cardFields.style.display = 'none';
        }
    }

    // Add event listeners to payment method radios
    paymentRadios.forEach(radio => {
        radio.addEventListener('change', togglePaymentFields);
    });

    // Initial setup
    togglePaymentFields();
}

function setupCardInputFormatting() {
    const cardNumberInput = document.getElementById('cardNumber');
    const cardExpiryInput = document.getElementById('cardExpiry');
    const cardCvcInput = document.getElementById('cardCvc');

    if (!cardNumberInput) return;

    cardNumberInput.addEventListener('input', function () {
        const digitsOnly = this.value.replace(/\D/g, '').slice(0, 19);
        const grouped = digitsOnly.match(/.{1,4}/g);
        this.value = grouped ? grouped.join(' ') : '';
    });

    cardExpiryInput?.addEventListener('input', function () {
        const digitsOnly = this.value.replace(/\D/g, '').slice(0, 4);
        if (digitsOnly.length <= 2) {
            this.value = digitsOnly;
            return;
        }
        this.value = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
    });

    cardCvcInput?.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').slice(0, 4);
    });
}

// ============================================
// CUSTOM COUNTRY DROPDOWN
// ============================================
function initCustomCountryDropdown() {
    const nativeSelect = document.getElementById('checkoutCountry');
    if (!nativeSelect || nativeSelect.dataset.customized === 'true') return;

    nativeSelect.dataset.customized = 'true';
    nativeSelect.classList.add('z_native_select_hidden');
    nativeSelect.setAttribute('tabindex', '-1');

    const customSelect = document.createElement('div');
    customSelect.className = 'z_custom_select';

    const triggerBtn = document.createElement('button');
    triggerBtn.type = 'button';
    triggerBtn.className = 'z_custom_select_trigger';
    triggerBtn.setAttribute('aria-haspopup', 'listbox');
    triggerBtn.setAttribute('aria-expanded', 'false');

    const triggerText = document.createElement('span');
    triggerText.className = 'z_custom_select_text';

    const triggerIcon = document.createElement('i');
    triggerIcon.className = 'fa-solid fa-chevron-down';
    triggerIcon.setAttribute('aria-hidden', 'true');

    triggerBtn.appendChild(triggerText);
    triggerBtn.appendChild(triggerIcon);

    const optionsMenu = document.createElement('div');
    optionsMenu.className = 'z_custom_select_menu';
    optionsMenu.setAttribute('role', 'listbox');

    const optionButtons = [];
    Array.from(nativeSelect.options).forEach((option) => {
        if (!option.value) return;

        const optionBtn = document.createElement('button');
        optionBtn.type = 'button';
        optionBtn.className = 'z_custom_select_option';
        optionBtn.textContent = option.textContent;
        optionBtn.dataset.value = option.value;
        optionBtn.setAttribute('role', 'option');

        optionBtn.addEventListener('click', () => {
            nativeSelect.value = option.value;
            nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
            closeMenu();
        });

        optionsMenu.appendChild(optionBtn);
        optionButtons.push(optionBtn);
    });

    customSelect.appendChild(triggerBtn);
    customSelect.appendChild(optionsMenu);
    nativeSelect.insertAdjacentElement('afterend', customSelect);

    function updateUI() {
        const selectedOption = nativeSelect.options[nativeSelect.selectedIndex];
        const hasValue = !!nativeSelect.value;

        triggerText.textContent = selectedOption ? selectedOption.textContent : 'Select country';
        triggerText.classList.toggle('is_placeholder', !hasValue);

        optionButtons.forEach((btn) => {
            btn.classList.toggle('is_selected', btn.dataset.value === nativeSelect.value);
            btn.setAttribute('aria-selected', btn.dataset.value === nativeSelect.value ? 'true' : 'false');
        });
    }

    function openMenu() {
        customSelect.classList.add('z_open');
        triggerBtn.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
        customSelect.classList.remove('z_open');
        triggerBtn.setAttribute('aria-expanded', 'false');
    }

    triggerBtn.addEventListener('click', () => {
        if (customSelect.classList.contains('z_open')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    triggerBtn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            openMenu();
            const selectedBtn = optionsMenu.querySelector('.z_custom_select_option.is_selected') || optionButtons[0];
            if (selectedBtn) selectedBtn.focus();
        }
    });

    optionsMenu.addEventListener('keydown', (e) => {
        const currentIndex = optionButtons.findIndex((btn) => btn === document.activeElement);

        if (e.key === 'Escape') {
            e.preventDefault();
            closeMenu();
            triggerBtn.focus();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = currentIndex < optionButtons.length - 1 ? currentIndex + 1 : 0;
            optionButtons[nextIndex]?.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : optionButtons.length - 1;
            optionButtons[prevIndex]?.focus();
        }
    });

    document.addEventListener('click', (e) => {
        if (!customSelect.contains(e.target)) {
            closeMenu();
        }
    });

    nativeSelect.addEventListener('change', updateUI);
    updateUI();
}

// ============================================
// PAYMENT VALIDATION
// ============================================
function validatePayment() {
    const paymentMethod = document.querySelector('input[name="payment"]:checked');
    if (!paymentMethod) {
        alert('Please select a payment method');
        return false;
    }

    if (paymentMethod.value === 'card') {
        const cardNumber = document.getElementById('cardNumber').value;
        const cardExpiry = document.getElementById('cardExpiry').value;
        const cardCvc = document.getElementById('cardCvc').value;
        const cardName = document.getElementById('cardName').value;

        if (!cardNumber || !cardExpiry || !cardCvc || !cardName) {
            alert('Please fill in all card details');
            return false;
        }

        // Basic card number validation (should be 13-19 digits)
        if (!/^\d{13,19}$/.test(cardNumber.replace(/\s/g, ''))) {
            alert('Please enter a valid card number');
            return false;
        }

        // Basic expiry validation (MM/YY format)
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) {
            alert('Please enter a valid expiry date (MM/YY)');
            return false;
        }

        // Basic CVC validation (3-4 digits)
        if (!/^\d{3,4}$/.test(cardCvc)) {
            alert('Please enter a valid CVC');
            return false;
        }
    } else if (paymentMethod.value === 'paypal') {
        // PayPal specific validation if needed
        // For now, PayPal doesn't require additional fields
        console.log('PayPal payment selected');
    } else if (paymentMethod.value === 'cod') {
        // Cash on delivery specific validation if needed
        console.log('Cash on delivery selected');
    }

    return true;
}

// ============================================
// GET CART ITEMS FOR ORDER
// ============================================
async function getCartItemsForOrder() {
    try {
        // Get user cart
        const cartResponse = await fetch(`${CARTS_API}?userId=${getUserId()}`);
        if (!cartResponse.ok) {
            throw new Error('Failed to fetch cart');
        }
        const userCarts = await cartResponse.json();

        if (userCarts.length === 0 || !userCarts[0].items || userCarts[0].items.length === 0) {
            return [];
        }

        const userCart = userCarts[0];

        // Get all products
        const productsResponse = await fetch(PRODUCTS_API);
        if (!productsResponse.ok) {
            throw new Error('Failed to fetch products');
        }
        const allProducts = await productsResponse.json();

        // Map cart items with product details for order
        return userCart.items.map(cartItem => {
            const product = allProducts.find(p => String(p.id) === String(cartItem.id));
            if (!product) return null;

            const itemPrice = parseFloat(product.currentPrice ?? product.price ?? 0);
            return {
                productId: product.id,
                quantity: cartItem.quantity || 1,
                price: Number.isFinite(itemPrice) ? itemPrice : 0
            };
        }).filter(item => item !== null);
    } catch (error) {
        console.error('Get cart items error:', error);
        return [];
    }
}

// ============================================
// CREATE ORDER
// ============================================
async function createOrder(addressData, paymentMethod) {
    try {
        // Get cart items
        const orderItems = await getCartItemsForOrder();

        if (orderItems.length === 0) {
            throw new Error('No items in cart');
        }

        // Calculate total amount
        const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Create order data
        const orderData = {
            userId: getUserId(),
            items: orderItems,
            totalAmount: totalAmount,
            paymentMethod: paymentMethod,
            paymentStatus: 'Pending',
            orderStatus: 'Processing',
            shippingAddress: {
                fullName: addressData.fullName,
                phone: addressData.phone,
                address: addressData.address,
                address2: addressData.address2,
                city: addressData.city,
                state: addressData.state,
                pincode: addressData.pincode,
                country: addressData.country
            },
            createdAt: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        };

        // Save order
        const response = await fetch(ORDERS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            throw new Error('Failed to create order');
        }

        return await response.json();
    } catch (error) {
        console.error('Create order error:', error);
        throw error;
    }
}
async function saveAddress(addressData) {
    try {
        const response = await fetch(ADDRESSES_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(addressData)
        });

        if (!response.ok) {
            throw new Error('Failed to save address');
        }

        return await response.json();
    } catch (error) {
        console.error('Save address error:', error);
        throw error;
    }
}

function normalizeAddressValue(value) {
    return (value || '').toString().trim().toLowerCase();
}

function isSameAddress(first, second) {
    if (!first || !second) return false;

    return normalizeAddressValue(first.fullName) === normalizeAddressValue(second.fullName)
        && normalizeAddressValue(first.phone) === normalizeAddressValue(second.phone)
        && normalizeAddressValue(first.address) === normalizeAddressValue(second.address)
        && normalizeAddressValue(first.address2) === normalizeAddressValue(second.address2)
        && normalizeAddressValue(first.city) === normalizeAddressValue(second.city)
        && normalizeAddressValue(first.state) === normalizeAddressValue(second.state)
        && normalizeAddressValue(first.pincode) === normalizeAddressValue(second.pincode)
        && normalizeAddressValue(first.country) === normalizeAddressValue(second.country);
}

function shouldSaveAddress(addressData) {
    if (!usingManualAddress) return false;
    return !checkoutAddresses.some((savedAddress) => isSameAddress(savedAddress, addressData));
}

// ============================================
// GET FORM DATA
// ============================================
function getCheckoutFormData() {
    const firstName = document.getElementById('firstNameCheckout').value.trim();
    const lastName = document.getElementById('lastNameCheckout').value.trim();
    return {
        userId: getUserId(),
        fullName: `${firstName} ${lastName}`.trim(),
        phone: document.getElementById('checkoutPhone').value,
        email: document.getElementById('checkoutEmail').value,
        address: document.getElementById('checkoutAddress').value,
        address2: document.getElementById('checkoutAddress2').value,
        city: document.getElementById('checkoutCity').value,
        state: document.getElementById('checkoutState').value,
        pincode: document.getElementById('checkoutZip').value,
        country: document.getElementById('checkoutCountry').value
    };
}

// ============================================
// CLEAR CART AFTER ORDER
// ============================================
async function clearUserCart() {
    try {
        // Get user cart
        const cartResponse = await fetch(`${CARTS_API}?userId=${getUserId()}`);
        const userCarts = await cartResponse.json();

        if (userCarts.length > 0) {
            const cartId = userCarts[0].id;
            // Clear cart by setting empty items array
            await fetch(`${CARTS_API}/${cartId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ items: [] })
            });
        }
    } catch (error) {
        console.error('Clear cart error:', error);
    }
}

// ============================================
// PROCESS CHECKOUT
// ============================================
async function processCheckout(e) {
    e.preventDefault();

    // Validate form
    if (!validateCheckoutForm()) {
        // Scroll to first error
        const firstError = document.querySelector('.z_error_msg');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

    // Validate payment
    if (!validatePayment()) {
        return;
    }

    const submitBtn = document.getElementById('placeOrderBtn');
    const originalText = submitBtn ? submitBtn.innerHTML : '';

    try {
        // Show loading state
        if (!submitBtn) {
            throw new Error('Place order button not found');
        }
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        submitBtn.disabled = true;

        // Get form data
        const addressData = getCheckoutFormData();
        const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

        // Create order first
        const order = await createOrder(addressData, paymentMethod);
        console.log('Order created:', order);

        // Save address only for new/manual address (avoid duplicate saved addresses)
        try {
            if (shouldSaveAddress(addressData)) {
                const savedAddress = await saveAddress(addressData);
                console.log('Address saved:', savedAddress);
            }
        } catch (saveAddressError) {
            console.warn('Address save skipped:', saveAddressError);
        }

        // Clear cart
        await clearUserCart();

        // Clear discount
        localStorage.removeItem('checkoutDiscount');

        // Show success message
        alert(`Order placed successfully! Order ID: ${order.id}`);

        // Redirect to success page immediately after alert OK
        // Keep storage as best-effort so it never blocks navigation.
        const orderId = String((order && order.id) || '');
        try {
            if (orderId) {
                localStorage.setItem('lastOrderId', orderId);
            }
        } catch (storageError) {
            console.warn('Could not save lastOrderId in localStorage:', storageError);
        }
        const successUrl = orderId
            ? `OrderSuccess.html?order=${encodeURIComponent(orderId)}`
            : 'OrderSuccess.html';
        setTimeout(() => {
            window.location.replace(successUrl);
        }, 0);
        return;

    } catch (error) {
        console.error('Checkout error:', error);
        alert('There was an error processing your order. Please try again.');
    } finally {
        // Reset button state only if user is still on checkout page
        if (submitBtn && window.location.pathname.toLowerCase().includes('checkout')) {
            submitBtn.innerHTML = originalText || 'Place order <i class="fa-solid fa-lock"></i>';
            submitBtn.disabled = false;
        }
    }
}

// ============================================
// INIT CHECKOUT
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        // Use custom JS validation messages instead of browser default popups.
        checkoutForm.setAttribute('novalidate', 'novalidate');
        checkoutForm.addEventListener('submit', processCheckout);
    }

    // Setup payment method field visibility
    setupPaymentMethodHandlers();
    setupCardInputFormatting();
    initCustomCountryDropdown();

    // Auto-fill user data if available
    const userEmail = localStorage.getItem('userEmail');
    const userName = localStorage.getItem('userName');

    if (userEmail) {
        const emailField = document.getElementById('checkoutEmail');
        if (emailField) emailField.value = userEmail;
    }

    if (userName) {
        const nameParts = splitFullName(userName);
        const firstNameField = document.getElementById('firstNameCheckout');
        const lastNameField = document.getElementById('lastNameCheckout');
        if (firstNameField) firstNameField.value = nameParts.firstName;
        if (lastNameField) lastNameField.value = nameParts.lastName;
    }

    const addressInputIds = [
        'firstNameCheckout',
        'lastNameCheckout',
        'checkoutPhone',
        'checkoutAddress',
        'checkoutAddress2',
        'checkoutCity',
        'checkoutState',
        'checkoutZip',
        'checkoutCountry'
    ];
    addressInputIds.forEach((id) => {
        const field = document.getElementById(id);
        const markManual = () => {
            if (!isProgrammaticAddressFill) {
                usingManualAddress = true;
                setDefaultAddressNote(false);
            }
        };
        field?.addEventListener('input', markManual);
        field?.addEventListener('change', markManual);
    });

    const addAddressBtnCheckout = document.getElementById('addAddressBtnCheckout');
    const savedAddressWrap = document.getElementById('savedAddressWrap');
    addAddressBtnCheckout?.addEventListener('click', function () {
        if (!savedAddressWrap) return;
        const shouldOpen = savedAddressWrap.style.display === 'none' || !savedAddressWrap.style.display;
        savedAddressWrap.style.display = shouldOpen ? 'block' : 'none';
    });

    loadDefaultAddressForCheckout();
});
