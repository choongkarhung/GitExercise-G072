// Seed Data: Pre-populating some items from your initial data list
const initialMenu = [
    { name: "Nasi goreng", restaurant: "Hajitapah Mamak", price: 4.50, category: "Carbs", calories: 500 },
    { name: "Teh (ais)", restaurant: "Hajitapah Mamak", price: 2.30, category: "Beverage", calories: 55 },
    { name: "Crispy chicken chop", restaurant: "Dapo Sahang", price: 10.00, category: "Protein", calories: 550 },
    { name: "Yee mee", restaurant: "Starbees(Home Sweet Home)", price: 6.50, category: "Carbs", calories: 420 },
    { name: "Chicken Chop Combo+Rice", restaurant: "Deen Cafe", price: 7.00, category: "Carbs", calories: 750 }
];

// Initialize global state array from localStorage, or load standard default items if empty
let menuItems = JSON.parse(localStorage.getItem('restaurantMenu')) || initialMenu;

// Query Form Elements
const menuForm = document.getElementById('menu-form');
const itemIndexInput = document.getElementById('item-index');
const itemNameInput = document.getElementById('item-name');
const restaurantInput = document.getElementById('restaurant');
const priceInput = document.getElementById('price');
const categoryInput = document.getElementById('category');
const caloriesInput = document.getElementById('calories');

const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const tableBody = document.getElementById('menu-table-body');

// UI Rendering Function
function renderDashboard() {
    // 1. Render Table Rows
    tableBody.innerHTML = '';
    menuItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.name}</strong></td>
            <td>${item.restaurant}</td>
            <td>RM ${parseFloat(item.price).toFixed(2)}</td>
            <td>${item.category}</td>
            <td>${item.calories} kcal</td>
            <td class="action-cell">
                <button class="btn btn-warning" onclick="editItem(${index})">Edit</button>
                <button class="btn btn-danger" onclick="deleteItem(${index})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // 2. Compute Dashboard Live Aggregated System Metrics
    document.getElementById('stat-total-items').textContent = menuItems.length;
    
    const uniqueRestaurants = [...new Set(menuItems.map(item => item.restaurant.toLowerCase().trim()))];
    document.getElementById('stat-total-restaurants').textContent = uniqueRestaurants.length;

    const avgPrice = menuItems.length > 0 
        ? menuItems.reduce((sum, item) => sum + parseFloat(item.price), 0) / menuItems.length 
        : 0;
    document.getElementById('stat-avg-price').textContent = `RM ${avgPrice.toFixed(2)}`;

    // 3. Keep local storage synced with running changes
    localStorage.setItem('restaurantMenu', JSON.stringify(menuItems));
}

// Processing Writes (Create & Update)
menuForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const newItem = {
        name: itemNameInput.value,
        restaurant: restaurantInput.value,
        price: parseFloat(priceInput.value),
        category: categoryInput.value,
        calories: parseInt(caloriesInput.value)
    };

    const targetIndex = itemIndexInput.value;

    if (targetIndex === '') {
        // Create Mode
        menuItems.push(newItem);
    } else {
        // Update Mode
        menuItems[targetIndex] = newItem;
        resetFormState();
    }

    renderDashboard();
    menuForm.reset();
});

// Setting UI Form contextual elements into Update Mode
window.editItem = function(index) {
    const item = menuItems[index];
    itemIndexInput.value = index;
    itemNameInput.value = item.name;
    restaurantInput.value = item.restaurant;
    priceInput.value = item.price;
    categoryInput.value = item.category;
    caloriesInput.value = item.calories;

    formTitle.textContent = "Modify Menu Item Elements";
    submitBtn.textContent = "Save Changes";
    submitBtn.style.backgroundColor = "#d35400";
    cancelBtn.style.display = "inline-block";
};

// Processing Deletions (Delete)
window.deleteItem = function(index) {
    if (confirm(`Are you sure you want to delete "${menuItems[index].name}"?`)) {
        menuItems.splice(index, 1);
        if (itemIndexInput.value == index) resetFormState();
        renderDashboard();
    }
};

// Reset interface configuration context to Creation Mode
cancelBtn.addEventListener('click', resetFormState);

function resetFormState() {
    menuForm.reset();
    itemIndexInput.value = '';
    formTitle.textContent = "Add New Menu Item";
    submitBtn.textContent = "Add Item";
    submitBtn.style.backgroundColor = "#27ae60";
    cancelBtn.style.display = "none";
}

// Initial Evaluation Run
renderDashboard();