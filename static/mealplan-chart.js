/**
 * BrokeBite - Non-Invasive Meal Plan Pie Chart Synchronization
 * Automatically plugs into the active session UI without modifying structural codebase layers.
 */
(function() {
    // 1. Dynamically inject Chart.js library into document head from CDN
    const chartScript = document.createElement('script');
    chartScript.src = "https://cdn.jsdelivr.net/npm/chart.js";
    document.head.appendChild(chartScript);

    let mealPlanChart = null;

    // 2. Setup structural HTML card layout dynamically under the existing meals block
    function guaranteeChartUI() {
        if (document.getElementById('mealplan-pie-chart-card')) return;

        const targetRow = document.getElementById('meals-row');
        if (!targetRow) return;

        const chartCard = document.createElement('div');
        chartCard.id = "mealplan-pie-chart-card";
        chartCard.style.cssText = `
            max-width: 440px;
            margin: 30px auto;
            padding: 24px;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.04);
            text-align: center;
            display: none;
        `;

        chartCard.innerHTML = `
            <h3 style="margin-bottom: 18px; color: #2c3e50; font-family: system-ui, sans-serif; font-size: 1.1rem; font-weight: 600; letter-spacing: -0.3px;">
                Macro Distribution Breakdown
            </h3>
            <canvas id="injectedMealPlanPieChart"></canvas>
        `;

        // Safely place the new chart card element exactly after your meals layout row
        targetRow.parentNode.insertBefore(chartCard, targetRow.nextSibling);
    }

    // 3. Process categorical tallies and render/update the interactive layout
    function updateInjectedChart(meals) {
        guaranteeChartUI();
        
        const chartCard = document.getElementById('mealplan-pie-chart-card');
        if (!chartCard || !window.Chart) return;

        // Dynamic category aggregation (handles user additions from admin panels on-the-fly)
        const categories = {};
        meals.forEach(item => {
            if (item && item.category) {
                // Normalize category strings to manage naming variances gracefully
                let catName = item.category.trim();
                if (catName.toLowerCase().startsWith('carb')) catName = 'Carbs';
                else if (catName.toLowerCase().startsWith('protein')) catName = 'Protein';
                else if (catName.toLowerCase().startsWith('bev')) catName = 'Beverages';

                categories[catName] = (categories[catName] || 0) + 1;
            }
        });

        const labels = Object.keys(categories);
        const dataValues = Object.values(categories);

        if (labels.length === 0) {
            chartCard.style.display = 'none';
            return;
        }

        chartCard.style.display = 'block';

        // Aesthetic theme color configuration
        const colorPalette = {
            'Carbs': '#3498db',     // Vibrant Blue
            'Protein': '#2ecc71',   // Healthy Green
            'Beverages': '#e67e22', // Warm Orange
            'Juice': '#f1c40f',
            'Snack': '#9b59b6'
        };
        const backgroundColors = labels.map(label => colorPalette[label] || '#' + Math.floor(Math.random()*16777215).toString(16));

        const ctx = document.getElementById('injectedMealPlanPieChart').getContext('2d');

        if (mealPlanChart) {
            // Update the chart dataset dynamically when a user clicks "Regenerate Plan"
            mealPlanChart.data.labels = labels;
            mealPlanChart.data.datasets[0].data = dataValues;
            mealPlanChart.data.datasets[0].backgroundColor = backgroundColors;
            mealPlanChart.update();
        } else {
            // Instantiate chart engine instance
            mealPlanChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataValues,
                        backgroundColor: backgroundColors,
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { font: { family: 'system-ui', size: 12, weight: '500' } }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.raw / total) * 100).toFixed(1);
                                    return ` ${context.label}: ${context.raw} item(s) (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    // 4. Overwrite global network fetch seamlessly to map state mutations safely
    const nativeFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await nativeFetch.apply(this, args);
        const endpointUrl = typeof args[0] === 'string' ? args[0] : '';

        // Safely targets dynamic meal plan routing endpoints 
        if (endpointUrl.includes('/api/meals') || endpointUrl.includes('/api/mealplan')) {
            try {
                const clonedResponse = response.clone();
                clonedResponse.json().then(data => {
                    const mealsArray = Array.isArray(data) ? data : (data.meals || []);
                    if (mealsArray.length > 0) {
                        // Short buffer delay handles internal thread timings 
                        setTimeout(() => updateInjectedChart(mealsArray), 200);
                    }
                });
            } catch (err) {
                console.error("Chart auto-sync catch block context:", err);
            }
        }
        return response;
    };
})();