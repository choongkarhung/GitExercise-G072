// Locate your form submission event listener
document.getElementById('setup-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const balance = document.getElementById('balance').value;
    const days = document.getElementById('days').value;

    const response = await fetch('/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance, days })
    });

    if (response.ok) {
        // This is the fix: manually redirect to the dashboard route
        window.location.href = '/dashboard'; 
    } else {
        const error = await response.json();
        const msgBox = document.getElementById('message-box');
        msgBox.textContent = error.error;
        msgBox.classList.remove('hidden');
    }
});