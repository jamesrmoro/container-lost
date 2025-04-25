if (localStorage.getItem("skipIntro") === "true") {
    document.documentElement.classList.add("intro-skipped");
}
const canvas = document.getElementById("gameCanvas");
const stage = new createjs.Stage(canvas);
createjs.Ticker.framerate = 60;

let robot, aura, score = 0,
    lives = 20,
    fallingItems = [],
    powerUps = [],
    bonusItems = [],
    gameRunning = true;
let highScore = localStorage.getItem("containerHighScore") || 0;
let direction = 1;
const robotSpeedOriginal = 2;
let robotSpeed = robotSpeedOriginal;
let spacePressed = false;
let robotFrame = 1;
let robotAnimInterval;
let shieldActive = false;
let shieldTimeout;
let musicOn = true;
let shieldBar, shieldBarBg, shieldText, shieldTween;
let goldenAura = false;

let movingLeft = false;
let movingRight = false;
let touchInterval = null;

const ROBOT_WIDTH = 91;
const ROBOT_HEIGHT = 108;

let lastSpawnX = null;
const MIN_ITEM_DISTANCE_X = 80; // distância mínima em pixels
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);


const restartBtn = document.getElementById("restartBtn");
const startBtn = document.getElementById("startBtn");
const soundToggle = document.getElementById("soundToggle");

const robotImg = new Image();
robotImg.src = "./assets/images/robot-1.webp";
const damageIcons = ["./assets/images/game.webp", "./assets/images/tv.webp", "./assets/images/drone.webp", "./assets/images/phone.webp", "./assets/images/sound.webp"];
const bgImg = new Image();
bgImg.src = "./assets/images/bg.jpg";
const shieldImg = new Image();
shieldImg.src = "./assets/images/shield.webp";
const lifeImg = new Image();
lifeImg.src = "./assets/images/life.webp";
const bonusImg = new Image();
bonusImg.src = "./assets/images/combo.webp";
let idleLock = false;

const bonusSound = new Audio("./assets/sounds/bonus.mp3");
const shieldSound = new Audio("./assets/sounds/shield.mp3");
const lifeSound = new Audio("./assets/sounds/life.mp3");
const bgMusic = new Audio("./assets/sounds/soundtrack.mp3");
const hitSound = new Audio("./assets/sounds/reached.mp3");
const comboSound = new Audio("./assets/sounds/thunder.mp3");

const comboMasterImg = new Image();
comboMasterImg.src = "./assets/images/battery.webp";

let lastBonusTime = 0;
let lastBonusX = null;
const MIN_BONUS_INTERVAL = 3000; // 3 segundos
const MIN_BONUS_DISTANCE = 100; // distância mínima entre bônus

let idleBar, idleBarBg, idleTween;

bgMusic.loop = true;

soundToggle.onclick = () => {
    musicOn = !musicOn;
    soundToggle.innerText = musicOn ? "🔊 ON" : "🔇 OFF";
    bgMusic.volume = musicOn ? 1 : 0;
};


robotImg.onload = () => {
    startBtn.style.display = "block";
};

startBtn.onclick = () => {

    document.getElementById("startOverlay").style.display = "none";
    document.getElementById("ui").style.display = "block";
    document.getElementById("gameWrapper").classList.add("rocking");
    init();
    createjs.Ticker.removeEventListener("tick", tick);
    createjs.Ticker.addEventListener("tick", tick);
};

restartBtn.onclick = () => {
    localStorage.setItem("skipIntro", "true");
    location.reload();
};


function init() {
    requestAnimationFrame(() => {
        document.getElementById("gameWrapper").style.filter = "none";
        document.getElementById("gameWrapper").classList.remove("blurred");
        const wrapper = document.getElementById("gameWrapper");
        const bounds = wrapper.getBoundingClientRect();

        canvas.style.width = bounds.width + "px";
        canvas.style.height = bounds.height + "px";

        if (window.innerWidth <= 600) {
            const scale = bounds.width / 350;
            stage.scaleX = scale;
            stage.scaleY = scale;
        } else {
            stage.scaleX = 1;
            stage.scaleY = 1;
        }

        startGameAfterCanvasReady();
    });
}


