import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const db = getFirestore();
let syncInterval = null;

export async function saveLocalStorageToFirebase(uid) {
    try {
        const localStorageData = {};
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                localStorageData[key] = localStorage.getItem(key);
            }
        }
        await setDoc(doc(db, 'users', uid), { localStorage: localStorageData }, { merge: true });
        console.log('LocalStorage saved to Firebase');
    } catch (error) {
        console.error('Error saving localStorage:', error);
    }
}

export async function loadLocalStorageFromFirebase(uid) {
    try {
        const docSnap = await getDoc(doc(db, 'users', uid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.localStorage) {
                for (let key in data.localStorage) {
                    localStorage.setItem(key, data.localStorage[key]);
                }
                console.log('LocalStorage loaded from Firebase');
            }
        }
    } catch (error) {
        console.error('Error loading localStorage:', error);
    }
}

export function startSync(uid) {
    if (syncInterval) {
        clearInterval(syncInterval);
    }
    syncInterval = setInterval(() => {
        if (uid) {
            saveLocalStorageToFirebase(uid);
        }
    }, 60000);
    return syncInterval;
}

export function stopSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

// ========================================
// STATE MANAGEMENT
// ========================================
let active = false;
let activeApp = "";
let tabs = [];
let currentTabId = 0;
let isTyping = false;
let nextTabId = 1;
let draggedTab = null;

// ========================================
// CONFIGURATION HELPERS
// ========================================

// Helper function to extract URL from formatted title (title|A|url)
function extractUrlFromTitle(title) {
    if (!title || typeof title !== 'string') return null;

    try {
        // Check if title is formatted as (page title)|A|(actual url)
        if (title.includes('|A|')) {
            const parts = title.split('|A|');
            if (parts.length >= 2 && parts[1]) {
                return parts[1].trim();
            }
        }
    } catch (e) {
        console.debug('Error extracting URL from title:', e);
    }

    return null;
}

// Helper function to clean and decode proxy URLs consistently
function cleanProxyUrl(url) {
    if (!url || typeof url !== 'string') return url;

    try {
        // Check if this is any type of proxy URL
        if ((url.includes("prxy.html") || url.includes("prxy_sj.html") || url.includes("prxy_uv.html")) && url.includes("url=")) {
            const urlParam = url.split("url=")[1];
            if (urlParam) {
                try {
                    // Try to decode base64 encoded URL
                    return atob(urlParam.split('&')[0]); // Split by & to handle additional params
                } catch (e) {
                    // If base64 decoding fails, try URL decoding
                    try {
                        return decodeURIComponent(urlParam.split('&')[0]);
                    } catch (e2) {
                        console.error('Error decoding proxy URL:', e2);
                        return url;
                    }
                }
            }
        }

        // Convert internal page URLs to axiom:// format
        if (url.startsWith(window.location.origin) && !url.includes("prxy")) {
            const pathParts = url.split("/");
            const filename = pathParts[pathParts.length - 1];
            if (filename && filename.includes(".html")) {
                const pageName = filename.split(".html")[0];
                return "axiom://" + pageName;
            }
        }

        return url;
    } catch (error) {
        console.error('Error cleaning proxy URL:', error);
        return url;
    }
}

function getHomepageURL() {
    try {
        const homepageSetting = localStorage.getItem('axiomHomepage') || 'start.html';

        if (homepageSetting === 'custom') {
            const customUrl = localStorage.getItem('axiomCustomHomepage');
            if (customUrl && customUrl.trim()) {
                if (customUrl.startsWith('./') || customUrl.startsWith('axiom://') || customUrl.includes('prxy.html')) {
                    return customUrl;
                }
                try {
                    return '../prxy.html?url=' + btoa(customUrl);
                } catch (btoaError) {
                    console.error('Error encoding custom URL:', btoaError);
                    return '../prxy.html?url=' + encodeURIComponent(customUrl);
                }
            }
            return './start.html';
        }

        if (typeof homepageSetting === 'string') {
            return './' + homepageSetting;
        }

        return './start.html';
    } catch (error) {
        console.error('Error getting homepage URL:', error);
        return './start.html';
    }
}

