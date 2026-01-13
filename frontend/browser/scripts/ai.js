let history = [];

// yes these are client side. no they aren't some secret private code. steal them, idgaf

let sys_prompt_def = `
You are the Axiom Network AI assistant embedded within the Axiom proxy.
Your goal is to be a helpful assistant and assist with all tasks required.
`;
let sys_prompt_prem = `
You are a deep thinking AI called AxiomAI, you may use extremely long chains of thought to deeply consider the problem and deliberate with yourself via systematic reasoning processes to help come to a correct solution prior to answering. You should enclose your thoughts and internal monologue inside <think> </think> tags, and then provide your solution or response to the problem. Always include a final response outside of the XML tags.
`;

function getWebpageContext() {
  const content = sessionStorage.getItem("axiomAICon");
  if (content && content.trim()) {
    return `\n\nYou currently have access to the following webpage content that the user is viewing:\n<webpage_content>\n${content.substring(0, 8000)}\n</webpage_content>\nYou can reference this content when answering questions about the page.`;
  }
  return "";
}

function buildSystemPrompt() {
  let basePrompt = (localStorage.getItem("axiomPremium") == "true" && window.premium.check())
    ? sys_prompt_prem
    : sys_prompt_def;
  return basePrompt + getWebpageContext();
}

history.push({ role: "system", content: buildSystemPrompt() });

function parseThinkTags(content) {
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
  let thinkContent = '';
  let mainContent = content;

  const matches = content.match(thinkRegex);
  if (matches) {
    matches.forEach(match => {
      const innerContent = match.replace(/<\/?think>/gi, '');
      thinkContent += innerContent + '\n';
    });
    mainContent = content.replace(thinkRegex, '').trim();
  }

  return { thinkContent: thinkContent.trim(), mainContent };
}

function formatMessageWithThinking(content) {
  const { thinkContent, mainContent } = parseThinkTags(content);
  let html = '';

  if (thinkContent) {
    html += `<details class="think-box">
      <summary>Thinking...</summary>
      <div class="think-content">${thinkContent.replace(/\n/g, '<br>')}</div>
    </details>`;
  }

  if (mainContent) {
    html += mainContent.replace(/\n/g, '<br>');
  }

  return html;
}

function addMessage(content, role) {
  const message = document.createElement("div");
  message.classList.add("message-" + role);
  message.innerHTML = role === 'ai' ? formatMessageWithThinking(content) : content;
  document.getElementById("chat-container").appendChild(message);
}

async function sendMessage() {
  const message = document.getElementById("input").value;
  if (!message.trim()) return;

  history[0] = { role: "system", content: buildSystemPrompt() };

  addMessage(message, "user");
  history.push({ role: "user", content: message });
  document.getElementById("input").value = "";

  try {
    const fullPrompt = history.map(h => h.role === 'system' ? h.content : `${h.role}: ${h.content}`).join('\n') + '\nAssistant:';
    const response = await fetch(`https://charbot.ape3d.com/?prompt=${encodeURIComponent(history[0]['content'] + '\n' + fullPrompt)}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullMessage = '';
    const aiMessageDiv = document.createElement("div");
    aiMessageDiv.classList.add("message-ai");
    document.getElementById("chat-container").appendChild(aiMessageDiv);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullMessage += chunk;
      aiMessageDiv.innerHTML = formatMessageWithThinking(fullMessage);
    }
    history.push({ role: "assistant", content: fullMessage });
  } catch (error) {
    console.error("Error getting AI response:", error);
    addMessage("Sorry, there was an error getting a response.", "ai");
  }
}

document.getElementById("input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});
