const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");

const searchParams = new URLSearchParams(window.location.search);
let API_KEY = searchParams.get("key");
const API_URL = `/api/chat`;
let apiKeys = [];
let currentApiKeyIndex = 0;
let controller, typingInterval;
const chatHistory = [];
const userData = { message: "", file: {} };

const loadApiKeys = () => {
  const saved = localStorage.getItem("apiKeys");
  if (saved) {
    apiKeys = saved.split(",").map(k => k.trim()).filter(k => k);
    if (apiKeys.length > 0) {
      API_KEY = apiKeys[0];
    }
  }
};

const saveApiKeys = (keys) => {
  apiKeys = keys.filter(k => k.trim());
  localStorage.setItem("apiKeys", apiKeys.join(","));
  if (apiKeys.length > 0) {
    API_KEY = apiKeys[0];
    currentApiKeyIndex = 0;
  }
};

const switchToNextApiKey = () => {
  if (apiKeys.length > 1) {
    currentApiKeyIndex = (currentApiKeyIndex + 1) % apiKeys.length;
    API_KEY = apiKeys[currentApiKeyIndex];
    console.log(`Switched to API key ${currentApiKeyIndex + 1}`);
    return true;
  }
  return false;
};

loadApiKeys();

const initTheme = () => {
  const savedTheme = localStorage.getItem("theme") || "light";
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    const themeLabel = document.querySelector("#theme-label");
    themeLabel.textContent = "Light Mode";
  }
};

const toggleTheme = () => {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  const themeLabel = document.querySelector("#theme-label");
  themeLabel.textContent = isDark ? "Light Mode" : "Dark Mode";
};

const translations = {
  en: {
    greeting: "Hello, there",
    subheading: "How can I help you today?",
    placeholder: "Ask Assistant",
    suggestions: [
      "Design a home office setup for remote work under $500.",
      "How can I level up my web development expertise in 2025?",
      "Suggest some useful tools for debugging JavaScript code.",
      "Create a React JS component for the simple todo list app."
    ]
  },
  id: {
    greeting: "Halo, selamat datang",
    subheading: "Apa yang bisa saya bantu hari ini?",
    placeholder: "Tanya Asisten",
    suggestions: [
      "Rancang setup home office untuk kerja remote di bawah $500.",
      "Bagaimana cara meningkatkan keahlian web development saya di 2025?",
      "Sarankan beberapa tools berguna untuk debugging kode JavaScript.",
      "Buat komponen React JS untuk aplikasi todo list sederhana."
    ]
  }
};

let currentLang = localStorage.getItem("language") || "en";

const setLanguage = (lang) => {
  currentLang = lang;
  localStorage.setItem("language", lang);
  updateLanguage();
};

const updateLanguage = () => {
  const t = translations[currentLang];
  document.querySelector(".app-header .heading").textContent = t.greeting;
  document.querySelector(".app-header .sub-heading").textContent = t.subheading;
  document.querySelector(".prompt-input").placeholder = t.placeholder;
  
  const suggestionsList = document.querySelectorAll(".suggestions-item .text");
  suggestionsList.forEach((item, i) => {
    if (t.suggestions[i]) item.textContent = t.suggestions[i];
  });
};

const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

const scrollToBottom = () =>
  container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  const words = text.split(" ");
  let wordIndex = 0;

  typingInterval = setInterval(() => {
    if (wordIndex < words.length) {
      textElement.textContent +=
        (wordIndex === 0 ? "" : " ") + words[wordIndex++];
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
    }
  }, 40);
};

