let allItems = [];
let myUserId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initVendor();
    document.getElementById('menu-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('cancel-btn').addEventListener('click', resetFormState);
});

async function initVendor() {
    try {
        // Fetch identity and all items in parallel
        const [meRes, itemsRes] = await Promise.all([
            fetch('/api/me'),
            fetch('/api/food_items'),
        ]);
        if (meRes.status === 401 || itemsRes.status === 401) {
            window.location.href = '/'; return;
        }
        if (itemsRes.status === 403) {
            window.location.href = '/dashboard'; return;
        }
        const me   = await meRes.json();
        myUserId   = me.user_id;
        allItems   = await itemsRes.json();
        renderUI();
    } catch (e) {
        console.error('Vendor init error:', e);
    }
}

// RENDER 

function renderUI() {
    const myItems = allItems.filter(i => i.owner_id === myUserId);
    renderStats(myItems);
    renderMyItems(myItems);
    renderAllItems();
}

function renderStats(myItems) {
    document.getElementById('stat-my-items').textContent = myItems.length;
    document.getElementById('stat-total-items').textContent = allItems.length;
    const priceSum = myItems.reduce((s, i) => s + parseFloat(i.price), 0);
    document.getElementById('stat-avg-price').textContent =
        myItems.length > 0 ? `RM ${(priceSum / myItems.length).toFixed(2)}` : 'RM —';
}

function renderMyItems(myItems) {
    const tbody = document.getElementById('my-items-table-body');
    tbody.innerHTML = '';

    if (myItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-row">
            You haven't listed any items yet. Use the form above to add your first item!
        </td></tr>`;
        return;
    }

    myItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${escHtml(item.name)}</strong></td>
            <td>${escHtml(item.stall)}</td>
            <td class="price-cell">RM ${parseFloat(item.price).toFixed(2)}</td>
            <td><span class="badge badge-${item.category.toLowerCase()}">${item.category}</span></td>
            <td>${item.calories} kcal</td>
            <td style="text-align:center;">
                <button class="btn btn-edit"   onclick="startEdit(${item.id})">Edit</button>
                <button class="btn btn-delete" onclick="deleteItem(${item.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderAllItems() {
    const tbody = document.getElementById('all-items-table-body');
    tbody.innerHTML = '';

    if (allItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No menu items found.</td></tr>`;
        return;
    }

    allItems.forEach(item => {
        const isMine = item.owner_id === myUserId;
        const row = document.createElement('tr');
        if (isMine) row.classList.add('row-mine');
        row.innerHTML = `
            <td>
                <strong>${escHtml(item.name)}</strong>
                ${isMine ? '<span class="mine-tag">Yours</span>' : ''}
            </td>
            <td>${escHtml(item.stall)}</td>
            <td class="price-cell">RM ${parseFloat(item.price).toFixed(2)}</td>
            <td><span class="badge badge-${item.category.toLowerCase()}">${item.category}</span></td>
            <td>${item.calories} kcal</td>
        `;
        tbody.appendChild(row);
    });
}

// FORM 

async function handleFormSubmit(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('item-name').value.trim(),
        stall: document.getElementById('restaurant').value.trim(),
        price: parseFloat(document.getElementById('price').value),
        category: document.getElementById('category').value,
        calories: parseInt(document.getElementById('calories').value || 0),
    };
    const targetId     = document.getElementById('item-index').value;
    const isUpdateMode = targetId !== '';
    const url    = isUpdateMode ? `/api/food_items/${targetId}` : '/api/food_items';
    const method = isUpdateMode ? 'PUT' : 'POST';

    try {
        const res  = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Server error.');
        showMsg('success', data.message);
        resetFormState();
        await initVendor();
    } catch (err) {
        showMsg('error', err.message);
    }
}

function startEdit(id) {
    const item = allItems.find(i => i.id === id);
    if (!item) return;
    document.getElementById('item-index').value = item.id;
    document.getElementById('item-name').value = item.name;
    document.getElementById('restaurant').value = item.stall;
    document.getElementById('price').value = item.price;
    document.getElementById('category').value = item.category;
    document.getElementById('calories').value = item.calories;
    document.getElementById('form-title').textContent = 'Edit Menu Item';
    document.getElementById('submit-btn').textContent = 'Save Changes';
    document.getElementById('cancel-btn').style.display = 'inline-block';
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
}

async function deleteItem(id) {
    if (!confirm('Remove this item from the menu?')) return;
    try {
        const res  = await fetch(`/api/food_items/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Delete failed.');
        showMsg('success', data.message);
        await initVendor();
    } catch (err) {
        showMsg('error', err.message);
    }
}

function resetFormState() {
    document.getElementById('menu-form').reset();
    document.getElementById('item-index').value = '';
    document.getElementById('form-title').textContent = 'Add New Menu Item';
    document.getElementById('submit-btn').textContent = 'Add Item ✚';
    document.getElementById('cancel-btn').style.display = 'none';
}

// HELPERS 

function showMsg(type, text) {
    let el = document.getElementById('vendor-msg');
    if (!el) {
        el = document.createElement('div');
        el.id = 'vendor-msg';
        document.querySelector('.form-actions').insertAdjacentElement('afterend', el);
    }
    el.className = type;
    el.textContent = text;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.className = 'hidden'; }, 4000);
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}