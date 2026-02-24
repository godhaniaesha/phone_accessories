// ===================================== header =====================================

const headerContainer = document.getElementById("header-container");

if (headerContainer) {
	fetch("Header.html")
		.then(response => response.text())
		.then(data => {
			headerContainer.innerHTML = data;
			setActiveLink();
			if (window.initHeader) {
				window.initHeader();
			}
			if (window.updateWishlistBadge) {
				window.updateWishlistBadge();
			}
		});
}

function setActiveLink() {
	const links = document.querySelectorAll(".x_nav_link");
	const currentPage = window.location.pathname.split("/").pop();

	links.forEach(link => {
		const linkPage = link.getAttribute("href");
		if (linkPage === currentPage) {
			link.classList.add("active");
		}
	});
}

// ===================================== footer =====================================

const footerContainer = document.getElementById("footer");

if (footerContainer) {
	fetch("footer.html")
		.then(response => response.text())
		.then(data => {
			footerContainer.innerHTML = data;

			// dynamically load footer.js after injecting footer markup
			const script = document.createElement('script');
			script.src = './js/footer.js';
			document.body.appendChild(script);
		});
}

// ===================================== home page hero section slider =====================================

// Slider Navigation (fully functional)
const slides = Array.from(document.querySelectorAll('.x_hero_slide'));
const sliderPrev = document.querySelector('.x_slider_prev');
const sliderNext = document.querySelector('.x_slider_next');
const variants = Array.from(document.querySelectorAll('.x_variant-btn'));
const currentCounter = document.querySelector('.x_current_slide');
const totalCounter = document.querySelector('.x_total_slides');
const heroContainer = document.querySelector('.x_hero_container');
let currentIndex = 0;
let sliderInterval = null;
const SLIDE_COUNT = slides.length || 1;

// initialize counters
if (totalCounter) totalCounter.textContent = String(SLIDE_COUNT).padStart(2, '0');

function showSlide(index) {
	if (!slides.length) return;
	currentIndex = (index + SLIDE_COUNT) % SLIDE_COUNT;
	slides.forEach((s, i) => s.classList.toggle('active', i === currentIndex));
	variants.forEach((v, i) => v.classList.toggle('active', i === currentIndex));
	if (currentCounter) currentCounter.textContent = String(currentIndex + 1).padStart(2, '0');
}

function nextSlide() { showSlide(currentIndex + 1); }
function prevSlide() { showSlide(currentIndex - 1); }

if (sliderNext) sliderNext.addEventListener('click', () => { nextSlide(); resetAutoplay(); });
if (sliderPrev) sliderPrev.addEventListener('click', () => { prevSlide(); resetAutoplay(); });

variants.forEach(v => {
	v.addEventListener('click', (e) => {
		const idx = parseInt(v.getAttribute('data-variant')) || 0;
		showSlide(idx);
		resetAutoplay();
	});
});

function startAutoplay() {
	stopAutoplay();
	sliderInterval = setInterval(() => { nextSlide(); }, 4000);
}

function stopAutoplay() {
	if (sliderInterval) { clearInterval(sliderInterval); sliderInterval = null; }
}

function resetAutoplay() { stopAutoplay(); startAutoplay(); }

// pause on hover
if (heroContainer) {
	heroContainer.addEventListener('mouseenter', stopAutoplay);
	heroContainer.addEventListener('mouseleave', startAutoplay);
}

// initialize
showSlide(0);
startAutoplay();