function startGameAfterCanvasReady() {

    stage.removeAllChildren();

    fallingItems = [];
    powerUps = [];
    bonusItems = [];
    score = 0;
    lives = 20;
    gameRunning = true;
    direction = 1;
    robotFrame = 1;
    shieldActive = false;
    document.getElementById("score").innerText = "Pontos: 0";
    document.getElementById("highScore").innerText = "Recorde: " + highScore;
    updateLifeBar();
    restartBtn.style.display = "none";

    const bg = new createjs.Bitmap(bgImg);
    const scale = Math.max(
        canvas.width / bgImg.width,
        canvas.height / bgImg.height
    );
    bg.scaleX = bg.scaleY = scale;

    // Centraliza o background no canvas
    bg.x = (canvas.width - bgImg.width * scale) / 2;
    bg.y = (canvas.height - bgImg.height * scale) / 2;

    stage.addChild(bg);

    robot = new createjs.Bitmap(robotImg);
    let robotScale = ROBOT_WIDTH / robotImg.width;
    robot.scaleX = robotScale;
    robot.scaleY = ROBOT_HEIGHT / robotImg.height;
    robot.regX = 0;
    robot.x = canvas.width / 2 - ROBOT_WIDTH / 2;
    robot.y = canvas.height - ROBOT_HEIGHT - 10;
    stage.addChild(robot);

    idleBarBg = new createjs.Shape();
    idleBarBg.graphics.beginFill("#333").drawRoundRect(0, 0, 60, 6, 3);
    idleBarBg.alpha = 0;
    stage.addChild(idleBarBg);

    idleBar = new createjs.Shape();
    idleBar.graphics.beginFill("#ccc").drawRoundRect(0, 0, 60, 6, 3);
    idleBar.alpha = 0;
    stage.addChild(idleBar);

    aura = new createjs.Shape();
    stage.addChild(aura);

    shieldBarBg = new createjs.Shape();
    shieldBarBg.graphics.beginFill("#400").drawRoundRect(0, 0, 60, 8, 4);
    shieldBarBg.alpha = 0;
    stage.addChild(shieldBarBg);

    shieldBar = new createjs.Shape();
    shieldBar.graphics.beginFill("#ff4444").drawRoundRect(0, 0, 60, 8, 4);
    shieldBar.alpha = 0;
    stage.addChild(shieldBar);

    shieldText = new createjs.Text("protection", "12px monospace", "#ff9999");
    shieldText.textAlign = "center";
    shieldText.textBaseline = "bottom";
    shieldText.alpha = 0;
    stage.addChild(shieldText);

    idleText = new createjs.Text("rusting", "12px monospace", "#cccccc");
    idleText.textAlign = "center";
    idleText.textBaseline = "bottom";
    idleText.alpha = 0;
    stage.addChild(idleText);

    startBounce();
    spawnLoop();
    powerUpLoop();
    bonusLoop();

    // Garante que a imagem foi aplicada ao robô antes de iniciar a animação
    setTimeout(() => {
        startRobotAnimation();
    }, 100); // espera 100ms para garantir que a imagem está pronta
}


function spawnLoop() {
    if (!gameRunning) return;
    spawnItem();
    let interval = 2000 - score * 3;
    interval = Math.max(1000, interval); // nunca menor que 600ms
    setTimeout(spawnLoop, interval);

}

function spawnItem() {
    const icon = damageIcons[Math.floor(Math.random() * damageIcons.length)];
    const img = new Image();
    img.src = icon;
    img.onload = () => {
        let spawnX;
        let attempts = 0;
        do {
            spawnX = Math.random() * (canvas.width - 30) + 15;
            attempts++;
        } while (lastSpawnX !== null && Math.abs(spawnX - lastSpawnX) < MIN_ITEM_DISTANCE_X && attempts < 10);

        lastSpawnX = spawnX;

        const bmp = new createjs.Bitmap(img);
        bmp.regX = 15;
        bmp.regY = 26.5;
        bmp.scaleX = bmp.scaleY = 1;
        bmp.x = spawnX;
        bmp.y = -60;
        bmp.speed = 2 + score * 0.05;
        fallingItems.push(bmp);
        stage.addChild(bmp);
    };
}


let lastShieldTime = 0;

function powerUpLoop() {
    if (!gameRunning) return;

    spawnPowerUp();

    let delay = 8000 + score * 300;
    delay = Math.min(delay, 30000); // máximo de 30s

    setTimeout(powerUpLoop, delay);
}

function spawnPowerUp() {
    const now = Date.now();
    let type = "life";

    // Só permite shield se já passou 15 segundos desde o último
    if (Math.random() < 0.25 && (now - lastShieldTime > 15000)) {
        type = "shield";
        lastShieldTime = now;
    }

    const img = type === "shield" ? shieldImg : lifeImg;
    const bmp = new createjs.Bitmap(img);
    bmp.scaleX = bmp.scaleY = 1;
    bmp.effect = type;
    bmp.x = Math.random() < 0.5 ? 35 : canvas.width - 64 - 35;
    bmp.y = canvas.height - 74;
    powerUps.push(bmp);
    stage.addChild(bmp);

    let visibleTime = 5000 - score * 100;
    visibleTime = Math.max(1500, visibleTime);

    setTimeout(() => {
        if (gameRunning && stage.contains(bmp)) {
            stage.removeChild(bmp);
            powerUps = powerUps.filter(p => p !== bmp);
        }
    }, visibleTime);
}


function spawnComboMaster() {
    const now = Date.now();
    const newX = Math.random() * (canvas.width - 30) + 15;

    if ((now - lastBonusTime < MIN_BONUS_INTERVAL) ||
        (lastBonusX !== null && Math.abs(newX - lastBonusX) < MIN_BONUS_DISTANCE)) {
        return; // cancela o spawn se for muito próximo
    }

    lastBonusTime = now;
    lastBonusX = newX;

    const bmp = new createjs.Bitmap(comboMasterImg);
    bmp.regX = 15;
    bmp.regY = 26.5;
    bmp.scaleX = bmp.scaleY = 1.1;
    bmp.x = newX;
    bmp.y = -60;
    bmp.speed = 2;
    bmp.effect = "combo";
    bmp.shadow = new createjs.Shadow("#79d044", 0, 0, 15);
    createjs.Tween.get(bmp, {
        loop: true
    }).to({
        rotation: 360
    }, 1500);
    bonusItems.push(bmp);
    stage.addChild(bmp);
}


