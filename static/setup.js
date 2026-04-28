document.getElementById('setup-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const balance = parseFloat(document.getElementById('balance').value);
    const days = parseInt(document.getElementById('days').value);
    const messageBox = document.getElementById('message-box');

    // Basic front-end validation
    if (isNaN(balance) || balance <= 0) {
        messageBox.textContent = 'Please enter a valid balance.';
        messageBox.className = 'error';
        return;
    }
    if (isNaN(days) || days <= 0) {
        messageBox.textContent = 'Please enter a valid number of days.';
        messageBox.className = 'error';
        return;
    }

    const response = await fetch('/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance, days })
    });

    const data = await response.json();

    if (response.ok) {
        window.location.href = '/dashboard';
    } else {
        messageBox.textContent = data.error || 'Something went wrong.';
        messageBox.className = 'error';
    }
});