// ================= Best Sellers slider (mobile) =================
function initBestSellerSlider() {
	const row = document.getElementById('bestSellerGrid');
	if (!row) return;
	if (row.dataset.sliderReady === 'true') {
		row.dispatchEvent(new CustomEvent('x-bs-refresh'));
		return;
	}

	const prevBtn = document.querySelector('.x_bs_prev');
	const nextBtn = document.querySelector('.x_bs_next');
	const viewAll = document.querySelector('.x_bs_viewall');

	let index = 0;
	const getCols = () => Array.from(row.children);

	function isAtEnd() {
		const cols = getCols();
		if (!row || cols.length === 0) return false;
		const threshold = 2;
		return row.scrollLeft + row.clientWidth >= row.scrollWidth - threshold;
	}

	function updateView() {
		const cols = getCols();
		if (cols.length === 0) {
			if (nextBtn) nextBtn.disabled = true;
			if (prevBtn) prevBtn.disabled = true;
			if (viewAll) viewAll.classList.remove('visible');
			return;
		}
		index = Math.max(0, Math.min(index, cols.length - 1));
		const child = cols[index];
		if (child) child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
		const atLast = index >= cols.length - 1 || isAtEnd();
		if (viewAll) {
			if (atLast) viewAll.classList.add('visible');
			else viewAll.classList.remove('visible');
		}
		if (nextBtn) nextBtn.disabled = index >= cols.length - 1;
		if (prevBtn) prevBtn.disabled = index <= 0;
	}

	function syncFromScroll() {
		const cols = getCols();
		if (cols.length === 0) return;
		const atLast = index >= cols.length - 1 || isAtEnd();
		if (viewAll) {
			if (atLast) viewAll.classList.add('visible');
			else viewAll.classList.remove('visible');
		}
		if (nextBtn) nextBtn.disabled = index >= cols.length - 1;
		if (prevBtn) prevBtn.disabled = index <= 0;
	}

	function prev() { index = Math.max(0, index - 1); updateView(); }
	function next() {
		const cols = getCols();
		if (cols.length === 0) return;
		index = Math.min(cols.length - 1, index + 1);
		updateView();
	}

	if (prevBtn) prevBtn.addEventListener('click', prev);
	if (nextBtn) nextBtn.addEventListener('click', next);

	updateView(); // initial state: View All hidden, next enabled, prev disabled

	// update index on manual scroll and keep View All / next disabled in sync
	let scrollDebounce = null;
	row.addEventListener('scroll', () => {
		if (scrollDebounce) clearTimeout(scrollDebounce);
		scrollDebounce = setTimeout(() => {
			const center = row.scrollLeft + row.clientWidth / 2;
			let nearest = 0;
			let minDiff = Infinity;
			cols.forEach((c, i) => {
				const rect = c.getBoundingClientRect();
				const parentRect = row.getBoundingClientRect();
				const cx = (rect.left - parentRect.left) + rect.width / 2;
				const diff = Math.abs(cx - row.clientWidth / 2);
				if (diff < minDiff) { minDiff = diff; nearest = i; }
			});
			index = nearest;
			syncFromScroll();
		}, 120);
	});

	// initialize only for small screens
	function handleResize() {
		if (window.innerWidth <= 769) {
			if (prevBtn) prevBtn.style.display = '';
			if (nextBtn) nextBtn.style.display = '';
			const cols = getCols();
			const atLast = index >= cols.length - 1 || isAtEnd();
			if (viewAll) viewAll.classList.toggle('visible', atLast);
			if (nextBtn) nextBtn.disabled = index >= cols.length - 1;
			if (prevBtn) prevBtn.disabled = index <= 0;
		} else {
			if (prevBtn) prevBtn.style.display = 'none';
			if (nextBtn) nextBtn.style.display = 'none';
			if (viewAll) viewAll.style.display = 'none';
			if (nextBtn) nextBtn.disabled = false;
			if (prevBtn) prevBtn.disabled = false;
		}
	}

	handleResize();
	window.addEventListener('resize', handleResize);
	row.addEventListener('x-bs-refresh', () => {
		index = 0;
		row.scrollLeft = 0;
		handleResize();
		updateView();
	});
	row.dataset.sliderReady = 'true';
}

