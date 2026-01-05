let zIndexCounter = 100;
let isDragging = false;
let isResizing = false;

let currentWindow = null;
let initialX, initialY;
let initialLeft, initialTop;
let initialWidth, initialHeight;

// Snapping state
let snapState = null; // 'left', 'right', 'top', 'bottom', or null
let windowPreSnapState = null; // Store original position/size before snap

function initWindow(win) {
  const header = win.querySelector(".window-header");
  const resizer = win.querySelector(".resizer");
  const minBtn = win.querySelector(".btn-min");
  const maxBtn = win.querySelector(".btn-max");
  const closeBtn = win.querySelector(".btn-close");

  header.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("control-btn")) return;

    startDrag(e, win);

    win.style.zIndex = ++zIndexCounter;
  });

  resizer.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    startResize(e, win);
    win.style.zIndex = ++zIndexCounter;
  });

  win.addEventListener("mousedown", () => {
    win.style.zIndex = ++zIndexCounter;
  });

  if (minBtn) minBtn.addEventListener("click", () => minimizeWindow(minBtn));
  if (maxBtn) maxBtn.addEventListener("click", () => maximizeWindow(maxBtn));
  if (closeBtn) closeBtn.addEventListener("click", () => closeWindow(closeBtn));
}

const windows = document.querySelectorAll(".window");
windows.forEach(initWindow);

function startDrag(e, win) {
  isDragging = true;
  currentWindow = win;

  const rect = win.getBoundingClientRect();
  initialX = e.clientX - rect.left;
  initialY = e.clientY - rect.top;

  // If window is currently snapped, restore to minimum size
  if (snapState) {
    const minWidth = 500;  // Match min-width from CSS
    const minHeight = 500; // Match min-height from CSS

    // Center the window under the cursor
    currentWindow.style.width = minWidth + "px";
    currentWindow.style.height = minHeight + "px";

    // Adjust position so window stays under cursor
    const newX = e.clientX - (minWidth / 2);
    const newY = e.clientY - 20; // Keep cursor near top of window

    currentWindow.style.left = newX + "px";
    currentWindow.style.top = newY + "px";

    // Update initialX/Y for the new window size
    initialX = minWidth / 2;
    initialY = 20;

    // Clear snap state
    snapState = null;
    windowPreSnapState = null;
  }

  document.addEventListener("mousemove", onDrag);
  document.addEventListener("mouseup", stopDrag);
}

function onDrag(e) {
  if (!isDragging || !currentWindow) return;

  e.preventDefault();

  let newX = e.clientX - initialX;
  let newY = e.clientY - initialY;

  const desktop = document.getElementById("desktop");
  const desktopRect = desktop.getBoundingClientRect();
  const windowRect = currentWindow.getBoundingClientRect();

  // Boundary constraints
  const maxX = desktopRect.width - windowRect.width;
  const maxY = desktopRect.height - windowRect.height;

  // Apply boundary constraints
  newX = Math.max(0, Math.min(newX, maxX));
  newY = Math.max(0, Math.min(newY, maxY));

  // Update position freely during drag
  currentWindow.style.left = newX + "px";
  currentWindow.style.top = newY + "px";
}

function stopDrag() {
  if (currentWindow) {
    const desktop = document.getElementById("desktop");
    const desktopRect = desktop.getBoundingClientRect();
    const windowRect = currentWindow.getBoundingClientRect();

    // Snap distance threshold
    const snapDistance = 20;

    let newSnapState = null;
    const currentX = parseFloat(currentWindow.style.left);
    const currentY = parseFloat(currentWindow.style.top);

    // Determine snap zone
    if (currentX < snapDistance) {
      newSnapState = 'left';
    } else if (desktopRect.width - (currentX + windowRect.width) < snapDistance) {
      newSnapState = 'right';
    }

    if (currentY < snapDistance && !newSnapState) {
      newSnapState = 'top';
    } else if (desktopRect.height - (currentY + windowRect.height) < snapDistance && !newSnapState) {
      newSnapState = 'bottom';
    }

    // Apply snap if in snap zone
    if (newSnapState) {
      const halfWidth = desktopRect.width / 2;
      const halfHeight = desktopRect.height / 2;

      if (newSnapState === 'left') {
        currentWindow.style.left = "0px";
        currentWindow.style.top = "0px";
        currentWindow.style.width = halfWidth + "px";
        currentWindow.style.height = desktopRect.height + "px";
      } else if (newSnapState === 'right') {
        currentWindow.style.left = halfWidth + "px";
        currentWindow.style.top = "0px";
        currentWindow.style.width = halfWidth + "px";
        currentWindow.style.height = desktopRect.height + "px";
      } else if (newSnapState === 'top') {
        currentWindow.style.left = "0px";
        currentWindow.style.top = "0px";
        currentWindow.style.width = desktopRect.width + "px";
        currentWindow.style.height = halfHeight + "px";
      } else if (newSnapState === 'bottom') {
        currentWindow.style.left = "0px";
        currentWindow.style.top = halfHeight + "px";
        currentWindow.style.width = desktopRect.width + "px";
        currentWindow.style.height = halfHeight + "px";
      }

      snapState = newSnapState;
    }
  }

  isDragging = false;
  currentWindow = null;
  document.removeEventListener("mousemove", onDrag);
  document.removeEventListener("mouseup", stopDrag);
}