function getHomepageTitle() {
    try {
        const homepageSetting = localStorage.getItem('axiomHomepage') || 'start.html';

        switch (homepageSetting) {
            case 'start.html':
                return 'New Tab';
            case 'games.html':
                return 'Games';
            case 'custom':
                const customUrl = localStorage.getItem('axiomCustomHomepage');
                if (customUrl && customUrl.trim()) {
                    try {
                        const url = new URL(customUrl);
                        return url.hostname || 'Custom Page';
                    } catch {
                        return 'Custom Page';
                    }
                }
                return 'New Tab';
            default:
                return 'New Tab';
        }
    } catch (error) {
        console.error('Error getting homepage title:', error);
        return 'New Tab';
    }
}

function getSearchEngine() {
    try {
        const searchEngine = localStorage.getItem('search');
        if (searchEngine && typeof searchEngine === 'string') {
            return searchEngine;
        }
        return 'https://search.brave.com/search?q=';
    } catch (error) {
        console.error('Error getting search engine:', error);
        return 'https://search.brave.com/search?q=';
    }
}

// ========================================
// TAB MANAGEMENT
// ========================================
function createDefaultTab() {
    try {
        const homepage = getHomepageURL();
        const homepageTitle = getHomepageTitle();
        addtab(homepageTitle || "New Tab", homepage || "./start.html");
    } catch (error) {
        addtab("New Tab", "./start.html");
    }
}

function addtab(name = "New Tab", url = null) {
    try {
        if (!name || typeof name !== 'string') {
            name = "New Tab";
        }

        if (!url) {
            url = getHomepageURL();
            if (name === "New Tab") {
                name = getHomepageTitle();
            }
        }

        // Validate and clean the URL
        if (!url || url === 'about:blank' || url.trim() === '') {
            url = getHomepageURL() || "./start.html";
        }

        const tabId = nextTabId++;
        const tab = {
            id: tabId,
            title: name,
            url: url,
            element: null
        };

        tabs.push(tab);

        const tabElement = document.createElement('div');
        tabElement.className = 'tab';
        tabElement.setAttribute('data-tab-id', tabId);

        tabElement.innerHTML = `
            <div class="tab-title">${name}</div>
            <div class="exit">×</div>
        `;

        tabElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('exit')) {
                closetab(tabId);
            } else {
                switchTab(tabId);
            }
        });

        const tabBar = document.getElementById('tab-bar');
        const addTabButton = document.getElementById('add-tab');
        tabBar.insertBefore(tabElement, addTabButton);

        tab.element = tabElement;
        setupTabDragAndDrop(tabElement, tabId);

        if (tabs.length === 1 || !document.querySelector('.tab.active')) {
            switchTab(tabId);
        }

        console.log(`Tab created: ${name} (ID: ${tabId}) with URL: ${url}`);
        return tabId;
    } catch (error) {
        console.error('Error creating tab:', error);
        return null;
    }
}

function closetab(tabId) {
    try {
        const tabIndex = tabs.findIndex(tab => tab.id === tabId);
        if (tabIndex === -1) {
            console.error('Tab not found:', tabId);
            return;
        }

        const tab = tabs[tabIndex];
        const isActive = tab.element && tab.element.classList.contains('active');
        const wasLastTab = tabs.length === 1;

        if (tab.element && tab.element.parentNode) {
            tab.element.remove();
        }

        tabs.splice(tabIndex, 1);

        if (wasLastTab) {
            currentTabId = 0;
            createDefaultTab();
        } else if (isActive) {
            let newActiveIndex = tabIndex;
            if (newActiveIndex >= tabs.length) {
                newActiveIndex = tabs.length - 1;
            }
            if (tabs[newActiveIndex]) {
                switchTab(tabs[newActiveIndex].id);
            }
        }

        console.log(`Tab closed: ${tab.title} (ID: ${tabId})`);
    } catch (error) {
        console.error('Error closing tab:', error);
    }
}

