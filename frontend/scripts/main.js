let zIndexCounter = 0;
let activeWindows = [];
let windowOffsetCounter = 0;

function addWindowFunctionality(windowElement, header) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  let isDragging = false;

  const startDrag = (clientX, clientY) => {
    isDragging = true;
    windowElement.style.zIndex = (++zIndexCounter).toString();
    pos3 = clientX;
    pos4 = clientY;
  };

  const drag = (clientX, clientY) => {
    if (!isDragging) return;

    // Calculate movement delta
    pos1 = pos3 - clientX;
    pos2 = pos4 - clientY;
    pos3 = clientX;
    pos4 = clientY;

    // Get current position - force reflow to ensure accurate values
    const currentLeft = parseInt(windowElement.style.left) || windowElement.offsetLeft;
    const currentTop = parseInt(windowElement.style.top) || windowElement.offsetTop;

    // Calculate new position
    let newLeft = currentLeft - pos1;
    let newTop = currentTop - pos2;

    const winWidth = windowElement.offsetWidth;
    const winHeight = windowElement.offsetHeight;

    // Allow some negative values to prevent windows from getting stuck
    // but keep at least 100px visible
    const minLeft = -(winWidth - 100);
    const maxLeft = window.innerWidth - 100;
    const minTop = 0;
    const maxTop = window.innerHeight - 50; // Keep title bar visible

    newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
    newTop = Math.max(minTop, Math.min(newTop, maxTop));

    windowElement.style.left = `${newLeft}px`;
    windowElement.style.top = `${newTop}px`;
  };

  const stopDrag = () => {
    isDragging = false;
  };

  
  const onMouseDown = (e) => {
    
    if (e.target.closest('.controls') && !e.target.closest('.drag-handle')) return;
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e) => drag(e.clientX, e.clientY);
  const onMouseUp = () => {
    stopDrag();
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  
  const onTouchStart = (e) => {
    
    if (e.target.closest('.controls') && !e.target.closest('.drag-handle')) return;
    e.preventDefault();
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  };

  const onTouchMove = (e) => {
    const touch = e.touches[0];
    drag(touch.clientX, touch.clientY);
  };

  const onTouchEnd = () => {
    stopDrag();
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
  };

  
  (header || windowElement).addEventListener('mousedown', onMouseDown);
  (header || windowElement).addEventListener('touchstart', onTouchStart, { passive: false });
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
  windowElement.setAttribute("name", "secondary");

  if (noTitle) {
    windowElement.classList.add("no-title");
    windowElement.innerHTML = `
      <div class="controls controls-overlay" name="tertiary">
        <div class="drag-handle" name="quaternary"><span class="material-symbols-outlined">drag_indicator</span></div>
        <div class="maximize" name="quaternary" onclick="maximizeWindow(this)"><span class="material-symbols-outlined">crop_square</span></div>
        <div class="close" name="quaternary" onclick="closeWindow(this)"><span class="material-symbols-outlined">close</span></div>
      </div>
      <iframe class="content" name="primary" src="${url}"></iframe>
    `;
  } else {
    windowElement.innerHTML = `
      <div class="window-top" name="tertiary">
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


  windowElement.addEventListener("mousedown", function() {
    bringWindowToFront(windowElement);
  });


  const header = noTitle ? windowElement.querySelector(".drag-handle") : windowElement.querySelector(".window-top");
  addWindowFunctionality(windowElement, header);


  windowElement.style.zIndex = (++zIndexCounter).toString();


  activeWindows.push({ name: name, element: windowElement });

  return windowElement;
}

function closeWindow(btn) {
  const windowElement = btn.closest(".window");
  const index = activeWindows.findIndex(w => w.element === windowElement);
  if (index > -1) {
    activeWindows.splice(index, 1);
  }
  windowElement.remove();
  updateActiveWindowsToolbar();
}

function updateItems(){
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

  if (localStorage.getItem("axiomTheme") != null){
    document.body.style.setProperty("background-image", `url(/assets/media/backgrounds/${localStorage.getItem("axiomTheme")}.jpg)`);
  }
  else {
    document.body.style.setProperty("background-image", `url(/assets/media/backgrounds/default.jpg)`);
  }

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