// ================= Best Sellers - Load from DB =================
async function loadBestSellers() {
	try {
		// Fetch all products
		const prodRes = await fetch('http://localhost:3000/products');
		const allProducts = await prodRes.json();

		// Fetch categories
		const catRes = await fetch('http://localhost:3000/categories');
		const categories = await catRes.json();

		// Fetch existing cart items for current user (match shop.js behavior)
		let inCartIds = [];
		try {
			const userId = localStorage.getItem('userId') || 'guest';
			const cartRes = await fetch(`http://localhost:3000/carts?userId=${userId}`);
			if (cartRes.ok) {
				const carts = await cartRes.json();
				if (Array.isArray(carts) && carts.length > 0 && Array.isArray(carts[0].items)) {
					inCartIds = carts[0].items.map(item => String(item.id));
				}
			}
		} catch (cartErr) {
			console.error('Error fetching cart:', cartErr);
		}

		// Get best seller products (ids 26-29)
		const bestSellers = allProducts.filter(p => ['26', '27', '28', '29'].includes(String(p.id)));

		// Get user's wishlist
		let userWishlistIds = [];
		const userId = localStorage.getItem('userId');
		if (userId) {
			const wishRes = await fetch(`http://localhost:3000/wishlists?userId=${userId}`);
			const wishlists = await wishRes.json();
			if (wishlists.length > 0) {
				userWishlistIds = wishlists[0].productIds.map(String);
			}
		}

		// Render best sellers
		const grid = document.getElementById('bestSellerGrid');
		if (!grid) return;

		grid.innerHTML = bestSellers.map(product => {
			const isWishlisted = userWishlistIds.includes(String(product.id));
			const alreadyInCart = inCartIds.includes(String(product.id));
			const discount = Math.round(((product.OldPrice - product.currentPrice) / product.OldPrice) * 100);
			return `
			<div class="col-lg-3 col-md-3 col-6">
				<div class="x_product_card x_home_product_card h-100" data-id="${product.id}">
					<div class="x_product_visual">
						<span class="x_sale_tag">${discount}% Off</span>
						<button class="x_wishlist_btn x_home_wishlist_btn ${isWishlisted ? 'active' : ''}" 
							data-id="${product.id}"
							title="Add to Wishlist">
							<i class="${isWishlisted ? 'fa-solid' : 'far'} fa-heart"></i>
						</button>
						<img src="${product.image || './Image/placeholder.png'}" 
							alt="${product.ProductTitle}">
						<div class="x_visual_overlay">
							<button class="x_add_cart_btn x_home_add_cart" 
								data-id="${product.id}"
								data-name="${product.ProductTitle}"
								data-price="${product.currentPrice}"
								data-image="${product.image || ''}"
								${alreadyInCart ? 'disabled' : ''}>
								${alreadyInCart ? 'In Cart' : 'Add to Cart'}
							</button>
						</div>
					</div>
					<div class="x_product_info">
						<h3 class="x_product_title">${product.shortTitle || product.ProductTitle}</h3>
						<div class="x_price_box">
							<span class="x_current_price">$${parseFloat(product.currentPrice).toFixed(2)} USD</span>
						</div>
					</div>
				</div>
			</div>
		`}).join('');

		// Add event listeners for add to cart
		document.querySelectorAll('.x_home_add_cart').forEach(btn => {
			btn.addEventListener('click', async (e) => {
				e.preventDefault();
				e.stopPropagation();
				if (btn.disabled) return;
				try {
					const addFn = window.cartAddToCart || window.addToCart;
					if (typeof addFn === 'function') {
						const ok = await addFn(
							btn.dataset.id,
							btn.dataset.name,
							parseFloat(btn.dataset.price),
							btn.dataset.image
						);
						if (ok) {
							btn.textContent = 'In Cart';
							btn.disabled = true;
							if (typeof window.updateCartUI === 'function') {
								window.updateCartUI();
							}
							alert('Product added to cart!');
						} else {
							alert('Failed to add to cart. Please try again.');
						}
					} else {
						alert('Cart is not ready. Please try again.');
					}
				} catch (err) {
					console.error('Add to cart error:', err);
					alert('Failed to add to cart. Please try again.');
				}
			});
		});

		// Navigate to product details on card click
		document.querySelectorAll('#bestSellerGrid .x_home_product_card').forEach(card => {
			card.addEventListener('click', (e) => {
				if (e.target.closest('.x_home_add_cart, .x_home_wishlist_btn')) return;
				const productId = card.dataset.id;
				if (productId) {
					window.location.href = `productDetails.html?id=${encodeURIComponent(productId)}`;
				}
			});
		});

		// Add event listeners for wishlist
		document.querySelectorAll('.x_home_wishlist_btn').forEach(btn => {
			btn.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				const productId = btn.dataset.id;
				if (typeof window.addToWishlist !== 'undefined') {
					window.addToWishlist(productId);
				}
			});
		});

		// Re-sync mobile best seller slider after cards are rendered
		initBestSellerSlider();

	} catch (error) {
		console.error('Error loading best sellers:', error);
	}
}

// run after DOM ready
document.addEventListener('DOMContentLoaded', () => {
	loadBestSellers();
	initBestSellerSlider();
});