function switchTab(tabId) {
    try {
        if (!tabId) return;

        const tab = tabs.find(tab => tab.id === tabId);
        if (!tab) {
            console.error('Tab not found for switching:', tabId);
            return;
        }

        document.querySelectorAll('.tab').forEach(tabEl => {
            tabEl.classList.remove('active');
        });

        if (tab.element) {
            tab.element.classList.add('active');
        }

        currentTabId = tabId;

        const iframe = document.getElementById('iframe');
        if (iframe) {
            // Validate and clean the URL before setting
            let urlToLoad = tab.url;

            // Handle about:blank or empty URLs
            if (!urlToLoad || urlToLoad === 'about:blank' || urlToLoad.trim() === '') {
                urlToLoad = getHomepageURL();
                tab.url = urlToLoad;
            }

            // Normalize URLs for comparison (handle relative paths)
            let currentIframeSrc = '';
            try {
                currentIframeSrc = new URL(iframe.src, window.location.origin).href;
            } catch (e) {
                currentIframeSrc = iframe.src;
            }

            let targetUrl = '';
            try {
                targetUrl = new URL(urlToLoad, window.location.origin).href;
            } catch (e) {
                targetUrl = urlToLoad;
            }

            console.log(`Switch tab - Current: ${currentIframeSrc}, Target: ${targetUrl}`);

            // Always load the URL for the switched tab
            // Don't skip loading even if URLs appear the same, as the iframe might be stuck
            iframe.src = urlToLoad;
            console.log(`Loading URL: ${urlToLoad}`);

            setTimeout(() => {
                injectDevToolsIntoIframe();
            }, 1000);
        }

        updateUrlInputOnSwitch(tabId);

        console.log(`Switched to tab: ${tab.title} (ID: ${tabId})`);
    } catch (error) {
        console.error('Error switching tab:', error);
    }
}

function saveTabs() {
    try {
        if (Array.isArray(tabs) && tabs.length > 0) {
            const cleanTabs = tabs.map(tab => ({
                id: tab.id,
                title: tab.title || 'Untitled',
                url: tab.url || './start.html'
            }));
            localStorage.setItem("tabs", JSON.stringify(cleanTabs));
        } else {
            localStorage.removeItem("tabs");
        }
    } catch (error) {
        console.error('Failed to save tabs:', error);
        try {
            if (tabs && tabs.length > 0) {
                localStorage.setItem("tabs_backup", JSON.stringify(tabs));
            }
        } catch (backupError) {
            console.error('Failed to create backup:', backupError);
        }
    }
}

function restoreTabs(savedTabs) {
    try {
        if (!Array.isArray(savedTabs) || savedTabs.length === 0) {
            createDefaultTab();
            return;
        }

        let restoredCount = 0;
        savedTabs.forEach(tabData => {
            if (tabData && typeof tabData === 'object' && (tabData.title || tabData.url)) {
                try {
                    // Validate and clean the URL before restoring
                    let urlToRestore = tabData.url || './start.html';

                    // Replace about:blank with the homepage
                    if (!urlToRestore || urlToRestore === 'about:blank' || urlToRestore.trim() === '') {
                        urlToRestore = getHomepageURL() || './start.html';
                    }

                    addtab(
                        tabData.title || 'Restored Tab',
                        urlToRestore
                    );
                    restoredCount++;
                } catch (tabError) {
                    console.error('Failed to restore tab:', tabError);
                }
            }
        });

        if (restoredCount === 0) {
            createDefaultTab();
        }

        console.log(`Restored ${restoredCount} tabs`);
    } catch (error) {
        console.error('Error restoring tabs:', error);
        createDefaultTab();
    }
}

function initializeTabs() {
    try {
        const savedTabs = localStorage.getItem("tabs");
        if (savedTabs) {
            const parsedTabs = JSON.parse(savedTabs);
            restoreTabs(parsedTabs);
        } else {
            createDefaultTab();
        }
    } catch (error) {
        console.error('Error initializing tabs:', error);
        createDefaultTab();
    }
}

// ========================================
// TAB DRAG AND DROP
// ========================================
function setupTabDragAndDrop(tabElement, tabId) {
    tabElement.draggable = true;

    tabElement.addEventListener('dragstart', (e) => {
        draggedTab = tabElement;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', tabId.toString());
        setTimeout(() => {
            if (tabElement && tabElement.classList) {
                tabElement.classList.add('dragging');
            }
        }, 0);
    });

    tabElement.addEventListener('dragend', () => {
        if (tabElement) {
            tabElement.classList.remove('dragging');
        }
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('drag-over');
        });
        draggedTab = null;
    });

    tabElement.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (tabElement !== draggedTab) {
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('drag-over');
            });
            tabElement.classList.add('drag-over');
        }
    });

    tabElement.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const draggedTabId = parseInt(e.dataTransfer.getData('text/plain'));
        if (draggedTabId === tabId) return;

        reorderTabs(draggedTabId, tabId);
    });
}

