function updateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateString = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  document.getElementById("currentTime").textContent = timeString;
  document.getElementById("currentDate").textContent = dateString;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return "Good... night?";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function updateGreeting() {
  const greeting = getGreeting();
  const isFirstVisit = localStorage.getItem("firstVisit") === null;

  if (isFirstVisit) {
    localStorage.setItem("firstVisit", "false");
  }

  document.getElementById("greetingText").textContent = greeting;
  document.getElementById("welcomeMessage").textContent = isFirstVisit
    ? "Welcome to Axiom"
    : "Welcome back to Axiom";
}


updateTime();
updateGreeting();
setInterval(updateTime, 1000);


const urlBar = document.getElementById("urlBar");
urlBar.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    const query = urlBar.value.trim();
    if (query) {
      if (query.includes(".") && !query.includes(" ")) {
        const url = query.startsWith("http") ? query : "https://" + query;
        window.location.href = url;
      } else {
        window.location.href = "/load.html?url=" + btoa(query);
      }
    }
  }
});
