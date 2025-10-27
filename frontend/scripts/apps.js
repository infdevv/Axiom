let validTypes = ["pcgames", "apps", "games", "shows"];

let urlsearch = new URLSearchParams(window.location.search);
let appsContainer = document.getElementById("apps");
let type = urlsearch.get("type");

if (!validTypes.includes(type)) type = "pcgames";

document.getElementsByClassName(type)[0].setAttribute("name", "secondary");
fetch("/assets/storage/" + type + ".json")
  .then((response) => response.json())
  .then((data) => {
    for (app of data) {
      const appDiv = document.createElement("img");
      appDiv.classList.add("app");
      appDiv.setAttribute("data", app.name);

      appDiv.src = app["image"];

      appDiv.categories = JSON.stringify(app["categories"]);

      const appLink = app["link"]; // Capture the link value
      appDiv.onclick = function () {
        window.location = "/load.html?url=" + btoa(appLink);
      };

      appsContainer.appendChild(appDiv);
    }
  })
  .catch((error) => {
    alert("Error while loading apps: " + error);
  });
  function filterApps() {
    let filter = document.getElementById("search").value.toLowerCase();
    let apps = Array.from(document.getElementsByClassName("app")).sort((a, b) => {
      let nameA = a.getAttribute("data") || "";
      let nameB = b.getAttribute("data") || "";
      return nameA.localeCompare(nameB);
    });

    // Clear and re-append in sorted order
    appsContainer.innerHTML = "";
    for (let app of apps) {
      appsContainer.appendChild(app);
      if (app.getAttribute("data").toLowerCase().includes(filter)) {
        app.style.display = "block";
      } else {
        app.style.display = "none";
      }
    }
  }

  document.getElementById("search").addEventListener("input", filterApps);
