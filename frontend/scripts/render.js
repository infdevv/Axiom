const search_engine_preference =
  localStorage.getItem("search_engine") || "Google";
let suggestions = [];

search_engine = "https://search.brave.com/search?q=";

const premium = window.premium.check()
let typing = 0;
let scramjetFrame = null;
let scramjet = null;

document
  .getElementById("search")
  .addEventListener("focusin", () => (typing = 1));
document
  .getElementById("search")
  .addEventListener("focusout", () => (typing = 0));

function getURLParameter(name) {
  const regex = new RegExp(`[\\?&]${name}=([^&#]*)`);
  const results = regex.exec(location.search);
  return results ? atob(results[1]) : "";
}

document.getElementById("search").addEventListener("keydown", function () {
  if (event.key == "Enter") {
    navigateToPage();
  }
});

function navigateToPage() {
  const url = document.getElementById("search").value;
  window.location = `render.html?url=${btoa(url)}`;
}

function cleanContent(htmlString){
  if (!htmlString) return "";

  const nukeTags = /<(script|style|div)\b[^>]*>([\s\S]*?)<\/\1>/gim;
  let cleaned = htmlString.replace(nukeTags, "");

  const stripTags = /<[^>]+>/g;
  cleaned = cleaned.replace(stripTags, "");
  return cleaned
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

let lastKnownUrl = "";                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   let wisp_end = ["wss://anura.pro/wisp/", "wss://gointospace.app/wisp/"];
let current_wisp_index = parseInt(sessionStorage.getItem("wisp_index")) || 0;
let current_wisp = wisp_end[current_wisp_index];
let fallback_count = parseInt(sessionStorage.getItem("fallback_count")) || 0;

function updateDocumentTitle() {
  if (scramjetFrame && scramjetFrame.frame) {
    try {
      const frameTitle = scramjetFrame.frame.contentDocument
        ? scramjetFrame.frame.contentDocument.title
        : "";

      if (frameTitle == "Scramjet") { // error page
        // cycle to next wisp if not tried all
        if (fallback_count < wisp_end.length) {
          current_wisp_index = (current_wisp_index + 1) % wisp_end.length;
          sessionStorage.setItem("wisp_index", current_wisp_index);
          current_wisp = wisp_end[current_wisp_index];
          fallback_count++;
          sessionStorage.setItem("fallback_count", fallback_count);
          location.reload();
        }
      } else if (frameTitle) {
        // successful load, reset fallback count
        fallback_count = 0;
        sessionStorage.setItem("fallback_count", fallback_count);
      }

      
      const currentUrl = scramjetFrame.url || "";

      
      if (currentUrl && currentUrl !== lastKnownUrl && !typing) {
        lastKnownUrl = currentUrl;
        document.getElementById("search").value = currentUrl;

        
        const newBrowserUrl = `render.html?url=${btoa(currentUrl)}`;
        if (window.location.search !== `?url=${btoa(currentUrl)}`) {
          history.replaceState(null, "", newBrowserUrl);
        }
      }

      
      if (frameTitle && document.title !== frameTitle) {
        if (premium) {
          
          sessionStorage.setItem("axiomAICon", cleanContent(scramjetFrame.frame.contentDocument.innerHTML));
        }
        document.title = frameTitle;
      }
    } catch (e) {
    }
  }
}

const searchInput = document.querySelector("#search");

function buildSearchUrl(input, searchEngine) {
  try {
    if (
      !input.startsWith("http://") &&
      !input.startsWith("https://") &&
      input.includes(".")
    ) {
      input = "https://" + input;
    }
    return new URL(input).toString();
  } catch (err) {
    return `${searchEngine}${encodeURIComponent(input)}`;
  }
}

let eruda_status = 0;

function handle_eruda() {
  if (window.eruda == null) {
    javascript: (function () {
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/eruda";
      document.body.append(script);
      script.onload = function () {
        eruda.init();
      };
    })();
    window.eruda.show();
  } else {
    if (eruda_status == 0) {
      window.eruda.show();
      eruda_status = 1;
    } else {
      window.eruda.hide();
      eruda_status = 0;
    }
  }
}

function handle_fullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

const stockSW = "/scram_es/sw.js";

const swAllowedHostnames = ["localhost", "127.0.0.1"];

async function registerSW() {
  if (!navigator.serviceWorker) {
    if (
      location.protocol !== "https:" &&
      !swAllowedHostnames.includes(location.hostname)
    )
      throw new Error("Service workers cannot be registered without https.");

    throw new Error("Your browser doesn't support service workers.");
  }

  await navigator.serviceWorker.register(stockSW, { scope: "/" });
}

document.addEventListener("DOMContentLoaded", async () => {

  while (typeof BareMux === "undefined") {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const { ScramjetController } = $scramjetLoadController();

  scramjet = new ScramjetController(__scramjet$config);

  let url = getURLParameter("url") || "";

  await scramjet.init();

  const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

  try {
    await registerSW();
    console.log("Registered!");
  } catch (err) {
    console.error("Failed to register service worker:", err);
  }

  const wispUrl = current_wisp; /*
    (location.protocol === "https:" ? "wss" : "ws") +
    "://" +
    location.host +
    "/wisp/"; */

  await connection.setTransport("/epoxy/index.mjs", [
    {
      wisp: wispUrl,
    },
  ]);

  if (url) {
    const finalUrl = buildSearchUrl(url, search_engine);

    // Initialize search bar with the URL
    document.getElementById("search").value = url;
    lastKnownUrl = finalUrl;

    scramjetFrame = scramjet.createFrame();
    scramjetFrame.frame.id = "frame";
    scramjetFrame.frame.classList.add("active");
    document.getElementById("frame-container").appendChild(scramjetFrame.frame);

    scramjetFrame.go(finalUrl);

    setInterval(updateDocumentTitle, 500);
  }
});
