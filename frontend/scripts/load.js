const search_engine = "https://search.brave.com/search?q=";

function getURLParameter(name) {
  const base64RegExp = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;
  const regex = new RegExp(`[\\?&]${name}=([^&#]*)`);
  const match = regex.exec(location.search);

  if (!match) return "";

  let paramValue = match[1];

  if (base64RegExp.test(paramValue)) {
    paramValue = atob(paramValue);
  }

  let result = decodeURIComponent(paramValue.replace(/\+/g, " "));

  if (!result.startsWith("http://") && !result.startsWith("https://") && result.includes(".")) {
    result = "https://" + result;
  }
  else if (!result.includes(".")){
    result = (localStorage.getItem("axiomSearchEngine") || "https://search.brave.com/search?q=") + result
  }
  return result;
}

function buildSearchUrl(input, searchEngine) {
  let url;
  try {
    if (
      !input.startsWith("http://") &&
      !input.startsWith("https://") &&
      input.includes(".")
    ) {
      input = "https://" + input;
    }
    url = new URL(input).toString();
  } catch (err) {
    return `${searchEngine}${encodeURIComponent(input)}`;
  }

  if (url.includes("reddit.com")) {
    url = url.replace("reddit.com", "l.opnxng.com");
  }

  return url;
}

async function loadProxyPage() {
  const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

  // Register service worker and wait for it to be ready
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/"
    });

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    // If there's no active controller, wait for it
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
      });
    }

    console.log("Service worker is ready and controlling the page");
  }

  const urlParam = getURLParameter("url");
  if (!urlParam) return;

  const url = buildSearchUrl(urlParam, search_engine);
  console.log("Loading URL:", url);

  const frame = document.getElementById("iframe");
  const loader = document.getElementById("loader");

  let wispUrl =  "wss://anura.pro/";
  await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
  frame.src = __uv$config.prefix + __uv$config.encodeUrl(url);

  const hideLoader = () => {
    if (loader && loader.parentNode) {
      loader.style.transition = "opacity 0.3s ease";
      loader.style.opacity = "0";
      setTimeout(() => {
        if (loader.parentNode) {
          loader.remove();
        }
      }, 300);
    }
  };

  // Try to detect when iframe is loaded
  frame.onload = hideLoader;

  // Fallback timeout to hide loader after 5 seconds regardless
  setTimeout(hideLoader, 5000);

  frame.style.display = "block";


  setInterval(() => {
    try {
      let frameDoc = frame.contentDocument;
      if (!frameDoc) return;

      let title = frameDoc.title;
      let frameUrl = "";

      frameUrl = url; 


      let formattedTitle = title + "|A|" + frameUrl;
      if (formattedTitle !== document.title) {
        document.title = formattedTitle;
      }

      let content = frameDoc.body.innerHTML;
      content = content.replace(/<[^>]+>/g, '');
      content = content.replace(/&nbsp;/g, ' ');
      content = content.replace(/\t/g, ' ');
      content = content.replace(/\n/g, ' ');
      content = content.replace(/\n\s*\n/g, '\n');
      content = content.trim();
      sessionStorage.setItem("content", content);
    } catch (e) {
      // Cross-origin error handling
      console.debug('Could not access iframe content:', e);
    }
  }, 100);
}

window.addEventListener('load', async () => {
  loadProxyPage();
});
