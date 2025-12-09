class SettingsManager {
    constructor() {
        this.themesData = null;
        this.loadThemes();
    }

    async loadThemes() {
        try {
            const response = await fetch('./assets/storage/themes.json');
            this.themesData = await response.json();
            this.displayThemes();
        } catch (error) {
            console.error('Error loading themes:', error);
            alert('Failed to load themes');
        }
    }

    displayThemes() {
        const settingDiv = document.querySelector('.setting');
        if (!settingDiv || !this.themesData) return;

        const currentTheme = localStorage.getItem('axiomTheme') || Object.keys(this.themesData)[0];


        const themeContainer = document.createElement('div');
        themeContainer.className = 'theme-container';


        Object.keys(this.themesData).forEach(themeName => {
            const themeButton = document.createElement('button');
            themeButton.className = 'theme-button';
            themeButton.textContent = this.formatThemeName(themeName);
            themeButton.setAttribute('name', 'tertiary');
            themeButton.dataset.theme = themeName;


            if (themeName === currentTheme) {
                themeButton.classList.add('active');
            }


            themeButton.addEventListener('click', () => {
                this.selectTheme(themeName);
            });


            const colorPreview = document.createElement('div');
            colorPreview.className = 'color-preview';
            const theme = this.themesData[themeName];
            colorPreview.style.background = `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`;
            colorPreview.style.border = `2px solid ${theme.border}`;

            themeButton.appendChild(colorPreview);

            themeContainer.appendChild(themeButton);
        });

        settingDiv.appendChild(themeContainer);

        if (window.themeManager) {
            window.themeManager.load();
        }
    }

    formatThemeName(name) {
        return name
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    selectTheme(themeName) {

        document.querySelectorAll('.theme-button').forEach(btn => {
            btn.classList.remove('active');
        });


        const selectedButton = document.querySelector(`[data-theme="${themeName}"]`);
        if (selectedButton) {
            selectedButton.classList.add('active');
        }


        if (window.themeManager) {
            window.themeManager.setTheme(themeName);
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManager();
});


async function setPremiumKey(key) {
    // check key 
    await fetch("/api/check-premium", {method: "GET", headers: {key: key}}).then(res => res.json()).then(res => {
        if (!res.success){
            alert("Invalid Key");
            return;
        }
        else {
            localStorage.setItem("premiumKey", key);
            location.reload();
        }
    }) 
}

if (localStorage.getItem("premiumKey")){
    document.getElementById("premiumKey").value = localStorage.getItem("premiumKey")
    document.getElementById("status").textContent = "Premium activated!";
}