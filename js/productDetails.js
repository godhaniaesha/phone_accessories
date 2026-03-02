// Product Details Page Interactive Scripts

// Function to get product ID from URL
function getProductId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || '1'; // Default to 1 if no ID found
}

// Fetch and load product details
async function loadProductDetails() {
    const productId = getProductId();
    try {
        const response = await fetch(`http://localhost:3000/products/${productId}`);
        if (!response.ok) throw new Error('Product not found');
        const product = await response.json();

        // Update UI with product data
        if (product.ProductTitle) {
            document.title = `${product.ProductTitle} - Accessories Ecommerce`;
            const titleEl = document.querySelector('.pd-title');
            if (titleEl) titleEl.textContent = product.ProductTitle;
        }

        const mainImg = document.getElementById('mainImage');
        if (mainImg) mainImg.src = product.image;

        const newPriceEl = document.querySelector('.pd-new-price');
        if (newPriceEl) newPriceEl.textContent = `$${parseFloat(product.currentPrice).toFixed(2)}`;

        const oldPriceEl = document.querySelector('.pd-old-price');
        if (oldPriceEl) {
            const oldPrice = parseFloat(product.OldPrice || product.currentPrice);
            oldPriceEl.textContent = `$${oldPrice.toFixed(2)}`;
        }

        const descEl = document.querySelector('.pd-description');
        if (descEl) descEl.innerHTML = `<p>${product.Description}</p>`;

        const reviewsEl = document.querySelector('.pd-rating span.text-muted');
        if (reviewsEl) reviewsEl.textContent = `${product.RatingCount} reviews`;

        const ratingEl = document.querySelector('.pd-rating-number');
        if (ratingEl) ratingEl.textContent = product.rating;

        // Update breadcrumb
        const breadcrumbLinks = document.querySelectorAll('.pd-breadcrumb-nav a');
        if (breadcrumbLinks.length >= 3 && product.shortTitle) {
            breadcrumbLinks[2].textContent = product.shortTitle;
        }

        // Update wishlist button state
        const wishBtn = document.querySelector('.pd-btn-wishlist');
        if (wishBtn) {
            wishBtn.setAttribute('data-id', product.id);
            wishBtn.setAttribute('onclick', `addToWishlist('${product.id}')`);
            if (window.isInWishlist) {
                const wishlisted = await window.isInWishlist(product.id);
                if (wishlisted) {
                    wishBtn.classList.add('active');
                    const icon = wishBtn.querySelector('i');
                    if (icon) {
                        icon.classList.remove('far');
                        icon.classList.add('fas');
                    }
                }
            }
        }

        // Load thumbnails
        const thumbContainer = document.querySelector('.pd-thumbnails');
        if (thumbContainer) {
            thumbContainer.innerHTML = '';
            if (product.thumbImage && product.thumbImage.length > 0) {
                product.thumbImage.forEach((img, index) => {
                    const thumb = document.createElement('div');
                    thumb.className = `pd-thumb ${index === 0 ? 'active' : ''}`;
                    thumb.onclick = function () { changeImage(img, this); };
                    thumb.innerHTML = `<img src="${img}" alt="Thumb ${index + 1}">`;
                    thumbContainer.appendChild(thumb);
                });
            }
        }

        // Load Related Products
        fetchRelatedProducts(product.cat_id, product.id);

        // Add to Cart Button Listener
        const addToCartBtn = document.querySelector('.pd-btn-add-cart');
        if (addToCartBtn) {
            addToCartBtn.onclick = async () => {
                const qtyInput = document.getElementById('qtyInput');
                const qty = qtyInput ? parseInt(qtyInput.value) : 1;
                if (window.addToCart) {
                    const success = await window.addToCart(product.id, product.ProductTitle, product.currentPrice, product.image, qty);
                    if (success) {
                        addToCartBtn.textContent = 'Added to Cart!';
                        setTimeout(() => {
                            addToCartBtn.textContent = 'Add to Cart';
                        }, 2000);
                    }
                }
            };
        }

    } catch (error) {
        console.error('Error loading product:', error);
    }
}

