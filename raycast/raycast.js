const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

// Helper funcs
const radToDeg = (radians) => radians * 180 / Math.PI;
const degToRad = (degrees) => degrees * Math.PI / 180;
const FOVToFocal = (degrees) => canvas.width / (2 * Math.tan(degToRad(degrees) / 2));
const floor = (x) => x < 0 ? Math.ceil(x) : Math.floor(x);
const nextGridPos = (x, dir) => (Math.floor(x / tileSize) + (dir > 0 ? 1 : -0.00001)) * tileSize;

// Constants
const tileSize = 10;
const minimapScale = 0.2;

// Map
const map = [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1]
];

const MAP_WIDTH = map.length;
const MAP_HEIGHT = map[0].length;

// Initialize globals
// NOTE - Don't copy this. Lots of global state is bad practice!!!
let pos = [55, 55];
let vel = [0, 0];

let viewAngle = Math.random() * 2 * Math.PI;
let FOV = 60;
let focalLength = FOVToFocal(FOV);
const controls = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    lookLeft: false,
    lookRight: false
};

// Trace the ray
const traceRay = function(start, ray) {

    let tileX = Math.floor(start[0] / tileSize);
    let tileY = Math.floor(start[1] / tileSize);
    let cur = [...start]; // wasteful shallow copy but whatever

    let yPerX = ray[1] / ray[0];
    let xPerY = ray[0] / ray[1];

    while(true) {

        let nextHorizY = nextGridPos(cur[1], Math.sign(ray[1]));
        let nextHorizX = (nextHorizY - cur[1]) * xPerY + cur[0];

        let nextVertX = nextGridPos(cur[0], Math.sign(ray[0]));
        let nextVertY = (nextVertX - cur[0]) * yPerX + cur[1];

        let nextHorizDistSq = (nextHorizX - cur[0]) * (nextHorizX - cur[0]) + (nextHorizY - cur[1]) * (nextHorizY - cur[1]); 
        let nextVertDistSq = (nextVertX - cur[0]) * (nextVertX - cur[0]) + (nextVertY - cur[1]) * (nextVertY - cur[1]);

        if(isFinite(nextHorizDistSq) && (!isFinite(nextVertDistSq) || nextHorizDistSq < nextVertDistSq)) {
            cur[0] = nextHorizX;
            cur[1] = nextHorizY;
            tileY += Math.sign(ray[1]);
        } else {
            cur[0] = nextVertX;
            cur[1] = nextVertY;
            tileX += Math.sign(ray[0]);
        }

        if(tileX < 0 || tileY < 0 || tileX >= MAP_WIDTH || tileY >= MAP_HEIGHT) break;

        if(map[tileX][tileY]) {
            let dx = cur[0] - start[0];
            let dy = cur[1] - start[1];
            return Math.sqrt(dx * dx + dy * dy);
        }

    }

    return Infinity;

};

const drawMinimap = function() {

    ctx.fillStyle = "#ff0000";
    for(let x = 0; x < map.length; x++) {
        for(let y = 0; y < map[x].length; y++) {

            if(map[x][y])
                ctx.fillRect(x * tileSize * minimapScale, y * tileSize * minimapScale, tileSize * minimapScale, tileSize * minimapScale);

        }
    }

};

