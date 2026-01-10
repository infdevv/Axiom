async function initThemeSelector() {
  if (!window.themeManager.themes) {
    await window.themeManager.init();
  }

  const themes = window.themeManager.themes;
  const activeTheme = window.themeManager.getTheme();
  const container = document.querySelector(".theme-container");
  const isPremium = window.premium.checkSync();

  const freeThemes = [];
  const premiumThemes = [];

  for (let themeName of Object.keys(themes)) {
    const themeData = themes[themeName];
    if (themeData.premium) {
      premiumThemes.push({ name: themeName, data: themeData });
    } else {
      freeThemes.push({ name: themeName, data: themeData });
    }
  }

  for (let theme of freeThemes) {
    container.innerHTML += `
      <div class="theme" id="${theme.name}">
        <div class="sample" style="background-color: ${theme.data.primary};"></div>
        <span>${theme.name}</span>
      </div>
    `;
  }

  if (premiumThemes.length > 0) {
    container.innerHTML += `
      <div class="premium-divider">
        <span class="premium-badge">Premium Themes</span>
      </div>
    `;

    for (let theme of premiumThemes) {
      const lockedClass = isPremium ? '' : 'locked';
      container.innerHTML += `
        <div class="theme ${lockedClass}" id="${theme.name}" data-premium="true">
          <div class="sample" style="background-color: ${theme.data.primary}; border: 2px solid ${theme.data.quaternary};">
            ${!isPremium ? '<span class="lock-icon"><span class="material-symbols-outlined">lock</span></span>' : ''}
          </div>
          <span>${theme.name}</span>
        </div>
      `;
    }
  }

  const activeElement = document.getElementById(activeTheme);
  if (activeElement) {
    activeElement.classList.add("on");
  }

  document.querySelectorAll(".theme").forEach((themeElement) => {
    themeElement.addEventListener("click", () => {
      const themeName = themeElement.id;
      if (themeElement.dataset.premium === "true" && !window.premium.checkSync()) {
        alert("This theme requires Premium. Enter your premium key below to unlock!");
        return;
      }

      document.querySelectorAll(".theme").forEach((t) => {
        t.classList.remove("on");
      });
      themeElement.classList.add("on");
      window.themeManager.setTheme(themeName);
      // trigger reload
      sessionStorage.setItem("axiomReload", "true");
    });
  });
}

function initWallpaperUpload() {
  const wallpaperSection = document.getElementById("wallpaper-section");
  if (!wallpaperSection) return;

  const isPremium = window.premium.checkSync();

  if (!isPremium) {
    wallpaperSection.innerHTML = `
      <h4>Custom Wallpaper</h4>
      <p class="premium-required">Requires Premium</p>
    `;
    return;
  }

  const hasCustom = window.premium.wallpaper.hasCustom();

  wallpaperSection.innerHTML = `
    <h4>Custom Wallpaper</h4>
    <input type="file" id="wallpaper-upload" accept="image/*" style="display: none;">
    <button onclick="document.getElementById('wallpaper-upload').click()" class="upload-btn">
      <span class="material-symbols-outlined">upload</span> Upload Wallpaper
    </button>
    ${hasCustom ? '<button onclick="clearCustomWallpaper()" class="clear-btn"><span class="material-symbols-outlined">wallpaper</span> Use Theme Wallpaper</button>' : ''}
    <p class="hint">Max 5MB. Supports PNG, JPG, WebP</p>
  `;

  // Add upload handler
  document.getElementById("wallpaper-upload").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      await window.premium.wallpaper.upload(file);
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'wallpaperChanged' }, '*');
      }
      initWallpaperUpload(); 
      alert("Wallpaper set successfully!");
    } catch (err) {
      alert("Error: " + err);
    }
  });
}

function clearCustomWallpaper() {
  window.premium.wallpaper.clear();
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'wallpaperCleared' }, '*');
  }
  initWallpaperUpload();
}

function initTabSessions() {
  const sessionsSection = document.getElementById("tab-sessions-section");
  if (!sessionsSection) return;

  const isPremium = window.premium.checkSync();

  if (!isPremium) {
    sessionsSection.innerHTML = `
      <h4>Tab Sessions</h4>
      <p class="premium-required">Requires Premium</p>
    `;
    return;
  }

  const sessions = window.premium.tabs.getSessions();

  let sessionsHTML = `
    <h4>Tab Sessions</h4>
    <div class="session-controls">
      <input type="text" id="session-name" placeholder="Session name">
      <button onclick="saveCurrentSession()"><span class="material-symbols-outlined">save</span> Save Current Tabs</button>
    </div>
  `;

  if (sessions.length > 0) {
    sessionsHTML += `<div class="sessions-list">`;
    for (let session of sessions) {
      const date = new Date(session.savedAt).toLocaleDateString();
      sessionsHTML += `
        <div class="session-item">
          <span class="session-name">${session.name}</span>
          <span class="session-info">${session.tabCount} tabs - ${date}</span>
          <button onclick="restoreSession('${session.name}')"><span class="material-symbols-outlined">restore</span> Restore</button>
          <button onclick="deleteSession('${session.name}')" class="delete-btn"><span class="material-symbols-outlined">close</span></button>
        </div>
      `;
    }
    sessionsHTML += `</div>`;
  } else {
    sessionsHTML += `<p class="hint">No saved sessions yet</p>`;
  }

  sessionsSection.innerHTML = sessionsHTML;
}

function saveCurrentSession() {
  const nameInput = document.getElementById("session-name");
  const name = nameInput.value.trim();

  if (!name) {
    alert("Please enter a session name");
    return;
  }

  if (window.parent && window.parent.premium) {
    window.parent.premium.tabs.save(name);
    alert("Session saved!");
    nameInput.value = "";
    initTabSessions();
  } else {
    alert("Cannot save tabs from this context. Open settings from the browser.");
  }
}

function restoreSession(name) {
  if (window.parent && window.parent.premium) {
    window.parent.premium.tabs.restore(name);
    alert("Session restored!");
  } else {
    alert("Cannot restore tabs from this context.");
  }
}

function deleteSession(name) {
  if (confirm("Delete session '" + name + "'?")) {
    window.premium.tabs.deleteSession(name);
    initTabSessions();
  }
}

initThemeSelector();
initWallpaperUpload();
initTabSessions();

if (window.premium.checkSync()) {
  document.getElementById("info").innerHTML = "Premium Active! Enjoy all features!";
}

function activatePremium() {
  const key = document.getElementById("input").value;
  localStorage.setItem("axiomPremiumKey", key);

  window.premium.check().then(isValid => {
    if (isValid) {
      localStorage.setItem("axiomPremium", "true");
      window.location.reload();
    } else {
      alert("Invalid premium key. Please check and try again.");
    }
  }).catch(() => {
    alert("Failed to verify premium key. Please try again later.");
  });
}
