document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    const submitBtn = document.getElementById('contactSubmitBtn');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Collect data
            const name = document.getElementById('contactName').value;
            const email = document.getElementById('contactEmail').value;
            const subject = document.getElementById('contactSubject').value;
            const message = document.getElementById('contactMessage').value;

            // Prepare data object
            const contactData = {
                name,
                email,
                subject,
                message,
                status: 'unread',
                createdAt: new Date().toISOString()
            };

            // Change button state
            const originalBtnContent = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Sending...</span>';

            try {
                const response = await fetch('http://localhost:3000/contacts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(contactData)
                });

                const responseDiv = document.getElementById('contactResponse');
                if (response.ok) {
                    responseDiv.style.display = 'block';
                    responseDiv.style.color = '#28a745';
                    responseDiv.innerHTML = '<i class="fas fa-check-circle me-2"></i> Thank you! Your message has been sent successfully.';
                    contactForm.reset();

                    // Hide after 5 seconds
                    setTimeout(() => {
                        responseDiv.style.display = 'none';
                    }, 5000);
                } else {
                    throw new Error('Failed to send message');
                }
            } catch (error) {
                console.error('Error sending message:', error);
                const responseDiv = document.getElementById('contactResponse');
                responseDiv.style.display = 'block';
                responseDiv.style.color = '#dc3545';
                responseDiv.innerHTML = '<i class="fas fa-exclamation-circle me-2"></i> Oops! Something went wrong. Please try again later.';
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
            }
        });
    }
});