const drawCharacterMinimap = function() {

    // Draw character
    ctx.beginPath();
    ctx.arc(pos[0] * minimapScale, pos[1] * minimapScale, 3, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#00ff00";
    ctx.beginPath();
    ctx.moveTo(pos[0] * minimapScale, pos[1] * minimapScale);
    ctx.lineTo(pos[0] * minimapScale + Math.cos(viewAngle) * tileSize * minimapScale, pos[1] * minimapScale + Math.sin(viewAngle) * tileSize * minimapScale);
    ctx.closePath();
    ctx.stroke();

};

// Draw the scene
const imageData = ctx.createImageData(canvas.width, canvas.height);

const draw = function() {

    /*
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";

    for(let screenX = 0; screenX < canvas.width; screenX++) {

        // interpolate angle
        let angle = degToRad((screenX / canvas.width) * FOV - FOV / 2) + viewAngle;

        // ray
        let dx = Math.cos(angle);
        let dy = Math.sin(angle);
        
        let dist = traceRay(pos, [dx, dy]);

        if(isFinite(dist)) {
            let fprime = focalLength / Math.cos(viewAngle - angle);
            let width = tileSize * fprime / dist;
            let color = Math.round(5000 / dist);
            ctx.fillStyle = `rgb(${color},${color},${color})`;
            ctx.fillRect(screenX, (canvas.height - width) / 2, 1, width);
        }

    }

    drawMinimap();
    drawCharacterMinimap();

    ctx.fillStyle = "#00ff00";
    ctx.font = "24px Arial";
    ctx.fillText(`(${pos[0].toFixed(2)}, ${pos[1].toFixed(2)})`, 2, canvas.height - 24);
    ctx.fillText(viewAngle.toFixed(2), 2, canvas.height - 48);
    */

    for(let screenX = 0; screenX < canvas.width; screenX++) {

        // interpolate angle
        let angle = degToRad((screenX / canvas.width) * FOV - FOV / 2) + viewAngle;

        // cast ray
        let depth = traceRay(pos, [Math.cos(angle), Math.sin(angle)]);

        // draw
        let fprime = focalLength / Math.cos(viewAngle - angle);
        let sliceHeight = tileSize * fprime / depth;

        for(let y = 0; y < canvas.height; y++) {

            let r, g, b;
            if(Math.abs(canvas.height / 2 - y) < sliceHeight) {
                r = 0; g = 255; b = 0;
            } else {
                
                // Shade
                let stile = tileSize / 2;

            }

            let idx = y * canvas.width + screenX;
            imageData.data[idx * 4] = r;
            imageData.data[idx * 4 + 1] = g;
            imageData.data[idx * 4 + 2] = b;
            imageData.data[idx * 4 + 3] = 255;

        }

    }

    ctx.putImageData(imageData, 0, 0);

};

// Update player position
const update = function() {

    const walkSpeed = 1;

    let dx = 0, dy = 0;

    if(controls.forward) {
        dx = Math.cos(viewAngle) * walkSpeed;
        dy = Math.sin(viewAngle) * walkSpeed;
    }

    if(controls.backward) {
        dx = -Math.cos(viewAngle) * walkSpeed;
        dy = -Math.sin(viewAngle) * walkSpeed;
    }

    if(controls.left) {
        dx = Math.sin(viewAngle) * walkSpeed;
        dy = -Math.cos(viewAngle) * walkSpeed;   
    }

    if(controls.right) {
        dx = -Math.sin(viewAngle) * walkSpeed;
        dy = Math.cos(viewAngle) * walkSpeed;
    }

    /*
    let objDist = traceRay(pos, [Math.cos(viewAngle), Math.sin(viewAngle)]);
    let nextDistSq = dx * dx + dy * dy;
    if(objDist < nextDistSq) {
        let dist = Math.sqrt(nextDistSq);
        dx *= objDist / dist;
        dy *= objDist / dist;
    }*/

    pos[0] += dx;
    pos[1] += dy;

    if(controls.lookLeft) {
        viewAngle -= 0.03;
    }

    if(controls.lookRight) {
        viewAngle += 0.03;
    }

};

// Game loop
const run = function() {
    draw();
    update();
    requestAnimationFrame(run);
};

// Add event listeners
const handleKey = (key, state) => {
    switch(key) {
        case "w": controls.forward = state; break;
        case "a": controls.left = state; break;
        case "s": controls.backward = state; break;
        case "d": controls.right = state; break;
        case "h": controls.lookLeft = state; break;
        case "k": controls.lookRight = state; break;
    }
};

window.addEventListener("keydown", (event) => handleKey(event.key, true));
window.addEventListener("keyup", (event) => handleKey(event.key, false));
canvas.addEventListener("click", (event) => canvas.requestPointerLock());
canvas.addEventListener("mousemove", (event) => {
    viewAngle += event.movementX * 0.003;
});

run();