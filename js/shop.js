document.addEventListener('DOMContentLoaded', () => {
    let allProducts = [];
    let products = [];
    let categories = [];
    const itemsPerPage = 8;
    let currentPage = 1;
    let currentFilter = { category: null, brand: null, search: null };
    let currentSort = 'featured';
    let userWishlistIds = [];
    let userCartItemIds = [];

    const normalize = (v) => String(v || '').trim().toLowerCase();

    const productGrid = document.getElementById('product-grid');
    const paginationContainer = document.querySelector('.s_page_numbers');
    const sortBySelect = document.getElementById('sortBy');

    function getCurrentUserId() {
        return localStorage.getItem('userId') || 'guest';
    }

    function renderCategoryFilters() {
        const lists = document.querySelectorAll('.s_category_list');
        if (!lists.length || !Array.isArray(categories)) return;

        const html = categories.map(cat => `
            <li>
                <a href="shop.html?category=${encodeURIComponent(cat.slug || cat.name)}"
                   data-category-name="${cat.name}"
                   data-category-slug="${cat.slug || ''}">
                    <i class="fas ${cat.icon || 'fa-tags'}" style="margin-right:8px;"></i>
                    ${cat.name}
                </a>
            </li>
        `).join('');

        lists.forEach(list => {
            list.innerHTML = html;
        });

        updateActiveCategoryLink();
    }

    function updateActiveCategoryLink() {
        const selected = normalize(currentFilter.category);
        document.querySelectorAll('.s_category_list a').forEach(link => {
            const linkName = normalize(link.dataset.categoryName || link.textContent);
            const linkSlug = normalize(link.dataset.categorySlug);
            const isActive = !!selected && (selected === linkName || selected === linkSlug);
            link.classList.toggle('active', isActive);
        });
    }

    async function fetchData() {
        try {
            const userId = localStorage.getItem('userId');
            if (userId) {
                const wishRes = await fetch(`http://localhost:3000/wishlists?userId=${userId}`);
                const wishlists = await wishRes.json();
                if (wishlists.length > 0) {
                    userWishlistIds = wishlists[0].productIds.map(String);
                }
            }

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

            renderCategoryFilters();
            applyFiltersAndSort();
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    async function fetchRecommendations() {
        try {
            const res = await fetch('http://localhost:3000/products');
            const allProds = await res.json();

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
            `;
            }).join('');

            if (typeof $ !== 'undefined' && $.fn.owlCarousel) {
                $('#recommendationsCarousel').owlCarousel({
                    loop: true,
                    margin: 20,
                    nav: false,
                    dots: true,
                    responsive: {
                        0: { items: 1 },
                        376: { items: 2 },
                        600: { items: 3 },
                        769: { items: 4 },
                        1200: { items: 5 }
                    }
                });
            }
        } catch (err) {
            console.error('Error fetching recommendations:', err);
        }
    }

    function truncateText(text, limit = 12) {
        if (!text) return '';
        return text.length > limit ? text.slice(0, limit) + '...' : text;
    }

    function applyFiltersAndSort() {
        let filtered = [...allProducts];

        if (currentFilter.category) {
            const selected = normalize(currentFilter.category);
            filtered = filtered.filter(p => {
                const cat = categories.find(c => String(c.id) === String(p.cat_id));
                if (!cat) return false;
                return normalize(cat.name) === selected || normalize(cat.slug) === selected;
            });
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
            default: filtered.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10)); break;
        }

        products = filtered;
        currentPage = 1;
        renderProducts(currentPage);
        renderPagination();
        updateActiveCategoryLink();
    }

    function renderProducts(page) {
        if (!productGrid) return;

        if (products.length === 0) {
            productGrid.innerHTML = '<div class="col-12 text-center py-5">No products found matching your criteria.</div>';
            return;
        }

        const start = (page - 1) * itemsPerPage;
        const pageProducts = products.slice(start, start + itemsPerPage);

        productGrid.innerHTML = pageProducts.map(product => {
            const isWishlisted = userWishlistIds.includes(String(product.id));
            const inCart = userCartItemIds.includes(String(product.id));
            return `
            <div class="col-sm-6 col-md-4 col-lg-6 col-xl-3 px-1">
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
        `;
        }).join('');
    }

    function goToPage(page) {
        currentPage = page;
        renderProducts(currentPage);
        renderPagination();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // document.addEventListener('click', function (e) {
    //     const card = e.target.closest('.s_shop_product_card');

    //     if (card
    //         && !e.target.closest('.s_btn_add_cart')
    //         && !e.target.closest('.s_btn_wishlist')
    //         && !e.target.closest('a')) {
    //         const productId = card.dataset.id;
    //         window.location.href = `productDetails.html?id=${productId}`;
    //     }
    // });

    function renderPagination() {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';

        const totalPages = Math.ceil(products.length / itemsPerPage);

        const prevButton = document.querySelector('.s_shop_pagination .s_rec_prev');
        const nextButton = document.querySelector('.s_shop_pagination .s_rec_next');

        if (totalPages <= 1) {
            if (prevButton) prevButton.style.visibility = 'hidden';
            if (nextButton) nextButton.style.visibility = 'hidden';
            return;
        }

        const pagesToShow = [];
        if (totalPages <= 6) {
            for (let i = 1; i <= totalPages; i++) pagesToShow.push(i);
        } else {
            const first = 1;
            const second = 2;
            const penultimate = totalPages - 1;
            const last = totalPages;

            // Determine sliding window around current page
            const windowStart = Math.max(3, currentPage - 1);
            const windowEnd = Math.min(totalPages - 2, currentPage + 1);

            pagesToShow.push(first, second);

            if (windowStart > 3) {
                pagesToShow.push('dots');
            } else {
                // include any pages between 2 and windowStart when close to beginning
                for (let i = 3; i < windowStart; i++) pagesToShow.push(i);
            }

            for (let i = windowStart; i <= windowEnd; i++) {
                pagesToShow.push(i);
            }

            if (windowEnd < totalPages - 2) {
                pagesToShow.push('dots');
            } else {
                // include any pages between windowEnd and penultimate when close to end
                for (let i = windowEnd + 1; i < penultimate; i++) pagesToShow.push(i);
            }

            pagesToShow.push(penultimate, last);
        }

        pagesToShow.forEach((item) => {
            if (item === 'dots') {
                const dots = document.createElement('span');
                dots.className = 's_dots';
                dots.textContent = '...';
                paginationContainer.appendChild(dots);
                return;
            }

            const pageLink = document.createElement('a');
            pageLink.href = '#';
            pageLink.className = `s_page_number${item === currentPage ? ' active' : ''}`;
            pageLink.textContent = item;
            pageLink.addEventListener('click', (evt) => {
                evt.preventDefault();
                goToPage(item);
            });
            paginationContainer.appendChild(pageLink);
        });

        if (prevButton) {
            prevButton.style.visibility = currentPage === 1 ? 'hidden' : 'visible';

            const newPrev = prevButton.cloneNode(true);
            prevButton.parentNode.replaceChild(newPrev, prevButton);
            newPrev.addEventListener('click', (evt) => {
                evt.preventDefault();
                if (currentPage > 1) goToPage(currentPage - 1);
            });
        }

        if (nextButton) {
            nextButton.style.visibility = currentPage === totalPages ? 'hidden' : 'visible';

            const newNext = nextButton.cloneNode(true);
            nextButton.parentNode.replaceChild(newNext, nextButton);
            newNext.addEventListener('click', (evt) => {
                evt.preventDefault();
                if (currentPage < totalPages) goToPage(currentPage + 1);
            });
        }
    }

    document.addEventListener('click', async function (e) {
        if (e.target.classList.contains('s_btn_add_cart')) {
            const btn = e.target;
            if (window.addToCart) {
                const success = await window.addToCart(btn.dataset.id, btn.dataset.name, parseFloat(btn.dataset.price), btn.dataset.image);
                if (success) {
                    btn.textContent = 'In Cart';
                    btn.disabled = true;
                    const idStr = String(btn.dataset.id);
                    if (!userCartItemIds.includes(idStr)) {
                        userCartItemIds.push(idStr);
                    }
                }
            }
        }

        const wishlistBtn = e.target.closest('.s_btn_wishlist');
        if (wishlistBtn) {
            const productId = wishlistBtn.dataset.id;
            if (window.addToWishlist) {
                const success = await window.addToWishlist(productId);
                if (success) {
                    wishlistBtn.classList.add('active');
                    const icon = wishlistBtn.querySelector('i');
                    if (icon) {
                        icon.classList.remove('far');
                        icon.classList.add('fas');
                    }
                    if (!userWishlistIds.includes(String(productId))) {
                        userWishlistIds.push(String(productId));
                    }
                }
            }
        }
    });

    document.addEventListener('click', (e) => {
        const link = e.target.closest('.s_category_list a');
        if (!link) return;
        e.preventDefault();

        const selectedCategory = (link.dataset.categorySlug || link.dataset.categoryName || link.textContent || '').trim();
        currentFilter.category = normalize(currentFilter.category) === normalize(selectedCategory)
            ? null
            : selectedCategory;

        applyFiltersAndSort();
    });

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

    if (sortBySelect) {
        sortBySelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            applyFiltersAndSort();
        });
    }

    const handleClear = (e) => {
        e.preventDefault();
        currentFilter = { category: null, brand: null, search: null };
        document.querySelectorAll('.s_category_list a, .s_brand_list a').forEach(l => l.classList.remove('active'));

        const headerSearchInput = document.getElementById('headerSearchInput');
        if (headerSearchInput) headerSearchInput.value = '';

        const url = new URL(window.location);
        url.searchParams.delete('search');
        url.searchParams.delete('category');
        window.history.pushState({}, '', url);

        applyFiltersAndSort();
    };

    document.getElementById('clearFilters')?.addEventListener('click', handleClear);
    document.getElementById('clearFiltersMobile')?.addEventListener('click', handleClear);

    const originalSelect = document.getElementById('sortBy');
    if (originalSelect && !document.querySelector('.s_custom_select_wrapper')) {
        const newWrapper = document.createElement('div');
        newWrapper.classList.add('s_custom_select_wrapper');

        const selected = document.createElement('div');
        selected.classList.add('s_custom_select_selected');
        selected.innerHTML = `<span>${originalSelect.options[originalSelect.selectedIndex].text}</span>`;

        const optionsList = document.createElement('div');
        optionsList.classList.add('s_custom_select_options');

        Array.from(originalSelect.options).forEach((opt, index) => {
            const item = document.createElement('div');
            item.classList.add('s_custom_select_option');
            if (index === originalSelect.selectedIndex) item.classList.add('selected');
            item.textContent = opt.text;
            item.dataset.value = opt.value;
            item.addEventListener('click', function () {
                selected.querySelector('span').textContent = this.textContent;
                optionsList.querySelectorAll('.s_custom_select_option').forEach(el => el.classList.remove('selected'));
                this.classList.add('selected');
                originalSelect.value = this.dataset.value;
                originalSelect.dispatchEvent(new Event('change'));
                newWrapper.classList.remove('open');
            });
            optionsList.appendChild(item);
        });

        selected.addEventListener('click', (e) => {
            e.stopPropagation();
            newWrapper.classList.toggle('open');
        });
        document.addEventListener('click', () => newWrapper.classList.remove('open'));

        newWrapper.appendChild(selected);
        newWrapper.appendChild(optionsList);
        originalSelect.insertAdjacentElement('afterend', newWrapper);
    }

    async function init() {
        const urlParams = new URLSearchParams(window.location.search);
        const searchParam = urlParams.get('search');
        const categoryParam = urlParams.get('category');

        if (searchParam) {
            currentFilter.search = searchParam;
            const headerSearchInput = document.getElementById('headerSearchInput');
            if (headerSearchInput) headerSearchInput.value = searchParam;
        }

        if (categoryParam) {
            currentFilter.category = categoryParam;
        }

        await fetchData();
        await fetchRecommendations();
    }

    init();
});
