class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem("axiomTheme") || "default";
        this.themes = null;
        this.observer = null;
        this.mutationTimeout = null;

        fetch("/assets/storage/themes.json")
            .then(response => response.json())
            .then(data => {
                this.themes = data;
                this.load();
                this.setupMutationObserver();
                this.setupStorageListener();
            })
            .catch(error => {
                alert("Error loading themes: " + error);
                window.location.reload();
            });
    }

    setupMutationObserver() {
        if (this.observer) return;

        // Don't set up observer if we're inside an iframe to prevent conflicts
        // when multiple browser windows are open
        if (window !== window.top) {
            return;
        }

        this.observer = new MutationObserver((mutationsList) => {

            if (this.mutationTimeout) {
                clearTimeout(this.mutationTimeout);
            }

            this.mutationTimeout = setTimeout(() => {
                let shouldReload = false;

                for (const mutation of mutationsList) {
                    if (mutation.type === 'childList') {

                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === 1 && node.hasAttribute('name')) {
                                shouldReload = true;
                                break;
                            }
                        }
                    }
                    if (mutation.type === 'attributes' && mutation.attributeName === 'name') {
                        shouldReload = true;
                    }
                }

                if (shouldReload && this.themes) {
                    this.load();
                }
            }, 50);
        });

        const config = {
            attributes: true,
            attributeFilter: ['name'],
            childList: true,
            subtree: true
        };

        this.observer.observe(document.body, config);
    }

    setupStorageListener() {
        // Listen for storage events from other tabs/windows
        window.addEventListener('storage', (e) => {
            if (e.key === 'axiomTheme' && e.newValue && e.newValue !== this.theme) {
                this.theme = e.newValue;
                this.load();
            }
        });

        // Also poll localStorage periodically to catch changes in the same tab
        setInterval(() => {
            const currentTheme = localStorage.getItem("axiomTheme");
            if (currentTheme && currentTheme !== this.theme) {
                this.theme = currentTheme;
                this.load();
            }
        }, 500);
    }

    applyTheme(theme) {
        if (!this.themes || !this.themes[theme]) {
            console.error(`Theme '${theme}' not found`);
            return;
        }
        this.theme = theme;
        localStorage.setItem("axiomTheme", theme);
        this.load();
    }

    getAvailableThemes() {
        return this.themes ? Object.keys(this.themes) : [];
    }

    getCurrentTheme() {
        return this.theme;
    }

    load() {
        if (!this.themes) return;

        const theme = this.themes[this.theme];

        
        document.body.style.color = theme["text"];

        
        const selectors = {
            primary: '[name="primary"]',
            secondary: '[name="secondary"]',
            tertiary: '[name="tertiary"]',
            quaternary: '[name="quaternary"]',
            surface: '[name="surface"]',
            textSecondary: '[name="textSecondary"]',
            textMuted: '[name="textMuted"]'
        };

        
        for (const [key, selector] of Object.entries(selectors)) {
            const elements = document.querySelectorAll(selector);
            const colorProp = theme[key]; 
            const borderColor = theme["border"];
            const textColor = theme["text"];

            if (!colorProp) continue; 

            elements.forEach(element => {
                if (key.startsWith('text')) {
                    
                    element.style.setProperty('color', colorProp, 'important');
                } else {
                    
                    element.style.setProperty('background-color', colorProp, 'important');
                    element.style.setProperty('border-color', borderColor, 'important');
                    element.style.setProperty('color', textColor, 'important');
                }
            });
        }
    }
}

window.themeManager = new ThemeManager();

// FUCK VERCELLLLLLLLL



if (localStorage.getItem("premiumKey")) {
    try {
        const res = await fetch("/api/check-premium", {
            method: "GET",
            headers: { key: localStorage.getItem("premiumKey") }
        });
        const data = await res.json();
        if (data.success) {
            sessionStorage.setItem("premium", "true");
        } else {
            sessionStorage.setItem("premium", "false");
        }
    } catch (error) {
        console.error("Premium check failed:", error);
        sessionStorage.setItem("premium", "false");
    }
}

let currentTitle 
let currentURL 

if (!(window.location.href).includes("main.html")){

if (localStorage.getItem("axiomAds") === "false") {
    document.getElementById("info").remove()
}

setInterval(function(){
    if (currentTitle === document.title && currentURL === (window.location.href).replace(window.origin + "/", "")){
        return
    }
    currentTitle = document.title
    currentURL = (window.location.href).replace(window.origin + "/", "").replace(".html","")
    document.title = `${document.title}|A|axiom://${(window.location.href).replace(window.origin + "/", "").replace(".html","")}`
    if (localStorage.getItem("axiomAds") === "false") {
        document.querySelectorAll('iframe').forEach(function(iframe) {
            iframe.parentNode.removeChild(iframe);
        });
    }
}, 500)

}