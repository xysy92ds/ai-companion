/* AI Companion - Smart Terminal Page v4 (i18n + localStorage backup + proper execution flow) */

// v4: localStorage key for persistent terminal history
const TERMINAL_HISTORY_KEY = "ai_terminal_history_v4";

// v4: Persist terminal output entries to localStorage
function saveTerminalHistory(entries) {
    try {
        localStorage.setItem(TERMINAL_HISTORY_KEY, JSON.stringify(entries));
    } catch (e) {
        // storage full or private browsing — ignore
    }
}

// v4: Restore terminal history from localStorage
function loadTerminalHistory() {
    try {
        const raw = localStorage.getItem(TERMINAL_HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

// v4: In-memory cache for this page session (refreshed on DOM rebuild)
let _terminalHistoryCache = [];

function renderTerminalPage(container) {
    container.innerHTML = ``;

    // v4: Build shared markup via DOM so we can keep the cached entries alive
    const wrapper = document.createElement("div");
    wrapper.className = "smart-terminal-container";
    wrapper.style.cssText = "display:flex;flex-direction:column;" +
        "height:calc(100dvh - 60px - 72px - env(safe-area-inset-top) - env(safe-area-inset-bottom));";

    // --- shared styles (injected once) ---
    const style = document.createElement("style");
    style.textContent = `
        .smart-input-section {
            padding: 12px; background: var(--bg-secondary);
            border-bottom: 1px solid var(--border);
        }
        .smart-input-row {
            display: flex; gap: 8px; align-items: flex-end;
        }
        .smart-input {
            flex: 1; padding: 12px 16px; background: var(--bg-input);
            border: 1px solid var(--border); border-radius: 24px;
            color: var(--text-primary); font-size: 15px; font-family: inherit;
            outline: none; max-height: 100px; resize: none;
        }
        .smart-input:focus { border-color: var(--accent); }
        .smart-go-btn {
            width: 44px; height: 44px; border-radius: 50%; border: none;
            background: var(--accent); color: white; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; transition: transform 0.1s;
        }
        .smart-go-btn:active { transform: scale(0.9); }
        .smart-go-btn:disabled { opacity: 0.4; }
        .quick-actions {
            display: flex; gap: 6px; padding: 8px 12px 0;
            overflow-x: auto; scrollbar-width: none;
        }
        .quick-actions::-webkit-scrollbar { display: none; }
        .quick-action {
            padding: 6px 12px; background: var(--bg-input);
            border: 1px solid var(--border); border-radius: 100px;
            color: var(--text-secondary); font-size: 12px;
            white-space: nowrap; cursor: pointer; flex-shrink: 0;
        }
        .quick-action:active { transform: scale(0.95); }
        .smart-output {
            flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
            padding: 12px;
        }
        .exec-card {
            background: var(--bg-card); border-radius: var(--radius);
            padding: 14px; margin-bottom: 12px; box-shadow: var(--shadow);
            animation: fadeIn 0.3s ease-out;
        }
        .exec-step {
            display: flex; align-items: flex-start; gap: 8px;
            padding: 6px 0; font-size: 13px;
        }
        .exec-icon {
            width: 20px; height: 20px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 12px; flex-shrink: 0; font-weight: 700;
        }
        .exec-icon.pending { background: var(--bg-input); color: var(--text-muted); }
        .exec-icon.running { background: var(--accent-soft); color: var(--accent); }
        .exec-icon.success { background: rgba(34,197,94,0.15); color: var(--success); }
        .exec-icon.error { background: rgba(239,68,68,0.15); color: var(--danger); }
        .exec-label { color: var(--text-muted); font-size: 11px; text-transform: uppercase; margin-bottom: 2px; }
        .exec-value { color: var(--text-primary); font-size: 13px; word-break: break-all; }
        .exec-cmd {
            font-family: "SF Mono","Fira Code",monospace; font-size: 13px;
            background: var(--bg-input); padding: 8px 12px; border-radius: var(--radius-sm);
            margin: 4px 0; color: var(--accent); word-break: break-all;
        }
        .exec-output {
            font-family: "SF Mono","Fira Code",monospace; font-size: 12px;
            background: var(--bg-primary); padding: 8px 12px; border-radius: var(--radius-sm);
            margin-top: 4px; white-space: pre-wrap; word-break: break-all;
            color: var(--text-secondary); max-height: 300px; overflow-y: auto;
        }
        .tab-bar {
            display: flex; gap: 4px; padding: 8px 12px 0;
        }
        .tab {
            padding: 6px 14px; background: var(--bg-input); border: none;
            border-radius: 100px; color: var(--text-secondary); font-size: 12px;
            font-weight: 500; font-family: inherit; cursor: pointer;
            white-space: nowrap; transition: background 0.2s, color 0.2s;
        }
        .tab.active { background: var(--accent); color: white; }
        .summary-box {
            background: var(--accent-soft); color: var(--accent);
            padding: 10px 12px; border-radius: var(--radius-sm); font-size: 13px;
            margin-top: 6px; border-left: 3px solid var(--accent);
        }
        .history-divider {
            text-align: center; font-size: 11px; color: var(--text-muted);
            margin: 12px 0; text-transform: uppercase; letter-spacing: 1px;
        }
    `;
    wrapper.appendChild(style);

    // --- tab bar ---
    const tabBar = document.createElement("div");
    tabBar.className = "tab-bar";
    tabBar.innerHTML = `
        <button class="tab active" data-mode="smart">${t("terminal.tab.smart")}</button>
        <button class="tab" data-mode="manual">${t("terminal.tab.manual")}</button>
    `;
    wrapper.appendChild(tabBar);

    // --- content area ---
    const content = document.createElement("div");
    content.id = "terminalContent";
    wrapper.appendChild(content);

    container.appendChild(wrapper);

    let currentMode = "smart";

    // Tab switching
    wrapper.querySelectorAll(".tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            wrapper.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");
            currentMode = tab.dataset.mode;
            renderMode();
        });
    });

    renderMode();

    function renderMode() {
        if (currentMode === "smart") {
            renderSmartMode(content);
        } else {
            renderManualMode(content);
        }
    }

    function renderSmartMode(el) {
        el.innerHTML = ``;

        // Input area
        const inputSection = document.createElement("div");
        inputSection.className = "smart-input-section";
        inputSection.innerHTML = `
            <div class="smart-input-row">
                <textarea class="smart-input" id="smartInput"
                    placeholder="${t("terminal.smartPlaceholder")}"
                    rows="1"></textarea>
                <button class="smart-go-btn" id="smartGoBtn" disabled>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                </button>
            </div>
            <div class="quick-actions" id="quickActions"></div>
        `;
        el.appendChild(inputSection);

        // Output area
        const outputEl = document.createElement("div");
        outputEl.className = "smart-output";
        outputEl.id = "smartOutput";
        el.appendChild(outputEl);

        const inputEl = document.getElementById("smartInput");
        const goBtn = document.getElementById("smartGoBtn");

        inputEl.addEventListener("input", () => {
            inputEl.style.height = "auto";
            inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + "px";
            goBtn.disabled = !inputEl.value.trim();
        });

        inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); executeSmart(); }
        });

        goBtn.addEventListener("click", executeSmart);

        // v4: Restore history into smart output from cache/localStorage
        const saved = _terminalHistoryCache.length ? _terminalHistoryCache : loadTerminalHistory();
        _terminalHistoryCache = saved; // keep in sync
        if (saved.length === 0) {
            outputEl.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 36px; margin-bottom: 8px;">&#129302;</div>
                    <div style="font-size: 14px; color: var(--text-secondary);">${t("terminal.smartTitle")}</div>
                    <div style="font-size: 12px; margin-top: 4px; color: var(--text-muted);">
                        ${t("terminal.smartHint")}
                    </div>
                </div>
            `;
        } else {
            // v4: Show "restored from previous session" divider if from localStorage
            const fromStorage = loadTerminalHistory().length > 0;
            if (fromStorage) {
                const divider = document.createElement("div");
                divider.className = "history-divider";
                divider.textContent = t("terminal.restoredFromHistory") || "Previously";
                outputEl.appendChild(divider);
            }
            saved.forEach((entry) => {
                appendHistoryEntry(outputEl, entry);
            });
            outputEl.scrollTop = outputEl.scrollHeight;
        }

        // Load quick actions
        loadQuickActions();

        async function loadQuickActions() {
            try {
                const data = await AICompanion.apiGet("/api/smart-terminal/quick-actions");
                const qaEl = document.getElementById("quickActions");
                (data.actions || []).forEach((action) => {
                    const btn = document.createElement("span");
                    btn.className = "quick-action";
                    btn.textContent = action.label;
                    btn.addEventListener("click", () => {
                        inputEl.value = action.prompt_prefix;
                        inputEl.focus();
                        inputEl.placeholder = action.placeholder;
                        goBtn.disabled = !inputEl.value.trim();
                    });
                    qaEl.appendChild(btn);
                });
            } catch (e) {}
        }

        // v4: Build a structured history entry object and persist it
        function pushHistory(entry) {
            _terminalHistoryCache.push(entry);
            saveTerminalHistory(_terminalHistoryCache);
        }

        async function executeSmart() {
            const request = inputEl.value.trim();
            if (!request) return;

            inputEl.value = "";
            inputEl.style.height = "auto";
            goBtn.disabled = true;

            // Remove empty state
            const empty = outputEl.querySelector(".empty-state");
            if (empty) empty.remove();

            // Create execution card
            const card = document.createElement("div");
            card.className = "exec-card fade-in";
            card.innerHTML = `
                <div class="exec-step">
                    <div class="exec-icon running spinner" style="border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%;"></div>
                    <div>
                        <div class="exec-label">${t("terminal.yourRequest")}</div>
                        <div class="exec-value">${escapeHtml(request)}</div>
                    </div>
                </div>
                <div class="exec-step" id="aiThinkingStep">
                    <div class="exec-icon running spinner" style="border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%;"></div>
                    <div>
                        <div class="exec-label">${t("terminal.aiThinking")}</div>
                        <div class="exec-value" style="color: var(--text-muted);">${t("terminal.aiGenerating")}</div>
                    </div>
                </div>
            `;
            outputEl.appendChild(card);
            outputEl.scrollTop = outputEl.scrollHeight;

            try {
                // v4: Step 1 — AI generates command
                const result = await AICompanion.apiPost("/api/smart-terminal/execute", { request });

                const thinkStep = card.querySelector("#aiThinkingStep");
                if (result.error) {
                    thinkStep.innerHTML = `
                        <div class="exec-icon error">!</div>
                        <div><div class="exec-label">${t("terminal.error")}</div><div class="exec-value" style="color: var(--danger);">${escapeHtml(result.error)}</div></div>
                    `;
                    pushHistory({ type: "smart", mode: "error", request, error: result.error });
                } else if (result.command) {
                    // v4: Step 2 — Show generated command
                    thinkStep.innerHTML = `
                        <div class="exec-icon success">&#10003;</div>
                        <div>
                            <div class="exec-label">${t("terminal.aiGenerated")} (${escapeHtml(result.tool || "tool")})</div>
                            <div class="exec-value">${escapeHtml(result.explanation || "")}</div>
                            <div class="exec-cmd">$ ${escapeHtml(result.command)}</div>
                        </div>
                    `;

                    // v4: Step 3 — Execute the command via dedicated endpoint
                    const execStep = document.createElement("div");
                    execStep.className = "exec-step";
                    execStep.innerHTML = `
                        <div class="exec-icon running spinner" style="border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%;"></div>
                        <div style="flex:1;">
                            <div class="exec-label">${t("terminal.running")}</div>
                            <div class="exec-cmd">$ ${escapeHtml(result.command)}</div>
                        </div>
                    `;
                    card.appendChild(execStep);
                    outputEl.scrollTop = outputEl.scrollHeight;

                    let execResult;
                    try {
                        execResult = await AICompanion.apiPost("/api/terminal/execute", { command: result.command });
                    } catch (execErr) {
                        execResult = { exit_code: 1, output: "", error: execErr.message };
                    }

                    // v4: Step 4 — Show execution output
                    const success = execResult.exit_code === 0;
                    const iconEl = execStep.querySelector(".exec-icon");
                    iconEl.className = `exec-icon ${success ? "success" : "error"}`;
                    iconEl.innerHTML = success ? "&#10003;" : "x";
                    iconEl.style.border = "none";

                    execStep.querySelector(".exec-label").textContent =
                        `${t("terminal.output")} (${t("terminal.exit")}: ${execResult.exit_code})`;

                    const outDiv = document.createElement("div");
                    outDiv.className = "exec-output";
                    outDiv.textContent = execResult.output || execResult.error || "(no output)";
                    execStep.appendChild(outDiv);
                    outputEl.scrollTop = outputEl.scrollHeight;

                    // v4: Step 5 — Ask AI to summarize the output
                    const summaryStep = document.createElement("div");
                    summaryStep.className = "exec-step";
                    summaryStep.innerHTML = `
                        <div class="exec-icon running spinner" style="border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%;"></div>
                        <div style="flex:1;">
                            <div class="exec-label">${t("terminal.aiAnalyzing")}</div>
                            <div class="exec-value" style="color: var(--text-muted);">${t("terminal.aiSummarizing")}</div>
                        </div>
                    `;
                    card.appendChild(summaryStep);
                    outputEl.scrollTop = outputEl.scrollHeight;

                    let summary = "";
                    try {
                        const sumPayload = {
                            request: request,
                            command: result.command,
                            output: execResult.output || "",
                            error: execResult.error || "",
                            exit_code: execResult.exit_code,
                        };
                        const sumResult = await AICompanion.apiPost("/api/smart-terminal/summarize", sumPayload);
                        summary = sumResult.summary || sumResult.explanation || "";
                    } catch (sumErr) {
                        summary = "";
                    }

                    // v4: Step 6 — Display AI summary
                    if (summary) {
                        summaryStep.innerHTML = `
                            <div class="exec-icon success">&#10003;</div>
                            <div style="flex:1;">
                                <div class="exec-label">${t("terminal.aiSummary")}</div>
                                <div class="summary-box">${escapeHtml(summary)}</div>
                            </div>
                        `;
                    } else {
                        summaryStep.innerHTML = `
                            <div class="exec-icon pending">-</div>
                            <div style="flex:1;">
                                <div class="exec-label">${t("terminal.noSummary")}</div>
                                <div class="exec-value" style="color: var(--text-muted);">${t("terminal.noSummaryHint")}</div>
                            </div>
                        `;
                    }

                    // v4: Persist full execution record
                    pushHistory({
                        type: "smart",
                        mode: "full",
                        request,
                        tool: result.tool || "tool",
                        explanation: result.explanation || "",
                        command: result.command,
                        exit_code: execResult.exit_code,
                        output: execResult.output || "",
                        error: execResult.error || "",
                        summary,
                    });
                } else {
                    thinkStep.innerHTML = `
                        <div class="exec-icon pending">-</div>
                        <div><div class="exec-label">${t("terminal.noAction")}</div><div class="exec-value">${escapeHtml(result.explanation || t("terminal.noSuitable"))}</div></div>
                    `;
                    pushHistory({ type: "smart", mode: "no-action", request, explanation: result.explanation || "" });
                }
            } catch (e) {
                card.querySelector("#aiThinkingStep").innerHTML = `
                    <div class="exec-icon error">!</div>
                    <div><div class="exec-label">${t("terminal.error")}</div><div class="exec-value" style="color: var(--danger);">${t("terminal.requestFailed")}${escapeHtml(e.message)}</div></div>
                `;
                pushHistory({ type: "smart", mode: "error", request, error: e.message });
            }

            outputEl.scrollTop = outputEl.scrollHeight;
            goBtn.disabled = false;
            inputEl.focus();
        }
    }

    function renderManualMode(el) {
        el.innerHTML = ``;

        // Input area
        const inputSection = document.createElement("div");
        inputSection.className = "smart-input-section";
        inputSection.innerHTML = `
            <div class="smart-input-row">
                <input type="text" class="smart-input" id="manualInput"
                    placeholder="${t("terminal.manualPlaceholder")}" autocomplete="off" spellcheck="false">
                <button class="smart-go-btn" id="manualRunBtn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
                    </svg>
                </button>
            </div>
            <div class="quick-actions">
                <span class="quick-action" data-cmd="ls -la">ls -la</span>
                <span class="quick-action" data-cmd="pwd">pwd</span>
                <span class="quick-action" data-cmd="df -h">df -h</span>
                <span class="quick-action" data-cmd="free -h">free -h</span>
                <span class="quick-action" data-cmd="whoami">whoami</span>
                <span class="quick-action" data-cmd="date">date</span>
            </div>
        `;
        el.appendChild(inputSection);

        // Output area
        const output = document.createElement("div");
        output.className = "smart-output";
        output.id = "manualOutput";
        el.appendChild(output);

        const input = document.getElementById("manualInput");

        input.addEventListener("keydown", (e) => { if (e.key === "Enter") runManual(); });
        document.getElementById("manualRunBtn").addEventListener("click", runManual);
        el.querySelectorAll(".quick-action").forEach((btn) => {
            btn.addEventListener("click", () => { input.value = btn.dataset.cmd; runManual(); });
        });

        // v4: Restore manual history from cache/localStorage
        const saved = _terminalHistoryCache.length ? _terminalHistoryCache : loadTerminalHistory();
        _terminalHistoryCache = saved;
        if (saved.length === 0) {
            output.innerHTML = `<div class="empty-state"><div style="font-size: 36px; margin-bottom: 8px;">&#128187;</div><div style="font-size: 14px; color: var(--text-secondary);">${t("terminal.manualMode")}</div></div>`;
        } else {
            const fromStorage = loadTerminalHistory().length > 0;
            if (fromStorage) {
                const divider = document.createElement("div");
                divider.className = "history-divider";
                divider.textContent = t("terminal.restoredFromHistory") || "Previously";
                output.appendChild(divider);
            }
            saved.forEach((entry) => {
                appendHistoryEntry(output, entry);
            });
            output.scrollTop = output.scrollHeight;
        }

        // v4: Persist helper for manual mode
        function pushHistory(entry) {
            _terminalHistoryCache.push(entry);
            saveTerminalHistory(_terminalHistoryCache);
        }

        async function runManual() {
            const cmd = input.value.trim();
            if (!cmd) return;
            const empty = output.querySelector(".empty-state");
            if (empty) empty.remove();

            const card = document.createElement("div");
            card.className = "exec-card fade-in";
            card.innerHTML = `
                <div class="exec-step"><div class="exec-icon running spinner" style="border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%;"></div>
                <div><div class="exec-label">${t("terminal.running")}</div><div class="exec-cmd">$ ${escapeHtml(cmd)}</div></div></div>
            `;
            output.appendChild(card);

            let execResult;
            try {
                execResult = await AICompanion.apiPost("/api/terminal/execute", { command: cmd });
            } catch (e) {
                execResult = { exit_code: 1, output: "", error: e.message };
            }

            const spinner = card.querySelector(".spinner");
            const success = execResult.exit_code === 0;
            const iconEl = card.querySelector(".exec-icon");
            iconEl.className = `exec-icon ${success ? "success" : "error"}`;
            iconEl.innerHTML = success ? "&#10003;" : "x";
            iconEl.style.border = "none";

            const resultStep = document.createElement("div");
            resultStep.className = "exec-step";
            resultStep.innerHTML = `
                <div class="exec-icon ${success ? "success" : "error"}">${success ? "&#10003;" : "x"}</div>
                <div style="flex: 1;">
                    <div class="exec-label">${t("terminal.output")} (${t("terminal.exit")}: ${execResult.exit_code})</div>
                    <div class="exec-output">${escapeHtml(execResult.output || execResult.error || "(no output)")}</div>
                </div>
            `;
            card.appendChild(resultStep);

            // v4: Persist manual execution
            pushHistory({
                type: "manual",
                command: cmd,
                exit_code: execResult.exit_code,
                output: execResult.output || "",
                error: execResult.error || "",
            });

            output.scrollTop = output.scrollHeight;
            input.value = "";
            input.focus();
        }
    }

    // v4: Append a persisted history entry object as a DOM card
    function appendHistoryEntry(container, entry) {
        const card = document.createElement("div");
        card.className = "exec-card fade-in";

        if (entry.type === "smart") {
            if (entry.mode === "error") {
                card.innerHTML = `
                    <div class="exec-step">
                        <div class="exec-icon error">!</div>
                        <div><div class="exec-label">${t("terminal.error")}</div><div class="exec-value" style="color:var(--danger);">${escapeHtml(entry.error || "")}</div></div>
                    </div>
                `;
            } else if (entry.mode === "no-action") {
                card.innerHTML = `
                    <div class="exec-step">
                        <div class="exec-icon pending">-</div>
                        <div><div class="exec-label">${t("terminal.noAction")}</div><div class="exec-value">${escapeHtml(entry.explanation || t("terminal.noSuitable"))}</div></div>
                    </div>
                `;
            } else if (entry.mode === "full") {
                card.innerHTML = `
                    <div class="exec-step">
                        <div class="exec-icon success">&#10003;</div>
                        <div>
                            <div class="exec-label">${t("terminal.aiGenerated")} (${escapeHtml(entry.tool || "tool")})</div>
                            <div class="exec-value">${escapeHtml(entry.explanation || "")}</div>
                            <div class="exec-cmd">$ ${escapeHtml(entry.command || "")}</div>
                        </div>
                    </div>
                    <div class="exec-step">
                        <div class="exec-icon ${entry.exit_code === 0 ? "success" : "error"}">${entry.exit_code === 0 ? "&#10003;" : "x"}</div>
                        <div style="flex:1;">
                            <div class="exec-label">${t("terminal.output")} (${t("terminal.exit")}: ${entry.exit_code})</div>
                            <div class="exec-output">${escapeHtml(entry.output || entry.error || "(no output)")}</div>
                        </div>
                    </div>
                `;
                if (entry.summary) {
                    card.innerHTML += `
                        <div class="exec-step">
                            <div class="exec-icon success">&#10003;</div>
                            <div style="flex:1;">
                                <div class="exec-label">${t("terminal.aiSummary")}</div>
                                <div class="summary-box">${escapeHtml(entry.summary)}</div>
                            </div>
                        </div>
                    `;
                }
            }
        } else if (entry.type === "manual") {
            card.innerHTML = `
                <div class="exec-step">
                    <div class="exec-icon ${entry.exit_code === 0 ? "success" : "error"}">${entry.exit_code === 0 ? "&#10003;" : "x"}</div>
                    <div style="flex:1;">
                        <div class="exec-label">${t("terminal.output")} (${t("terminal.exit")}: ${entry.exit_code})</div>
                        <div class="exec-cmd">$ ${escapeHtml(entry.command || "")}</div>
                        <div class="exec-output">${escapeHtml(entry.output || entry.error || "(no output)")}</div>
                    </div>
                </div>
            `;
        }

        container.appendChild(card);
    }
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
