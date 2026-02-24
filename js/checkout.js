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

// ============================================
// FORM VALIDATION
// ============================================
function validateCheckoutForm() {
    let isValid = true;
    
    // Clear previous errors
    document.querySelectorAll('.z_error_msg').forEach(el => el.textContent = '');
    
    // Email validation
    const email = document.getElementById('checkoutEmail').value;
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
        const userCarts = await cartResponse.json();
        
        if (userCarts.length === 0 || !userCarts[0].items || userCarts[0].items.length === 0) {
            return [];
        }
        
        const userCart = userCarts[0];
        
        // Get all products
        const productsResponse = await fetch(PRODUCTS_API);
        const allProducts = await productsResponse.json();
        
        // Map cart items with product details for order
        return userCart.items.map(cartItem => {
            const product = allProducts.find(p => p.id === cartItem.id);
            if (!product) return null;
            
            return {
                productId: product.id,
                quantity: cartItem.quantity || 1,
                price: product.currentPrice
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

// ============================================
// GET FORM DATA
// ============================================
function getCheckoutFormData() {
    return {
        userId: getUserId(),
        fullName: `${document.getElementById('firstNameCheckout').value} ${document.getElementById('lastNameCheckout').value}`,
        phone: document.getElementById('checkoutPhone').value,
        email: document.getElementById('checkoutEmail').value,
        address: document.getElementById('checkoutAddress').value,
        address2: document.getElementById('checkoutAddress2').value,
        city: document.getElementById('checkoutCity').value,
        state: document.getElementById('checkoutState').value,
        pincode: document.getElementById('checkoutZip').value,
        country: document.getElementById('checkoutCountry').value,
        isDefault: true // Mark as default address
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
    
    try {
        // Show loading state
        const submitBtn = document.getElementById('placeOrderBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        submitBtn.disabled = true;
        
        // Get form data
        const addressData = getCheckoutFormData();
        const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
        
        // Create order first
        const order = await createOrder(addressData, paymentMethod);
        console.log('Order created:', order);
        
        // Save address
        const savedAddress = await saveAddress(addressData);
        console.log('Address saved:', savedAddress);
        
        // Clear cart
        await clearUserCart();
        
        // Clear discount
        localStorage.removeItem('checkoutDiscount');
        
        // Show success message
        alert(`Order placed successfully! Order ID: ${order.id}`);
        
        // Redirect to success page
        window.location.href = 'OrderSuccess.html?order=' + encodeURIComponent(order.id);
        
    } catch (error) {
        console.error('Checkout error:', error);
        alert('There was an error processing your order. Please try again.');
        
        // Reset button state
        const submitBtn = document.getElementById('placeOrderBtn');
        submitBtn.innerHTML = 'Place order <i class="fa-solid fa-lock"></i>';
        submitBtn.disabled = false;
    }
}

// ============================================
// INIT CHECKOUT
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', processCheckout);
    }
    
    // Setup payment method field visibility
    setupPaymentMethodHandlers();
    
    // Auto-fill user data if available
    const userEmail = localStorage.getItem('userEmail');
    const userName = localStorage.getItem('userName');
    
    if (userEmail) {
        const emailField = document.getElementById('checkoutEmail');
        if (emailField) emailField.value = userEmail;
    }
    
    if (userName) {
        const nameField = document.getElementById('firstNameCheckout');
        if (nameField) nameField.value = userName;
    }
});