function bonusLoop() {
    if (!gameRunning) return;

    const spawnCombo = Math.random() < 0.25;

    if (spawnCombo) {
        spawnComboMaster();
        setTimeout(() => {
            if (gameRunning) spawnBonus();
        }, 1500); // delay para evitar sobreposição
    } else {
        spawnBonus();
    }

    setTimeout(bonusLoop, 7000);
}


function createLifeRestoredText() {
    const text = new createjs.Text("Life Restored", "bold 24px monospace", "#ffffff");
    text.x = canvas.width / 2;
    text.y = robot.y - 30; // um pouco acima do robô
    text.alpha = 1;
    text.textAlign = "center";
    text.textBaseline = "middle";
    text.scaleX = text.scaleY = 1.2; // zoom inicial reduzido
    text.shadow = new createjs.Shadow("#ffffff", 0, 0, 6);
    stage.addChild(text);

    createjs.Tween.get(text)
        .wait(2000) // espera 2 segundos
        .to({
            scaleX: 1.6,
            scaleY: 1.6,
            alpha: 0
        }, 500, createjs.Ease.quadOut)
        .call(() => stage.removeChild(text));
}


function spawnBonus() {
    const now = Date.now();
    const newX = Math.random() * (canvas.width - 30) + 15;

    if ((now - lastBonusTime < MIN_BONUS_INTERVAL) ||
        (lastBonusX !== null && Math.abs(newX - lastBonusX) < MIN_BONUS_DISTANCE)) {
        return;
    }

    lastBonusTime = now;
    lastBonusX = newX;

    const bmp = new createjs.Bitmap(bonusImg);
    bmp.regX = 15;
    bmp.regY = 26.5;
    bmp.scaleX = bmp.scaleY = 1;
    bmp.x = newX;
    bmp.y = -60;
    bmp.speed = 2.5;
    bmp.effect = "bonus";
    bmp.shadow = new createjs.Shadow("#FFD700", 0, 0, 12);
    createjs.Tween.get(bmp, {
        loop: true
    }).to({
        rotation: 360
    }, 2000);
    bonusItems.push(bmp);
    stage.addChild(bmp);
}


let targetSpeed = 0;
let velocityX = 0;
const easing = 0.2; // suavidade na transição de velocidade
const maxSpeed = 6;

