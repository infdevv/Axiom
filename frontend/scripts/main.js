let zIndexCounter = 0;
let activeWindows = [];
let windowOffsetCounter = 0;

function addWindowFunctionality(windowElement, header) {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
  let isDragging = false;
  let animationFrameId = null;
  let pendingX = null;
  let pendingY = null;

  const startDrag = (clientX, clientY) => {
    isDragging = true;
    windowElement.style.zIndex = (++zIndexCounter).toString();
    pos3 = clientX;
    pos4 = clientY;

    // Disable pointer events on iframe to prevent it from capturing mouse events during drag
    const iframe = windowElement.querySelector('iframe');
    if (iframe) {
      iframe.style.pointerEvents = 'none';
    }
  };

  const updatePosition = () => {
    if (!isDragging || pendingX === null || pendingY === null) {
      animationFrameId = null;
      return;
    }

    // Calculate movement delta
    pos1 = pos3 - pendingX;
    pos2 = pos4 - pendingY;
    pos3 = pendingX;
    pos4 = pendingY;

    // Get current position - force reflow to ensure accurate values
    const currentLeft =
      parseInt(windowElement.style.left) || windowElement.offsetLeft;
    const currentTop =
      parseInt(windowElement.style.top) || windowElement.offsetTop;

    // Calculate new position
    let newLeft = currentLeft - pos1;
    let newTop = currentTop - pos2;

    const winWidth = windowElement.offsetWidth;
    const winHeight = windowElement.offsetHeight;

    // Toolbar height at the bottom
    const toolbarHeight = 50;

    // Constrain window to stay completely within document bounds
    // Don't allow any part to go outside or overlap with toolbar
    const minLeft = 0;
    const maxLeft = window.innerWidth - winWidth;
    const minTop = 0;
    const maxTop = window.innerHeight - toolbarHeight - winHeight;

    newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
    newTop = Math.max(minTop, Math.min(newTop, maxTop));

    windowElement.style.left = `${newLeft}px`;
    windowElement.style.top = `${newTop}px`;

    pendingX = null;
    pendingY = null;
    animationFrameId = null;
  };

  const drag = (clientX, clientY) => {
    if (!isDragging) return;

    pendingX = clientX;
    pendingY = clientY;

    // Use requestAnimationFrame to throttle updates and prevent choppiness
    if (animationFrameId === null) {
      animationFrameId = requestAnimationFrame(updatePosition);
    }
  };

  const stopDrag = () => {
    isDragging = false;
    pendingX = null;
    pendingY = null;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    // Re-enable pointer events on iframe after drag ends
    const iframe = windowElement.querySelector('iframe');
    if (iframe) {
      iframe.style.pointerEvents = 'auto';
    }
  };

  const onMouseDown = (e) => {
    if (e.target.closest(".controls") && !e.target.closest(".drag-handle"))
      return;
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
    // Use window instead of document to catch events even when cursor leaves browser
    window.addEventListener("mousemove", onMouseMove, true);
    window.addEventListener("mouseup", onMouseUp, true);
  };

  const onMouseMove = (e) => {
    e.preventDefault();
    drag(e.clientX, e.clientY);
  };

  const onMouseUp = (e) => {
    e.preventDefault();
    stopDrag();
    window.removeEventListener("mousemove", onMouseMove, true);
    window.removeEventListener("mouseup", onMouseUp, true);
  };

  const onTouchStart = (e) => {
    if (e.target.closest(".controls") && !e.target.closest(".drag-handle"))
      return;
    e.preventDefault();
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
    window.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
    window.addEventListener("touchend", onTouchEnd, { capture: true });
  };

  const onTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    drag(touch.clientX, touch.clientY);
  };

  const onTouchEnd = (e) => {
    e.preventDefault();
    stopDrag();
    window.removeEventListener("touchmove", onTouchMove, true);
    window.removeEventListener("touchend", onTouchEnd, true);
  };

  (header || windowElement).addEventListener("mousedown", onMouseDown);
  (header || windowElement).addEventListener("touchstart", onTouchStart, {
    passive: false,
  });
}

function bringWindowToFront(windowElement) {
  windowElement.style.zIndex = (++zIndexCounter).toString();
  if (windowElement.style.display === "none") {
    windowElement.style.display = "";
  }
}

function minimizeWindow(btn) {
  const windowElement = btn.closest(".window");
  windowElement.style.display = "none";
  updateActiveWindowsToolbar();
}

