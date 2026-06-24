let currentRange = 'today';

const CATS = [
    { key: 'Carbs', label: 'Carbs', dotClass: 'dot-carbs', color: '#e8c050' },
    { key: 'Protein', label: 'Protein', dotClass: 'dot-protein', color: '#e87878' },
    { key: 'Beverage', label: 'Beverage', dotClass: 'dot-beverage', color: '#6a8fe8' },
    { key: 'Other', label: 'Other', dotClass: 'dot-other', color: '#b0a898' },
];

async function init() {
    document.querySelectorAll('.range-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.range === currentRange) return;
            document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentRange = btn.dataset.range;
            loadBreakdown();
        });
    });

    await loadBreakdown();
}

async function loadBreakdown() {
    showLoading();

    try {
        const res = await fetch(`/api/category_breakdown?range=${currentRange}`);
        if (!res.ok) {
            if (res.status === 401) { window.location.href = '/'; return; }
            if (res.status === 404) { showEmpty(); return; }
            throw new Error('Failed to load breakdown');
        }
        const data = await res.json();

        if (!data.total_items || data.total_items === 0) {
            showEmpty();
            return;
        }

        renderChart(data);
    } catch (e) {
        console.error(e);
        showEmpty();
    }
}

function showLoading() {
    document.getElementById('st-loading').classList.remove('hidden');
    document.getElementById('st-content').classList.add('hidden');
    document.getElementById('st-content').classList.remove('visible');
    document.getElementById('st-empty').classList.add('hidden');
    document.getElementById('st-empty').classList.remove('visible');
}

function showEmpty() {
    document.getElementById('st-loading').classList.add('hidden');
    document.getElementById('st-content').classList.add('hidden');
    document.getElementById('st-content').classList.remove('visible');
    document.getElementById('st-empty').classList.remove('hidden');
    document.getElementById('st-empty').classList.add('visible');
}

function renderChart(data) {
    document.getElementById('st-loading').classList.add('hidden');
    document.getElementById('st-empty').classList.add('hidden');
    document.getElementById('st-empty').classList.remove('visible');
    document.getElementById('st-content').classList.remove('hidden');
    document.getElementById('st-content').classList.add('visible');

    const total = data.total_items;
    document.getElementById('pie-total').textContent = total.toLocaleString();

    // Build conic-gradient slices, skipping zero-count categories
    let cursor = 0;
    const slices = [];
    const legendRows = [];

    CATS.forEach(cat => {
        const count = data.counts[cat.key] || 0;
        if (count <= 0) return;

        const pct = (count / total) * 100;
        const startDeg = (cursor / 100) * 360;
        cursor += pct;
        const endDeg = (cursor / 100) * 360;

        slices.push(`${cat.color} ${startDeg}deg ${endDeg}deg`);

        legendRows.push({
            label: cat.label,
            dotClass: cat.dotClass,
            count,
            pct,
        });
    });

    const pieEl = document.getElementById('pie-chart');
    if (slices.length === 1) {
        // Single category = solid circle, no gradient seams
        pieEl.style.background = slices[0].split(' ')[0];
    } else {
        pieEl.style.background = `conic-gradient(${slices.join(', ')})`;
    }

    const legendEl = document.getElementById('legend');
    legendEl.innerHTML = legendRows.map(row => `
        <div class="legend-item">
            <span class="legend-dot ${row.dotClass}"></span>
            <div class="legend-info">
                <div class="legend-label">${row.label}</div>
                <div class="legend-count">${row.count} item${row.count !== 1 ? 's' : ''}</div>
            </div>
            <span class="legend-pct">${row.pct.toFixed(0)}%</span>
        </div>
    `).join('');
}

init();