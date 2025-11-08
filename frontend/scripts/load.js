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
    result = (localStorage.getItem("axiomSearchEngine") || search_engine) + result;
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

async function initializeServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser");
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none"
    });

    console.log("Service worker registered:", registration);

    // If there's no controller, we need to reload to let the SW take control
    if (!navigator.serviceWorker.controller) {
      console.log("No controller found, waiting for activation...");

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      // If still no controller after ready, reload the page once
      if (!navigator.serviceWorker.controller) {
        console.log("Reloading to activate service worker...");
        window.location.reload();
        return;
      }
    }

    console.log("Service worker is ready and controlling the page");
    return registration;
  } catch (error) {
    console.error("Failed to initialize service worker:", error);
    throw error;
  }
}

async function loadProxyPage() {

  
  try {
    await initializeServiceWorker();
  } catch (error) {
    console.error("Service worker initialization failed:", error);
    alert("Failed to initialize proxy service. Please refresh the page.");
    return;
  }

  const urlParam = getURLParameter("url");
  if (!urlParam) return;

  const url = buildSearchUrl(urlParam, search_engine);
  console.log("Loading URL:", url);

  const frame = document.getElementById("iframe");

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

  
  frame.onload = hideLoader;

  
  setTimeout(hideLoader, 5000);

  frame.style.display = "block";


  setInterval(() => {
    try {
      let frameDoc = frame.contentDocument;
      if (!frameDoc) return;

      let title = frameDoc.title;
      let frameUrl = "";

      
      try {
        const currentSrc = frame.src;
        if (currentSrc && currentSrc.includes(__uv$config.prefix)) {
          const encodedUrl = currentSrc.substring(currentSrc.indexOf(__uv$config.prefix) + __uv$config.prefix.length);
          frameUrl = __uv$config.decodeUrl(encodedUrl);
        } else {
          frameUrl = url;
        }
      } catch (e) {
        frameUrl = url;
      }


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
      
      console.debug('Could not access iframe content:', e);
    }
  }, 100);
}

window.addEventListener('load', async () => {
  loadProxyPage();
});
