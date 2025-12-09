
(function() {
    'use strict';
    
    class themeManager {
        constructor() {
            this.themes = {};
            this.currentTheme = 'default'; 
            this.isLoading = false;
            this.isInitialized = false;
        }

        async load() {
            if (this.isInitialized) return Promise.resolve();
            
            try {
                const response = await fetch('./assets/storage/themes.json');
                this.themes = await response.json();
                
                const savedTheme = localStorage.getItem('axiomTheme') || 'space';
                this.setTheme(savedTheme);
                
                this.isInitialized = true;
                console.log('Theme manager loaded with themes:', Object.keys(this.themes));

                window.addEventListener('storage', (e) => {
                    if (e.key === 'axiomTheme') {
                        this.setTheme(e.newValue);
                    }
                });

                return Promise.resolve();
            } catch (error) {
                console.error('Failed to load themes:', error);
                this.themes = {
                    space: {
                        primary: "#E0E1DD",
                        secondary: "#778DA9",
                        tertiary: "#1B263B",
                        quaternary: "#415A77",
                        quinary: "#0D1B2A",
                        border: "#0D1B2A"
                    }
                };
                this.setTheme('space');
                this.isInitialized = true;
                return Promise.resolve();
            }
        }

        setTheme(themeName) {
            if (!this.themes[themeName]) {
                console.warn(`Theme '${themeName}' not found, using default`);
                themeName = 'space';
            }

            this.currentTheme = themeName;
            this.applyTheme(this.themes[themeName]);
            localStorage.setItem('axiomTheme', themeName);
            
            this.updateThemeSelectionUI(themeName);
            
            console.log(`Applied theme: ${themeName}`);
        }

        hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
        }

        getLuminance(hex) {
            const rgb = this.hexToRgb(hex);
            if (!rgb) return 0;
            const [r, g, b] = rgb.split(', ').map(Number);
            return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        }

        applyTheme(theme) {
            const root = document.documentElement;

            root.style.setProperty('--theme-primary', theme.primary);
            root.style.setProperty('--theme-secondary', theme.secondary);
            root.style.setProperty('--theme-tertiary', theme.tertiary);
            root.style.setProperty('--theme-quaternary', theme.quaternary);
            root.style.setProperty('--theme-quinary', theme.quinary);
            root.style.setProperty('--theme-border', theme.border);

            root.style.setProperty('--theme-primary-rgb', this.hexToRgb(theme.primary));
            root.style.setProperty('--theme-secondary-rgb', this.hexToRgb(theme.secondary));
            root.style.setProperty('--theme-tertiary-rgb', this.hexToRgb(theme.tertiary));
            root.style.setProperty('--theme-quaternary-rgb', this.hexToRgb(theme.quaternary));
            root.style.setProperty('--theme-quinary-rgb', this.hexToRgb(theme.quinary));
            root.style.setProperty('--theme-border-rgb', this.hexToRgb(theme.border));

            const bgLuminance = this.getLuminance(theme.tertiary);
            const textColor = bgLuminance < 0.5 ? theme.primary : theme.quinary;
            root.style.setProperty('--text-color', textColor);
            root.style.setProperty('--tab-text-color', theme.quinary);
            root.style.setProperty('--accent-color', theme.primary);
            root.style.setProperty('--primary-bg', theme.tertiary);
            root.style.setProperty('--secondary-bg', theme.quaternary);

            this.applyMainPageBackground(theme);
        }

        applyMainPageBackground(theme) {
            if (window.location.pathname.includes('main.html')) {
                document.body.style.backgroundColor = theme.tertiary;
            }
        }

        updateThemeSelectionUI(selectedTheme) {
            const themeButtons = document.querySelectorAll('.theme-button');
            themeButtons.forEach(button => {
                button.classList.remove('active');
                if (button.dataset.theme === selectedTheme) {
                    button.classList.add('active');
                }
            });
        }

        getCurrentTheme() {
            return this.currentTheme;
        }

        getAvailableThemes() {
            return Object.keys(this.themes);
        }

        getThemeColors(themeName = null) {
            const themeToGet = themeName || this.currentTheme;
            return this.themes[themeToGet] || {};
        }

        getColor(colorName, themeName = null) {
            const themeToGet = themeName || this.currentTheme;
            return this.themes[themeToGet]?.[colorName] || '#000000';
        }

        generateThemePreview(themeName, colors) {
            return `
                <div class="color-preview" style="
                    background: linear-gradient(45deg, ${colors.primary}, ${colors.secondary}, ${colors.tertiary});
                    border: 1px solid ${colors.border};
                "></div>
            `;
        }
    }

    const themeManagerInstance = new themeManager();
    
    window.themeManager = themeManagerInstance;
    
    window.themeManager.load = themeManagerInstance.load.bind(themeManagerInstance);
    window.themeManager.setTheme = themeManagerInstance.setTheme.bind(themeManagerInstance);
    window.themeManager.getCurrentTheme = themeManagerInstance.getCurrentTheme.bind(themeManagerInstance);
    window.themeManager.getAvailableThemes = themeManagerInstance.getAvailableThemes.bind(themeManagerInstance);
    window.themeManager.getThemeColors = themeManagerInstance.getThemeColors.bind(themeManagerInstance);
    window.themeManager.getColor = themeManagerInstance.getColor.bind(themeManagerInstance);
    window.themeManager.generateThemePreview = themeManagerInstance.generateThemePreview.bind(themeManagerInstance);
    
    window.themeManagerClass = themeManager;
})();