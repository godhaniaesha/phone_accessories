document.addEventListener('DOMContentLoaded', () => {
    let allProducts = [];
    let products = [];
    let categories = [];
    const itemsPerPage = 6;
    let currentPage = 1;
    let currentFilter = { category: null, brand: null, search: null };
    let currentSort = 'featured';
    let userWishlistIds = [];
    let userCartItemIds = [];

    const productGrid = document.getElementById('product-grid');
    const paginationContainer = document.querySelector('.s_page_numbers');
    const prevBtn = document.querySelector('.s_shop_pagination .s_rec_prev');
    const nextBtn = document.querySelector('.s_shop_pagination .s_rec_next');
    const sortBySelect = document.getElementById('sortBy');

    // Keep it in sync with cart.js getUserId logic
    function getCurrentUserId() {
        return localStorage.getItem('userId') || 'guest';
    }

    async function fetchData() {
        try {
            // Fetch wishlist first if logged in
            const userId = localStorage.getItem('userId');
            if (userId) {
                const wishRes = await fetch(`http://localhost:3000/wishlists?userId=${userId}`);
                const wishlists = await wishRes.json();
                if (wishlists.length > 0) {
                    userWishlistIds = wishlists[0].productIds.map(String);
                }
            }

            // ✅ Fetch existing cart items for the current user (logged-in or guest)
            try {
                const cartUserId = getCurrentUserId();
                const cartRes = await fetch(`http://localhost:3000/carts?userId=${cartUserId}`);
                if (cartRes.ok) {
                    const carts = await cartRes.json();
                    if (Array.isArray(carts) && carts.length > 0 && Array.isArray(carts[0].items)) {
                        userCartItemIds = carts[0].items.map(item => String(item.id));
                    } else {
                        userCartItemIds = [];
                    }
                }
            } catch (cartErr) {
                console.error('Error fetching cart:', cartErr);
                userCartItemIds = [];
            }

            const [prodRes, catRes] = await Promise.all([
                fetch('http://localhost:3000/products'),
                fetch('http://localhost:3000/categories')
            ]);
            allProducts = await prodRes.json();
            categories = await catRes.json();

            allProducts = allProducts.map(p => {
                const cat = categories.find(c => String(c.id) === String(p.cat_id));
                return { ...p, CategoryName: cat ? cat.name : 'Uncategorized' };
            });

            applyFiltersAndSort();
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    // ✅ NEW: Fetch and render recommendations
    async function fetchRecommendations() {
        try {
            const res = await fetch('http://localhost:3000/products');
            const allProds = await res.json();

            // Pick top 8 by rating (or just first 8 if no rating)
            const recommended = [...allProds]
                .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
                .slice(0, 8);

            const carousel = document.getElementById('recommendationsCarousel');
            if (!carousel) return;

            carousel.innerHTML = recommended.map(p => {
                const isWishlisted = userWishlistIds.includes(String(p.id));
                const inCart = userCartItemIds.includes(String(p.id));
                return `
                <div class="item">
                    <div class="s_shop_product_card s_small_card">
                        <span class="s_product_tag">${p.CategoryName || 'Product'}</span>
                        <div class="s_product_img_wrapper">
                          <a href="productDetails.html?id=${p.id}">
                            <img src="${p.image || './Image/placeholder.png'}" alt="${p.ProductTitle}">
                            </a>
                        </div>
                        <div class="s_product_details">
                            <h6 class="s_product_title" title="${p.ProductTitle}">${truncateText(p.ProductTitle, 25)}</h6>
                            <div class="s_product_rating"><i class="fas fa-star"></i> ${p.rating}</div>
                            <div class="s_product_price">$${parseFloat(p.currentPrice).toFixed(2)}</div>
                            <div class="s_product_actions">
                                <button class="s_btn_add_cart"
                                    data-id="${p.id}"
                                    data-name="${p.ProductTitle}"
                                    data-price="${p.currentPrice}"
                                    data-image="${p.image || ''}"
                                    ${inCart ? 'disabled' : ''}>
                                    ${inCart ? 'In Cart' : 'Add to Cart'}
                                </button>
                                <button class="s_btn_wishlist ${isWishlisted ? 'active' : ''}" 
                                    data-id="${p.id}"
                                    title="Add to Wishlist">
                                    <i class="${isWishlisted ? 'fas' : 'far'} fa-heart"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `}).join('');

            // Initialize Owl Carousel after content is injected
            if (typeof $ !== 'undefined' && $.fn.owlCarousel) {
                $('#recommendationsCarousel').owlCarousel({
                    loop: true,
                    margin: 20,
                    nav: false,
                    dots: true,
                    responsive: {
                        0: { items: 1 },
                        600: { items: 3 },
                        1000: { items: 4 }
                    }
                });
            }
        } catch (err) {
            console.error('Error fetching recommendations:', err);
        }
    }

    function truncateText(text, limit = 12) {
        if (!text) return "";
        return text.length > limit ? text.slice(0, limit) + "..." : text;
    }

    function applyFiltersAndSort() {
        let filtered = [...allProducts];

        if (currentFilter.category) {
            filtered = filtered.filter(p => p.CategoryName === currentFilter.category);
        }
        if (currentFilter.brand) {
            filtered = filtered.filter(p => {
                if (p.brand && p.brand.toLowerCase() === currentFilter.brand.toLowerCase()) return true;
                return p.ProductTitle.toLowerCase().includes(currentFilter.brand.toLowerCase());
            });
        }
        if (currentFilter.search) {
            const query = currentFilter.search.toLowerCase();
            filtered = filtered.filter(p =>
                p.ProductTitle.toLowerCase().includes(query) ||
                (p.description && p.description.toLowerCase().includes(query)) ||
                (p.CategoryName && p.CategoryName.toLowerCase().includes(query))
            );
        }

        const clearBtn = document.getElementById('clearFilters');
        const clearBtnMobile = document.getElementById('clearFiltersMobile');
        const showClear = !!(currentFilter.category || currentFilter.brand || currentFilter.search);
        if (clearBtn) clearBtn.style.display = showClear ? 'block' : 'none';
        if (clearBtnMobile) clearBtnMobile.style.display = showClear ? 'block' : 'none';

        switch (currentSort) {
            case 'price-low': filtered.sort((a, b) => a.currentPrice - b.currentPrice); break;
            case 'price-high': filtered.sort((a, b) => b.currentPrice - a.currentPrice); break;
            case 'rating': filtered.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating)); break;
            case 'name-az': filtered.sort((a, b) => a.ProductTitle.localeCompare(b.ProductTitle)); break;
            case 'name-za': filtered.sort((a, b) => b.ProductTitle.localeCompare(a.ProductTitle)); break;
            default: filtered.sort((a, b) => parseInt(a.id) - parseInt(b.id)); break;
        }

        products = filtered;
        currentPage = 1;
        renderProducts(currentPage);
        renderPagination();
    }

    function renderProducts(page) {
        if (!productGrid) return;

        if (products.length === 0) {
            productGrid.innerHTML = '<div class="col-12 text-center py-5">No products found matching your criteria.</div>';
            return;
        }

        const start = (page - 1) * itemsPerPage;
        const pageProducts = products.slice(start, start + itemsPerPage);

        // ✅ Build HTML once, assign once (avoids DOM re-parse on each +=)
        productGrid.innerHTML = pageProducts.map(product => {
            const isWishlisted = userWishlistIds.includes(String(product.id));
            const inCart = userCartItemIds.includes(String(product.id));
            return `
            <div class="col-sm-6 col-xl-4">
                <div class="s_shop_product_card" data-id="${product.id}">
                    <span class="s_product_tag">${product.CategoryName}</span>
                    <div class="s_product_img_wrapper">
                        <a href="productDetails.html?id=${product.id}">
                            <img src="${product.image || './Image/placeholder.png'}" alt="${product.ProductTitle}">
                        </a>
                    </div>
                    <div class="s_product_details">
                        <h6 class="s_product_title" title="${product.ProductTitle}">${truncateText(product.ProductTitle, 25)}</h6>
                        <div class="s_product_rating">
                            <i class="fas fa-star"></i> ${product.rating} (${product.RatingCount} Reviews)
                        </div>
                        <div class="s_product_price">$${parseFloat(product.currentPrice).toFixed(2)}</div>
                        <div class="s_product_actions">
                            <button class="s_btn_add_cart"
                                data-id="${product.id}"
                                data-name="${product.ProductTitle}"
                                data-price="${product.currentPrice}"
                                data-image="${product.image || ''}"
                                ${inCart ? 'disabled' : ''}>
                                ${inCart ? 'In Cart' : 'Add to Cart'}
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
        `}).join('');
    }

    // ✅ FIXED: Pagination - extracted goToPage() to avoid duplication and bugs
    function goToPage(page) {
        currentPage = page;
        renderProducts(currentPage);
        renderPagination();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    document.addEventListener("click", function (e) {

        const card = e.target.closest(".s_shop_product_card");

        if (card
            && !e.target.closest(".s_btn_add_cart")
            && !e.target.closest(".s_btn_wishlist")
            && !e.target.closest("a")) {
            const productId = card.dataset.id;
            window.location.href = `productDetails.html?id=${productId}`;
        }

    });


    // Function to render pagination controls
    function renderPagination() {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';

        const totalPages = Math.ceil(products.length / itemsPerPage);

        // Always query fresh references - never use stale cached ones
        const prevButton = document.querySelector('.s_shop_pagination .s_rec_prev');
        const nextButton = document.querySelector('.s_shop_pagination .s_rec_next');

        if (totalPages <= 1) {
            if (prevButton) prevButton.style.visibility = 'hidden';
            if (nextButton) nextButton.style.visibility = 'hidden';
            return;
        }

        // Render page numbers
        for (let i = 1; i <= totalPages; i++) {
            const pageLink = document.createElement('a');
            pageLink.href = '#';
            pageLink.className = `s_page_number${i === currentPage ? ' active' : ''}`;
            pageLink.textContent = i;
            pageLink.addEventListener('click', (e) => {
                e.preventDefault();
                goToPage(i);
            });
            paginationContainer.appendChild(pageLink);
        }

        // ✅ FIX: Update visibility based on current page
        if (prevButton) {
            // Hide on first page, show on all others
            prevButton.style.visibility = currentPage === 1 ? 'hidden' : 'visible';

            // Remove old listener by cloning
            const newPrev = prevButton.cloneNode(true);
            prevButton.parentNode.replaceChild(newPrev, prevButton);
            newPrev.addEventListener('click', (e) => {
                e.preventDefault();
                if (currentPage > 1) goToPage(currentPage - 1);
            });
        }

        if (nextButton) {
            // Hide on last page, show on all others
            nextButton.style.visibility = currentPage === totalPages ? 'hidden' : 'visible';

            // Remove old listener by cloning
            const newNext = nextButton.cloneNode(true);
            nextButton.parentNode.replaceChild(newNext, nextButton);
            newNext.addEventListener('click', (e) => {
                e.preventDefault();
                if (currentPage < totalPages) goToPage(currentPage + 1);
            });
        }
    }

    // Add to Cart & Wishlist (delegated)
    document.addEventListener("click", async function (e) {
        // Add to Cart
        if (e.target.classList.contains("s_btn_add_cart")) {
            const btn = e.target;
            if (window.addToCart) {
                const success = await window.addToCart(btn.dataset.id, btn.dataset.name, parseFloat(btn.dataset.price), btn.dataset.image);
                if (success) {
                    // ✅ Update button + local cart cache so it shows "In Cart" and is disabled
                    btn.textContent = 'In Cart';
                    btn.disabled = true;
                    const idStr = String(btn.dataset.id);
                    if (!userCartItemIds.includes(idStr)) {
                        userCartItemIds.push(idStr);
                    }
                }
            }
        }

        // Add to Wishlist
        const wishlistBtn = e.target.closest(".s_btn_wishlist");
        if (wishlistBtn) {
            const productId = wishlistBtn.dataset.id;
            if (window.addToWishlist) {
                const success = await window.addToWishlist(productId);
                if (success) {
                    wishlistBtn.classList.add("active");
                    const icon = wishlistBtn.querySelector("i");
                    if (icon) {
                        icon.classList.remove("far");
                        icon.classList.add("fas");
                    }
                    // Add to local list too
                    if (!userWishlistIds.includes(String(productId))) {
                        userWishlistIds.push(String(productId));
                    }
                }
            }
        }
    });

    // Category filter
    document.querySelectorAll('.s_category_list a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = link.textContent.trim();
            document.querySelectorAll('.s_category_list a').forEach(l => l.classList.remove('active'));
            currentFilter.category = currentFilter.category === category ? null : category;
            if (currentFilter.category) link.classList.add('active');
            applyFiltersAndSort();
        });
    });

    // Brand filter
    document.querySelectorAll('.s_brand_list a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const brand = link.firstChild.textContent.trim();
            document.querySelectorAll('.s_brand_list a').forEach(l => l.classList.remove('active'));
            currentFilter.brand = currentFilter.brand === brand ? null : brand;
            if (currentFilter.brand) link.classList.add('active');
            applyFiltersAndSort();
        });
    });

    // Sort
    if (sortBySelect) {
        sortBySelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            applyFiltersAndSort();
        });
    }

    // Clear filters
    const handleClear = (e) => {
        e.preventDefault();
        currentFilter = { category: null, brand: null, search: null };
        document.querySelectorAll('.s_category_list a, .s_brand_list a').forEach(l => l.classList.remove('active'));
        // Clear search input if visible
        const headerSearchInput = document.getElementById('headerSearchInput');
        if (headerSearchInput) headerSearchInput.value = '';

        // Remove search param from URL without refreshing
        const url = new URL(window.location);
        url.searchParams.delete('search');
        window.history.pushState({}, '', url);

        applyFiltersAndSort();
    };
    document.getElementById('clearFilters')?.addEventListener('click', handleClear);
    document.getElementById('clearFiltersMobile')?.addEventListener('click', handleClear);

    // ✅ Custom Sort Dropdown (moved INSIDE the single DOMContentLoaded)
    const originalSelect = document.getElementById("sortBy");
    if (originalSelect && !document.querySelector(".s_custom_select_wrapper")) {
        const newWrapper = document.createElement("div");
        newWrapper.classList.add("s_custom_select_wrapper");

        const selected = document.createElement("div");
        selected.classList.add("s_custom_select_selected");
        selected.innerHTML = `<span>${originalSelect.options[originalSelect.selectedIndex].text}</span>`;

        const optionsList = document.createElement("div");
        optionsList.classList.add("s_custom_select_options");

        Array.from(originalSelect.options).forEach((opt, index) => {
            const item = document.createElement("div");
            item.classList.add("s_custom_select_option");
            if (index === originalSelect.selectedIndex) item.classList.add("selected");
            item.textContent = opt.text;
            item.dataset.value = opt.value;
            item.addEventListener("click", function () {
                selected.querySelector("span").textContent = this.textContent;
                optionsList.querySelectorAll(".s_custom_select_option").forEach(el => el.classList.remove("selected"));
                this.classList.add("selected");
                originalSelect.value = this.dataset.value;
                originalSelect.dispatchEvent(new Event("change"));
                newWrapper.classList.remove("open");
            });
            optionsList.appendChild(item);
        });

        selected.addEventListener("click", (e) => { e.stopPropagation(); newWrapper.classList.toggle("open"); });
        document.addEventListener("click", () => newWrapper.classList.remove("open"));

        newWrapper.appendChild(selected);
        newWrapper.appendChild(optionsList);
        originalSelect.insertAdjacentElement("afterend", newWrapper);
    }

    // Init
    async function init() {
        // Check for URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const searchParam = urlParams.get('search');
        const categoryParam = urlParams.get('category');

        if (searchParam) {
            currentFilter.search = searchParam;
            const headerSearchInput = document.getElementById('headerSearchInput');
            if (headerSearchInput) headerSearchInput.value = searchParam;
        }

        if (categoryParam) {
            // Note: we'll match by slug if possible, but the UI might need to update
            currentFilter.category = categoryParam;
        }

        await fetchData();
        await fetchRecommendations();
    }
    init();
});

console.log("Category script loaded ✅");

fetch("http://localhost:3000/categories")
    .then(response => response.json())
    .then(categories => {

        const categoryList = document.getElementById("categoryList");
        categoryList.innerHTML = "";

        categories.forEach(cat => {
            const li = document.createElement("li");

            li.innerHTML = `
        <a href="shop.html?category=${cat.slug}">
          <i class="fas ${cat.icon}" style="margin-right:8px;"></i>
          ${cat.name}
        </a>
      `;

            categoryList.appendChild(li);
        });

  })
  .catch(error => {
    console.error("Error loading categories:", error);
  });