function reorderTabs(draggedTabId, targetTabId) {
    try {
        const draggedTabIndex = tabs.findIndex(tab => tab.id === draggedTabId);
        const targetTabIndex = tabs.findIndex(tab => tab.id === targetTabId);

        if (draggedTabIndex === -1 || targetTabIndex === -1) return;

        const draggedTab = tabs.splice(draggedTabIndex, 1)[0];
        const newIndex = targetTabIndex > draggedTabIndex ? targetTabIndex : targetTabIndex;
        tabs.splice(newIndex, 0, draggedTab);

        const tabBar = document.getElementById('tab-bar');
        const draggedElement = draggedTab.element;
        const targetElement = tabs.find(tab => tab.id === targetTabId).element;

        if (targetTabIndex > draggedTabIndex) {
            tabBar.insertBefore(draggedElement, targetElement.nextSibling);
        } else {
            tabBar.insertBefore(draggedElement, targetElement);
        }

        console.log(`Reordered tabs: ${draggedTab.title} moved to position ${newIndex}`);
    } catch (error) {
        console.error('Error reordering tabs:', error);
    }
}

// ========================================
// TAB TITLE AND URL UPDATES
// ========================================
function updateTabTitleAndUrl() {
    try {
        const iframe = document.getElementById('iframe');
        const currentTab = document.querySelector('.tab.active');

        if (!iframe || !currentTab || !Array.isArray(tabs)) return;

        const tabIdAttr = currentTab.getAttribute('data-tab-id');
        if (!tabIdAttr) return;

        const tabId = parseInt(tabIdAttr);
        if (isNaN(tabId)) return;

        const tabData = tabs.find(t => t && t.id === tabId);
        if (!tabData || !iframe.contentWindow) return;

        try {
            const iframeDoc = iframe.contentWindow.document;
            if (!iframeDoc) return;

            if (iframeDoc.location && iframeDoc.location.href &&
                iframeDoc.location.href !== tabData.url) {
                tabData.url = iframeDoc.location.href;

                // Try to extract URL from title (for proxy pages)
                let displayUrl = null;
                if (iframeDoc.title) {
                    displayUrl = extractUrlFromTitle(iframeDoc.title);
                }

                // If no URL in title, clean the URL normally
                if (!displayUrl) {
                    displayUrl = cleanProxyUrl(iframeDoc.location.href);
                }

                updateUrlBar(displayUrl);
            }

            if (iframeDoc.title && iframeDoc.title !== tabData.title &&
                iframeDoc.title.trim() !== '') {
                // Extract clean title (without URL part)
                let displayTitle = iframeDoc.title;
                if (displayTitle.includes('|A|')) {
                    displayTitle = displayTitle.split('|A|')[0].trim();
                }

                tabData.title = displayTitle;
                updateTabDisplay(tabId, displayTitle);
            }
        } catch (e) {
            // Cross-origin restriction
        }
    } catch (error) {
        console.error('Error updating tab title and URL:', error);
    }
}

function updateUrlBar(url) {
    try {
        const urlInput = document.getElementById('url-input');
        if (!urlInput || !url || typeof url !== 'string') return;

        // Use the cleanProxyUrl helper to consistently decode all proxy URLs
        const cleanedUrl = cleanProxyUrl(url);
        urlInput.value = cleanedUrl;
    } catch (error) {
        console.error('Error updating URL bar:', error);
    }
}

function updateTabDisplay(tabId, newTitle) {
    try {
        if (!tabId || !newTitle || typeof newTitle !== 'string') return;

        const tab = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (!tab) return;

        const titleSpan = tab.querySelector('.tab-title');
        if (titleSpan) {
            titleSpan.textContent = newTitle.trim();
        }
    } catch (error) {
        console.error('Error updating tab display:', error);
    }
}

function updateUrlInputOnSwitch(tabId) {
    try {
        if (!tabId) return;

        const tabData = tabs.find(t => t && t.id === tabId);
        const urlInput = document.getElementById('url-input');

        if (tabData && urlInput && tabData.url) {
            // Clean the URL before displaying
            const cleanedUrl = cleanProxyUrl(tabData.url);
            updateUrlBar(cleanedUrl);

            // Force immediate update to ensure URL bar is populated
            urlInput.value = cleanedUrl;
        }
    } catch (error) {
        console.error('Error updating URL input on switch:', error);
    }
}