function tick() {
    if (!gameRunning || !robot) return;

    if (!gameRunning || !robot) return;

    // Define a velocidade alvo com base no input
    if (rusting) {
        // Impede qualquer movimento
        velocityX = 0;
        targetSpeed = 0;
        movingLeft = false;
        movingRight = false;
    } else {
        if (movingLeft) {
            targetSpeed = -maxSpeed;
        } else if (movingRight) {
            targetSpeed = maxSpeed;
        } else {
            targetSpeed = 0;
        }
    }


    // Interpola suavemente a velocidade atual para a velocidade alvo
    velocityX += (targetSpeed - velocityX) * easing;

    // Aplica a velocidade ao robô
    robot.x += velocityX;

    const WALL_PADDING = 6;
    const leftLimit = WALL_PADDING;
    const rightLimit = canvas.width - ROBOT_WIDTH - WALL_PADDING;


    if (robot.x <= leftLimit) {
        robot.x = leftLimit;
        velocityX = 0;
        vibrateCanvas();
    } else if (robot.x >= rightLimit) {
        robot.x = rightLimit;
        velocityX = 0;
        vibrateCanvas();
    }

    if (Math.abs(velocityX) < 0.01) {
        idleTime += 1 / 60;

        // Após 5 segundos parados, exibe a barrinha e inicia contagem regressiva de 10s
        if (idleTime >= 5 && !idleTween && !idleLock && gameRunning) {
            idleBar.scaleX = 1;
            idleTween = createjs.Tween.get(idleBar)
                .to({
                    scaleX: 0
                }, 10000, createjs.Ease.linear)
                .call(() => {
                    idleTween = null;
                    idleBar.alpha = 0;
                    idleBarBg.alpha = 0;
                    applyRustingEffect(); // agora SEM checar idleTime
                });

            idleBar.alpha = 1;
            idleBarBg.alpha = 0.4;
        }

    } else {
        resetIdleTimer();
    }


    aura.graphics.clear();
    if (shieldActive) {
        const color = goldenAura ? "gold" : "cyan";
        aura.graphics.setStrokeStyle(3).beginStroke(color).drawEllipse(
            robot.x - 10, robot.y - 10, ROBOT_WIDTH + 20, ROBOT_HEIGHT + 20
        );
    }

    for (let i = fallingItems.length - 1; i >= 0; i--) {
        let item = fallingItems[i];

        if (item.exiting) {
            item.y += item.speed;
            item.rotation += 1;
            if (
                !stage.contains(item) ||
                item.alpha <= 0.05 ||
                item.y > canvas.height + 100 ||
                item.y < -100 ||
                isNaN(item.y)
            ) {
                stage.removeChild(item);
                fallingItems.splice(i, 1);
                continue;
            }
            continue;
        }

        item.y += item.speed;
        item.rotation += 1;

        if (checkCollision(item, robot)) {
            if (shieldActive) {
                item.exiting = true;

                score += 0.5;
                document.getElementById("score").innerText = "Pontos: " + Math.floor(score);
                createScoreText("+0.5", item.x, item.y);

                setTimeout(() => {
                    if (stage.contains(item)) stage.removeChild(item);
                    const index = fallingItems.indexOf(item);
                    if (index !== -1) fallingItems.splice(index, 1);
                }, 800);

                createjs.Tween.get(item)
                    .to({
                        y: item.y - 150,
                        x: item.x + (Math.random() > 0.5 ? 100 : -100),
                        rotation: item.rotation + 720,
                        alpha: 0
                    }, 500, createjs.Ease.quadOut)
                    .call(() => {
                        if (stage.contains(item)) stage.removeChild(item);
                        const index = fallingItems.indexOf(item);
                        if (index !== -1) fallingItems.splice(index, 1);
                    });
            } else {
                hitSound.currentTime = 0;
                hitSound.play();
                createExplosion(robot.x, robot.y);
                lives = Math.max(0, lives - 1);
                updateLifeBar();

                createjs.Tween.get(robot)
                    .to({
                        alpha: 0
                    }, 100)
                    .to({
                        alpha: 1
                    }, 100)
                    .to({
                        alpha: 0
                    }, 100)
                    .to({
                        alpha: 1
                    }, 100);

                if (lives <= 0) endGame();

                stage.removeChild(item);
                fallingItems.splice(i, 1);
            }
            continue;
        }

        if (item.y > canvas.height) {
            const circle = new createjs.Shape();
            circle.graphics.beginFill("rgba(255,255,255,0.3)").drawCircle(0, 0, 10);
            circle.x = item.x;
            circle.y = canvas.height - 5;
            stage.addChild(circle);

            createjs.Tween.get(circle)
                .to({
                    scaleX: 5,
                    scaleY: 0.5,
                    alpha: 0
                }, 400, createjs.Ease.quadOut)
                .call(() => stage.removeChild(circle));

            const avoidSound = new Audio("./assets/sounds/avoid.mp3");
            avoidSound.play();

            stage.removeChild(item);
            fallingItems.splice(i, 1);

            score++;
            if (score > highScore) {
                highScore = score;
                localStorage.setItem("containerHighScore", highScore);
                document.getElementById("highScore").innerText = "Recorde: " + highScore;
            }
            document.getElementById("score").innerText = "Pontos: " + score;
            createScoreText("+1", item.x, canvas.height - 20);
        }
    }

    for (let i = powerUps.length - 1; i >= 0; i--) {
        let p = powerUps[i];
        if (checkCollision(p, robot)) {
            applyPowerUp(p.effect);
            stage.removeChild(p);
            powerUps.splice(i, 1);
        }
    }

    function showLightningEffect() {
        const wrapper = document.getElementById("gameWrapper");

        const lightning1 = document.createElement("img");
        lightning1.src = "./assets/images/rain-1.webp";
        lightning1.style.position = "absolute";
        lightning1.style.top = "0";
        lightning1.style.left = "0";
        lightning1.style.width = "100%";
        lightning1.style.height = "100%";
        lightning1.style.objectFit = "cover";
        lightning1.style.zIndex = "9999";
        lightning1.style.pointerEvents = "none";
        lightning1.style.opacity = "0";

        const lightning2 = lightning1.cloneNode();
        lightning2.src = "./assets/images/rain-2.webp";

        wrapper.appendChild(lightning1);
        wrapper.appendChild(lightning2);

        // Simula o flash rápido de raio
        setTimeout(() => lightning1.style.opacity = "1", 100);
        setTimeout(() => lightning1.style.opacity = "0", 300);
        setTimeout(() => lightning2.style.opacity = "1", 400);
        setTimeout(() => lightning2.style.opacity = "0", 600);

        // Remove os elementos depois
        setTimeout(() => {
            wrapper.removeChild(lightning1);
            wrapper.removeChild(lightning2);
        }, 1000);
    }


    for (let i = bonusItems.length - 1; i >= 0; i--) {
        let b = bonusItems[i];
        b.y += b.speed;

        if (checkCollision(b, robot)) {
            if (b.effect === "combo") {
                lives = 20;
                updateLifeBar();
                comboSound.play();
                showLightningEffect();
                createGlobalExplosion();
                applyFreezeEffect();

                setTimeout(() => {
                    const restored = new Audio("./assets/sounds/life-restored.mp3");
                    restored.play();
                    setTimeout(() => {
                        createLifeRestoredText();
                    }, 100);
                }, 1650); // após último flash de raio (~600ms)


                stage.removeChild(b);
                bonusItems.splice(i, 1);
                continue;
            }

            score += 10;
            document.getElementById("score").innerText = "Pontos: " + score;
            createScoreText("+10");
            bonusSound.play();

            robot.filters = [new createjs.ColorFilter(0.8, 1.2, 0.4, 1, 0, 255, 150, 0)];
            robot.shadow = new createjs.Shadow("#00ffff", 0, 0, 25);
            robot.cache(0, 0, robot.image.width, robot.image.height);

            setTimeout(() => {
                robot.filters = [];
                robot.shadow = null;
                robot.uncache();
            }, 2000);

            if (shieldActive) {
                goldenAura = true;
                setTimeout(() => goldenAura = false, 2000);
            }

            stage.removeChild(b);
            bonusItems.splice(i, 1);
            continue;
        }

        if (b.y > canvas.height) {
            stage.removeChild(b);
            bonusItems.splice(i, 1);
        }
    }

    if (shieldBar && shieldBarBg && shieldText) {
        const barX = robot.x + ROBOT_WIDTH / 2 - 30;
        const barY = robot.y - 20;
        shieldBar.x = barX;
        shieldBar.y = barY;
        shieldBarBg.x = barX;
        shieldBarBg.y = barY;
        shieldText.x = barX + 30;
        shieldText.y = barY - 2;
    }

    if (idleBar && idleBarBg) {
        const idleX = robot.x + ROBOT_WIDTH / 2 - 30;
        const idleY = robot.y - 42;
        idleBar.x = idleX;
        idleBar.y = idleY;
        idleBarBg.x = idleX;
        idleBarBg.y = idleY;

        idleText.x = idleX + 30;
        idleText.y = idleY - 2;
        idleText.alpha = idleBar.alpha;
    }


    stage.update();
}