function maximizeWindow(btn) {
  const windowElement = btn.closest(".window");
  const icon = btn.querySelector(".material-symbols-outlined");

  if (windowElement.classList.contains("maximized")) {
    windowElement.classList.remove("maximized");
    icon.textContent = "crop_square";
  } else {
    windowElement.classList.add("maximized");
    icon.textContent = "filter_none";
  }
}

function createWindow(name, url, noTitle = false) {
  const windowElement = document.createElement("div");
  windowElement.className = "window";

  if (noTitle) {
    windowElement.classList.add("no-title");
    windowElement.innerHTML = `
      <div class="controls controls-overlay">
        <div class="drag-handle" name="quaternary"><span class="material-symbols-outlined">drag_indicator</span></div>
        <div class="maximize" name="quaternary" onclick="maximizeWindow(this)"><span class="material-symbols-outlined">crop_square</span></div>
        <div class="close" name="quaternary" onclick="closeWindow(this)"><span class="material-symbols-outlined">close</span></div>
      </div>
      <iframe class="content" name="primary" src="${url}"></iframe>
    `;
  } else {
    windowElement.innerHTML = `
      <div class="window-top">
        <span class="window-title">${name}</span>
        <div class="controls">
          <div class="maximize" onclick="maximizeWindow(this)"><span class="material-symbols-outlined">crop_square</span></div>
          <div class="close" onclick="closeWindow(this)"><span class="material-symbols-outlined">close</span></div>
        </div>
      </div>
      <iframe class="content" name="primary" src="${url}"></iframe>
    `;
  }

  document.getElementById("main").appendChild(windowElement);

  // Set initial position - all windows start at the same position
  windowElement.style.left = `50px`;
  windowElement.style.top = `50px`;

  windowElement.addEventListener("mousedown", function () {
    bringWindowToFront(windowElement);
  });

  const header = noTitle
    ? windowElement.querySelector(".drag-handle")
    : windowElement.querySelector(".window-top");
  addWindowFunctionality(windowElement, header);

  windowElement.style.zIndex = (++zIndexCounter).toString();

  activeWindows.push({ name: name, element: windowElement });

  return windowElement;
}

function closeWindow(btn) {
  const windowElement = btn.closest(".window");
  const index = activeWindows.findIndex((w) => w.element === windowElement);
  if (index > -1) {
    activeWindows.splice(index, 1);
  }
  windowElement.remove();
  updateActiveWindowsToolbar();
}

function updateItems() {
  const now = new Date();
  const hours = now.getHours() % 12;
  const hoursStr = hours ? hours.toString().padStart(2, "0") : "12";
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const ampm = now.getHours() >= 12 ? "PM" : "AM";
  document.getElementById(
    "time-counter"
  ).innerHTML = `${hoursStr}:${minutes} ${ampm}`;
}

// Expose functions to global scope for inline onclick handlers
window.closeWindow = closeWindow;
window.maximizeWindow = maximizeWindow;
window.minimizeWindow = minimizeWindow;

document.addEventListener("DOMContentLoaded", function () {
  let currentBackground = "null"; // it can be null so we just use a string so theres no chance of a match
  setInterval(function(){
  if (localStorage.getItem("axiomTheme") != currentBackground) {
  if (localStorage.getItem("axiomTheme") != null) {
    document.body.style.setProperty(
      "background-image",
      `url(/assets/media/backgrounds/${localStorage.getItem("axiomTheme")}.jpg)`
    );
    currentBackground = localStorage.getItem("axiomTheme");
  } else {
    document.body.style.setProperty(
      "background-image",
      `url(/assets/media/backgrounds/default.jpg)`
    );
    currentBackground = "default";
  }
  }
  }, 500)

  updateItems();
  const toolbarButtons = document.querySelectorAll(".item[data-name]");
  toolbarButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const name = this.getAttribute("data-name");
      const url = this.getAttribute("data-url");
      const noTitle = this.getAttribute("data-no-title") === "true";
      createWindow(name, url, noTitle);
    });
  });
});

document.onclick = hideMenu;
document.oncontextmenu = rightClick;

function hideMenu() {
  document.getElementById("contextMenu").style.display = "none";
}

function rightClick(e) {
  e.preventDefault();

  if (document.getElementById("contextMenu").style.display == "block")
    hideMenu();
  else {
    let menu = document.getElementById("contextMenu");

    menu.style.display = "block";
    menu.style.left = e.pageX + "px";
    menu.style.top = e.pageY + "px";
  }
}


// Welcome to devlabs!