// ========================================
// URL PROCESSING AND NAVIGATION
// ========================================
function processUrl(input) {
    let url = input;

    if (!url.match(/^https?:\/\//i)) {
        if (url.includes('.') && !url.includes(' ')) {
            url = 'https://' + url;
        } else {
            url = getSearchEngine() + encodeURIComponent(url);
        }
    }

    const currentTab = tabs.find(t => t.id === currentTabId);
    if (currentTab) {
        currentTab.url = url;
        document.getElementById('iframe').src = url;
    }
}

function goto(url) {
    try {
        if (!url || typeof url !== 'string') return;

        const iframe = document.getElementById("iframe");
        if (!iframe) return;

        iframe.src = url;

        if (Array.isArray(tabs)) {
            tabs.forEach(tab => {
                if (tab && tab.id === currentTabId) {
                    tab.url = url;
                }
            });
        }

        setTimeout(() => {
            injectDevToolsIntoIframe();
        }, 1000);
    } catch (error) {
        console.error('Error in goto function:', error);
    }
}

// ========================================
// LEGACY LOAD FUNCTION
// ========================================
function load(item) {
    if (item == "games") {
        addtab("Games", "games.html");
    }
    if (item == "movies") {
        addtab("Movies", "./features/movies.html");
    }
}

// ========================================
// SIDEBAR MANAGEMENT
// ========================================
function sidebarload(app) {
    try {
        if (!app || typeof app !== 'string') return;

        const sidemenu = document.getElementById("sidemenu");
        if (!sidemenu) return;

        const sidebarFrame = document.querySelector(`[use="${app}"]`);

        if (active && activeApp === app) {
            sidemenu.classList.remove("active");

            setTimeout(() => {
                if (sidemenu && !sidemenu.classList.contains('active')) {
                    sidemenu.style.display = "none";

                    const frames = document.querySelectorAll('#sidemenu iframe');
                    frames.forEach(frame => {
                        frame.style.opacity = "0";
                        frame.style.pointerEvents = "none";
                    });
                }
            }, 300);

            active = false;
            activeApp = "";
            return;
        }

        sidemenu.style.display = "block";

        const frames = document.querySelectorAll('#sidemenu iframe');
        frames.forEach(frame => {
            frame.style.opacity = "0";
            frame.style.pointerEvents = "none";
        });

        if (sidebarFrame) {
            sidebarFrame.style.opacity = "1";
            sidebarFrame.style.pointerEvents = "all";
            activeApp = app;

            if (!active) {
                requestAnimationFrame(() => {
                    sidemenu.classList.add("active");
                });
                active = true;
            }
        }
    } catch (error) {
        console.error('Error in sidebarload:', error);
    }
}

// ========================================
// WINDOW MANAGEMENT
// ========================================
function openApp(name, url) {
    try {
        if (!name || !url || typeof name !== 'string' || typeof url !== 'string') {
            console.error('Invalid name or URL provided to openApp');
            return;
        }

        const id = Math.floor(Math.random() * 1000000000);
        const bodyElement = document.getElementById("body");

        if (!bodyElement) {
            console.error('Body element not found');
            return;
        }

        const safeName = name.replace(/[<>"']/g, '');
        const safeUrl = url.replace(/[<>"']/g, '');

        const windowHTML = `
        <div class="window" id="${id}" onclick="arrange('${id}')">
            <div class="title-bar">
                <span>${safeName}</span>
                <div class="window-controls">
                    <div class="maximize" onclick="maximize('${id}')"></div>
                    <div class="minimize" onclick="minimize('${id}')"></div>
                    <div class="close" onclick="closeWindow('${id}')"></div>
                </div>
            </div>
            <div class="content">
                <iframe onclick="arrange('${id}')" src="${safeUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
        </div>
        `;

        bodyElement.insertAdjacentHTML("beforeend", windowHTML);

        const windowElement = document.getElementById(id);
        if (windowElement) {
            windowElement.style.zIndex = (highestZIndex || 0) + 1;
            highestZIndex = (highestZIndex || 0) + 1;

            if (typeof $ !== 'undefined' && $.fn.draggable && $.fn.resizable) {
                try {
                    const desktop = document.getElementById("desktop");
                    $(`#${id}`).draggable().resizable({
                        containment: desktop || 'document'
                    });
                } catch (jqueryError) {
                    console.error('Error initializing jQuery UI:', jqueryError);
                }
            }

            if (Array.isArray(stack)) {
                stack.push(id);
            }
        }
    } catch (error) {
        console.error('Error in openApp:', error);
    }
}

function openSettings() {
    try {
        addtab("Settings", "settings.html");
    } catch (error) {
        console.error('Error opening settings:', error);
    }
}

// ========================================
// DEVELOPER MODE
// ========================================
function injectDevToolsIntoIframe() {
    try {
        const developerMode = localStorage.getItem('axiomDeveloperMode') === 'true';
        const iframe = document.getElementById("iframe");

        if (!developerMode || !iframe) return;

        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDoc && iframeDoc.head && !iframeDoc.querySelector('script[data-eruda]')) {
                const script = iframeDoc.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/eruda@3.0.1/eruda.min.js';
                script.setAttribute('data-eruda', 'true');
                script.onload = function() {
                    try {
                        if (iframe.contentWindow && iframe.contentWindow.eruda) {
                            iframe.contentWindow.eruda.init({
                                container: iframeDoc.body,
                                tool: ['console', 'elements', 'network'],
                                defaults: {
                                    displaySize: 40,
                                    transparency: 0.8
                                }
                            });
                        }
                    } catch (initError) {
                        console.error('Error initializing eruda:', initError);
                    }
                };
                script.onerror = function() {
                    console.error('Failed to load eruda script');
                };
                iframeDoc.head.appendChild(script);
            }
        } catch (e) {
            // Cross-origin restriction
        }
    } catch (error) {
        console.error('Error in injectDevToolsIntoIframe:', error);
    }
}

function initDeveloperMode() {
    try {
        const developerMode = localStorage.getItem('axiomDeveloperMode') === 'true';

        if (developerMode && !window.eruda) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/eruda@3.0.1/eruda.min.js';
            script.onload = function() {
                try {
                    if (window.eruda && document.body) {
                        window.eruda.init({
                            container: document.body,
                            tool: ['console', 'elements', 'network', 'resource', 'info', 'snippets'],
                            useShadowDom: true,
                            autoScale: true,
                            defaults: {
                                displaySize: 50,
                                transparency: 0.9
                            }
                        });
                        console.log('🛠️ Developer mode enabled - Eruda dev tools loaded');
                    }
                } catch (initError) {
                    console.error('Error initializing developer tools:', initError);
                }
            };
            script.onerror = function() {
                console.error('Failed to load developer tools script');
            };
            const head = document.head;
            if (head) {
                head.appendChild(script);
            }
        }
    } catch (error) {
        console.error('Error in initDeveloperMode:', error);
    }
}

// ========================================
// EVENT LISTENERS
// ========================================

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        addtab();
    }

    if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            const tabId = parseInt(activeTab.getAttribute('data-tab-id'));
            closetab(tabId);
        }
    }

    if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            const currentIndex = tabs.findIndex(tab => tab.element === activeTab);
            const nextIndex = (currentIndex + 1) % tabs.length;
            if (tabs[nextIndex]) {
                switchTab(tabs[nextIndex].id);
            }
        }
    }

    if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            const currentIndex = tabs.findIndex(tab => tab.element === activeTab);
            const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
            if (tabs[prevIndex]) {
                switchTab(tabs[prevIndex].id);
            }
        }
    }
});

