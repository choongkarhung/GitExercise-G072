let menuItems = [];

// DOM Initialization on Page Load
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    document.getElementById('menu-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('cancel-btn').addEventListener('click', resetFormState);
});

// Fetch all database items to display
async function loadDashboard() {
    try {
        const response = await fetch('/api/food_items');
        if (!response.ok) throw new Error('Database loading issue.');
        
        menuItems = await response.json();
        renderUI(); // Sync changes straight to the table layout
    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

// Dynamically build the table and update admin overview metrics
function renderUI() {
    const tableBody = document.getElementById('menu-table-body');
    tableBody.innerHTML = ''; // Clear stale data

    let totalItems = menuItems.length;
    let uniqueStalls = new Set();
    let priceSum = 0;

    menuItems.forEach(item => {
        uniqueStalls.add(item.stall);
        priceSum += parseFloat(item.price);

        // Map database response to HTML Table Row elements
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.name}</strong></td>
            <td>${item.stall}</td>
            <td>RM ${parseFloat(item.price).toFixed(2)}</td>
            <td><span class="badge ${item.category.toLowerCase()}">${item.category}</span></td>
            <td>${item.calories} kcal</td>
            <td style="text-align: center;">
                <button class="btn btn-edit" onclick="startEdit(${item.id})">Edit</button>
                <button class="btn btn-delete" onclick="deleteItem(${item.id})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Update Dashboard metric cards dynamically
    document.getElementById('stat-total-items').textContent = totalItems;
    document.getElementById('stat-total-restaurants').textContent = uniqueStalls.size;
    document.getElementById('stat-avg-price').textContent = `RM ${(totalItems > 0 ? priceSum / totalItems : 0).toFixed(2)}`;
}

// CREATE / UPDATE
async function handleFormSubmit(e) {
    e.preventDefault();

    const payload = {
        name: document.getElementById('item-name').value,
        stall: document.getElementById('restaurant').value, 
        price: parseFloat(document.getElementById('price').value),
        category: document.getElementById('category').value,
        calories: parseInt(document.getElementById('calories').value || 0)
    };

    const targetId = document.getElementById('item-index').value;
    const isUpdateMode = targetId !== '';
    
    const url = isUpdateMode ? `/api/food_items/${targetId}` : '/api/food_items';
    const method = isUpdateMode ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Server processing fail.');

        alert(data.message);
        resetFormState();
        loadDashboard(); // Refresh UI instantly from database changes
    } catch (error) {
        alert(`Transaction Failed: ${error.message}`);
    }
}

// Map a table row's data back into the form fields
function startEdit(id) {
    const item = menuItems.find(i => i.id === id);
    if (!item) return;

    document.getElementById('item-index').value = item.id;
    document.getElementById('item-name').value = item.name;
    document.getElementById('restaurant').value = item.stall;
    document.getElementById('price').value = item.price;
    document.getElementById('category').value = item.category;
    document.getElementById('calories').value = item.calories;

    document.getElementById('form-title').textContent = "Modify Menu Item";
    document.getElementById('submit-btn').textContent = "Save Changes";
    document.getElementById('cancel-btn').style.display = "inline-block";
}

// Calls the backend API soft-delete route
async function deleteItem(id) {
    if (!confirm("Are you sure you want to delete this menu item?")) return;

    try {
        const response = await fetch(`/api/food_items/${id}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Failed to remove entry.');
        
        alert(data.message);
        loadDashboard(); // Sync and clean UI layout
    } catch (error) {
        alert(`Deletion Error: ${error.message}`);
    }
}

// Return form to neutral create configuration
function resetFormState() {
    document.getElementById('menu-form').reset();
    document.getElementById('item-index').value = '';
    document.getElementById('form-title').textContent = "Add New Menu Item";
    document.getElementById('submit-btn').textContent = "Add Item";
    document.getElementById('cancel-btn').style.display = "none";
}