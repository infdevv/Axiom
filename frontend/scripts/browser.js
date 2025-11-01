let draggedTab = null;
let tabs = {};
let urlBarFocused = false;

function resolveAxiomUrl(url) {
  if (url.startsWith("axiom://")) {
    const pageName = url.substring(8); // Remove 'axiom://'
    const fileName = pageName + ".html";

    return "/" + fileName;
  }
  return url;
}

// Add event listeners for tabs
document.querySelectorAll(".tab").forEach((tab) => {
  setupDragEvents(tab);
});
function setupDragEvents(tab) {
  tab.addEventListener("dragstart", handleDragStart);
  tab.addEventListener("dragover", handleDragOver);
  tab.addEventListener("dragenter", handleDragEnter);
  tab.addEventListener("dragleave", handleDragLeave);
  tab.addEventListener("drop", handleDrop);
  tab.addEventListener("dragend", handleDragEnd);
}
function handleDragStart(e) {
  draggedTab = this;
  this.style.opacity = "0.75";
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/html", this.innerHTML);
}
function handleDragOver(e) {
  e.preventDefault(); // Necessary to allow drop
  e.dataTransfer.dropEffect = "move";
  this.classList.add("drag-over");
  return false;
}
function handleDragEnter(e) {
  e.preventDefault();
  // Highlight the tab being dragged over
  this.classList.add("drag-over");
}
function handleDragLeave() {
  this.classList.remove("drag-over");
}
function handleDrop(e) {
  e.stopPropagation(); // Stops some browsers from redirecting.
  if (draggedTab !== this) {
    // Get the index of the dragged tab and the drop target
    const draggedIndex = Array.from(this.parentNode.children).indexOf(
      draggedTab
    );
    const dropIndex = Array.from(this.parentNode.children).indexOf(this);
    // Reorder elements if they're not the same position
    if (draggedIndex !== dropIndex) {
      // Remove dragged element from its current position
      this.parentNode.removeChild(draggedTab);
      // Insert at new position (before the drop target)
      this.parentNode.insertBefore(draggedTab, this);
      // Reattach event listeners to the newly positioned tab
      setupDragEvents(draggedTab);
    }
  }
  // Remove highlight from all tabs
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("drag-over");
  });
  return false;
}
function handleDragEnd() {
  // Reset styles
  this.style.opacity = "1";
  // Remove highlight from all tabs
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("drag-over");
  });
}
document.getElementById("addTab").onclick = function () {
  const newTab = document.createElement("div");
  let id = btoa(Date.now());
  newTab.className = "tab";
  newTab.setAttribute("name", "tertiary");
  newTab.draggable = true; // Enable dragging for new tabs
  newTab.id = id;
  newTab.innerHTML = `New Tab
                <span onclick="closeTab('${id}', event)">
                    <span class="material-symbols-outlined" style="font-size: 16px; cursor: pointer;">
                        close
                    </span>
                </span>`;
  newTab.onclick = function (e) {
    console.log("Tab clicked:", id, "Target:", e.target);
    if (e.target.closest('span[onclick*="closeTab"]')) {
      console.log("Close button clicked, ignoring");
      return;
    }
    switchToTab(id);
  };
  setupDragEvents(newTab);
  tabs[id] = {
    title: "New Tab",
    url: "axiom://start",
    element: newTab,
  };
  createFrameForTab(id, "axiom://start");
  document
    .getElementById("tabs")
    .insertBefore(newTab, document.getElementById("addTab"));

  newTab.click();
};
function switchToTab(tabId) {
  console.log("Switching to tab:", tabId);
  // Hide all iframes and remove active class
  document.querySelectorAll("#frames iframe").forEach((iframe) => {
    iframe.classList.remove("active");
  });
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  // Show selected iframe and activate tab
  const frame = document.getElementById(`frame-${tabId}`);
  if (frame) {
    frame.classList.add("active");
    console.log("Frame activated:", `frame-${tabId}`);
  } else {
    console.log("Frame not found:", `frame-${tabId}`);
  }
  const tab = document.getElementById(tabId);
  if (tab) {
    tab.classList.add("active");
    console.log("Tab activated:", tabId);
  } else {
    console.log("Tab not found:", tabId);
  }

  // Let updateUrlBarFromIframe handle the URL bar update
  // This prevents conflicts with the |A| title format
  updateUrlBarFromIframe();
}
function getActiveTabId() {
  const activeTab = document.querySelector(".tab.active");
  return activeTab ? activeTab.id : null;
}
function navigateToUrl(url) {
  const activeTabId = getActiveTabId();
  if (!activeTabId) return;

  // Store the original URL (for display purposes)
  const displayUrl = url;

  // Handle axiom:// protocol
  if (url.startsWith("axiom://")) {
    const resolvedUrl = resolveAxiomUrl(url);
    url = resolvedUrl;
  }
  // Add https:// if no protocol specified
  else if (
    !url.match(/^https?:\/\//i) &&
    !url.startsWith("about:") &&
    !url.startsWith("/")
  ) {
    url = "https://" + url;
  }

  const frame = document.getElementById(`frame-${activeTabId}`);
  if (frame) {
    if (!url.includes(window.origin) && !url.includes("load.html")) {
      frame.src = "load.html?url=" + url;
    }
    // Store the display URL (axiom://) not the resolved path
    tabs[activeTabId].url = displayUrl;
  }
}
function handleUrlKeypress(event) {
  if (event.key === "Enter") {
    const url = event.target.value;
    navigateToUrl(url);
  }
}
function goBack() {
  const activeTabId = getActiveTabId();
  if (!activeTabId) return;

  const frame = document.getElementById(`frame-${activeTabId}`);
  if (frame && frame.contentWindow) {
    frame.contentWindow.history.back();
  }
}
function goForward() {
  const activeTabId = getActiveTabId();
  if (!activeTabId) return;

  const frame = document.getElementById(`frame-${activeTabId}`);
  if (frame && frame.contentWindow) {
    frame.contentWindow.history.forward();
  }
}
function refreshPage() {
  const activeTabId = getActiveTabId();
  if (!activeTabId) return;

  const frame = document.getElementById(`frame-${activeTabId}`);
  if (frame) {
    frame.src = frame.src;
  }
}
function createFrameForTab(tabId, url = "about:blank") {
  console.log("Creating frame for tab:", tabId, "URL:", url);
  const framesContainer = document.getElementById("frames");
  const iframe = document.createElement("iframe");
  iframe.id = `frame-${tabId}`;

  // Handle axiom:// protocol specially
  if (url.startsWith("axiom://")) {
    const resolvedUrl = resolveAxiomUrl(url);
    iframe.src = resolvedUrl; // Set the iframe src to the resolved local path
  } else if (url === "about:blank") {
    iframe.src = "about:blank";
  } else {
    iframe.src = "load.html?url=" + btoa(url);
  }

  // Setup monitoring for this iframe
  setupIframeMonitoring(iframe);

  framesContainer.appendChild(iframe);
  console.log("Frame appended, calling switchToTab");
  // Switch to the new tab (this will add the active class)
  switchToTab(tabId);
}
function closeTab(tabId, event) {
  event.stopPropagation(); // Prevent tab click event from firing

  const tab = document.getElementById(tabId);
  const frame = document.getElementById(`frame-${tabId}`);

  if (!tab) return;

  // Remove from tabs object
  delete tabs[tabId];

  // Remove the iframe
  if (frame) {
    frame.remove();
  }

  // If this was the active tab, switch to another tab
  const wasActive = tab.classList.contains("active");
  tab.remove();

  if (wasActive) {
    // Get remaining tabs
    const remainingTabs = document.querySelectorAll(".tab");
    if (remainingTabs.length > 0) {
      // Switch to the last remaining tab
      const lastTab = remainingTabs[remainingTabs.length - 1];
      switchToTab(lastTab.id);
    }
  }
}
// Track URL bar focus state
const urlBar = document.getElementById("urlBar");
urlBar.addEventListener("focus", () => {
  urlBarFocused = true;
});
urlBar.addEventListener("blur", () => {
  urlBarFocused = false;
});

function truncate(text) {
  if (text.length > 20) {
    return text.slice(0, 16) + "...";
  }
  return text;
}

function decodeIframeUrl(iframeSrc) {
  try {
    // Check if it's a load.html URL
    if (iframeSrc.includes("load.html?url=")) {
      const urlParam = new URL(iframeSrc, window.location.origin).searchParams.get("url");
      if (!urlParam) return null;

      // Check if it's base64 encoded
      const base64RegExp = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;
      let decodedUrl = urlParam;

      if (base64RegExp.test(urlParam)) {
        decodedUrl = atob(urlParam);
      }

      decodedUrl = decodeURIComponent(decodedUrl.replace(/\+/g, " "));
      return decodedUrl;
    }
    return null;
  } catch (error) {
    console.error("Error decoding iframe URL:", error);
    return null;
  }
}

// Function to update URL bar from active iframe
function updateUrlBarFromIframe() {
  const activeTabId = getActiveTabId();
  if (!activeTabId) return;

  const frame = document.getElementById(`frame-${activeTabId}`);
  if (!frame) return;

  const tab = document.getElementById(activeTabId);
  if (!tab) return;

  let currentUrl = "";
  let title = "";
  let hasValidTitle = false;

  try {
    title = frame.contentDocument ? frame.contentDocument.title : frame.contentWindow.document.title;
  } catch (error) {
    // cross-origin - can't access title
  }

  if (title && title.includes('|A|')) {
    const parts = title.split('|A|');
    if (parts.length === 2) {
      const pageTitle = parts[0].trim();
      currentUrl = parts[1].trim();
      hasValidTitle = true;

      console.log("Parsed title - Page:", pageTitle, "URL:", currentUrl);

      const currentTabTitle = truncate(tabs[activeTabId].title);
      const currentTabUrl = tabs[activeTabId].url;

      if (pageTitle && pageTitle !== currentTabTitle && pageTitle !== "Loading...") {
        // Update tab title to page title
        const textNode = tab.firstChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          textNode.textContent = pageTitle;
        }
        tabs[activeTabId].title = truncate(pageTitle);
      }

      if (currentUrl && currentUrl !== currentTabUrl) {
        if (!urlBarFocused) {
          urlBar.value = currentUrl;
        }
        tabs[activeTabId].url = currentUrl;
      }

      // Successfully got URL from |A| format, we're done
      return;
    }
  }

  // Only use fallback logic if we didn't get a URL from the title
  if (!currentUrl && !hasValidTitle) {
    try {
      const iframeSrc = frame.src;
      const decodedUrl = decodeIframeUrl(iframeSrc);
      if (decodedUrl) {
        currentUrl = decodedUrl;
      } else if (iframeSrc.startsWith(window.location.origin)) {
        const path = iframeSrc.replace(window.location.origin, "");
        if (path.startsWith("/") && path.endsWith(".html")) {
          const pageName = path.substring(1, path.length - 5);
          // Don't override with axiom:// if it's load.html or if we already have a stored URL
          if (pageName === "load") {
            // For load.html, keep the existing stored URL
            if (tabs[activeTabId] && tabs[activeTabId].url && tabs[activeTabId].url !== "axiom://start") {
              currentUrl = tabs[activeTabId].url;
            }
          } else {
            currentUrl = `axiom://${pageName}`;
          }
        }
      } else {
        // Fall back to stored URL
        if (tabs[activeTabId] && tabs[activeTabId].url) {
          currentUrl = tabs[activeTabId].url;
        }
      }
    } catch (error) {
      if (tabs[activeTabId]) {
        currentUrl = tabs[activeTabId].url || "";
      }
    }
  }

  // Only update the URL bar if we have a valid URL and the user isn't focused on it
  if (currentUrl && !urlBarFocused) {
    if (tabs[activeTabId]) {
      tabs[activeTabId].url = currentUrl;
    }
  }
}

// Monitor iframe load events to update URL bar
function setupIframeMonitoring(iframe) {
  iframe.addEventListener("load", () => {
    updateUrlBarFromIframe();
  });

  // Monitor title changes within the iframe
  const titleObserver = new MutationObserver(() => {
    updateUrlBarFromIframe();
  });

  const observeTitle = () => {
    try {
      if (iframe.contentDocument && iframe.contentDocument.head) {
        const titleElement = iframe.contentDocument.querySelector('title');
        if (titleElement) {
          titleObserver.observe(titleElement, { childList: true, subtree: true });
        }
      }
    } catch (e) {
      // Cross-origin, ignore
    }
  };

  // Check periodically for title element availability
  setInterval(observeTitle, 100);
}

// Initialize the initial tab
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("addTab").click();
});
