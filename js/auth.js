document.addEventListener('DOMContentLoaded', () => {
    // API base - json-server serves db.json at this URL (run: npx json-server db.json)
    const API_BASE = 'http://localhost:3000';

    // Helpers
    const openModal = (id) => document.getElementById(id)?.classList.add('z_open');
    const closeModal = (id) => document.getElementById(id)?.classList.remove('z_open');
    const showError = (id, msg) => { const el = document.getElementById(id); if (el) el.textContent = msg; };
    const clearErrors = () => document.querySelectorAll('.z_error_msg').forEach(e => e.textContent = '');
    const getUserDisplayName = (user = {}) => {
        const firstName = (user['First Name'] || user.firstName || '').trim();
        const lastName = (user['Last Name'] || user.lastName || '').trim();
        const fullName = `${firstName} ${lastName}`.trim();
        return fullName || user.name || firstName || '';
    };

    // Password toggle
    const attachPasswordToggles = () => {
        document.querySelectorAll('.z_toggle_password').forEach(icon => {
            if (icon._attached) return; icon._attached = true;
            icon.addEventListener('click', function () {
                const input = document.querySelector(this.getAttribute('toggle'));
                if (!input) return;
                if (input.type === 'password') {
                    input.type = 'text'; this.classList.remove('fa-eye'); this.classList.add('fa-eye-slash');
                } else { input.type = 'password'; this.classList.remove('fa-eye-slash'); this.classList.add('fa-eye'); }
            });
        });
    };

    function updateUserIcon() {
        const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
        const userIcon = document.getElementById('userIcon');
        if (userIcon) {
            if (isLoggedIn) { userIcon.innerHTML = '<i class="bi bi-person"></i>'; userIcon.style.color = '#7c6f64'; }
            else { userIcon.innerHTML = '<i class="bi bi-person-add"></i>'; userIcon.style.color = ''; }
        }
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const profileLink = document.getElementById('profileLink');
        const logoutBtn = document.getElementById('logoutBtn');
        if (loginBtn) loginBtn.style.display = isLoggedIn ? 'none' : '';
        if (registerBtn) registerBtn.style.display = isLoggedIn ? 'none' : '';
        if (profileLink) profileLink.style.display = isLoggedIn ? '' : 'none';
        if (logoutBtn) logoutBtn.style.display = isLoggedIn ? '' : 'none';
    }

    // Modal overlay click to close
    document.querySelectorAll('.z_modal_overlay').forEach(modal => {
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('z_open'); });
    });

    attachPasswordToggles();
    updateUserIcon();

    // Register flow
    const registerForm = document.getElementById('registerForm');
    if (registerForm) registerForm.addEventListener('submit', async (e) => {
        e.preventDefault(); clearErrors();
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('registerEmail').value.trim().toLowerCase();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirm = document.getElementById('confirmPassword').value;
        const accept = document.getElementById('acceptTerms').checked;

        let ok = true;
        if (!firstName) { showError('firstNameError', 'First name is required'); ok = false; }
        if (!lastName) { showError('lastNameError', 'Last name is required'); ok = false; }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('registerEmailError', 'Valid email is required'); ok = false; }
        if (!phone || !/^[0-9]{10,}$/.test(phone.replace(/\D/g, ''))) { showError('phoneError', 'Valid phone is required'); ok = false; }
        if (!password || password.length < 8) { showError('registerPasswordError', 'Password must be at least 8 characters'); ok = false; }
        if (password !== confirm) { showError('confirmPasswordError', 'Passwords do not match'); ok = false; }
        if (!accept) { showError('acceptTermsError', 'You must accept the terms'); ok = false; }
        if (!ok) return;

        try {
            // Check email not already in API (db.json)
            const checkResp = await fetch(`${API_BASE}/users?email=${encodeURIComponent(email)}`);
            if (!checkResp.ok) throw new Error('API not reachable. Run: npx json-server db.json');
            const existingUsers = await checkResp.json();
            if (existingUsers.length > 0) {
                showError('registerEmailError', 'Email already registered');
                return;
            }

            // Same structure as db.json users
            const newUser = {
                "First Name": firstName,
                "Last Name": lastName,
                email: email,
                phone: phone,
                password: password,
                role: "user"
            };

            const createResp = await fetch(`${API_BASE}/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newUser)
            });

            if (!createResp.ok) {
                const errText = await createResp.text();
                throw new Error('Server returned ' + createResp.status + (errText ? ': ' + errText : ''));
            }

            const created = await createResp.json();
            const displayName = `${firstName} ${lastName}`.trim();
            localStorage.setItem('userId', created.id);
            localStorage.setItem('userName', displayName);
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userPhone', phone);
            localStorage.setItem('userLoggedIn', 'true');
            localStorage.setItem('currentUser', JSON.stringify({ id: created.id, email, name: displayName, phone }));
            alert('Account created! User added to API (id: ' + created.id + '). You can see it at ' + API_BASE + '/users');
            closeModal('registerModal');
            updateUserIcon();
        } catch (err) {
            console.error('Register error:', err);
            showError('registerEmailError', err.message || 'Unable to connect. Run: npx json-server db.json');
        }
    });

    // Login flow - uses db.json via API (json-server)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); clearErrors();
        const email = (document.getElementById('loginEmail').value || '').trim().toLowerCase();
        const password = document.getElementById('loginPassword').value;
        if (!email) { showError('loginEmailError', 'Email is required'); return; }
        if (!password) { showError('loginPasswordError', 'Password is required'); return; }
        try {
            const resp = await fetch(`${API_BASE}/users?email=${encodeURIComponent(email)}`);
            const users = await resp.json();
            if (users.length === 0) {
                showError('loginEmailError', 'Email not found');
                return;
            }
            const user = users[0];
            if (user.password !== password) {
                showError('loginPasswordError', 'Incorrect password');
                return;
            }
            const displayName = getUserDisplayName(user);
            localStorage.setItem('userLoggedIn', 'true');
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userName', displayName);
            localStorage.setItem('userId', user.id);
            localStorage.setItem('userPhone', (user.phone || '').toString());
            localStorage.setItem('userBio', (user.bio || '').toString());
            localStorage.setItem('currentUser', JSON.stringify({ id: user.id, email, name: displayName, phone: user.phone || '', bio: user.bio || '' }));
            alert('Login successful');
            closeModal('loginModal');
            updateUserIcon();
            if (window.updateWishlistBadge) window.updateWishlistBadge();
        } catch (err) {
            console.error(err);
            showError('loginEmailError', 'Unable to connect. Run: npx json-server db.json');
        }
    });

    // Forgot password -> send OTP (email check from db.json API)
    const forgotForm = document.getElementById('forgotPasswordForm');
    if (forgotForm) forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault(); clearErrors();
        const email = (document.getElementById('resetEmail').value || '').trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('resetEmailError', 'Please enter a valid email'); return; }
        try {
            const resp = await fetch(`${API_BASE}/users?email=${encodeURIComponent(email)}`);
            const users = await resp.json();
            if (users.length === 0) {
                showError('resetEmailError', 'Email not found');
                return;
            }
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const resetObj = { email, otp, expires: Date.now() + 5 * 60 * 1000 };
            localStorage.setItem('passwordReset', JSON.stringify(resetObj));
            alert('OTP sent (for demo): ' + otp);
            closeModal('forgotPasswordModal');
            openModal('otpModal');
        } catch (err) {
            console.error(err);
            showError('resetEmailError', 'Unable to connect. Run: npx json-server db.json');
        }
    });

    // OTP verification
    const otpForm = document.getElementById('otpForm');
    if (otpForm) otpForm.addEventListener('submit', (e) => {
        e.preventDefault(); clearErrors();
        const code = (document.getElementById('otpCode').value || '').trim();
        const raw = localStorage.getItem('passwordReset');
        if (!raw) { showError('otpError', 'No OTP request found'); return; }
        const obj = JSON.parse(raw);
        if (Date.now() > obj.expires) { showError('otpError', 'OTP expired'); return; }
        if (obj.otp !== code) { showError('otpError', 'Invalid OTP'); return; }
        // verified
        localStorage.setItem('passwordResetVerified', obj.email);
        localStorage.removeItem('passwordReset');
        closeModal('otpModal'); openModal('resetPasswordModal');
    });

    // Reset password submit
    const resetForm = document.getElementById('resetPasswordForm');
    if (resetForm) resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();
        const newPass = document.getElementById('newPassword').value;
        const confirm = document.getElementById('confirmNewPassword').value;
        // Validation
        if (!newPass || newPass.length < 8) {
            showError('newPasswordError', 'Password must be at least 8 characters');
            return;
        }
        if (newPass !== confirm) {
            showError('confirmNewPasswordError', 'Passwords do not match');
            return;
        }
        const email = localStorage.getItem('passwordResetVerified');
        if (!email) {
            alert('No reset request verified.');
            closeModal('resetPasswordModal');
            return;
        }
        try {
            const resp = await fetch(`${API_BASE}/users?email=${encodeURIComponent(email)}`);
            const users = await resp.json();
            if (users.length === 0) {
                alert("User not found");
                return;
            }
            const user = users[0];
            const patchResp = await fetch(`${API_BASE}/users/${user.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: newPass })
            });
            if (!patchResp.ok) throw new Error('Update failed');
            // 🧹 Clean reset flag
            localStorage.removeItem('passwordResetVerified');

            alert("Password updated successfully! Please login.");
            closeModal('resetPasswordModal');
            openModal('loginModal');
        } catch (error) {
            console.error("Error updating password:", error);
            alert("Something went wrong. Please try again.");
        }
    });


    // Open/close modal triggers
    document.getElementById('loginBtn')?.addEventListener('click', (e) => { e.preventDefault(); openModal('loginModal'); });
    document.getElementById('registerBtn')?.addEventListener('click', (e) => { e.preventDefault(); openModal('registerModal'); });
    document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => { e.preventDefault(); closeModal('loginModal'); openModal('forgotPasswordModal'); });
    document.getElementById('switchToRegister')?.addEventListener('click', (e) => { e.preventDefault(); closeModal('loginModal'); openModal('registerModal'); });
    document.getElementById('switchToLogin')?.addEventListener('click', (e) => { e.preventDefault(); closeModal('registerModal'); openModal('loginModal'); });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('userLoggedIn');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userPhone');
        localStorage.removeItem('userBio');
        updateUserIcon();
        if (window.updateWishlistBadge) window.updateWishlistBadge();
    });

    // Close buttons
    ['loginClose', 'registerClose', 'forgotPasswordClose', 'otpClose', 'resetClose'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => closeModal(id.replace('Close', '') + 'Modal'));
    });

    // Cart offcanvas handled elsewhere; keep UI icon updates
    updateUserIcon();
    attachPasswordToggles();
});