function startResize(e, win) {
  isResizing = true;
  currentWindow = win;

  initialX = e.clientX;
  initialY = e.clientY;

  const rect = win.getBoundingClientRect();
  initialWidth = rect.width;
  initialHeight = rect.height;

  document.addEventListener("mousemove", onResize);
  document.addEventListener("mouseup", stopResize);
}

function onResize(e) {
  if (!isResizing || !currentWindow) return;

  const widthChange = e.clientX - initialX;
  const heightChange = e.clientY - initialY;

  const newWidth = Math.max(200, initialWidth + widthChange);
  const newHeight = Math.max(150, initialHeight + heightChange);

  currentWindow.style.width = newWidth + "px";
  currentWindow.style.height = newHeight + "px";
}

function stopResize() {
  isResizing = false;
  currentWindow = null;
  document.removeEventListener("mousemove", onResize);
  document.removeEventListener("mouseup", stopResize);
}

function closeWindow(btn) {
  const win = btn.closest(".window");

  win.style.transform = "scale(0.9)";
  win.style.opacity = "0";
  setTimeout(() => {
    win.remove();
  }, 200);
}

function minimizeWindow(btn) {
  const win = btn.closest(".window");
  const taskbar = document.getElementById("taskbar");
  if (win.classList.contains("minimized")) {
    win.style.width = win.dataset.originalWidth || "300px";
    win.style.height = win.dataset.originalHeight || "200px";
    win.classList.remove("minimized");
  } else {
    win.dataset.originalWidth = win.style.width;
    win.dataset.originalHeight = win.style.height;
    win.style.width = "200px";
    win.style.height = "50px";
    win.classList.add("minimized");
    taskbar.style.borderTopLeftRadius = "20px";
    taskbar.style.borderTopRightRadius = "20px";
  }
}

function maximizeWindow(btn) {
  const win = btn.closest(".window");
  const taskbar = document.getElementById("taskbar");
  if (win.classList.contains("maximized")) {
    
    win.style.left = win.dataset.originalLeft || "200px";
    win.style.top = win.dataset.originalTop || "200px";
    win.style.width = win.dataset.originalWidth || "300px";
    win.style.height = win.dataset.originalHeight || "200px";
    win.classList.remove("maximized");
  } else {
    
    win.dataset.originalLeft = win.style.left;
    win.dataset.originalTop = win.style.top;
    win.dataset.originalWidth = win.style.width;
    win.dataset.originalHeight = win.style.height;
    
    win.style.left = "0px";
    win.style.top = "0px";
    win.style.width = "100vw";
    win.style.height = "100vh";
    win.classList.add("maximized");

    taskbar.style.borderTopLeftRadius = "0px";
    taskbar.style.borderTopRightRadius = "0px";
  }
}



function createWindow(name, content) {
  const new_window = document.createElement("div");
  new_window.classList.add("window");
  new_window.style.top = "200px";
  new_window.style.left = "200px";
  new_window.style.width = "800px";
  new_window.style.height = "600px";

  const header = document.createElement("div");
  header.classList.add("window-header");

  const title = document.createElement("span");
  title.classList.add("window-title");
  title.textContent = name;

  const controls = document.createElement("div");
  controls.classList.add("window-controls");

  const minBtn = document.createElement("div");
  minBtn.classList.add("control-btn", "btn-min");

  const maxBtn = document.createElement("div");
  maxBtn.classList.add("control-btn", "btn-max");

  const closeBtn = document.createElement("div");
  closeBtn.classList.add("control-btn", "btn-close");
  closeBtn.onclick = () => closeWindow(closeBtn);

  controls.appendChild(minBtn);
  controls.appendChild(maxBtn);
  controls.appendChild(closeBtn);

  header.appendChild(title);
  header.appendChild(controls);

  const contentDiv = document.createElement("div");
  contentDiv.classList.add("window-content");
  if (name === "Axiom Browser") {
    contentDiv.style.padding = "0";
    contentDiv.style.overflow = "hidden";
  }
  contentDiv.innerHTML = content;

  const resizer = document.createElement("div");
  resizer.classList.add("resizer");

  new_window.appendChild(header);
  new_window.appendChild(contentDiv);
  new_window.appendChild(resizer);

  document.getElementById("desktop").appendChild(new_window);
  initWindow(new_window);
}

// listeners

document.getElementById("browser").addEventListener("click", () => {
  createWindow(
  "Axiom Browser",
  "<iframe style='width: 100%; height: 100%; border: none; border-radius: 5px;' src='./browser/browser.html'></iframe>"
);
})

document.getElementById("games").addEventListener("click", () => {
  createWindow(
  "Games",
  "<iframe style='width: 100%; height: 100%; border: none; border-radius: 5px;' src='./browser/gapps.html'></iframe>"
);
})

document.getElementById("ai").addEventListener("click", () => {
  createWindow(
  "AI Chat",
  "<iframe style='width: 100%; height: 100%; border: none; border-radius: 5px;' src='./browser/ai.html'></iframe>"
);
})

document.getElementById("settings").addEventListener("click", () => {
  createWindow(
  "Settings",
  "<iframe style='width: 100%; height: 100%; border: none; border-radius: 5px;' src='./browser/settings.html'></iframe>"
);
})

setInterval(function(){
  if (sessionStorage.getItem("axiomReload") === "true") {
    sessionStorage.removeItem("axiomReload");
    location.reload();
  }
},50)