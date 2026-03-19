const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const uiLayer = document.getElementById("uiLayer");
const finalScoreText = document.getElementById("finalScore");

let score = 0;
let isGameOver = false;
let animationId;

// --- Entitas Game ---
const player = {
    x: 0,
    y: 0,
    width: 40,
    height: 40,
    speed: 3,
    cooldown: 0
};

// --- Penyesuaian Ukuran Layar ---
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Posisikan pemain di tengah bawah setiap kali layar diubah (atau baru mulai)
    player.y = canvas.height - 80;
    if(player.x === 0 || player.x > canvas.width) {
        player.x = canvas.width / 2;
    }
    
    // Sesuaikan jumlah bintang dengan ukuran layar
    initStars();
}
window.addEventListener('resize', resizeCanvas);

// --- Kontrol Input ---
const keys = { ArrowLeft: false, ArrowRight: false, Space: false };
let isTouching = false;
let touchX = 0;

// Kontrol Keyboard (PC)
document.addEventListener("keydown", (e) => {
    if (e.code === "ArrowLeft") keys.ArrowLeft = true;
    if (e.code === "ArrowRight") keys.ArrowRight = true;
    if (e.code === "Space") keys.Space = true;
});
document.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft") keys.ArrowLeft = false;
    if (e.code === "ArrowRight") keys.ArrowRight = false;
    if (e.code === "Space") keys.Space = false;
});

// Kontrol Sentuh/Mouse (Mobile/Tablet)
canvas.addEventListener('mousedown', (e) => { isTouching = true; touchX = e.clientX; });
canvas.addEventListener('mousemove', (e) => { if(isTouching) touchX = e.clientX; });
canvas.addEventListener('mouseup', () => { isTouching = false; });

canvas.addEventListener('touchstart', (e) => { isTouching = true; touchX = e.touches[0].clientX; });
canvas.addEventListener('touchmove', (e) => { touchX = e.touches[0].clientX; });
canvas.addEventListener('touchend', () => { isTouching = false; });

// --- Efek Latar Belakang (Bintang) ---
let stars = [];
function initStars() {
    stars = [];
    let numStars = Math.floor((canvas.width * canvas.height) / 5000); // Kepadatan bintang
    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2.5,
            speed: Math.random() * 2 + 0.5
        });
    }
}

function drawStars() {
    ctx.fillStyle = "white";
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
}

let bullets = [];
let enemies = [];
let particles = [];

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#00ffff";
    ctx.fillStyle = "#00ffff";

    ctx.beginPath();
    ctx.moveTo(0, -player.height / 2);
    ctx.lineTo(player.width / 2, player.height / 2);
    ctx.lineTo(0, player.height / 4);
    ctx.lineTo(-player.width / 2, player.height / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, -player.height / 4);
    ctx.lineTo(10, 10);
    ctx.lineTo(-10, 10);
    ctx.fill();

    ctx.restore();
}

function drawBullets() {
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ffaa00";
    ctx.fillStyle = "#ffaa00";
    bullets.forEach(b => {
        ctx.fillRect(b.x - 2, b.y, 4, 15);
    });
    ctx.shadowBlur = 0;
}

function drawEnemies() {
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ff0055";
    ctx.fillStyle = "#ff0055";
    enemies.forEach(e => {
        ctx.save();
        ctx.translate(e.x, e.y);
        
        ctx.beginPath();
        ctx.moveTo(0, -e.size);
        ctx.lineTo(e.size, 0);
        ctx.lineTo(0, e.size);
        ctx.lineTo(-e.size, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = "#220011";
        ctx.beginPath();
        ctx.arc(0, 0, e.size/3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });
    ctx.shadowBlur = 0;
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1.0, color: color
        });
    }
}

function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;

        if (p.life <= 0) particles.splice(i, 1);
    }
    ctx.globalAlpha = 1.0;
}

function updateGame() {
    if (isGameOver) return;

    // Gerakan Keyboard
    if (keys.ArrowLeft && player.x > player.width / 2) player.x -= player.speed;
    if (keys.ArrowRight && player.x < canvas.width - player.width / 2) player.x += player.speed;

    // Gerakan Sentuh (Mobile)
    if (isTouching) {
        // Smooth follow ke jari
        player.x += (touchX - player.x) * 0.15; 
        // Batasi agar tidak keluar layar
        if(player.x < player.width/2) player.x = player.width/2;
        if(player.x > canvas.width - player.width/2) player.x = canvas.width - player.width/2;
    }

    // Menembak (Spasi atau Saat disentuh layarnya)
    let isShooting = keys.Space || isTouching;
    
    if (player.cooldown > 0) player.cooldown--;
    if (isShooting && player.cooldown === 0) {
        bullets.push({ x: player.x, y: player.y - player.height / 2, speed: 15 });
        player.cooldown = 15; // Kecepatan tembak
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= bullets[i].speed;
        if (bullets[i].y < 0) bullets.splice(i, 1);
    }

    // Responsif spawn musuh berdasarkan lebar layar (layar lebar = musuh lebih banyak)
    let spawnRate = (canvas.width / 100000) + (score * 0.0001);
    if (Math.random() < spawnRate) {
        let size = Math.random() * 10 + 15;
        enemies.push({
            x: Math.random() * (canvas.width - size * 1) + size,
            y: -35,
            size: size,
            speed: Math.random() * 2 + 2 + (score * 0.02)
        });
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        e.y += e.speed;

        for (let j = bullets.length - 1; j >= 0; j--) {
            let b = bullets[j];
            if (Math.hypot(e.x - b.x, e.y - b.y) < e.size) {
                createExplosion(e.x, e.y, "#ff0055");
                enemies.splice(i, 1);
                bullets.splice(j, 1);
                score += 10;
                break; 
            }
        }

        if (Math.hypot(e.x - player.x, e.y - player.y) < e.size + player.width / 2 - 5) {
            createExplosion(player.x, player.y, "#00ffff");
            gameOver();
        }

        if (e && e.y > canvas.height + 30) enemies.splice(i, 1);
    }
}

function drawUI() {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px 'Segoe UI'";
    ctx.shadowBlur = 5;
    ctx.shadowColor = "#000";
    ctx.fillText("SKOR: " + score, 15, 35);
    ctx.shadowBlur = 0;
}

function gameOver() {
    isGameOver = true;
    finalScoreText.innerText = score;
    uiLayer.classList.remove("hidden");
    isTouching = false; // Matikan touch saat game over
}

// Tambahkan logika ini ke global agar tombol di HTML bisa memanggilnya
window.resetGame = function() {
    score = 0;
    player.x = canvas.width / 2;
    bullets = [];
    enemies = [];
    particles = [];
    isGameOver = false;
    uiLayer.classList.add("hidden");
    loop();
}

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawStars();
    
    if (!isGameOver) drawPlayer();
    
    drawBullets();
    drawEnemies();
    drawParticles();
    drawUI();

    updateGame();

    if (!isGameOver) {
        animationId = requestAnimationFrame(loop);
    }
}

// Inisialisasi awal
resizeCanvas();
loop();
          