const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();

  chatHistory.push({
    role: "user",
    parts: [
      { text: userData.message },
      ...(userData.file.data
        ? [
            {
              inline_data: (({ fileName, isImage, ...rest }) => rest)(
                userData.file
              ),
            },
          ]
        : []),
    ],
  });
  try {
    const apiConfig = JSON.parse(localStorage.getItem("apiConfig") || "{}");
    const provider = apiConfig.provider || "gemini";
    const ollamaUrl = apiConfig.url || "http://localhost:11434/api/generate";

    const requestBody = { contents: chatHistory, provider, ollamaUrl };
    console.log('Request body:', JSON.stringify(requestBody));
    
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || data.error);

    const responseText = data.candidates[0].content.parts[0].text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .trim();
    typingEffect(responseText, textElement, botMsgDiv);
    chatHistory.push({ role: "model", parts: [{ text: responseText }] });
  } catch (error) {
    textElement.textContent =
      error.name === "AbortError"
        ? "Response generation stopped."
        : error.message;
    textElement.style.color = "#d62939";
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
    scrollToBottom();
  } finally {
    userData.file = {};
  }
};

const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding"))
    return;
  userData.message = userMessage;
  promptInput.value = "";
  document.body.classList.add("chats-active", "bot-responding");
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");

  const userMsgHTML = `
    <p class="message-text"></p>
    ${
      userData.file.data
        ? userData.file.isImage
          ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />`
          : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`
        : ""
    }
  `;
  const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userData.message;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();
  setTimeout(() => {
    const botMsgHTML = `<img class="avatar" src="https://cdn.freelogovectors.net/wp-content/uploads/2024/02/gemini_logo-chatbot-freelogovectors.net_-180x135.png" /> <p class="message-text">Just a sec...</p>`;
    const botMsgDiv = createMessageElement(
      botMsgHTML,
      "bot-message",
      "loading"
    );
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 600);
};

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (e) => {
    fileInput.value = "";
    const base64String = e.target.result.split(",")[1];
    fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
    fileUploadWrapper.classList.add(
      "active",
      isImage ? "img-attached" : "file-attached"
    );
    userData.file = {
      fileName: file.name,
      data: base64String,
      mime_type: file.type,
      isImage,
    };
  };
});

document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
});

document.querySelector("#stop-response-btn").addEventListener("click", () => {
  controller?.abort();
  userData.file = {};
  clearInterval(typingInterval);
  chatsContainer
    .querySelector(".bot-message.loading")
    .classList.remove("loading");
  document.body.classList.remove("bot-responding");
});

document.querySelector("#delete-chats-btn").addEventListener("click", () => {
  if (confirm("Hapus semua chat? Tindakan ini tidak bisa dibatalkan.")) {
    chatHistory.length = 0;
    chatsContainer.innerHTML = "";
    userData.file = {};
    fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
    promptInput.value = "";
    document.body.classList.remove("chats-active", "bot-responding");
  }
});

document.querySelectorAll(".suggestions-item").forEach((suggestion) => {
  suggestion.addEventListener("click", () => {
    promptInput.value = suggestion.querySelector(".text").textContent;
    promptForm.dispatchEvent(new Event("submit"));
  });
});

document.addEventListener("click", ({ target }) => {
  const wrapper = document.querySelector(".prompt-wrapper");
  const shouldHide =
    target.classList.contains("prompt-input") ||
    (wrapper.classList.contains("hide-controls") &&
      (target.id === "add-file-btn" || target.id === "stop-response-btn"));
  wrapper.classList.toggle("hide-controls", shouldHide);
});

promptForm.addEventListener("submit", handleFormSubmit);
promptForm
  .querySelector("#add-file-btn")
  .addEventListener("click", () => fileInput.click());

initTheme();

const menuBtn = document.querySelector("#menu-btn");
const dropdownContent = document.querySelector("#dropdown-content");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");
const settingsMenuBtn = document.querySelector("#settings-menu-btn");
const settingsModal = document.querySelector("#settings-modal");
const closeModalBtn = document.querySelector("#close-modal");
const saveApiKeysBtn = document.querySelector("#save-api-keys");
const clearApiKeysBtn = document.querySelector("#clear-api-keys");
const apiKeysInput = document.querySelector("#api-keys-input");
const apiStatus = document.querySelector("#api-status");

