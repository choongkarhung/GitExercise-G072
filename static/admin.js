let menuItems = [];

document.addEventListener('DOMContentLoaded', () => {
    loadMenuItems();
    loadUsers();
    loadActivity();
    document.getElementById('menu-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('cancel-btn').addEventListener('click', resetFormState);
});

// MENU ITEMS 

async function loadMenuItems() {
    try {
        const response = await fetch('/api/food_items');
        if (response.status === 403) { window.location.href = '/dashboard'; return; }
        if (!response.ok) throw new Error('Database loading issue.');
        menuItems = await response.json();
        renderMenuUI();
    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

function renderMenuUI() {
    const tableBody = document.getElementById('menu-table-body');
    tableBody.innerHTML = '';

    let totalItems = menuItems.length;
    let uniqueStalls = new Set();
    let priceSum = 0;

    menuItems.forEach(item => {
        uniqueStalls.add(item.stall);
        priceSum += parseFloat(item.price);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${escHtml(item.name)}</strong></td>
            <td>${escHtml(item.stall)}</td>
            <td>RM ${parseFloat(item.price).toFixed(2)}</td>
            <td><span class="badge ${item.category.toLowerCase()}">${item.category}</span></td>
            <td>${item.calories} kcal</td>
            <td style="text-align:center;">
                <button class="btn btn-edit"   onclick="startEdit(${item.id})">Edit</button>
                <button class="btn btn-delete" onclick="deleteItem(${item.id})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    document.getElementById('stat-total-items').textContent = totalItems;
    document.getElementById('stat-total-restaurants').textContent = uniqueStalls.size;
    document.getElementById('stat-avg-price').textContent =
        `RM ${(totalItems > 0 ? priceSum / totalItems : 0).toFixed(2)}`;
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('item-name').value,
        stall: document.getElementById('restaurant').value,
        price: parseFloat(document.getElementById('price').value),
        category: document.getElementById('category').value,
        calories: parseInt(document.getElementById('calories').value || 0),
    };
    const targetId = document.getElementById('item-index').value;
    const isUpdateMode = targetId !== '';
    const url = isUpdateMode ? `/api/food_items/${targetId}` : '/api/food_items';
    const method = isUpdateMode ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Server error.');
        alert(data.message);
        resetFormState();
        loadMenuItems();
    } catch (error) {
        alert(`Transaction Failed: ${error.message}`);
    }
}

function startEdit(id) {
    const item = menuItems.find(i => i.id === id);
    if (!item) return;
    document.getElementById('item-index').value = item.id;
    document.getElementById('item-name').value = item.name;
    document.getElementById('restaurant').value = item.stall;
    document.getElementById('price').value = item.price;
    document.getElementById('category').value = item.category;
    document.getElementById('calories').value = item.calories;
    document.getElementById('form-title').textContent = 'Modify Menu Item';
    document.getElementById('submit-btn').textContent = 'Save Changes';
    document.getElementById('cancel-btn').style.display = 'inline-block';
}

async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    try {
        const response = await fetch(`/api/food_items/${id}`, { method: 'DELETE' });
        const data     = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to remove entry.');
        alert(data.message);
        loadMenuItems();
    } catch (error) {
        alert(`Deletion Error: ${error.message}`);
    }
}

function resetFormState() {
    document.getElementById('menu-form').reset();
    document.getElementById('item-index').value = '';
    document.getElementById('form-title').textContent   = 'Add New Menu Item';
    document.getElementById('submit-btn').textContent   = 'Add Item ✚';
    document.getElementById('cancel-btn').style.display = 'none';
}

// USER MANAGEMENT 

async function loadUsers() {
    try {
        const res = await fetch('/api/users');
        if (!res.ok) return;
        const users = await res.json();
        renderUsers(users);
    } catch (e) {
        console.error('User load error:', e);
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('user-table-body');
    tbody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td><strong>${escHtml(user.username)}</strong></td>
            <td>
                <span class="role-badge role-${user.role}">${user.role}</span>
            </td>
            <td style="text-align:center;">
                <select class="role-select" id="role-select-${user.id}">
                    <option value="student" ${user.role === 'student' ? 'selected' : ''}>student</option>
                    <option value="vendor" ${user.role === 'vendor' ? 'selected' : ''}>vendor</option>
                    <option value="admin" ${user.role === 'admin'  ? 'selected' : ''}>admin</option>
                </select>
                <button class="btn btn-edit" onclick="saveUserRole(${user.id})">Save</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function saveUserRole(uid) {
    const select  = document.getElementById(`role-select-${uid}`);
    const newRole = select.value;
    try {
        const res  = await fetch(`/api/users/${uid}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update role.');
        alert(data.message);
        loadUsers();
    } catch (e) {
        alert(`Role update failed: ${e.message}`);
    }
}

// USER ACTIVITY

async function loadActivity() {
    try {
        const [summaryRes, feedRes] = await Promise.all([
            fetch('/api/admin/activity'),
            fetch('/api/admin/recent_logs'),
        ]);
        if (!summaryRes.ok || !feedRes.ok) return;
        const summary = await summaryRes.json();
        const feed = await feedRes.json();
        renderActivitySummary(summary);
        renderActivityFeed(feed);
    } catch (e) {
        console.error('Activity load error:', e);
    }
}

function renderActivitySummary(rows) {
    const tbody = document.getElementById('activity-table-body');
    tbody.innerHTML = '';

    // Update overview stats
    const totalUsers = rows.length;
    const activeToday = rows.filter(r => r.logs_today > 0).length;
    const totalSessions = rows.reduce((s, r) => s + (r.total_sessions || 0), 0);
    document.getElementById('stat-total-users').textContent = totalUsers;
    document.getElementById('stat-active-today').textContent = activeToday;
    document.getElementById('stat-total-sessions').textContent = totalSessions;

    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--ink-faint);padding:24px;">No user data yet.</td></tr>`;
        return;
    }

    rows.forEach(row => {
        const lastActive = row.last_active
            ? new Date(row.last_active).toLocaleString('en-MY', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
              })
            : '—';

        const activityDot = row.logs_today > 0
            ? '<span class="activity-dot dot-active" title="Active today"></span>'
            : '<span class="activity-dot dot-idle" title="Not active today"></span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                ${activityDot}
                <strong>${escHtml(row.username)}</strong>
            </td>
            <td><span class="role-badge role-${row.role}">${row.role}</span></td>
            <td>${row.total_sessions}</td>
            <td>RM ${parseFloat(row.total_spent_all_time).toFixed(2)}</td>
            <td>
                ${row.logs_today > 0
                    ? `<span class="logs-today-badge">${row.logs_today} log${row.logs_today !== 1 ? 's' : ''} today</span>`
                    : '<span style="color:var(--ink-faint);font-size:0.8rem;">—</span>'}
            </td>
            <td style="font-size:0.82rem;color:var(--ink-muted);">${lastActive}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderActivityFeed(logs) {
    const feed = document.getElementById('activity-feed');
    feed.innerHTML = '';

    if (logs.length === 0) {
        feed.innerHTML = `<div class="feed-empty">No expense logs recorded yet.</div>`;
        return;
    }

    logs.forEach(log => {
        const time = new Date(log.logged_at).toLocaleString('en-MY', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
        });
        const calBadge = log.calories > 0
            ? `<span class="feed-cal">${log.calories} kcal</span>`
            : '';
        const el = document.createElement('div');
        el.className = 'feed-item';
        el.innerHTML = `
            <div class="feed-left">
                <span class="feed-user">${escHtml(log.username)}</span>
                <span class="feed-label">${escHtml(log.label)}</span>
                ${calBadge}
            </div>
            <div class="feed-right">
                <span class="feed-amount">RM ${parseFloat(log.amount).toFixed(2)}</span>
                <span class="feed-time">${time}</span>
            </div>
        `;
        feed.appendChild(el);
    });
}

// HELPERS 

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}