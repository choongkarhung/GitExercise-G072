 // Utility function to handle API requests
async function handleAuth(url, username, password) {
    const messageBox = document.getElementById('message-box');

     try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

         const data = await response.json();

        if (response.ok) {
            messageBox.className = 'success';
            messageBox.innerText = data.message;
            if (url === '/login') {
                // Redirect to dashboard on successful login
                window.location.href = '/dashboard'; 
            }
        } else {
            messageBox.className = 'error';
            messageBox.innerText = data.error;
        }
          } catch (error) {
        messageBox.className = 'error';
        messageBox.innerText = 'Network error occurred.';
    }
}

// Event Listeners for Forms
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    handleAuth('/login', user, pass);
});