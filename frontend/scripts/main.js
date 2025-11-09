let zIndexCounter = 0;
let activeWindows = [];
let windowOffsetCounter = 0;
let splitScreenMode = null; 
let originalWindowStates = new Map(); 

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

    
    const iframe = windowElement.querySelector("iframe");
    if (iframe) {
      iframe.style.pointerEvents = "none";
    }
  };

  const updatePosition = () => {
    if (!isDragging || pendingX === null || pendingY === null) {
      animationFrameId = null;
      return;
    }

    
    pos1 = pos3 - pendingX;
    pos2 = pos4 - pendingY;
    pos3 = pendingX;
    pos4 = pendingY;

    
    const currentLeft =
      parseInt(windowElement.style.left) || windowElement.offsetLeft;
    const currentTop =
      parseInt(windowElement.style.top) || windowElement.offsetTop;

    
    let newLeft = currentLeft - pos1;
    let newTop = currentTop - pos2;

    const winWidth = windowElement.offsetWidth;
    const winHeight = windowElement.offsetHeight;

    
    const toolbarHeight = 50;

    
    
    const minLeft = 0;
    const maxLeft = window.innerWidth - winWidth;
    const minTop = 0;
    const maxTop = window.innerHeight - toolbarHeight - winHeight;

    
    const snapThreshold = 30;
    const windowCenterX = newLeft + winWidth / 2;

    
    if (
      newLeft > snapThreshold &&
      newLeft < window.innerWidth - winWidth - snapThreshold
    ) {
      windowElement.classList.remove("near-edge");
    }

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

    
    if (animationFrameId === null) {
      animationFrameId = requestAnimationFrame(updatePosition);
    }

    
    const windowLeft = parseInt(windowElement.style.left) || 50;
    const windowWidth = windowElement.offsetWidth;
    const snapThreshold = 100;

    windowElement.classList.remove("near-edge");

    
    if (
      windowLeft <= snapThreshold ||
      windowLeft >= window.innerWidth - windowWidth - snapThreshold
    ) {
      windowElement.classList.add("near-edge");
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

    
    checkForSnap(windowElement);

    
    const iframe = windowElement.querySelector("iframe");
    if (iframe) {
      iframe.style.pointerEvents = "auto";
    }
  };

  const onMouseDown = (e) => {
    if (e.target.closest(".controls") && !e.target.closest(".drag-handle"))
      return;
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
    
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
    window.addEventListener("touchmove", onTouchMove, {
      passive: false,
      capture: true,
    });
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

  
  setTimeout(() => {
    windowElement.classList.add("opening");
    
    setTimeout(() => {
      windowElement.classList.remove("opening");
    }, 400);
  }, 10);

  return windowElement;
}

function closeWindow(btn) {
  const windowElement = btn.closest(".window");
  const index = activeWindows.findIndex((w) => w.element === windowElement);

  
  windowElement.classList.add("closing");

  
  if (index > -1) {
    activeWindows.splice(index, 1);
  }

  
  setTimeout(() => {
    windowElement.remove();
    updateActiveWindowsToolbar();
  }, 300); 
}


function checkForSnap(windowElement) {
  const left = parseInt(windowElement.style.left) || 0;
  const top = parseInt(windowElement.style.top) || 0;
  const width = windowElement.offsetWidth;
  const snapThreshold = 50; 

  
  windowElement.classList.remove("snapped-left", "snapped-right", "near-edge");

  
  if (
    windowElement.classList.contains("snapped-left") ||
    windowElement.classList.contains("snapped-right")
  ) {
    if (
      left > snapThreshold &&
      left < window.innerWidth - width - snapThreshold
    ) {
      restoreSnappedWindow(windowElement);
      return;
    }
  }

  
  if (left <= snapThreshold) {
    snapWindowToEdge(windowElement, "left");
    return;
  }

  
  if (left >= window.innerWidth - width - snapThreshold) {
    snapWindowToEdge(windowElement, "right");
    return;
  }

  
  if (
    (left <= snapThreshold * 2 && left > snapThreshold) ||
    (left >= window.innerWidth - width - snapThreshold * 2 &&
      left < window.innerWidth - width - snapThreshold)
  ) {
    windowElement.classList.add("near-edge");
  }
}

function snapWindowToEdge(windowElement, edge) {
  
  if (!windowElement.dataset.originalState) {
    windowElement.dataset.originalState = JSON.stringify({
      left: windowElement.style.left,
      top: windowElement.style.top,
      width: windowElement.style.width,
      height: windowElement.style.height,
      resize: windowElement.style.resize,
    });
  }

  
  windowElement.classList.remove("snapped-left", "snapped-right");

  if (edge === "left") {
    windowElement.classList.add("snapped-left");
  } else if (edge === "right") {
    windowElement.classList.add("snapped-right");
  }

  
  windowElement.classList.remove("near-edge");
}

function restoreSnappedWindow(windowElement) {
  
  if (windowElement.dataset.originalState) {
    const originalState = JSON.parse(windowElement.dataset.originalState);

    
    windowElement.classList.remove(
      "snapped-left",
      "snapped-right",
      "near-edge"
    );

    
    windowElement.style.left = originalState.left;
    windowElement.style.top = originalState.top;
    windowElement.style.width = originalState.width;
    windowElement.style.height = originalState.height;
    windowElement.style.resize = originalState.resize;

    
    delete windowElement.dataset.originalState;
  }
}

window.closeWindow = closeWindow;
window.maximizeWindow = maximizeWindow;
window.minimizeWindow = minimizeWindow;
window.restoreSnappedWindow = restoreSnappedWindow;
window.snapWindowToEdge = snapWindowToEdge;
window.checkForSnap = checkForSnap;

document.addEventListener("DOMContentLoaded", function () {
  let currentBackground = "null"; 
  setInterval(function () {
    if (localStorage.getItem("axiomTheme") != currentBackground) {
      if (localStorage.getItem("axiomTheme") != null) {
        document.body.style.setProperty(
          "background-image",
          `url(/assets/media/backgrounds/${localStorage.getItem(
            "axiomTheme"
          )}.jpg)`
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
  }, 500);

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

    
    const exitItem = document.getElementById("split-exit-item");
    exitItem.style.display = splitScreenMode ? "block" : "none";

    menu.style.display = "block";
    menu.style.left = e.pageX + "px";
    menu.style.top = e.pageY + "px";
  }
}


