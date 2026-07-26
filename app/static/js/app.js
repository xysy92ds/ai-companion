/* AI Companion - Core App Logic v4 (with i18n + page cache) */

const API_BASE = "";
let currentPage = "chat";

// v4: Page cache system - stores rendered DOM wrappers by page name.
// Instead of destroying pages on navigation, we hide them (display:none).
// This preserves SSE streams, terminal history, and form inputs.
const pageCache = {};

// v4: Global variable holding the active model name (shown in top bar badge)
let currentModelInfo = null;

// --- API helpers ----------------------------------------------------------

async function apiGet(path) {
    const res = await fetch(API_BASE + path);
    return res.json();
}

async function apiPost(path, body, isFormData) {
    const opts = { method: "POST" };
    if (isFormData) {
        opts.body = body;
    } else {
        opts.headers = { "Content-Type": "application/json" };
        opts.body = JSON.stringify(body);
    }
    const res = await fetch(API_BASE + path, opts);
    return res.json();
}

async function apiPut(path, body) {
    const res = await fetch(API_BASE + path, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return res.json();
}

async function apiDelete(path) {
    const res = await fetch(API_BASE + path, { method: "DELETE" });
    return res.json();
}

// --- Toast ----------------------------------------------------------------

function showToast(message, type) {
    type = type || "";
    const toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// --- Theme ----------------------------------------------------------------

const THEMES = [
    { key: "midnight", labelKey: "theme.midnight", desc: "" },
    { key: "ocean", labelKey: "theme.ocean", desc: "" },
    { key: "sakura", labelKey: "theme.sakura", desc: "" },
    { key: "light", labelKey: "theme.light", desc: "" },
];

async function loadTheme() {
    try {
        const theme = await apiGet("/api/settings/theme");
        document.documentElement.setAttribute("data-theme", theme.mode || "midnight");
    } catch (e) {
        // Default midnight
    }
}

async function setTheme(themeKey) {
    document.documentElement.setAttribute("data-theme", themeKey);
    await apiPost("/api/settings/theme", { mode: themeKey });
}

// --- API status & model badge ---------------------------------------------

// v4: Create the model badge DOM element (inserted near the page title)
function createModelBadge() {
    let badge = document.getElementById("modelBadge");
    if (badge) return badge;

    badge = document.createElement("span");
    badge.id = "modelBadge";
    badge.className = "model-badge";
    badge.style.cssText =
        "display:none; margin-left:8px; padding:2px 10px; " +
        "background:var(--accent-soft); color:var(--accent); " +
        "border-radius:100px; font-size:11px; font-weight:600; vertical-align:middle;";

    const pageTitle = document.getElementById("pageTitle");
    if (pageTitle && pageTitle.parentNode) {
        pageTitle.parentNode.insertBefore(badge, pageTitle.nextSibling);
    } else {
        document.body.appendChild(badge);
    }
    return badge;
}

// v4: Update the model badge text/visibility
function updateModelBadge() {
    const badge = createModelBadge();
    if (currentModelInfo) {
        badge.textContent = currentModelInfo;
        badge.style.display = "inline-block";
    } else {
        badge.style.display = "none";
    }
}

async function checkApiStatus() {
    try {
        const status = await apiGet("/api/settings/status");
        const dot = document.getElementById("apiStatusDot");
        const text = document.getElementById("apiStatusText");
        if (status.api_configured) {
            dot.classList.add("online");
            text.textContent = status.model_name || t("status.online");
            // v4: Update global model info and badge
            currentModelInfo = status.model_name || null;
            updateModelBadge();
        } else {
            dot.classList.remove("online");
            text.textContent = t("status.offline");
            currentModelInfo = null;
            updateModelBadge();
        }
    } catch (e) {
        // Server not running
    }
}

// --- Navigation -----------------------------------------------------------

const pageTitleKeys = {
    chat: "title.chat",
    memory: "title.memory",
    kb: "title.kb",
    terminal: "title.terminal",
    settings: "title.settings",
};

function updateNavLabels() {
    const labels = {
        chat: "nav.chat",
        memory: "nav.memory",
        kb: "nav.kb",
        terminal: "nav.terminal",
        settings: "nav.settings",
    };
    for (const [page, key] of Object.entries(labels)) {
        const el = document.getElementById("nav" + page.charAt(0).toUpperCase() + page.slice(1));
        if (el) el.textContent = t(key);
    }
}

function switchPage(pageName) {
    const previousPage = currentPage;
    currentPage = pageName;

    document.querySelectorAll(".nav-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.page === pageName);
    });

    document.getElementById("pageTitle").textContent = t(pageTitleKeys[pageName] || "title.chat");

    // Update nav labels
    updateNavLabels();

    const container = document.getElementById("pageContainer");

    // v4: Hide the previously active page wrapper instead of destroying it.
    // This keeps SSE connections alive and preserves terminal history / inputs.
    if (pageCache[previousPage]) {
        pageCache[previousPage].style.display = "none";
        pageCache[previousPage].classList.remove("fade-in");
    }

    // v4: If the target page was already rendered, simply show the cached wrapper.
    if (pageCache[pageName]) {
        pageCache[pageName].style.display = "block";
        pageCache[pageName].classList.add("fade-in");
        setTimeout(() => pageCache[pageName].classList.remove("fade-in"), 300);
    } else {
        // v4: Create a new wrapper, render the page inside it, and cache it.
        const wrapper = document.createElement("div");
        wrapper.className = "page-wrapper fade-in";
        wrapper.dataset.page = pageName;
        wrapper.style.display = "block";
        wrapper.style.width = "100%";
        wrapper.style.height = "100%";
        container.appendChild(wrapper);
        pageCache[pageName] = wrapper;

        switch (pageName) {
            case "chat":
                renderChatPage(wrapper);
                break;
            case "memory":
                renderMemoryPage(wrapper);
                break;
            case "kb":
                renderKbPage(wrapper);
                break;
            case "terminal":
                renderTerminalPage(wrapper);
                break;
            case "settings":
                renderSettingsPage(wrapper);
                break;
        }

        setTimeout(() => wrapper.classList.remove("fade-in"), 300);
    }
}

// v4: Optional utility to remove a specific page from cache (memory management)
function clearPageCache(pageName) {
    if (pageCache[pageName]) {
        pageCache[pageName].remove();
        delete pageCache[pageName];
    }
}

// --- Modal ----------------------------------------------------------------

function showModal(title, contentHtml, actions) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    const modal = document.createElement("div");
    modal.className = "modal";

    const titleEl = document.createElement("div");
    titleEl.className = "modal-title";
    titleEl.textContent = title;

    const content = document.createElement("div");
    content.innerHTML = contentHtml;

    const actionsEl = document.createElement("div");
    actionsEl.className = "modal-actions";
    actions.forEach((action) => {
        const btn = document.createElement("button");
        btn.className = "btn " + (action.style || "");
        btn.textContent = action.label;
        btn.onclick = () => {
            if (action.onClick) action.onClick(content, overlay);
            if (action.closeAfter !== false) overlay.classList.remove("show");
        };
        actionsEl.appendChild(btn);
    });

    modal.appendChild(titleEl);
    modal.appendChild(content);
    modal.appendChild(actionsEl);
    overlay.appendChild(modal);

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.classList.remove("show");
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));

    overlay.addEventListener("transitionend", () => {
        if (!overlay.classList.contains("show") && overlay.parentNode) {
            overlay.remove();
        }
    });

    return { overlay, content };
}

// --- Initialize -----------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
    // Load language first (default zh-CN, or from server)
    await loadLanguage();

    // Update nav labels with i18n
    updateNavLabels();
    document.getElementById("pageTitle").textContent = t("title.chat");

    await loadTheme();

    document.querySelectorAll(".nav-btn").forEach((btn) => {
        btn.addEventListener("click", () => switchPage(btn.dataset.page));
    });

    await checkApiStatus();
    setInterval(checkApiStatus, 30000);

    // v4: Initialize model badge
    updateModelBadge();

    switchPage("chat");
});

// Expose globals for other scripts
window.AICompanion = {
    apiGet,
    apiPost,
    apiPut,
    apiDelete,
    showToast,
    showModal,
    setTheme,
    switchPage,
    clearPageCache,
    THEMES,
    currentPage,
    t,
    setLanguage,
    currentLang,
    currentModelInfo, // v4: Active model name available globally
};
