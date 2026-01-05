let initialized = 0;

function getURLParameter(name) {
  const regex = new RegExp(
    "[\\?&]" + name.replace(/[\[\]]/g, "\\$&") + "=([^&#]*)"
  );
  const results = regex.exec(window.location.search);
  return results ? decodeURIComponent(results[1].replace(/\+/g, " ")) : "";
}

function createTab(name, url) {
  var tab = document.createElement("div");
  tab.classList.add("tab");
  tab.id = Math.random().toString(36).substr(2, 9);
  tab.innerHTML = `
                <p class="close" onclick="removeTab('${tab.id}')">X</p>
                <p>${name}</p>
            `;
  tab.draggable = true;

  var frame = document.createElement("iframe");
  frame.src = url;
  frame.id = tab.id + "-frame";
  frame.style.display = "none";

  document.getElementById("frames").appendChild(frame);

  tab.onclick = function () {
    // Remove active class from all tabs
    var allTabs = document.getElementsByClassName("tab");
    for (var i = 0; i < allTabs.length; i++) {
      allTabs[i].classList.remove("active");
    }

    // Add active class to clicked tab
    tab.classList.add("active");

    // Hide all iframes and remove active class
    var iframes = document.querySelectorAll("#frames iframe");
    for (var i = 0; i < iframes.length; i++) {
      iframes[i].classList.remove("active");
      iframes[i].style.display = "none";
    }

    // Show this tab's iframe
    var activeFrame = document.getElementById(tab.id + "-frame");
    if (activeFrame) {
      activeFrame.classList.add("active");
      activeFrame.style.display = "block";
    }
  };

  tab.ondragstart = function (event) {
    event.dataTransfer.setData("text", tab.id);
  };

  tab.ondragover = function (event) {
    event.preventDefault();
  };

  tab.ondrop = function (event) {
    event.preventDefault();
    var sourceId = event.dataTransfer.getData("text");
    var targetId = tab.id;
    if (sourceId !== targetId) {
      var sourceTab = document.getElementById(sourceId);
      var targetTab = document.getElementById(targetId);
      var parent = tab.parentNode;
      parent.insertBefore(sourceTab, targetTab.nextSibling);
    }
  };

  document.getElementById("tabs2").appendChild(tab);
  tab.click();

  frame.onload = function () {
    var frameTitle = frame.contentDocument.title;
    tab.innerHTML = `
                    <p>${frameTitle}</p>
                    <p class="close" onclick="removeTab('${tab.id}')">X</p>
                `;
    var last_title = frameTitle;
    setInterval(function () {
      frameTitle = frame.contentDocument.title;

      frameURL = frameTitle.split("|A|")[1];
      frameTitle = frameTitle.split("|A|")[0];

      const maxTitleLength = 30;
      if (frameTitle.length > maxTitleLength) {
        frameTitle = frameTitle.substring(0, maxTitleLength) + "...";
      }

      if (frameTitle != last_title) {
        if (frameURL == "") {
          x = getURLParameter("url");
          if (x.includes(".") == false) {
            x = "https://duckduckgo.com/search?q=" + x;
          }
          if (x.startsWith("https://") == false) {
            x = "https://" + x;
          }
          url1 =
            "https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=" +
            x;
        } else {
          url1 =
            "https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=" +
            frameURL;
        }
        tab.innerHTML = `
    <p style="display: flex; align-items: center;">
    ${frameTitle}
    
    </p>
    <p class="close" style="display: inline-block; cursor: pointer; margin-left: auto;" onclick="removeTab('${tab.id}')">X</p>
    
`;

        last_title = frameTitle;
      }
    }, 500);
  };
}
function removeTab(id) {
  var tab = document.getElementById(id);
  var frame = document.getElementById(id + "-frame");
  if (tab) {
    tab.parentNode.removeChild(tab);
    if (frame) {
      frame.parentNode.removeChild(frame);
      // check if there are any tabs left
      var tabs = document.getElementsByClassName("tab");
      if (tabs.length === 0) {
        // press it
        document
          .getElementById("create_tab")
          .click();

        // tap the glass
        if (tabs.length > 0) {
          tabs[0].click();
        }
      }
    }
  }
}

document.addEventListener("DOMContentLoaded", function () {
  if (initialized === 0) {
    var url = getURLParameter("url");

    if (url) {
      createTab("Home", "../render.html?url=" + url);
    } else {
      createTab("New Tab", "start.html");
    }
    initialized = 1;
  }
});