async function fetchRelatedProducts(categoryId, currentProductId) {
    try {
        let wishlistIds = [];
        const userId = localStorage.getItem('userId');
        if (userId) {
            const wishRes = await fetch(`http://localhost:3000/wishlists?userId=${userId}`);
            const wishlists = await wishRes.json();
            if (wishlists.length > 0) {
                wishlistIds = wishlists[0].productIds.map(String);
            }
        }

        let inCartIds = [];
        if (typeof window.getCartProductIds === 'function') {
            try { inCartIds = await window.getCartProductIds(); } catch (_) {}
        }

        const response = await fetch(`http://localhost:3000/products?cat_id=${categoryId}`);
        let relatedProducts = await response.json();
        relatedProducts = relatedProducts.filter(p => String(p.id) !== String(currentProductId));
        if (relatedProducts.length > 8) relatedProducts = relatedProducts.slice(0, 8);

        if (!relatedProducts || relatedProducts.length < 8) {
            const allRes = await fetch(`http://localhost:3000/products`);
            const allProds = await allRes.json();
            const selectedIds = new Set((relatedProducts || []).map(p => String(p.id)));
            const pool = allProds.filter(p => String(p.id) !== String(currentProductId) && !selectedIds.has(String(p.id)));
            const need = 8 - (relatedProducts ? relatedProducts.length : 0);
            const storageKey = `rel_fill_${currentProductId}`;
            let fillerIds = [];
            try {
                const saved = sessionStorage.getItem(storageKey);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    // keep only still-valid ids from pool
                    const poolIds = new Set(pool.map(p => String(p.id)));
                    fillerIds = parsed.filter(id => poolIds.has(String(id))).slice(0, need);
                }
            } catch (_) {}
            if (fillerIds.length < need) {
                // pick remaining randomly and persist the full chosen id list for stability
                const poolCopy = pool.slice();
                for (let i = poolCopy.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    const tmp = poolCopy[i]; poolCopy[i] = poolCopy[j]; poolCopy[j] = tmp;
                }
                const extra = poolCopy
                    .map(p => String(p.id))
                    .filter(id => !fillerIds.includes(id))
                    .slice(0, need - fillerIds.length);
                fillerIds = fillerIds.concat(extra);
                try { sessionStorage.setItem(storageKey, JSON.stringify(fillerIds)); } catch (_) {}
            }
            const fillerMap = new Map(pool.map(p => [String(p.id), p]));
            const filler = fillerIds.map(id => fillerMap.get(String(id))).filter(Boolean);
            relatedProducts = (relatedProducts || []).concat(filler).slice(0, 8);
        }

        const carousel = $('#recommendationsCarousel');

        let itemsHTML = '';

        relatedProducts.forEach(product => {
            const isWishlisted = wishlistIds.includes(String(product.id));
            const inCart = inCartIds.includes(String(product.id));
            itemsHTML += `
                <div class="item">
                    <div class="s_shop_product_card s_small_card">
                        <div class="s_product_img_wrapper">
                            <a href="productDetails.html?id=${product.id}">
                                <img src="${product.image}" alt="${product.ProductTitle}">
                            </a>
                        </div>
                        <div class="s_product_details">
                            <h6 class="s_product_title">
                                <a style="text-decoration: none; color: inherit;">
                                    ${product.shortTitle || product.ProductTitle}
                                </a>
                            </h6>
                            <div class="s_product_rating"><i class="fas fa-star"></i> ${product.rating}</div>
                            <div class="s_product_price">$${parseFloat(product.currentPrice).toFixed(2)}</div>
                            <div class="s_product_actions">
                                <button class="s_btn_add_cart"
                                    data-id="${product.id}"
                                    data-name="${(product.ProductTitle || '').replace(/"/g, '&quot;')}"
                                    data-price="${product.currentPrice}"
                                    data-image="${product.image || ''}" ${inCart ? 'disabled' : ''}>
                                    ${inCart ? 'Already in Cart' : 'Add to Cart'}
                                </button>
                                <button class="s_btn_wishlist ${isWishlisted ? 'active' : ''}" 
                                    data-id="${product.id}"
                                    title="Add to Wishlist">
                                    <i class="${isWishlisted ? 'fas' : 'far'} fa-heart"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        if (carousel.data('owl.carousel')) {
            carousel.trigger('replace.owl.carousel', itemsHTML).trigger('refresh.owl.carousel');
        } else {
            carousel.html(itemsHTML);
            initCarousel();
        }

    } catch (error) {
        console.error('Error fetching related products:', error);
    }
}

function initCarousel() {
    $('#recommendationsCarousel').owlCarousel({
        loop: false, // Set to false if items < screen
        margin: 20,
        nav: false,
        dots: true,
        autoplay: true,
        autoplayTimeout: 3000,
        autoplayHoverPause: true,
        responsive: {
            0: { items: 1 },
            576: { items: 2 },
            768: { items: 4 },
            992: { items: 5 }
        }
    });
}

// Quantity Selector
function updateQty(change) {
    let qtyInput = document.getElementById('qtyInput');
    let currentQty = parseInt(qtyInput.value);

    if (isNaN(currentQty)) {
        currentQty = 1;
    }

    let newQty = currentQty + change;

    if (newQty < 1) {
        newQty = 1;
    }

    qtyInput.value = newQty;
}

// Image Gallery
function changeImage(src, element) {
    // Change main image source
    document.getElementById('mainImage').src = src;

    // Update active thumbnail
    let thumbnails = document.querySelectorAll('.pd-thumb');
    thumbnails.forEach(thumb => thumb.classList.remove('active'));

    element.classList.add('active');
}

// Color Selector Actions
function selectColor(element) {
    // Remove active class from all swatches
    let swatches = document.querySelectorAll('.pd-color-swatch');
    swatches.forEach(swatch => swatch.classList.remove('active'));

    // Add active class to clicked swatch
    element.classList.add('active');
}

// Initialize on Load
$(document).ready(function () {
    loadProductDetails();
});

// Toggle Review Form
function toggleReviewForm() {
    const form = document.getElementById('reviewForm');
    if (form.style.display === 'none') {
        form.style.display = 'block';
        form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        form.style.display = 'none';
    }
}
