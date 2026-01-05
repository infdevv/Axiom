window.themeManager = {
    themes: null,
    currentTheme: null,
    listeners: [],
    wallpaperBasePath: null,
    variableMap: {
        '--bg-color': 'primary',
        '--window-bg': 'secondary',
        '--window-header': 'tertiary',
        '--text-color': 'text',
        '--accent-color': 'quaternary',

        '--color-background': 'primary',
        '--color-surface': 'secondary',
        '--color-primary': 'quaternary',
        '--color-secondary': 'quinary',
        '--color-text-primary': 'text',
        '--color-text-secondary': 'text',
        '--color-accent': 'quaternary',

        '--theme-primary': 'primary',
        '--theme-secondary': 'secondary',
        '--theme-tertiary': 'tertiary',
        '--theme-quaternary': 'quaternary',
        '--theme-quinary': 'quinary',
        '--theme-border': 'border',
        '--theme-text': 'text',
        '--theme-inactive-tab': 'inactiveTabBg',
        '--theme-active-tab': 'activeTabBg',
        '--theme-tab-text': 'tabText',

        '--primary-button-text-color': 'text',
        '--input-bg': 'secondary',
        '--card-bg': 'secondary',
        '--hover-bg': 'tertiary'
    },

    async init() {
        try {
            const paths = [
                { themes: '../storage/themes.json', wallpapers: '../storage/os-assets/wallpapers/' },
                { themes: './storage/themes.json', wallpapers: './storage/os-assets/wallpapers/' },
                { themes: '/storage/themes.json', wallpapers: '/storage/os-assets/wallpapers/' },
                { themes: 'storage/themes.json', wallpapers: 'storage/os-assets/wallpapers/' },
                { themes: '../browser/storage/themes.json', wallpapers: '../browser/storage/os-assets/wallpapers/' },
                { themes: '../../storage/themes.json', wallpapers: '../../storage/os-assets/wallpapers/' }
            ];

            let themes = null;
            for (const pathConfig of paths) {
                try {
                    const response = await fetch(pathConfig.themes);
                    if (response.ok) {
                        themes = await response.json();
                        this.wallpaperBasePath = pathConfig.wallpapers;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!themes) {
                console.warn('ThemeManager: Could not load themes.json, using defaults');
                themes = this.getDefaultThemes();
                this.wallpaperBasePath = '../storage/os-assets/wallpapers/';
            }

            this.themes = themes;
            this.applyTheme();
            return true;
        } catch (error) {
            console.error('ThemeManager: Error initializing', error);
            return false;
        }
    },

    getDefaultThemes() {
        return {
            "Default": {
                "primary": "#121212",
                "secondary": "#1e1e1e",
                "tertiary": "#252525",
                "quaternary": "#3b82f6",
                "quinary": "#1e1e1e",
                "border": "#252525",
                "text": "#ffffff",
                "inactiveTabBg": "#1e1e1e",
                "activeTabBg": "#252525",
                "tabText": "#ffffff"
            }
        };
    },

    getTheme() {
        return localStorage.getItem("axiomTheme") || "Default";
    },

    getThemeList() {
        return this.themes ? Object.keys(this.themes) : ["Default"];
    },

    getThemeData(themeName) {
        if (!this.themes) return null;
        return this.themes[themeName] || this.themes["Default"];
    },

    setTheme(theme, skipApply = false) {
        const oldTheme = this.currentTheme;
        localStorage.setItem("axiomTheme", theme);
        this.currentTheme = theme;

        if (!skipApply) {
            this.applyTheme();
        }

        this.notifyListeners(theme, oldTheme);
    },

    getWallpaperPath(themeName) {
        const filename = themeName.toLowerCase() + '.webp';
        return this.wallpaperBasePath + filename;
    },

    applyTheme() {
        const themeName = this.getTheme();
        const themeData = this.getThemeData(themeName);

        if (!themeData) {
            console.warn(`ThemeManager: Theme "${themeName}" not found`);
            return false;
        }

        this.currentTheme = themeName;
        const root = document.documentElement;

        for (const [cssVar, themeProp] of Object.entries(this.variableMap)) {
            const value = themeData[themeProp];
            if (value) {
                root.style.setProperty(cssVar, value);
            }
        }

        if (themeData.primary) {
            root.style.setProperty('--bg-color-alpha', this.hexToRgba(themeData.primary, 0.35));
            root.style.setProperty('--bg-color-alpha-low', this.hexToRgba(themeData.primary, 0.2));
        }
        if (themeData.secondary) {
            root.style.setProperty('--surface-alpha', this.hexToRgba(themeData.secondary, 0.3));
        }
        if (themeData.quaternary) {
            root.style.setProperty('--accent-alpha', this.hexToRgba(themeData.quaternary, 0.25));
        }

        if (location.pathname.includes('main.html') || sessionStorage.getItem('isMainPage') !== 'true') {
            const hasCustomWallpaper = localStorage.getItem("axiomUseCustomWallpaper") === "true" &&
                                       localStorage.getItem("axiomCustomWallpaper") !== null;

            if (!hasCustomWallpaper) {
                const wallpaperPath = this.getWallpaperPath(themeName);
                document.body.style.backgroundImage = `url('${wallpaperPath}')`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundRepeat = 'no-repeat';
            }
        }

        document.body.setAttribute('data-theme', themeName);

        return true;
    },

    hexToRgba(hex, alpha) {
        hex = hex.replace('#', '');

        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }

        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },

    onChange(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
        }
    },

    offChange(callback) {
        this.listeners = this.listeners.filter(cb => cb !== callback);
    },

    notifyListeners(newTheme, oldTheme) {
        for (const listener of this.listeners) {
            try {
                listener(newTheme, oldTheme);
            } catch (e) {
                console.error('ThemeManager: Listener error', e);
            }
        }
    },

    isDarkTheme(themeName) {
        const themeData = this.getThemeData(themeName || this.getTheme());
        if (!themeData || !themeData.primary) return true;

        const hex = themeData.primary.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        return luminance < 0.5;
    }
};

if (localStorage.getItem("axiomTheme") === null) {
    localStorage.setItem("axiomTheme", "Default");
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => themeManager.init());
} else {
    themeManager.init();
}