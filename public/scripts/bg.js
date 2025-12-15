function generateStars(numStars, size, className) {
    let shadows = [];
    for (let i = 0; i < numStars; i++) {
        let x = Math.floor(Math.random() * 2000);
        let y = Math.floor(Math.random() * 2000);
        shadows.push(`${x}px ${y}px #fff`);
    }
    return `.${className} {
    width: ${size}px;
    height: ${size}px;
    background-color: transparent;
    position: relative;
    box-shadow: ${shadows.join(', ')};
    animation: animate_stars ${30 + Math.floor(Math.random() * 20)}s linear infinite;
}`;
}

let inner = `
<div class="stars1"></div>
<div class="stars2"></div>
<div class="stars3"></div>
        <style>
.galaxy {
    width: 100%;
    height: 100vh;
    position: fixed;
    overflow: hidden;
    z-index: -1;
}
${generateStars(200, 1, 'stars1')}
${generateStars(200, 2, 'stars2')}
${generateStars(200, 3, 'stars3')}
@keyframes animate_stars {
    0% {
        transform: translateY(0);
    }
    100% {
        transform: translateY(-2000px);
    }
}
        </style>
`;

let div = document.createElement("div");
div.classList.add("galaxy");
div.innerHTML = inner;
document.body.insertBefore(div, document.body.firstChild);