// URL input handling
const urlInput = document.getElementById('url-input');
if (urlInput) {
    urlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const url = this.value.trim();
            if (url) {
                if (url.startsWith("axiom://")) {
                    const page = url.split("//")[1];
                    if (page) {
                        goto(page + ".html");
                    }
                } else {
                    let processedUrl = url;

                    if (!processedUrl.includes(".")) {
                        processedUrl = getSearchEngine() + encodeURIComponent(processedUrl);
                    }

                    if (!processedUrl.includes("://")) {
                        processedUrl = "https://www." + processedUrl;
                    }

                    try {
                        goto('../prxy.html?url=' + btoa(processedUrl));
                    } catch (btoaError) {
                        console.error('Error encoding URL:', btoaError);
                        goto('../prxy.html?url=' + encodeURIComponent(processedUrl));
                    }
                }
            }
        }
    });

    urlInput.addEventListener("focus", function () {
        isTyping = true;
    });

    urlInput.addEventListener("blur", function () {
        isTyping = false;
    });
}

// Navigation buttons
const backButton = document.querySelector('#url-bar > button:nth-child(1)');
if (backButton) {
    backButton.onclick = function() {
        try {
            document.getElementById('iframe').contentWindow.history.back();
        } catch (e) {
            console.log('Navigation blocked by cross-origin policy');
        }
    };
}

const forwardButton = document.querySelector('#url-bar > button:nth-child(2)');
if (forwardButton) {
    forwardButton.onclick = function() {
        try {
            document.getElementById('iframe').contentWindow.history.forward();
        } catch (e) {
            console.log('Navigation blocked by cross-origin policy');
        }
    };
}

