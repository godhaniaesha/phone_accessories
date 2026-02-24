(function () {
	const HEADER_API_BASE = "http://localhost:3000";

	function initHeader() {
		// Set active class to current page link
		function setActiveNavLink() {
			const currentPage = window.location.pathname.split('/').pop() || 'Home.html';
			const navLinks = document.querySelectorAll('.d_header_link');
			
			navLinks.forEach(link => {
				link.classList.remove('active');
				const href = link.getAttribute('href');
				if (href === currentPage || (currentPage === '' && href === 'Home.html')) {
					link.classList.add('active');
				}
			});
		}
		
		setActiveNavLink();

		let isLoggedIn = localStorage.getItem("userLoggedIn") === "true";

		const userIcon = document.getElementById("userIcon");
		const userDropdown = document.getElementById("userDropdown");

		function showError(id, msg) {
			const el = document.getElementById(id);
			if (el) el.textContent = msg;
		}
		function getUserDisplayName(user = {}) {
			const firstName = (user["First Name"] || user.firstName || "").trim();
			const lastName = (user["Last Name"] || user.lastName || "").trim();
			const fullName = `${firstName} ${lastName}`.trim();
			return fullName || user.name || firstName || "";
		}

		if (userIcon && userDropdown) {
			userIcon.addEventListener("click", (e) => {
				e.preventDefault();
				userDropdown.classList.toggle("z_active");
			});

			document.addEventListener("click", (e) => {
				if (!e.target.closest(".x_user_dropdown")) {
					userDropdown.classList.remove("z_active");
				}
			});
		}

		function openModal(modalId) {
			const modal = document.getElementById(modalId);
			if (modal) {
				modal.classList.add("z_open");
			}
			if (userDropdown) {
				userDropdown.classList.remove("z_active");
			}
		}

		function closeModal(modalId) {
			const modal = document.getElementById(modalId);
			if (modal) {
				modal.classList.remove("z_open");
			}
		}

		const loginBtn = document.getElementById("loginBtn");
		const loginClose = document.getElementById("loginClose");
		const loginForm = document.getElementById("loginForm");
		const forgotPasswordLink = document.getElementById("forgotPasswordLink");
		const switchToRegister = document.getElementById("switchToRegister");

		if (loginBtn) {
			loginBtn.addEventListener("click", (e) => {
				e.preventDefault();
				openModal("loginModal");
			});
		}

		if (loginClose) {
			loginClose.addEventListener("click", () => closeModal("loginModal"));
		}

		if (forgotPasswordLink) {
			forgotPasswordLink.addEventListener("click", (e) => {
				e.preventDefault();
				closeModal("loginModal");
				openModal("forgotPasswordModal");
			});
		}

		if (switchToRegister) {
			switchToRegister.addEventListener("click", (e) => {
				e.preventDefault();
				closeModal("loginModal");
				openModal("registerModal");
			});
		}

		if (loginForm) {
			loginForm.addEventListener("submit", async (e) => {
				e.preventDefault();
				document.querySelectorAll(".z_error_msg").forEach(el => el.textContent = "");
				const email = (document.getElementById("loginEmail").value || "").trim().toLowerCase();
				const password = document.getElementById("loginPassword").value;
				if (!email) { showError("loginEmailError", "Email is required"); return; }
				if (!password) { showError("loginPasswordError", "Password is required"); return; }
				try {
					const resp = await fetch(HEADER_API_BASE + "/users?email=" + encodeURIComponent(email));
					if (!resp.ok) throw new Error("API not reachable");
					const users = await resp.json();
					if (users.length === 0) { showError("loginEmailError", "Email not found"); return; }
					const user = users[0];
					if (user.password !== password) { showError("loginPasswordError", "Incorrect password"); return; }
					const displayName = getUserDisplayName(user);
					localStorage.setItem("userLoggedIn", "true");
					localStorage.setItem("userEmail", email);
					localStorage.setItem("userName", displayName);
					localStorage.setItem("userId", user.id);
					localStorage.setItem("userPhone", (user.phone || "").toString());
					localStorage.setItem("userBio", (user.bio || "").toString());
					localStorage.setItem("currentUser", JSON.stringify({ id: user.id, email, name: displayName, phone: user.phone || "", bio: user.bio || "" }));
					isLoggedIn = true;
					alert("Login successful!");
					closeModal("loginModal");
					updateUserIcon();
				} catch (err) {
					console.error(err);
					showError("loginEmailError", "Unable to connect. Run: npx json-server db.json");
				}
			});
		}

		function validateLoginForm() {
			const email = document.getElementById("loginEmail").value;
			const password = document.getElementById("loginPassword").value;
			let isValid = true;

			const loginEmailError = document.getElementById("loginEmailError");
			const loginPasswordError = document.getElementById("loginPasswordError");

			if (loginEmailError) loginEmailError.textContent = "";
			if (loginPasswordError) loginPasswordError.textContent = "";

			if (!email) {
				if (loginEmailError) loginEmailError.textContent = "Email is required";
				isValid = false;
			} else if (!validateEmail(email)) {
				if (loginEmailError) loginEmailError.textContent = "Please enter a valid email";
				isValid = false;
			}

			if (!password) {
				if (loginPasswordError) loginPasswordError.textContent = "Password is required";
				isValid = false;
			} else if (password.length < 6) {
				if (loginPasswordError) loginPasswordError.textContent = "Password must be at least 6 characters";
				isValid = false;
			}

			return isValid;
		}

		const forgotPasswordClose = document.getElementById("forgotPasswordClose");
		const backToLogin = document.getElementById("backToLogin");
		const forgotPasswordForm = document.getElementById("forgotPasswordForm");

		if (forgotPasswordClose) {
			forgotPasswordClose.addEventListener("click", () => closeModal("forgotPasswordModal"));
		}

		if (backToLogin) {
			backToLogin.addEventListener("click", (e) => {
				e.preventDefault();
				closeModal("forgotPasswordModal");
				openModal("loginModal");
			});
		}

		if (forgotPasswordForm) {
			forgotPasswordForm.addEventListener("submit", (e) => {
				e.preventDefault();
				const email = document.getElementById("resetEmail").value;
				if (validateEmail(email)) {
					alert("Password reset link sent to: " + email);
					closeModal("forgotPasswordModal");
					openModal("loginModal");
				} else {
					const resetEmailError = document.getElementById("resetEmailError");
					if (resetEmailError) resetEmailError.textContent = "Please enter a valid email";
				}
			});
		}

		const registerBtn = document.getElementById("registerBtn");
		const registerClose = document.getElementById("registerClose");
		const registerForm = document.getElementById("registerForm");
		const switchToLogin = document.getElementById("switchToLogin");

		if (registerBtn) {
			registerBtn.addEventListener("click", (e) => {
				e.preventDefault();
				openModal("registerModal");
			});
		}

		if (registerClose) {
			registerClose.addEventListener("click", () => closeModal("registerModal"));
		}

		if (switchToLogin) {
			switchToLogin.addEventListener("click", (e) => {
				e.preventDefault();
				closeModal("registerModal");
				openModal("loginModal");
			});
		}

		if (registerForm) {
			registerForm.addEventListener("submit", async (e) => {
				e.preventDefault();
				if (!validateRegisterForm()) return;
				document.querySelectorAll(".z_error_msg").forEach(el => el.textContent = "");
				const firstName = document.getElementById("firstName").value.trim();
				const lastName = document.getElementById("lastName").value.trim();
				const email = document.getElementById("registerEmail").value.trim().toLowerCase();
				const phone = document.getElementById("phone").value.trim();
				const password = document.getElementById("registerPassword").value;
				try {
					const checkResp = await fetch(HEADER_API_BASE + "/users?email=" + encodeURIComponent(email));
					if (!checkResp.ok) throw new Error("API not reachable. Run: npx json-server db.json");
					const existing = await checkResp.json();
					if (existing.length > 0) {
						showError("registerEmailError", "Email already registered");
						return;
					}
					const newUser = {
						"First Name": firstName,
						"Last Name": lastName,
						email: email,
						phone: phone,
						password: password,
						role: "user"
					};
					const createResp = await fetch(HEADER_API_BASE + "/users", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(newUser)
					});
					if (!createResp.ok) {
						const errText = await createResp.text();
						throw new Error("Server " + createResp.status + (errText ? ": " + errText : ""));
					}
					const created = await createResp.json();
					const displayName = `${firstName} ${lastName}`.trim();
					localStorage.setItem("userId", created.id);
					localStorage.setItem("userName", displayName);
					localStorage.setItem("userEmail", email);
					localStorage.setItem("userPhone", phone);
					localStorage.setItem("userLoggedIn", "true");
					localStorage.setItem("currentUser", JSON.stringify({ id: created.id, email, name: displayName, phone }));
					isLoggedIn = true;
					alert("Account created! User added to API. Check http://localhost:3000/users");
					closeModal("registerModal");
					updateUserIcon();
				} catch (err) {
					console.error("Register error:", err);
					showError("registerEmailError", err.message || "Unable to connect.");
				}
			});
		}

		function validateRegisterForm() {
			const firstName = document.getElementById("firstName").value;
			const lastName = document.getElementById("lastName").value;
			const email = document.getElementById("registerEmail").value;
			const phone = document.getElementById("phone").value;
			const password = document.getElementById("registerPassword").value;
			const confirmPassword = document.getElementById("confirmPassword").value;
			const acceptTerms = document.getElementById("acceptTerms").checked;
			let isValid = true;

			document.querySelectorAll(".z_error_msg").forEach(el => el.textContent = "");

			if (!firstName) {
				const firstNameError = document.getElementById("firstNameError");
				if (firstNameError) firstNameError.textContent = "First name is required";
				isValid = false;
			}

			if (!lastName) {
				const lastNameError = document.getElementById("lastNameError");
				if (lastNameError) lastNameError.textContent = "Last name is required";
				isValid = false;
			}

			if (!email) {
				const registerEmailError = document.getElementById("registerEmailError");
				if (registerEmailError) registerEmailError.textContent = "Email is required";
				isValid = false;
			} else if (!validateEmail(email)) {
				const registerEmailError = document.getElementById("registerEmailError");
				if (registerEmailError) registerEmailError.textContent = "Please enter a valid email";
				isValid = false;
			}

			if (!phone) {
				const phoneError = document.getElementById("phoneError");
				if (phoneError) phoneError.textContent = "Phone number is required";
				isValid = false;
			} else if (!validatePhone(phone)) {
				const phoneError = document.getElementById("phoneError");
				if (phoneError) phoneError.textContent = "Please enter a valid phone number";
				isValid = false;
			}

			if (!password) {
				const registerPasswordError = document.getElementById("registerPasswordError");
				if (registerPasswordError) registerPasswordError.textContent = "Password is required";
				isValid = false;
			} else if (password.length < 8) {
				const registerPasswordError = document.getElementById("registerPasswordError");
				if (registerPasswordError) registerPasswordError.textContent = "Password must be at least 8 characters";
				isValid = false;
			}

			if (password !== confirmPassword) {
				const confirmPasswordError = document.getElementById("confirmPasswordError");
				if (confirmPasswordError) confirmPasswordError.textContent = "Passwords do not match";
				isValid = false;
			}

			if (!acceptTerms) {
				const acceptTermsError = document.getElementById("acceptTermsError");
				if (acceptTermsError) acceptTermsError.textContent = "You must accept the terms";
				isValid = false;
			}

			return isValid;
		}

		const profileBtn = document.getElementById("profileBtn");
		const profileClose = document.getElementById("profileClose");
		const logoutBtn = document.getElementById("logoutBtn");

		if (profileBtn) {
			profileBtn.addEventListener("click", (e) => {
				e.preventDefault();
				if (isLoggedIn) {
					openModal("profileModal");
					updateProfileInfo();
				} else {
					openModal("loginModal");
				}
			});
		}

		if (profileClose) {
			profileClose.addEventListener("click", () => closeModal("profileModal"));
		}

		if (logoutBtn) {
			logoutBtn.addEventListener("click", (e) => {
				e.preventDefault();
				localStorage.removeItem("userLoggedIn");
				localStorage.removeItem("userName");
				localStorage.removeItem("userEmail");
				localStorage.removeItem("userId");
				localStorage.removeItem("currentUser");
				localStorage.removeItem("userPhone");
				localStorage.removeItem("userBio");
				isLoggedIn = false;
				alert("Logged out successfully!");
				closeModal("profileModal");
				updateUserIcon();
			});
		}

		function updateProfileInfo() {
			const name = localStorage.getItem("userName") || "John Doe";
			const email = localStorage.getItem("userEmail") || "john.doe@example.com";
			const profileHeader = document.querySelector(".z_profile_info");
			if (profileHeader) {
				profileHeader.innerHTML = `<h3>${name}</h3><p>${email}</p>`;
			}
		}

		function updateUserIcon() {
			if (!userIcon) return;
			
			const loginBtn = document.getElementById("loginBtn");
			const registerBtn = document.getElementById("registerBtn");
			const profileLink = userDropdown?.querySelector('a[href="Profile.html"]');
			
			if (isLoggedIn) {
				userIcon.innerHTML = '<i class="bi bi-person"></i>';
				userIcon.style.color = "#7c6f64";
				
				// Hide login and register, show only profile
				if (loginBtn) loginBtn.style.display = "none";
				if (registerBtn) registerBtn.style.display = "none";
				if (profileLink) profileLink.style.display = "block";
			} else {
				userIcon.innerHTML = '<i class="bi bi-person-add"></i>';
				userIcon.style.color = "#a5a5a5";
				
				// Show login and register
				if (loginBtn) loginBtn.style.display = "block";
				if (registerBtn) registerBtn.style.display = "block";
				if (profileLink) profileLink.style.display = "none";
			}
		}

		function validateEmail(email) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			return emailRegex.test(email);
		}

		function validatePhone(phone) {
			const phoneRegex = /^[0-9]{10,}$/;
			return phoneRegex.test(phone.replace(/\D/g, ""));
		}

		document.querySelectorAll(".z_modal_overlay").forEach(modal => {
			modal.addEventListener("click", (e) => {
				if (e.target === modal) {
					modal.classList.remove("z_open");
				}
			});
		});

		const cartIcon = document.getElementById("cartIcon");
		const cartPanel = document.getElementById("cartPanel");
		const cartBackdrop = document.getElementById("cartBackdrop");
		const cartClose = document.getElementById("cartClose");

		// =============================
		// Cart: Load from API (http://localhost:3000/carts)
		// New nested format: {id, userId, items: [{id, quantity}]}
		// =============================
		async function loadCartItems() {
			// Delegate to cart.js loadOffcanvasCart()
			if (typeof loadOffcanvasCart === "function") {
				await loadOffcanvasCart();
			}
		}

		if (cartIcon && cartPanel) {
			cartIcon.addEventListener("click", async (e) => {
				e.preventDefault();
				cartPanel.classList.add("z_open");
				if (cartBackdrop) cartBackdrop.classList.add("z_open");
				await loadCartItems();
			});
		}

		if (cartClose) {
			cartClose.addEventListener("click", () => {
				cartPanel.classList.remove("z_open");
				if (cartBackdrop) cartBackdrop.classList.remove("z_open");
			});
		}

		if (cartBackdrop) {
			cartBackdrop.addEventListener("click", () => {
				cartPanel.classList.remove("z_open");
				cartBackdrop.classList.remove("z_open");
			});
		}

		// =============================
		// Search: Handle header search
		// =============================
		const searchForm = document.getElementById("headerSearchForm");
		const searchInput = document.getElementById("headerSearchInput");
		const liveResults = document.getElementById("liveSearchResults");

		let debounceTimer;

		function debounce(func, delay) {
			return function () {
				const context = this;
				const args = arguments;
				clearTimeout(debounceTimer);
				debounceTimer = setTimeout(() => func.apply(context, args), delay);
			};
		}

		async function performLiveSearch() {
			const query = searchInput.value.trim().toLowerCase();
			if (query.length < 2) {
				liveResults.innerHTML = "";
				liveResults.classList.remove("active");
				return;
			}

			try {
				const [prodRes, catRes] = await Promise.all([
					fetch(API_BASE + "/products"),
					fetch(API_BASE + "/categories")
				]);
				const products = await prodRes.json();
				const categories = await catRes.json();

				const filtered = products.map(p => {
					const cat = categories.find(c => String(c.id) === String(p.cat_id));
					return { ...p, CategoryName: cat ? cat.name : "" };
				}).filter(p =>
					p.ProductTitle.toLowerCase().includes(query) ||
					(p.Description && p.Description.toLowerCase().includes(query)) ||
					(p.CategoryName && p.CategoryName.toLowerCase().includes(query))
				).slice(0, 6);

				if (filtered.length > 0) {
					liveResults.innerHTML = filtered.map(p => `
                        <a href="productDetails.html?id=${p.id}" class="d_search_item">
                            <img src="${p.image || './Image/placeholder.png'}" alt="${p.ProductTitle}" onerror="this.src='./Image/placeholder.png'">
                            <div class="d_search_item_info">
                                <span class="d_search_item_name">${p.ProductTitle}</span>
                            </div>
                        </a>
                    `).join("");
					liveResults.classList.add("active");
				} else {
					liveResults.innerHTML = `<div class="d_search_no_results">No products found for "${searchInput.value}"</div>`;
					liveResults.classList.add("active");
				}
			} catch (err) {
				console.error("Live search error:", err);
			}
		}

		if (searchForm && searchInput) {
			searchInput.addEventListener("input", debounce(performLiveSearch, 300));

			searchForm.addEventListener("submit", (e) => {
				e.preventDefault();
				const query = searchInput.value.trim();
				if (query) {
					liveResults.classList.remove("active");
					window.location.href = `shop.html?search=${encodeURIComponent(query)}`;
				}
			});

			// Close live search results when clicking outside
			document.addEventListener("click", (e) => {
				if (!searchForm.contains(e.target)) {
					liveResults.classList.remove("active");
				}
			});

			// Show results when focusing back on input if it has value
			searchInput.addEventListener("focus", () => {
				if (searchInput.value.trim().length >= 2) {
					liveResults.classList.add("active");
				}
			});
		}

		const menuToggle = document.querySelector(".x_menu_toggle");
		const navMenu = document.querySelector(".x_nav_menu");

		if (menuToggle && navMenu) {
			menuToggle.addEventListener("click", () => {
				navMenu.classList.toggle("active");
			});

			document.querySelectorAll(".x_nav_link").forEach(link => {
				link.addEventListener("click", () => {
					navMenu.classList.remove("active");
				});
			});
		}

		updateUserIcon();

		// Initialize cart badge on page load (via API)
		if (typeof updateCartUI === "function") {
			updateCartUI();
		}

		document.querySelectorAll(".z_toggle_password").forEach(icon => {
			icon.addEventListener("click", function () {
				const input = document.querySelector(this.getAttribute("toggle"));
				if (!input) return;

				if (input.type === "password") {
					input.type = "text";
					this.classList.remove("fa-eye");
					this.classList.add("fa-eye-slash");
				} else {
					input.type = "password";
					this.classList.remove("fa-eye-slash");
					this.classList.add("fa-eye");
				}
			});
		});
	}

	window.initHeader = initHeader;
})();
