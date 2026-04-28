 // Utility function to handle API requests
async function handleAuth(url, username, password) {
    const messageBox = document.getElementById('message-box');

     try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