const refreshButton = document.querySelector('#url-bar > button:nth-child(3)');
if (refreshButton) {
    refreshButton.onclick = function() {
        const iframe = document.getElementById('iframe');
        if (iframe) {
            iframe.src = iframe.src;
        }
    };
}

// Fullscreen on double-click
document.addEventListener('dblclick', function(e) {
    const iframe = document.getElementById('iframe');
    if (e.target.closest('#iframe-container') && iframe) {
        if (!document.fullscreenElement) {
            iframe.requestFullscreen().catch(console.log);
        } else {
            document.exitFullscreen().catch(console.log);
        }
    }
});

// Developer mode storage listener
window.addEventListener('storage', (e) => {
    try {
        if (e && e.key === 'axiomDeveloperMode') {
            if (e.newValue === 'true') {
                initDeveloperMode();
            } else if (e.newValue === 'false' && window.eruda) {
                try {
                    window.eruda.destroy();
                    console.log('🛠️ Developer mode disabled - Eruda dev tools removed');
                } catch (destroyError) {
                    console.error('Error destroying eruda:', destroyError);
                }
            }
        }
    } catch (error) {
        console.error('Error in storage event handler:', error);
    }
});

// ========================================
// AUTHENTICATION
// ========================================
let isSignupMode = false;

const loginSidebarButton = document.getElementById('login-sidebar-button');
if (loginSidebarButton) {
    loginSidebarButton.addEventListener('click', () => {
        isSignupMode = false;
        document.getElementById('dialog-title').textContent = 'Login to Axiom';
        document.getElementById('login-button').textContent = 'Login';
        document.getElementById('switch-to-signup').textContent = 'Create Account';
        document.getElementById('confirm-password-container').style.display = 'none';
        document.getElementById('login-dialog').style.display = 'block';
    });
}

const switchToSignupButton = document.getElementById('switch-to-signup');
if (switchToSignupButton) {
    switchToSignupButton.addEventListener('click', () => {
        isSignupMode = !isSignupMode;
        if (isSignupMode) {
            document.getElementById('dialog-title').textContent = 'Sign Up for Axiom';
            document.getElementById('login-button').textContent = 'Sign Up';
            document.getElementById('switch-to-signup').textContent = 'Back to Login';
            document.getElementById('confirm-password-container').style.display = 'block';
        } else {
            document.getElementById('dialog-title').textContent = 'Login to Axiom';
            document.getElementById('login-button').textContent = 'Login';
            document.getElementById('switch-to-signup').textContent = 'Create Account';
            document.getElementById('confirm-password-container').style.display = 'none';
        }
    });
}

const loginButton = document.getElementById('login-button');
if (loginButton) {
    loginButton.addEventListener('click', async () => {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            alert('Please enter both email and password.');
            return;
        }

        let retries = 0;
        while ((!window.auth || !window.signInWithEmailAndPassword || !window.createUserWithEmailAndPassword) && retries < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }

        if (!window.auth) {
            alert('Authentication system not ready. Please try again.');
            return;
        }

        if (isSignupMode) {
            const confirmPassword = document.getElementById('login-confirm-password').value;
            if (password !== confirmPassword) {
                alert('Passwords do not match.');
                return;
            }
            try {
                const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);
                console.log('Signed up:', userCredential.user);
                document.getElementById('login-dialog').style.display = 'none';
                document.getElementById('login-email').value = '';
                document.getElementById('login-password').value = '';
                document.getElementById('login-confirm-password').value = '';
            } catch (error) {
                console.error('Signup error:', error);
                let errorMessage = 'Signup failed. ';
                if (error.code === 'auth/email-already-in-use') {
                    errorMessage += 'Email already in use.';
                } else if (error.code === 'auth/weak-password') {
                    errorMessage += 'Password is too weak.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage += 'Invalid email address.';
                } else {
                    errorMessage += 'Please try again.';
                }
                alert(errorMessage);
            }
        } else {
            try {
                const userCredential = await window.signInWithEmailAndPassword(window.auth, email, password);
                console.log('Logged in:', userCredential.user);
                document.getElementById('login-dialog').style.display = 'none';
                document.getElementById('login-email').value = '';
                document.getElementById('login-password').value = '';
            } catch (error) {
                console.error('Login error:', error);
                let errorMessage = 'Login failed. ';
                if (error.code === 'auth/user-not-found') {
                    errorMessage += 'No account found with this email.';
                } else if (error.code === 'auth/wrong-password') {
                    errorMessage += 'Incorrect password.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage += 'Invalid email address.';
                } else {
                    errorMessage += 'Please check your credentials.';
                }
                alert(errorMessage);
            }
        }
    });
}

