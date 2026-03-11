console.log("Footer script loaded ✅");

const form = document.getElementById("subscribeForm");

if (form) {
    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const emailInput = document.getElementById("subscriberEmail");
        const email = emailInput.value.trim().toLowerCase();

        if (!email) return;

        try {
            // Check duplicate
            const check = await fetch(`http://localhost:3000/subscribers?email=${email}`);
            const existing = await check.json();

            if (existing.length > 0) {
                // alert("Email already subscribed!");
                return;
            }

            // Add subscriber
            const response = await fetch("http://localhost:3000/subscribers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email
                })
            });

            if (response.ok) {
                // alert("Subscribed Successfully 🎉");
                emailInput.value = "";
            } else {
                console.log("POST failed");
            }

        } catch (error) {
            console.error("Error:", error);
        }
    });
}