themeToggleBtn.addEventListener("click", () => {
  toggleTheme();
  dropdownContent.classList.remove("active");
});

menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdownContent.classList.toggle("active");
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".dropdown-menu")) {
    dropdownContent.classList.remove("active");
  }
});

settingsMenuBtn.addEventListener("click", () => {
  dropdownContent.classList.remove("active");
  settingsModal.classList.add("active");
});

closeModalBtn.addEventListener("click", () => {
  settingsModal.classList.remove("active");
});

settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.remove("active");
  }
});

saveApiKeysBtn.addEventListener("click", () => {
  const apiProvider = document.querySelector("#api-provider").value;
  let config = { provider: apiProvider };

  if (apiProvider === "gemini") {
    const keys = apiKeysInput.value.split(",");
    if (keys.some(k => k.trim())) {
      config.keys = keys.map(k => k.trim()).filter(k => k);
      localStorage.setItem("apiConfig", JSON.stringify(config));
      apiStatus.textContent = `${config.keys.length} Gemini API key berhasil disimpan`;
      apiStatus.classList.add("success");
      apiStatus.classList.remove("error");
      setTimeout(() => {
        settingsModal.classList.remove("active");
        apiStatus.classList.remove("success");
      }, 2000);
    } else {
      apiStatus.textContent = "Masukkan minimal 1 API key";
      apiStatus.classList.add("error");
      apiStatus.classList.remove("success");
    }
  } else if (apiProvider === "ollama") {
    const ollamaUrl = document.querySelector("#ollama-url-input").value.trim();
    if (ollamaUrl) {
      config.url = ollamaUrl;
      localStorage.setItem("apiConfig", JSON.stringify(config));
      apiStatus.textContent = `Ollama server ${ollamaUrl} berhasil disimpan`;
      apiStatus.classList.add("success");
      apiStatus.classList.remove("error");
      setTimeout(() => {
        settingsModal.classList.remove("active");
        apiStatus.classList.remove("success");
      }, 2000);
    } else {
      apiStatus.textContent = "Masukkan URL Ollama";
      apiStatus.classList.add("error");
      apiStatus.classList.remove("success");
    }
  } else if (apiProvider === "huggingface") {
    const hfKey = document.querySelector("#huggingface-key-input").value.trim();
    if (hfKey) {
      config.key = hfKey;
      localStorage.setItem("apiConfig", JSON.stringify(config));
      apiStatus.textContent = "Hugging Face API key berhasil disimpan";
      apiStatus.classList.add("success");
      apiStatus.classList.remove("error");
      setTimeout(() => {
        settingsModal.classList.remove("active");
        apiStatus.classList.remove("success");
      }, 2000);
    } else {
      apiStatus.textContent = "Masukkan Hugging Face API key";
      apiStatus.classList.add("error");
      apiStatus.classList.remove("success");
    }
  }
});

clearApiKeysBtn.addEventListener("click", () => {
  if (confirm("Hapus semua API configuration?")) {
    localStorage.removeItem("apiConfig");
    document.querySelector("#api-keys-input").value = "";
    document.querySelector("#ollama-url-input").value = "http://localhost:11434";
    document.querySelector("#huggingface-key-input").value = "";
    apiStatus.textContent = "Semua API config dihapus";
    apiStatus.classList.add("error");
    apiStatus.classList.remove("success");
  }
});

document.querySelector("#api-provider").addEventListener("change", (e) => {
  const provider = e.target.value;
  document.querySelector("#gemini-section").style.display = provider === "gemini" ? "block" : "none";
  document.querySelector("#ollama-section").style.display = provider === "ollama" ? "block" : "none";
  document.querySelector("#huggingface-section").style.display = provider === "huggingface" ? "block" : "none";
});

document.querySelectorAll(".lang-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".lang-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    setLanguage(btn.dataset.lang);
  });
  if (btn.dataset.lang === currentLang) {
    btn.classList.add("active");
  }
});

updateLanguage();
