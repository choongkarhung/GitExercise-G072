let options = window.wheelOptions && window.wheelOptions.length > 0 ? window.wheelOptions : ["Empty Menu"];
const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");
const size = canvas.width;
const center = size / 2;

let startAngle = 0;
const colors = ["#ffc107", "#ffb74d", "#81c784", "#4fc3f7", "#ba68c8", "#e57373", "#a1887f", "#90a4ae"];
let isSpinning = false;

function drawWheel() {
    ctx.clearRect(0, 0, size, size);

    if (!options || options.length === 0 || options[0] === "Empty Menu") {
        ctx.fillStyle = "#556670";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("No options left within budget!", center, center);
        return;
    }

    const numSlices = options.length;
    const arc = (2 * Math.PI) / numSlices;

    options.forEach((option, i) => {
        const angle = startAngle + i * arc;
        
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, center - 10, angle, angle + arc);
        ctx.lineTo(center, center);
        ctx.fill();
        
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.save();
        ctx.fillStyle = "#1a252c";
        ctx.translate(center, center);
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = "right";
        
        ctx.font = "bold 16px sans-serif";
        const shortText = option.length > 14 ? option.substring(0, 12) + "..." : option;
        ctx.fillText(shortText, center - 35, 5);
        ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(center, center, center - 10, 0, 2 * Math.PI);
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(center, center, 25, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#1a252c";
    ctx.lineWidth = 3;
    ctx.stroke();
}

function spinWheel() {
    if (isSpinning || !options || options.length === 0 || options[0] === "Empty Menu") return;
    
    // Auto-close open modal if resetting via "Spin Again" button
    document.getElementById('win-modal').style.display = 'none';
    
    isSpinning = true;
    
    const spinAngleStart = Math.random() * 10 + 25;
    const spinTimeTotal = Math.random() * 1000 + 3000; 
    let spinTime = 0;
    
    function rotate() {
        spinTime += 20;
        if (spinTime >= spinTimeTotal) {
            isSpinning = false;
            calculateWinner();
            return;
        }
        
        const progress = spinTime / spinTimeTotal;
        const easeOut = 1 - Math.pow(1 - progress, 4); 
        startAngle += (spinAngleStart * (1 - easeOut) * Math.PI) / 180;
        
        drawWheel();
        requestAnimationFrame(rotate);
    }
    rotate();
}

function calculateWinner() {
    const numSlices = options.length;
    const arcDegrees = 360 / numSlices;
    
    let normalizedAngle = (startAngle * 180 / Math.PI) % 360;
    if (normalizedAngle < 0) normalizedAngle += 360;
    
    const index = Math.floor((360 - normalizedAngle) / arcDegrees) % numSlices;
    const winnerText = options[index];
    
    // Call our brand-new sleek design system popup
    triggerWinModal(winnerText);
}

function triggerWinModal(prizeName) {
    document.getElementById('modal-prize-text').textContent = prizeName;
    
    const modal = document.getElementById('win-modal');
    modal.style.display = 'flex';
    
    document.getElementById('modal-close-btn').onclick = function() {
        modal.style.display = 'none';
    };
}

drawWheel();