function applyFreezeEffect() {
    // Cria o overlay escuro
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0, 0, 0, 0.8)";
    overlay.style.zIndex = 9998;
    overlay.style.pointerEvents = "none";
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 0.3s ease";
    document.body.appendChild(overlay);

    // Cria os raios (acima do overlay)
    const lightning1 = document.createElement("img");
    lightning1.src = "./assets/images/rain-1.webp";
    lightning1.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 350px;
    height: 100%;
    pointer-events: none;
    opacity: 0;
    margin: 0 auto;
    z-index: 9999;
    transition: opacity 0.1s;
    background-size: cover;
  `;

    const lightning2 = lightning1.cloneNode();
    lightning2.src = "./assets/images/rain-2.webp";

    document.body.appendChild(lightning1);
    document.body.appendChild(lightning2);

    // Aplica efeito visual
    setTimeout(() => overlay.style.opacity = "1", 50);
    gameRunning = false;
    createjs.Ticker.removeEventListener("tick", tick);

    // Flash dos raios
    setTimeout(() => lightning1.style.opacity = "1", 150);
    setTimeout(() => lightning1.style.opacity = "0", 300);
    setTimeout(() => lightning2.style.opacity = "1", 400);
    setTimeout(() => lightning2.style.opacity = "0", 600);

    // Volta à cena após o efeito
    setTimeout(() => {
        overlay.style.opacity = "0";
        robotSpeed = robotSpeedOriginal;
        gameRunning = true;
        createjs.Ticker.addEventListener("tick", tick);
        spawnLoop();
        bonusLoop();
        powerUpLoop();

        setTimeout(() => {
            document.body.removeChild(overlay);
            document.body.removeChild(lightning1);
            document.body.removeChild(lightning2);
        }, 500);
    }, 1000);
}


function createGlobalExplosion() {
    for (let i = 0; i < 60; i++) {
        const shape = new createjs.Shape();
        const size = Math.random() * 5 + 3;
        shape.graphics.beginFill("#ffcc00").drawRect(0, 0, size, size);
        shape.regX = size / 2;
        shape.regY = size / 2;
        shape.x = canvas.width / 2;
        shape.y = canvas.height / 2;
        shape.rotation = Math.random() * 360;
        shape.alpha = 1;
        stage.addChild(shape);

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        createjs.Tween.get(shape)
            .to({
                x: shape.x + vx * 25,
                y: shape.y + vy * 25,
                alpha: 0
            }, 800, createjs.Ease.quadOut)
            .call(() => stage.removeChild(shape));
    }
}


function updateLifeBar() {
    const totalBlocks = 20;
    const percent = Math.max(0, Math.min(100, (lives / totalBlocks) * 100));
    const container = document.getElementById("lifeBarContainer");
    container.innerHTML = "";
    for (let i = 0; i < totalBlocks; i++) {
        const block = document.createElement("div");
        block.classList.add("life-block");
        if (i < lives) block.classList.add("active");
        container.appendChild(block);
    }
    document.getElementById("lifePercentage").innerText = `${Math.round(percent)}%`;
}

function createScoreText(value = "+1", x = canvas.width / 2, y = canvas.height / 2) {
    const text = new createjs.Text(value, "bold 32px monospace", "#00ff9d");
    text.x = x;
    text.y = y;
    text.alpha = 1;
    text.textAlign = "center";
    text.textBaseline = "middle";
    text.scaleX = text.scaleY = 2;
    text.shadow = new createjs.Shadow("#00ff9d", 0, 0, 10);
    stage.addChild(text);
    createjs.Tween.get(text)
        .to({
            scaleX: 4,
            scaleY: 4,
            alpha: 0
        }, 600, createjs.Ease.quadOut)
        .call(() => stage.removeChild(text));
}

function applyPowerUp(type) {
    if (type === "shield") {
        if (Math.abs(velocityX) > 0.01) {
            resetIdleTimer();
        }
        shieldActive = true;
        shieldSound.play();
        clearTimeout(shieldTimeout);
        shieldBar.alpha = 1;
        shieldBarBg.alpha = 0.4;
        shieldText.alpha = 1;
        shieldBar.scaleX = 1;
        createjs.Tween.removeTweens(shieldBar);
        shieldTween = createjs.Tween.get(shieldBar)
            .to({
                scaleX: 0
            }, 10000, createjs.Ease.linear)
            .call(() => {
                shieldBar.alpha = 0;
                shieldBarBg.alpha = 0;
                shieldText.alpha = 0;
                shieldActive = false;
                aura.graphics.clear();
            });
    } else if (type === "life") {
        lives = Math.min(20, lives + 1);
        lifeSound.play();
        updateLifeBar();
    }
}

let idleTime = 0;
let rusting = false;
let rustFilter = new createjs.ColorMatrix();

function resetIdleTimer() {
    if (idleLock) return;
    idleTime = 0;
    if (idleTween) createjs.Tween.removeTweens(idleBar);
    idleTween = null;
    idleBar.alpha = 0;
    idleBarBg.alpha = 0;

    if (rusting) {
        rusting = false;
        if (robot) {
            robot.filters = [];
            robot.uncache();
        }
    }
}


function applyRustingEffect() {
    idleLock = true;
    if (!robot || rusting) return;
    rusting = true;

    let steps = 30;
    let currentStep = 0;

    clearInterval(robotAnimInterval); // Para animação de sprite

    const interval = setInterval(() => {
        const gray = 1 - currentStep / steps;
        rustFilter.reset();
        rustFilter.adjustColor(-gray * 100, -gray * 100, -gray * 100, 0);
        robot.filters = [new createjs.ColorMatrixFilter(rustFilter)];
        robot.cache(0, 0, robot.image.width, robot.image.height);
        currentStep++;

        if (currentStep >= steps) {
            clearInterval(interval);

            // Força o visual final em cinza
            rustFilter.reset();
            rustFilter.adjustColor(-100, -100, -100, 0);
            robot.filters = [new createjs.ColorMatrixFilter(rustFilter)];
            robot.cache(0, 0, robot.image.width, robot.image.height);

            showRustMessage();

            setTimeout(() => {
                applyBlur = false;
                document.getElementById("gameWrapper").style.filter = "grayscale(1)";
                endGame(); // encerra o jogo após exibir a mensagem
            }, 2000);
        }
    }, 1000 / 30);
}


function checkCollision(a, b) {
    const imageWidth = a.image?.width || 30;
    const imageHeight = a.image?.height || 53;

    const hitboxWidth = imageWidth * 0.6;
    const hitboxHeight = imageHeight * 0.7;

    const ax = a.x - (a.regX || 0) + (imageWidth - hitboxWidth) / 2;
    const ay = a.y - (a.regY || 0) + (imageHeight - hitboxHeight) / 2;

    return (
        ax < b.x + ROBOT_WIDTH &&
        ax + hitboxWidth > b.x &&
        ay < b.y + ROBOT_HEIGHT &&
        ay + hitboxHeight > b.y
    );
}


let applyBlur = true;

function endGame() {
    gameRunning = false;
    createjs.Ticker.off("tick", tick);
    clearInterval(robotAnimInterval);
    restartBtn.style.display = "block";
    document.getElementById("homeBtn").style.display = "block"; // 👈 mostrar novo botão
    canvas.style.animation = "none";
    bgMusic.pause();
    bgMusic.currentTime = 0;
    document.getElementById("gameWrapper").classList.remove("rocking");
    if (applyBlur) document.getElementById("gameWrapper").classList.add("blurred");
}

document.getElementById("homeBtn").onclick = () => {
    localStorage.removeItem("skipIntro"); // se quiser mostrar intro novamente
    location.reload();
};

function startRobotAnimation() {
    if (!robot || rusting) return;

    clearInterval(robotAnimInterval);

    robotAnimInterval = setInterval(() => {
        if (!robot || !robot.image || !robot.image.complete) return;

        robotFrame = robotFrame % 3 + 1;
        const newImg = new Image();
        newImg.src = `./assets/images/robot-${robotFrame}.webp?${Date.now()}`;

        newImg.onload = () => {
            if (!robot) return;
            robot.image = newImg;

            let scale = ROBOT_WIDTH / newImg.width;
            robot.scaleX = direction === 1 ? scale : -scale;
            robot.regX = direction === 1 ? 0 : newImg.width;
            robot.scaleY = ROBOT_HEIGHT / newImg.height;

            if (rusting) {
                robot.filters = [new createjs.ColorMatrixFilter(rustFilter)];
                robot.cache(0, 0, newImg.width, newImg.height);
            } else if (robot.filters && robot.filters.length > 0) {
                robot.cache(0, 0, newImg.width, newImg.height);
            }
        };
    }, 80);
}


function startBounce() {
    createjs.Tween.removeTweens(robot);
    const originalY = canvas.height - ROBOT_HEIGHT - 10;
    robot.y = originalY;
    createjs.Tween.get(robot, {
            loop: true
        })
        .to({
            y: originalY - 5
        }, 300, createjs.Ease.quadInOut)
        .to({
            y: originalY
        }, 300, createjs.Ease.quadInOut);
}

function updateRobotDirection() {
    if (!robot.image) return;
    let scale = ROBOT_WIDTH / robot.image.width;
    robot.scaleX = direction === 1 ? scale : -scale;
    robot.regX = direction === 1 ? 0 : robot.image.width;
}

function vibrateCanvas() {
    if (isMobile && navigator.vibrate) {
        navigator.vibrate(50); // vibra por 100ms
    }

    canvas.classList.add("shake");
    setTimeout(() => canvas.classList.remove("shake"), 200);
}


document.addEventListener("keydown", e => {
    if (!gameRunning) return;
    if (e.code === "ArrowLeft") {
        movingLeft = true;
        direction = -1;
        velocityX = -maxSpeed / 2;
        updateRobotDirection();
    } else if (e.code === "ArrowRight") {
        movingRight = true;
        direction = 1;
        velocityX = maxSpeed / 2;
        updateRobotDirection();
    }
});

document.addEventListener("keyup", e => {
    if (e.code === "ArrowLeft") movingLeft = false;
    if (e.code === "ArrowRight") movingRight = false;
});

canvas.addEventListener("touchstart", (e) => {
    if (!gameRunning) return;

    const touchX = e.touches[0].clientX;
    const halfScreen = window.innerWidth / 2;

    if (touchX < halfScreen) {
        direction = -1;
        movingLeft = true;
        movingRight = false;
    } else {
        direction = 1;
        movingRight = true;
        movingLeft = false;
    }

    updateRobotDirection();
});

canvas.addEventListener("touchend", () => {
    movingLeft = false;
    movingRight = false;
});

document.getElementById("homeIconBtn").onclick = () => {
    localStorage.removeItem("skipIntro");
    location.reload();
};

document.getElementById("startGameButton").onclick = () => {

    if (bgMusic.paused) {
        bgMusic.play().catch(() => {});
        bgMusic.volume = musicOn ? 1 : 0;
    }

    document.getElementById("titleScreen").style.display = "none";
    document.getElementById("startOverlay").style.display = "flex";

    document.getElementById("homeIconBtn").style.display = "flex";
    document.getElementById("soundToggle").style.display = "flex";
};

function createExplosion(x, y) {
    for (let i = 0; i < 12; i++) {
        const shape = new createjs.Shape();
        const size = Math.random() * 6 + 4;
        const gray = Math.floor(Math.random() * 100 + 100); // tom entre 100 e 200
        const color = `rgb(${gray},${gray},${gray})`;
        shape.graphics.beginFill(color).drawRect(0, 0, size, size);
        shape.regX = size / 2;
        shape.regY = size / 2;
        shape.x = x + ROBOT_WIDTH / 2;
        shape.y = y + ROBOT_HEIGHT / 2;
        shape.rotation = Math.random() * 360;
        shape.alpha = 1;
        stage.addChild(shape);

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        createjs.Tween.get(shape)
            .to({
                x: shape.x + vx * 20,
                y: shape.y + vy * 20,
                alpha: 0,
                rotation: shape.rotation + 180
            }, 800, createjs.Ease.quadOut)
            .call(() => stage.removeChild(shape));
    }
}

const rainContainer = document.querySelector('.rain-container');
const numberOfDrops = 150;

for (let i = 0; i < numberOfDrops; i++) {
    const raindrop = document.createElement('div');
    raindrop.classList.add('raindrop');

    raindrop.style.left = `${Math.random() * 100}vw`;

    const size = Math.random() * 0.5 + 0.5;
    raindrop.style.transform = `scale(${size})`;

    raindrop.style.animationDuration = `${Math.random() * 2 + 1}s`;
    raindrop.style.animationDelay = `-${Math.random() * 2}s`;

    rainContainer.appendChild(raindrop);

    raindrop.addEventListener('animationiteration', () => {
        createSplash(raindrop);
    });
}

function createSplash(raindrop) {
    const splash = document.createElement('div');
    splash.classList.add('splash');

    const dropX = raindrop.style.left;
    const dropY = window.innerHeight;

    splash.style.left = dropX;
    splash.style.top = `${dropY - 5}px`;

    rainContainer.appendChild(splash);

    setTimeout(() => {
        splash.remove();
    }, 300);
}

function syncCanvasSize() {
    const bounds = document.getElementById("gameWrapper").getBoundingClientRect();
    canvas.width = bounds.width;
    canvas.height = bounds.height;
}

function showRustMessage() {
    const messages = [
        "☠ Robot",
        "rusted",
        "due to lack",
        "of movement"
    ];

    const texts = messages.map((msg, i) => {
        const text = new createjs.Text(msg, "bold 16px monospace", "#ffffff");
        text.textAlign = "center";
        text.textBaseline = "bottom";
        text.shadow = new createjs.Shadow("#000000", 0, 0, 10);
        text.alpha = 0;
        text.x = robot.x + ROBOT_WIDTH / 2;
        text.y = robot.y - 40 + (i * 18); // espaçamento entre as linhas
        return text;
    });

    texts.forEach(text => stage.addChild(text));

    texts.forEach(text => {
        createjs.Tween.get(text)
            .to({
                alpha: 1
            }, 500)
            .wait(2000)
            .to({
                alpha: 0
            }, 1000)
            .call(() => stage.removeChild(text));
    });
}


function adjustGameWrapperSize() {
    const wrapper = document.getElementById("gameWrapper");
    const screenWidth = window.innerWidth - 40; // 20px de margem em cada lado
    const screenHeight = window.innerHeight;

    const idealHeight = screenWidth * 16 / 9;

    if (idealHeight <= screenHeight) {
        wrapper.style.width = screenWidth + "px";
        wrapper.style.height = idealHeight + "px";
        wrapper.style.margin = "0 auto";
    } else {
        const idealWidth = screenHeight * 9 / 16;
        wrapper.style.width = idealWidth + "px";
        wrapper.style.height = screenHeight + "px";
        wrapper.style.margin = "0 auto";
    }

    syncCanvasSize();
}


const imagePaths = [
    "./assets/images/robot-1.webp",
    "./assets/images/robot-2.webp",
    "./assets/images/robot-3.webp",
    "./assets/images/bg.jpg",
    "./assets/images/shield.webp",
    "./assets/images/life.webp",
    "./assets/images/battery.webp",
    "./assets/images/combo.webp",
    "./assets/images/game.webp",
    "./assets/images/tv.webp",
    "./assets/images/drone.webp",
    "./assets/images/phone.webp",
    "./assets/images/sound.webp",
    "./assets/images/rain-1.webp",
    "./assets/images/rain-2.webp"
];

function preloadImages(paths, callback) {
    let loaded = 0;
    const total = paths.length;

    for (let path of paths) {
        const img = new Image();
        img.src = path;
        img.onload = () => {
            loaded++;
            if (loaded === total) callback();
        };
        img.onerror = () => {
            console.warn("Erro ao carregar:", path);
            loaded++;
            if (loaded === total) callback();
        };
    }
}

const loaderMessages = [
    "Hold tight. Waves are coming... 🌊",
    "The storm is near. Containers are shaking... ⚠️",
    "Winds rising. Balance will be your only ally... 💨"
];

let msgIndex = 0;
const loaderText = document.getElementById("loaderText");

setInterval(() => {
    msgIndex = (msgIndex + 1) % loaderMessages.length;
    loaderText.innerText = loaderMessages[msgIndex];
}, 2500);


window.addEventListener("resize", adjustGameWrapperSize);
window.addEventListener("load", () => {
    preloadImages(imagePaths, () => {
        document.getElementById("loaderScreen").style.display = "none";
        adjustGameWrapperSize();

        if (localStorage.getItem("skipIntro") === "true") {
            document.getElementById("titleScreen").style.display = "none";
            document.getElementById("startOverlay").style.display = "none";
            document.getElementById("ui").style.display = "block";
            document.getElementById("gameWrapper").classList.add("rocking");
            bgMusic.play();
            init();
            createjs.Ticker.addEventListener("tick", tick);
            localStorage.removeItem("skipIntro");
        }
    });
});


document.getElementById("aboutGameBtn").onclick = () => {
    document.getElementById("introText").style.display = "flex";
};

document.getElementById("closeIntro").onclick = () => {
    document.getElementById("introText").style.display = "none";
};

function createScoreText(value = "+1", x = canvas.width / 2, y = canvas.height / 2) {
    const text = new createjs.Text(value, "bold 32px monospace", "#00ff9d");
    text.x = x;
    text.y = y;
    text.alpha = 1;
    text.textAlign = "center";
    text.textBaseline = "middle";
    text.scaleX = text.scaleY = 2;
    text.shadow = new createjs.Shadow("#00ff9d", 0, 0, 10);
    stage.addChild(text);
    createjs.Tween.get(text)
        .to({
            scaleX: 4,
            scaleY: 4,
            alpha: 0
        }, 600, createjs.Ease.quadOut)
        .call(() => stage.removeChild(text));
}

function createExplosion(x, y) {
    for (let i = 0; i < 12; i++) {
        const shape = new createjs.Shape();
        const size = Math.random() * 6 + 4;
        const gray = Math.floor(Math.random() * 100 + 100);
        const color = `rgb(${gray},${gray},${gray})`;
        shape.graphics.beginFill(color).drawRect(0, 0, size, size);
        shape.regX = size / 2;
        shape.regY = size / 2;
        shape.x = x + ROBOT_WIDTH / 2;
        shape.y = y + ROBOT_HEIGHT / 2;
        shape.rotation = Math.random() * 360;
        shape.alpha = 1;
        stage.addChild(shape);

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        createjs.Tween.get(shape)
            .to({
                x: shape.x + vx * 20,
                y: shape.y + vy * 20,
                alpha: 0,
                rotation: shape.rotation + 180
            }, 800, createjs.Ease.quadOut)
            .call(() => stage.removeChild(shape));
    }
}

function createGlobalExplosion() {
    for (let i = 0; i < 60; i++) {
        const shape = new createjs.Shape();
        const size = Math.random() * 5 + 3;
        shape.graphics.beginFill("#ffcc00").drawRect(0, 0, size, size);
        shape.regX = size / 2;
        shape.regY = size / 2;
        shape.x = canvas.width / 2;
        shape.y = canvas.height / 2;
        shape.rotation = Math.random() * 360;
        shape.alpha = 1;
        stage.addChild(shape);

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        createjs.Tween.get(shape)
            .to({
                x: shape.x + vx * 25,
                y: shape.y + vy * 25,
                alpha: 0
            }, 800, createjs.Ease.quadOut)
            .call(() => stage.removeChild(shape));
    }
}

function applyRustingEffect() {
    idleLock = true;
    if (!robot || rusting) return;
    rusting = true;

    let steps = 30;
    let currentStep = 0;
    clearInterval(robotAnimInterval);

    const interval = setInterval(() => {
        const gray = 1 - currentStep / steps;
        rustFilter.reset();
        rustFilter.adjustColor(-gray * 100, -gray * 100, -gray * 100, 0);
        robot.filters = [new createjs.ColorMatrixFilter(rustFilter)];
        robot.cache(0, 0, robot.image.width, robot.image.height);
        currentStep++;

        if (currentStep >= steps) {
            clearInterval(interval);
            rustFilter.reset();
            rustFilter.adjustColor(-100, -100, -100, 0);
            robot.filters = [new createjs.ColorMatrixFilter(rustFilter)];
            robot.cache(0, 0, robot.image.width, robot.image.height);
            showRustMessage();
            setTimeout(() => {
                applyBlur = false;
                document.getElementById("gameWrapper").style.filter = "grayscale(1)";
                endGame();
            }, 2000);
        }
    }, 1000 / 30);
}
