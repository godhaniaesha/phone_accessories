const WISHLIST_API_BASE = 'http://localhost:3000';

window.addToWishlist = async function (productId) {
    console.log("sdhjsegfjude", productId);

    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';

    if (!isLoggedIn) {
        alert('Please login to add items to your wishlist.');
        // Try to open login modal if it exists (it's in Header.html)
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.classList.add('z_open');
        }
        return;
    }

    const userId = localStorage.getItem('userId');
    if (!userId) {
        alert('User ID not found. Please login again.');
        return;
    }

    try {
        // Fetch existing wishlist for this user
        const response = await fetch(`${WISHLIST_API_BASE}/wishlists?userId=${userId}`);
        const wishlists = await response.json();

        // Ensure productId is added as same type as in products (string if id="1")
        const pid = String(productId);

        let wishlist;
        if (wishlists.length > 0) {
            wishlist = wishlists[0];
            // Check if product is already in wishlist
            if (wishlist.productIds.map(String).includes(pid)) {
                alert('Product is already in your wishlist!');
                return;
            }
            // Update existing wishlist
            wishlist.productIds.push(pid);
            const updateResponse = await fetch(`${WISHLIST_API_BASE}/wishlists/${wishlist.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productIds: wishlist.productIds })
            });

            if (updateResponse.ok) {
                // // alert('Product added to wishlist!');
                toggleWishlistUI(pid, true);
            }
        } else {
            // Create new wishlist
            const newWishlist = {
                userId: userId,
                productIds: [pid]
            };
            const createResponse = await fetch(`${WISHLIST_API_BASE}/wishlists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newWishlist)
            });

            if (createResponse.ok) {
                // // alert('Product added to wishlist!');
                toggleWishlistUI(pid, true);
            }
        }

        // Update wishlist badge
        updateWishlistBadge();
        return true;

    } catch (error) {
        console.error('Error adding to wishlist:', error);
        alert('Failed to add product to wishlist. Please ensure the server is running.');
        return false;
    }
};

window.toggleWishlistUI = function (productId, isActive) {
    const pid = String(productId);
    // Find all buttons that have this product ID
    const buttons = document.querySelectorAll(`[data-id="${pid}"].s_btn_wishlist, [data-id="${pid}"].pd-btn-wishlist, [data-id="${pid}"].x_wishlist_btn, button[onclick*="addToWishlist('${pid}')"]`);

    buttons.forEach(btn => {
        if (isActive) {
            btn.classList.add('active');
            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.remove('far');
                icon.classList.add('fas');
            }
        } else {
            btn.classList.remove('active');
            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.remove('fas');
                icon.classList.add('far');
            }
        }
    });
};

window.removeFromWishlist = async function (productId) {
    const userId = localStorage.getItem('userId');
    if (!userId) return false;

    try {
        const response = await fetch(`${WISHLIST_API_BASE}/wishlists?userId=${userId}`);
        const wishlists = await response.json();

        if (wishlists.length > 0) {
            const wishlist = wishlists[0];
            const pid = String(productId);
            const updatedProductIds = wishlist.productIds.filter(id => String(id) !== pid);

            const updateResponse = await fetch(`${WISHLIST_API_BASE}/wishlists/${wishlist.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productIds: updatedProductIds })
            });

            if (updateResponse.ok) {
                toggleWishlistUI(pid, false);
                updateWishlistBadge();
                return true;
            }
        }
    } catch (error) {
        console.error('Error removing from wishlist:', error);
    }
    return false;
};

window.isInWishlist = async function (productId) {
    const userId = localStorage.getItem('userId');
    if (!userId) return false;

    try {
        const response = await fetch(`${WISHLIST_API_BASE}/wishlists?userId=${userId}`);
        const wishlists = await response.json();
        if (wishlists.length > 0) {
            return wishlists[0].productIds.map(String).includes(String(productId));
        }
    } catch (error) {
        console.error('Error checking wishlist:', error);
    }
    return false;
};

window.updateWishlistBadge = function () {
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
        const badge = document.getElementById('wishlistBadge');
        if (badge) badge.style.display = 'none';
        return;
    }

    fetch(`${WISHLIST_API_BASE}/wishlists?userId=${userId}`)
        .then(res => res.json())
        .then(wishlists => {
            const badge = document.getElementById('wishlistBadge');
            if (badge) {
                if (wishlists.length > 0) {
                    const count = wishlists[0].productIds.length;
                    badge.textContent = count;
                    badge.style.display = count > 0 ? 'flex' : 'none';
                } else {
                    badge.style.display = 'none';
                }
            }
        })
        .catch(err => console.error('Error updating wishlist badge:', err));
}

// Initial update
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateWishlistBadge);
} else {
    updateWishlistBadge();
}
