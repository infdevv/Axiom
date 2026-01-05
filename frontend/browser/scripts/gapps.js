let type = "apps"
if (window.location.href.includes("gapps")) {
    type = "gapps"
}

fetch("./assets/" + type + ".json")
  .then((response) => response.json())
  .then((jsonData) => {
    let apps = jsonData;
    let appsContainer = document.getElementById("apps");
    apps.forEach((app) => {
      let appElement = document.createElement("div");
      appElement.classList.add("app");
      appElement.innerHTML = `
                    <img src="${app.app_img}" alt="${app.app_name}">
                    <h3>${app.app_name}</h3>
                `;
      appElement.addEventListener("click", () => {
        window.location.href = "../render.html?url=" + btoa(app.app_url);
      });
      appsContainer.appendChild(appElement);
    });
  });