const cancelLoginButton = document.getElementById('cancel-login');
if (cancelLoginButton) {
    cancelLoginButton.addEventListener('click', () => {
        document.getElementById('login-dialog').style.display = 'none';
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('login-confirm-password').value = '';
        isSignupMode = false;
        document.getElementById('dialog-title').textContent = 'Login to Axiom';
        document.getElementById('login-button').textContent = 'Login';
        document.getElementById('switch-to-signup').textContent = 'Create Account';
        document.getElementById('confirm-password-container').style.display = 'none';
    });
}

// ========================================
// IFRAME URL PROXY OVERRIDE
// ========================================
(function() {
    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
        if (name === 'src' && this.tagName === 'IFRAME' && value && (value.startsWith('http://') || value.startsWith('https://'))) {
            value = '../prxy.html?url=' + btoa(value);
        }
        return originalSetAttribute.call(this, name, value);
    };

    const iframe = document.getElementById('iframe');
    if (iframe) {
        let originalSrc = iframe.src;
        Object.defineProperty(iframe, 'src', {
            get: function() { return originalSrc; },
            set: function(value) {
                if (value && (value.startsWith('http://') || value.startsWith('https://'))) {
                    originalSrc = '../prxy.html?url=' + btoa(value);
                } else {
                    originalSrc = value;
                }
                originalSetAttribute.call(this, 'src', originalSrc);
            }
        });
    }
})();

// ========================================
// INTERVALS AND INITIALIZATION
// ========================================

// Auto-save tabs
setInterval(saveTabs, 100);

// Update tab title and URL
setInterval(updateTabTitleAndUrl, 100);

// URL bar auto-update
setInterval(() => {
    try {
        if (isTyping) return;

        const iframe = document.getElementById("iframe");
        const urlInput = document.getElementById("url-input");

        if (!iframe || !urlInput || !Array.isArray(tabs)) return;

        let currentUrl = null;
        let currentTitle = null;

        try {
            const contentDoc = iframe.contentDocument;
            if (contentDoc && contentDoc.location) {
                currentUrl = contentDoc.location.href;
                currentTitle = contentDoc.title;
            }
        } catch (e) {
            // Cross-origin restriction - can't access iframe URL
            return;
        }

        if (!currentUrl) return;

        // Try to extract URL from title first (for proxy pages with formatted titles)
        let displayUrl = null;
        if (currentTitle) {
            displayUrl = extractUrlFromTitle(currentTitle);
        }

        // If no URL in title, clean the URL normally
        if (!displayUrl) {
            displayUrl = cleanProxyUrl(currentUrl);
        }

        // Update tab title if available
        try {
            if (currentTitle) {
                // Extract clean title (without URL part)
                let displayTitle = currentTitle;
                if (displayTitle.includes('|A|')) {
                    displayTitle = displayTitle.split('|A|')[0].trim();
                }

                tabs.forEach(tab => {
                    if (tab && tab.id === currentTabId) {
                        tab.title = displayTitle;
                    }
                });
            }
        } catch (e) {
            // Cross-origin restriction
        }

        // Only update the URL input if the cleaned URL is different from what's displayed
        if (urlInput.value !== displayUrl) {
            urlInput.value = displayUrl;
        }
    } catch (error) {
        console.error('Error in URL update interval:', error);
    }
}, 100);

// Miniplayer interval
let activeminiplayer = false;
setInterval(() => {
    try {
        const currentVideoId = localStorage.getItem("currentVideoId");
        if (currentVideoId && activeminiplayer === false) {
            const inIframe = window.self !== window.top;
            if (!inIframe) {
                activeminiplayer = true;
                openApp("Miniplayer", "https://www.youtube.com/embed/" + currentVideoId);
                localStorage.removeItem("currentVideoId");

                setTimeout(() => {
                    activeminiplayer = false;
                }, 1000);
            }
        }
    } catch (error) {
        console.error('Error in miniplayer interval:', error);
    }
}, 100);

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initDeveloperMode();
});

// Initialize tabs immediately
initializeTabs();

// ========================================
// GLOBAL EXPORTS (for HTML onclick handlers)
// ========================================
window.addtab = addtab;
window.closetab = closetab;
window.switchTab = switchTab;
window.sidebarload = sidebarload;
window.openSettings = openSettings;
window.load = load;
window.openApp = openApp;
window.goto = goto;
