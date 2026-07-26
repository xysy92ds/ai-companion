/* AI Companion - Chat Page v3.5 (Terminal triggers, AI summaries in chat) */

function renderChatPage(container) {
    container.innerHTML = `
        <style>
            .chat-container {
                display: flex;
                flex-direction: column;
                height: calc(100vh - 60px - 72px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
                height: calc(100dvh - 60px - 72px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
            }
            .chat-messages {
                flex: 1;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
                padding: 16px 12px;
            }
            .msg {
                max-width: 80%;
                margin-bottom: 12px;
                padding: 10px 14px;
                border-radius: 16px;
                font-size: 15px;
                line-height: 1.5;
                word-wrap: break-word;
                animation: fadeIn 0.2s ease-out;
            }
            .msg.assistant .chunk {
                opacity: 0;
                animation: fadeIn 0.3s ease-in forwards;
            }
            .msg.user {
                align-self: flex-end;
                background: var(--accent);
                color: white;
                border-bottom-right-radius: 4px;
            }
            .msg.assistant {
                align-self: flex-start;
                background: var(--bg-card);
                color: var(--text-primary);
                border-bottom-left-radius: 4px;
            }
            .msg.system {
                align-self: center;
                background: var(--bg-input);
                color: var(--text-muted);
                font-size: 12px;
                max-width: 90%;
            }
            .msg.error {
                background: rgba(239, 68, 68, 0.15);
                color: var(--danger);
            }
            .msg-avatar {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 4px;
            }
            .avatar {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: var(--accent-soft);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                font-size: 14px;
            }
            .avatar img {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                object-fit: cover;
            }
            .terminal-suggest {
                background: var(--accent-soft);
                border: 1px solid var(--accent);
                border-radius: var(--radius-sm);
                padding: 8px 12px;
                margin: 4px 12px 8px;
                font-size: 13px;
                color: var(--text-secondary);
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                animation: fadeIn 0.2s ease-out;
            }
            .chat-input-bar {
                display: flex;
                gap: 8px;
                padding: 12px;
                background: var(--bg-secondary);
                border-top: 1px solid var(--border);
                padding-bottom: calc(12px + env(safe-area-inset-bottom));
            }
            .chat-input {
                flex: 1;
                padding: 12px 16px;
                background: var(--bg-input);
                border: 1px solid var(--border);
                border-radius: 24px;
                color: var(--text-primary);
                font-size: 15px;
                font-family: inherit;
                outline: none;
                max-height: 120px;
                resize: none;
            }
            .chat-input:focus { border-color: var(--accent); }
            .chat-send-btn {
                width: 44px; height: 44px; border-radius: 50%; border: none;
                background: var(--accent); color: white; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0; transition: transform 0.1s;
            }
            .chat-send-btn:active { transform: scale(0.9); }
            .chat-send-btn:disabled { opacity: 0.4; }
            .typing-indicator {
                display: flex; gap: 4px; padding: 4px 8px;
            }
            .typing-indicator span {
                width: 6px; height: 6px; border-radius: 50%;
                background: var(--text-muted); animation: typing 1.4s infinite;
            }
            .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
            .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes typing {
                0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
                30% { opacity: 1; transform: scale(1); }
            }
        </style>
        <div class="chat-container">
            <div class="chat-messages" id="chatMessages"></div>
            <div id="terminalSuggest"></div>
            <div class="chat-input-bar">
                <textarea class="chat-input" id="chatInput"
                    placeholder="${t("chat.placeholder")}"
                    rows="1"></textarea>
                <button class="chat-send-btn" id="chatSendBtn" disabled>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                </button>
            </div>
        </div>
    `;

    const messagesEl = document.getElementById("chatMessages");
    const inputEl = document.getElementById("chatInput");
    const sendBtn = document.getElementById("chatSendBtn");
    const suggestEl = document.getElementById("terminalSuggest");

    inputEl.addEventListener("input", () => {
        inputEl.style.height = "auto";
        inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + "px";
        sendBtn.disabled = !inputEl.value.trim();
        checkTerminalTrigger(inputEl.value.trim());
    });

    inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    sendBtn.addEventListener("click", sendMessage);

    loadChatHistory();

    async function loadChatHistory() {
        try {
            const data = await AICompanion.apiGet("/api/chat/history?limit=50");
            if (data.messages && data.messages.length > 0) {
                data.messages.forEach((msg) => { appendMessage(msg.role, msg.content); });
                scrollToBottom();
            } else { showWelcomeMessage(); }
        } catch (e) { showWelcomeMessage(); }
    }

    function showWelcomeMessage() {
        const welcome = document.createElement("div");
        welcome.className = "empty-state";
        welcome.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 8px;">&#129302;</div>
            <div style="font-size: 16px; color: var(--text-secondary);">${t("chat.welcome.title")}</div>
            <div style="font-size: 13px; margin-top: 8px; color: var(--text-muted);">${t("chat.welcome.desc")}</div>
        `;
        messagesEl.innerHTML = ""; messagesEl.appendChild(welcome);
    }

    const TRIGGER_KEYWORDS = [
        "搜索","查找","网上","网页","网络","上网","找一下","帮我找","查一下","查查",
        "search","find","lookup","web","internet","online","bilibili","b站","比站",
    ];
    let currentSuggestion = null;

    function checkTerminalTrigger(text) {
        if (!text) { suggestEl.innerHTML = ""; currentSuggestion = null; return; }
        const lower = text.toLowerCase();
        const triggered = TRIGGER_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
        if (triggered && !currentSuggestion) {
            suggestEl.innerHTML = `
                <div class="terminal-suggest">
                    <span>&#128270; ${t("chat.terminalSuggest") || "Detected search intent"}</span>
                    <button class="btn btn-sm" id="dismissSuggest">${t("common.cancel")}</button>
                </div>
            `;
            currentSuggestion = true;
            document.getElementById("dismissSuggest").addEventListener("click", () => {
                suggestEl.innerHTML = ""; currentSuggestion = null;
            });
        } else if (!triggered) { suggestEl.innerHTML = ""; currentSuggestion = null; }
    }

    // v4: Show a small "searching" badge while terminal request is in flight
    function showSearchBadge() {
        const badge = document.createElement("div");
        badge.id = "search-badge";
        badge.style.cssText = `
            position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
            background: var(--accent); color: white; font-size: 12px; padding: 4px 10px;
            border-radius: 12px; z-index: 10; opacity: 0.9; animation: fadeIn 0.3s ease;
        `;
        badge.textContent = "🌐 " + (t("chat.searching") || "联网搜索中...");
        messagesEl.appendChild(badge); scrollToBottom();
    }
    function hideSearchBadge() {
        const badge = document.getElementById("search-badge");
        if (badge) { badge.style.opacity = "0"; setTimeout(() => badge.remove(), 300); }
    }

    function appendMessage(role, content) {
        const empty = messagesEl.querySelector(".empty-state");
        if (empty) empty.remove();
        const msg = document.createElement("div");
        msg.className = "msg " + role;
        if (role === "assistant") {
            const wrap = document.createElement("div"); wrap.className = "msg-avatar";
            const av = document.createElement("div"); av.className = "avatar";
            av.innerHTML = '<img src="/static/assets/ai-avatar.png" alt="AI">';
            wrap.appendChild(av); messagesEl.appendChild(wrap);
        }
        if (content.startsWith("error: ")) { msg.className += " error"; content = content.substring(7); }
        // v4: Wrap text in a span with fade-in for smooth chunk appearance
        const chunk = document.createElement("span");
        chunk.className = "chunk";
        chunk.textContent = content;
        msg.appendChild(chunk);
        messagesEl.appendChild(msg); scrollToBottom();
    }

    function appendStreamingMessage() {
        const msg = document.createElement("div");
        msg.className = "msg assistant"; msg.id = "streaming-msg";
        const wrap = document.createElement("div"); wrap.className = "msg-avatar";
        const av = document.createElement("div"); av.className = "avatar";
        av.innerHTML = '<img src="/static/assets/ai-avatar.png" alt="AI">';
        wrap.appendChild(av);
        const typing = document.createElement("div"); typing.className = "typing-indicator";
        typing.innerHTML = "<span></span><span></span><span></span>";
        msg.appendChild(typing);
        messagesEl.appendChild(wrap); messagesEl.appendChild(msg); scrollToBottom();
        return msg;
    }

    function scrollToBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }

    async function sendMessage() {
        const message = inputEl.value.trim();
        if (!message) return;
        inputEl.value = ""; inputEl.style.height = "auto";
        sendBtn.disabled = true; suggestEl.innerHTML = ""; currentSuggestion = null;
        appendMessage("user", message);
        // v4: Show search badge if terminal keywords detected
        const lowerMsg = message.toLowerCase();
        const isTerminal = TRIGGER_KEYWORDS.some((kw) => lowerMsg.includes(kw.toLowerCase()));
        if (isTerminal) showSearchBadge();
        const streamMsg = appendStreamingMessage(); let fullResponse = "";
        try {
            const response = await fetch("/api/chat/send", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message, session_id: "default" }),
            });
            const reader = response.body.getReader(); const decoder = new TextDecoder();
            let sseBuffer = "";
            let firstChunkReceived = false;
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                sseBuffer += decoder.decode(value, { stream: true });
                // v4: Proper SSE parsing - split by double newlines
                const chunks = sseBuffer.split("\n\n");
                sseBuffer = chunks.pop(); // keep incomplete chunk in buffer
                for (const chunk of chunks) {
                    const lines = chunk.split("\n");
                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            const dataStr = line.substring(6).trim();
                            if (!dataStr) continue;
                            // v4: Remove typing indicator on first real content
                            if (!firstChunkReceived) {
                                const typing = streamMsg.querySelector(".typing-indicator");
                                if (typing) { typing.style.transition = "opacity 0.3s"; typing.style.opacity = "0"; setTimeout(() => typing.remove(), 300); }
                                firstChunkReceived = true;
                            }
                            // v4: Try parse JSON, fallback to raw text
                            let parsed = null;
                            try { parsed = JSON.parse(dataStr); } catch (e) {}
                            const text = parsed && typeof parsed.content === "string" ? parsed.content : dataStr;
                            // v4: Handle SSE message types
                            if (parsed && parsed.type === "error") {
                                streamMsg.classList.add("error");
                            } else if (parsed && parsed.type === "system") {
                                streamMsg.classList.add("system");
                            }
                            // v4: Handle memory summary messages with toast
                            if (text.includes("已自动总结") || text.includes("记忆已保存") || text.includes("memory saved")) {
                                AICompanion.showToast(t("chat.memorySaved") || "记忆已保存", "success");
                                continue;
                            }
                            // v4: Add content with smooth fade-in chunk
                            fullResponse += text;
                            const chunkSpan = document.createElement("span");
                            chunkSpan.className = "chunk";
                            chunkSpan.textContent = text;
                            streamMsg.appendChild(chunkSpan);
                            scrollToBottom();
                        }
                    }
                }
            }
        } catch (e) { streamMsg.classList.add("error"); streamMsg.textContent = t("chat.connectionError") + e.message; }
        // v4: Hide search badge when stream ends
        hideSearchBadge();
        sendBtn.disabled = false; inputEl.focus();
    }
}
