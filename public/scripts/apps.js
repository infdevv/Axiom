let appsData = [];

const searchInput = document.querySelector(
  'input[placeholder="Search for apps!"]'
);
const searchResults = document.getElementById("search-res");
const appsContainer = document.getElementById("apps");

searchInput.addEventListener("input", function () {
  const searchTerm = this.value.toLowerCase().trim();
  if (searchTerm === "") {
    // Show all apps if search is empty
    searchResults.innerHTML = "";
    appsContainer.style.display = "block";
  } else {
    // Filter and display search results
    performSearch(searchTerm);
    appsContainer.style.display = "none";
  }
});

function performSearch(searchTerm) {
  const filteredApps = appsData.filter((app) =>
    app.app_name.toLowerCase().includes(searchTerm)
  );

  displaySearchResults(filteredApps);
}

function displaySearchResults(results) {
  if (results.length === 0) {
    searchResults.innerHTML = "<p>No apps found.</p>";
    return;
  }

  let resultsHTML =
    '<div class="division"><h3>Search Results</h3><div class="division apps" id="search-results-container">';

  results.forEach((app) => {
    resultsHTML += `
                    <img src="${app.app_img}" alt="${app.app_name}" data-url="${app.app_url}" style="opacity: 1;">
                `;
  });

  resultsHTML += "</div></div>";
  searchResults.innerHTML = resultsHTML;

  const resultImages = searchResults.querySelectorAll("img");
  resultImages.forEach((img) => {
    img.onclick = function () {
      window.location =
        "./render.html?url=" + encodeURIComponent(btoa(this.dataset.url));
    };
  });
}

let sitename = location.href
if (sitename.includes("gapps")) sitename = "gapps"
else if (sitename.includes("apps")) sitename = "apps"


fetch("./assets/storage/" + sitename + ".json")
  .then((response) => response.json())
  .then((data) => {
    appsData = data;
    for (const app of data) {
      const image = document.createElement("img");
      image.src = app["app_img"];
      image.alt = app["app_name"];
      image.onload = function () {
        this.style.opacity = "1";
      };
      image.onclick = function () {
        window.location =
          "./render.html?url=" + encodeURIComponent(btoa(app["app_url"]));
      };

      document.getElementById(app["type"]).appendChild(image);
    }
  });
