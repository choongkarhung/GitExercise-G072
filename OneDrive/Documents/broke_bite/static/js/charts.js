// DONUT CHART
const donutCtx = document.getElementById("donutChart");

new Chart(donutCtx, {
    type: "doughnut",
    data: {
        labels: Object.keys(categoryData),
        datasets: [{
            data: Object.values(categoryData),
            backgroundColor: ["#ff6384", "#36a2eb", "#ffcd56"]
        }]
    }
});


// GAUGE (semi-doughnut)
const gaugeCtx = document.getElementById("gaugeChart");

new Chart(gaugeCtx, {
    type: "doughnut",
    data: {
        labels: ["Remaining", "Used"],
        datasets: [{
            data: [remaining, 100 - remaining],
            backgroundColor: [
                getColor(remaining),
                "#e0e0e0"
            ]
        }]
    },
    options: {
        rotation: -90,
        circumference: 180,
        cutout: "70%",
        plugins: {
            legend: { display: false }
        }
    }
});

function getColor(value) {
    if (value > 60) return "green";
    if (value > 30) return "orange";
    return "red";
}