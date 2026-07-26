/* AI Companion - Settings Page v3.5 (Multi-Model, Auto-Summary, Personality Persistence) */

function renderSettingsPage(container) {
    container.innerHTML = `
        <style>
            .settings-section {
                background: var(--bg-card);
                border-radius: var(--radius);
                margin: 12px;
                padding: 16px;
                box-shadow: var(--shadow);
            }
            .section-title {
                font-size: 16px; font-weight: 700; margin-bottom: 12px;
                display: flex; align-items: center; gap: 8px;
            }
            .section-title .badge { font-size: 10px; }
            .toggle-row {
                display: flex; justify-content: space-between; align-items: center;
                padding: 12px 0; border-bottom: 1px solid var(--border);
            }
            .toggle-row:last-child { border-bottom: none; }
            .toggle-label { font-size: 14px; }
            .toggle-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
            .toggle-switch {
                width: 48px; height: 26px; border-radius: 100px;
                background: var(--bg-input); position: relative;
                cursor: pointer; transition: background 0.2s; flex-shrink: 0;
            }
            .toggle-switch.on { background: var(--accent); }
            .toggle-switch::after {
                content: ""; position: absolute; top: 3px; left: 3px;
                width: 20px; height: 20px; border-radius: 50%;
                background: white; transition: transform 0.2s;
            }
            .toggle-switch.on::after { transform: translateX(22px); }
            .avatar-preview {
                width: 80px; height: 80px; border-radius: 50%;
                object-fit: cover; border: 3px solid var(--accent);
                margin: 0 auto 12px; display: block;
            }
            .avatar-upload-btn {
                display: block; margin: 0 auto; text-align: center;
            }
            .theme-grid {
                display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;
            }
            .theme-card {
                padding: 12px; border-radius: var(--radius-sm); cursor: pointer;
                border: 2px solid transparent; transition: border-color 0.2s;
                text-align: center;
            }
            .theme-card.active { border-color: var(--accent); }
            .theme-swatch {
                width: 40px; height: 40px; border-radius: 50%; margin: 0 auto 6px;
            }
            .theme-name { font-size: 13px; font-weight: 600; }
            .theme-desc { font-size: 11px; color: var(--text-muted); }
            .lang-grid {
                display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;
            }
            .lang-card {
                padding: 12px; border-radius: var(--radius-sm); cursor: pointer;
                border: 2px solid transparent; transition: border-color 0.2s;
                text-align: center; background: var(--bg-input);
            }
            .lang-card.active { border-color: var(--accent); }
            .lang-name { font-size: 13px; font-weight: 600; }
            .lang-native { font-size: 14px; }
            .trait-tag {
                display: inline-flex; align-items: center; gap: 4px;
                padding: 4px 10px; border-radius: 100px;
                background: var(--accent-soft); color: var(--accent);
                font-size: 12px; margin: 2px;
            }
            .trait-remove { cursor: pointer; opacity: 0.6; font-size: 14px; }
            .trait-remove:hover { opacity: 1; }
            /* Model cards */
            .model-cards {
                display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 12px;
            }
            .model-card {
                background: var(--bg-input); border-radius: var(--radius-sm);
                padding: 12px; position: relative; border: 2px solid transparent;
                transition: border-color 0.2s;
            }
            .model-card.default { border-color: var(--accent); }
            .model-card.disabled { opacity: 0.5; }
            .model-card-header {
                display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;
            }
            .model-card-name { font-size: 14px; font-weight: 600; }
            .model-card-purpose {
                font-size: 10px; padding: 2px 8px; border-radius: 100px;
                background: var(--accent-soft); color: var(--accent);
                text-transform: uppercase; font-weight: 600;
            }
            .model-card-info { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; }
            .model-card-actions {
                display: flex; gap: 6px; flex-wrap: wrap;
            }
            .model-card-actions button {
                font-size: 11px; padding: 4px 8px; border-radius: var(--radius-sm);
                border: none; cursor: pointer;
            }
            .model-btn-edit { background: var(--accent-soft); color: var(--accent); }
            .model-btn-default { background: var(--success-soft, #e8f5e9); color: var(--success, #4caf50); }
            .model-btn-delete { background: var(--danger-soft, #ffebee); color: var(--danger); }
            .model-card-toggle {
                display: flex; align-items: center; gap: 6px; margin-top: 8px;
                font-size: 12px; color: var(--text-muted);
            }
            /* Modal form */
            .modal-form .field-group { margin-bottom: 12px; }
            .modal-form label { display: block; font-size: 13px; margin-bottom: 4px; color: var(--text-secondary); }
            .modal-form input, .modal-form select {
                width: 100%; padding: 8px; border-radius: var(--radius-sm);
                border: 1px solid var(--border); background: var(--bg-input);
                color: var(--text); font-size: 14px;
            }
            .modal-form input[type="range"] { padding: 0; }
            .modal-form .range-val { font-size: 13px; color: var(--text-muted); margin-left: 6px; }
            .modal-form .checkbox-row {
                display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
            }
            .modal-form .checkbox-row input { width: auto; }
            /* Summary section */
            .summary-config .field-group { margin-bottom: 12px; }
        </style>
    `;

    // --- Appearance section (themes + language) ---
    const appearanceSection = document.createElement("div");
    appearanceSection.className = "settings-section";
    appearanceSection.innerHTML = `
        <div class="section-title">${t("settings.appearance")}</div>
        <div style="font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px;">${t("settings.language")}</div>
        <div class="lang-grid" id="langGrid">
            <div class="lang-card" data-lang="zh-CN">
                <div class="lang-native">中文</div>
                <div class="lang-name">简体中文</div>
            </div>
            <div class="lang-card" data-lang="en">
                <div class="lang-native">English</div>
                <div class="lang-name">English</div>
            </div>
        </div>
        <div style="margin-top: 16px;">
            <div style="font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 8px;">${t("settings.appearance")}</div>
            <div class="theme-grid" id="themeGrid"></div>
        </div>
    `;
    container.appendChild(appearanceSection);

    appearanceSection.querySelectorAll(".lang-card").forEach((card) => {
        if (currentLang === card.dataset.lang) card.classList.add("active");
        card.addEventListener("click", async () => {
            await setLanguage(card.dataset.lang);
        });
    });

    const currentTheme = document.documentElement.getAttribute("data-theme") || "midnight";
    const themeGrid = appearanceSection.querySelector("#themeGrid");
    const themeColors = {
        midnight: "#0f0f1e",
        ocean: "#0a1929",
        sakura: "#1a0f14",
        light: "#f5f5f8",
    };
    AICompanion.THEMES.forEach((theme) => {
        const card = document.createElement("div");
        card.className = "theme-card" + (currentTheme === theme.key ? " active" : "");
        card.innerHTML = `
            <div class="theme-swatch" style="background: ${themeColors[theme.key]};"></div>
            <div class="theme-name">${t(theme.labelKey)}</div>
        `;
        card.addEventListener("click", async () => {
            await AICompanion.setTheme(theme.key);
            themeGrid.querySelectorAll(".theme-card").forEach((c) => c.classList.remove("active"));
            card.classList.add("active");
        });
        themeGrid.appendChild(card);
    });

    // --- Avatar section ---
    const avatarSection = document.createElement("div");
    avatarSection.className = "settings-section";
    avatarSection.innerHTML = `
        <div class="section-title">${t("settings.avatar")}</div>
        <img class="avatar-preview" id="avatarPreview" src="/static/assets/ai-avatar.png?t=${Date.now()}" alt="Avatar">
        <div class="avatar-upload-btn">
            <input type="file" id="avatarFileInput" accept="image/png,image/jpeg" style="display:none;">
            <button class="btn btn-secondary btn-sm" id="avatarUploadBtn">${t("settings.uploadAvatar")}</button>
        </div>
    `;
    container.appendChild(avatarSection);

    avatarSection.querySelector("#avatarUploadBtn").addEventListener("click", () => {
        avatarSection.querySelector("#avatarFileInput").click();
    });

    avatarSection.querySelector("#avatarFileInput").addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        showAvatarCropModal(file);
    });

    // --- AI Model Management section ---
    const modelsSection = document.createElement("div");
    modelsSection.className = "settings-section";
    modelsSection.innerHTML = `
        <div class="section-title">${t("settings.aiModelManagement")}</div>
        <div class="model-cards" id="modelCards"></div>
        <button class="btn btn-secondary btn-full" id="addModelBtn">+ ${t("settings.addModel")}</button>
    `;
    container.appendChild(modelsSection);

    // --- Chat AI Configuration section (legacy single model compat) ---
    const apiSection = document.createElement("div");
    apiSection.className = "settings-section";
    apiSection.innerHTML = `
        <div class="section-title">${t("settings.chatAIConfig")} <span class="badge" id="apiStatusBadge">${t("common.loading")}</span></div>
        <div class="field-group">
            <label class="label">${t("settings.providerUrl")}</label>
            <input class="input" id="apiProviderUrl" placeholder="https://api.openai.com/v1">
        </div>
        <div class="field-group">
            <label class="label">${t("settings.apiKey")}</label>
            <input class="input" id="apiKey" type="password" placeholder="sk-...">
        </div>
        <div class="field-group">
            <label class="label">${t("settings.modelName")}</label>
            <input class="input" id="apiModelName" placeholder="gpt-4o-mini">
        </div>
        <div class="field-group">
            <label class="label">${t("settings.temperature")}: <span id="tempVal">0.8</span></label>
            <input type="range" min="0" max="2" step="0.1" value="0.8" id="apiTemperature" style="width: 100%;">
        </div>
        <div class="field-group">
            <label class="label">${t("settings.maxTokens")}: <span id="maxTokensVal">2048</span></label>
            <input type="range" min="256" max="8192" step="256" value="2048" id="apiMaxTokens" style="width: 100%;">
        </div>
        <button class="btn btn-full" id="saveApiBtn">${t("settings.saveConfig")}</button>
    `;
    container.appendChild(apiSection);

    // --- Embedding AI Configuration section ---
    const embedSection = document.createElement("div");
    embedSection.className = "settings-section";
    embedSection.innerHTML = `
        <div class="section-title">${t("settings.embeddingAIConfig")} <span class="badge" id="embedStatusBadge">${t("common.loading")}</span></div>
        <div class="toggle-desc" style="margin-bottom: 12px;">
            ${t("settings.embedDesc")}
        </div>
        <div class="field-group">
            <label class="label">${t("settings.embedUrl")}</label>
            <input class="input" id="embedProviderUrl" placeholder="https://api.openai.com/v1">
        </div>
        <div class="field-group">
            <label class="label">${t("settings.embedKey")}</label>
            <input class="input" id="embedApiKey" type="password" placeholder="sk-...">
        </div>
        <div class="field-group">
            <label class="label">${t("settings.embedModel")}</label>
            <input class="input" id="embedModelName" placeholder="text-embedding-3-small">
        </div>
        <div class="field-group">
            <label class="label">${t("settings.dimensions")}</label>
            <input class="input" id="embedDimensions" type="number" value="1536" placeholder="1536">
        </div>
        <div class="toggle-row">
            <div>
                <div class="toggle-label">${t("settings.useForMemory")}</div>
                <div class="toggle-desc">${t("settings.useForMemoryDesc")}</div>
            </div>
            <div class="toggle-switch" id="embedMemoryToggle"></div>
        </div>
        <button class="btn btn-full" id="saveEmbedBtn" style="margin-top: 12px;">${t("settings.saveEmbed")}</button>
    `;
    container.appendChild(embedSection);

    // --- Personality section ---
    const personalitySection = document.createElement("div");
    personalitySection.className = "settings-section";
    personalitySection.innerHTML = `
        <div class="section-title">${t("settings.personality")}</div>
        <div class="field-group">
            <label class="label">${t("settings.name")}</label>
            <input class="input" id="personalityName" placeholder="${t("settings.name")}">
        </div>
        <div class="field-group">
            <label class="label">${t("settings.description")}</label>
            <textarea class="input" id="personalityDesc" rows="3" placeholder="${t("settings.description")}"></textarea>
        </div>
        <div class="field-group">
            <label class="label">${t("settings.greeting")}</label>
            <input class="input" id="personalityGreeting" placeholder="${t("settings.greeting")}">
        </div>
        <div class="field-group">
            <label class="label">${t("settings.tone")}</label>
            <select class="input" id="personalityTone">
                <option value="friendly">${t("tone.friendly")}</option>
                <option value="professional">${t("tone.professional")}</option>
                <option value="playful">${t("tone.playful")}</option>
                <option value="casual">${t("tone.casual")}</option>
                <option value="formal">${t("tone.formal")}</option>
            </select>
        </div>
        <div class="field-group">
            <label class="label">${t("settings.traits")}</label>
            <div id="traitsContainer" style="display: flex; flex-wrap: wrap; margin-bottom: 8px;"></div>
            <div style="display: flex; gap: 8px;">
                <input class="input" id="newTraitInput" placeholder="${t("settings.addTrait")}" style="flex: 1;">
                <button class="btn btn-sm" id="addTraitBtn">${t("common.add")}</button>
            </div>
        </div>
        <button class="btn btn-full" id="savePersonalityBtn">${t("settings.savePersonality")}</button>
    `;
    container.appendChild(personalitySection);

    // --- Auto Summary section ---
    const summarySection = document.createElement("div");
    summarySection.className = "settings-section summary-config";
    summarySection.innerHTML = `
        <div class="section-title">${t("settings.autoSummary")}</div>
        <div class="toggle-desc" style="margin-bottom: 12px;">${t("settings.autoSummaryDesc")}</div>
        <div class="toggle-row">
            <div>
                <div class="toggle-label">${t("settings.autoSummaryEnabled")}</div>
                <div class="toggle-desc">${t("settings.autoSummaryEnabledDesc")}</div>
            </div>
            <div class="toggle-switch" id="summaryToggle"></div>
        </div>
        <div class="field-group">
            <label class="label">${t("settings.summaryInterval")}</label>
            <input class="input" id="summaryInterval" type="number" min="1" max="72" value="6" placeholder="6">
        </div>
        <div class="field-group">
            <label class="label">${t("settings.minMessages")}</label>
            <input class="input" id="minMessages" type="number" min="2" max="100" value="10" placeholder="10">
        </div>
        <button class="btn btn-full" id="saveSummaryBtn">${t("settings.saveSummary")}</button>
    `;
    container.appendChild(summarySection);

    // --- Smart Tools section ---
    const toolsSection = document.createElement("div");
    toolsSection.className = "settings-section";
    toolsSection.innerHTML = `
        <div class="section-title">${t("settings.smartTools")}</div>
        <div class="toggle-desc" style="margin-bottom: 12px;">
            ${t("settings.toolsDesc")}
        </div>
        <div id="toolsList"></div>
    `;
    container.appendChild(toolsSection);

    // --- Danger zone ---
    const dangerSection = document.createElement("div");
    dangerSection.className = "settings-section";
    dangerSection.innerHTML = `
        <div class="section-title" style="color: var(--danger);">${t("settings.dangerZone")}</div>
        <button class="btn btn-danger btn-full" id="clearChatBtn" style="margin-bottom: 8px;">${t("settings.clearChat")}</button>
        <button class="btn btn-secondary btn-full" id="testApiBtn">${t("settings.testApi")}</button>
    `;
    container.appendChild(dangerSection);

    // --- State ---
    let allModels = [];
    let currentTraits = [];
    let summaryConfig = { enabled: false, interval_hours: 6, min_messages: 10 };

    // --- Load everything ---
    loadAllSettings();
    loadTools();
    loadModels();

    // --- Model management ---
    async function loadModels() {
        try {
            const data = await AICompanion.apiGet("/api/settings/models");
            allModels = data.models || [];
            renderModelCards();
        } catch (e) {
            document.getElementById("modelCards").innerHTML = `
                <div style="font-size: 13px; color: var(--text-muted);">${t("settings.loadModelsFailed")}</div>
            `;
        }
    }

    function renderModelCards() {
        const cardsEl = document.getElementById("modelCards");
        cardsEl.innerHTML = "";
        if (!allModels.length) {
            cardsEl.innerHTML = `<div style="font-size: 13px; color: var(--text-muted);">${t("settings.noModels")}</div>`;
            return;
        }
        allModels.forEach((model) => {
            const card = document.createElement("div");
            const isDefault = model.is_default;
            const isEnabled = model.enabled !== false;
            card.className = "model-card" + (isDefault ? " default" : "") + (!isEnabled ? " disabled" : "");
            card.innerHTML = `
                <div class="model-card-header">
                    <div>
                        <div class="model-card-name">${escapeHtml(model.name)} ${isDefault ? `<span class="badge badge-success">${t("settings.defaultBadge")}</span>` : ""}</div>
                        <div class="model-card-info">${escapeHtml(model.model_name || "")}</div>
                    </div>
                    <div class="model-card-purpose">${escapeHtml(model.purpose || "chat")}</div>
                </div>
                <div class="model-card-actions">
                    <button class="model-btn-edit" data-id="${model.id}">${t("settings.edit")}</button>
                    <!-- v4: Add model test button -->
                    <button class="model-btn-test" data-id="${model.id}">${t("settings.test")}</button>
                    ${!isDefault ? `<button class="model-btn-default" data-id="${model.id}">${t("settings.setDefault")}</button>` : ""}
                    <button class="model-btn-delete" data-id="${model.id}">${t("common.delete")}</button>
                </div>
                <div class="model-card-toggle">
                    <span>${t("settings.enabled")}</span>
                    <div class="toggle-switch ${isEnabled ? "on" : ""}" data-id="${model.id}"></div>
                </div>
            `;
            cardsEl.appendChild(card);
        });

        cardsEl.querySelectorAll(".model-btn-edit").forEach((btn) => {
            btn.addEventListener("click", () => openModelModal(parseInt(btn.dataset.id)));
        });
        // v4: Add model test button listener
        cardsEl.querySelectorAll(".model-btn-test").forEach((btn) => {
            btn.addEventListener("click", async function() {
                const id = parseInt(this.dataset.id);
                this.textContent = t("settings.testing");
                this.disabled = true;
                try {
                    const result = await AICompanion.apiGet("/api/settings/models/" + id + "/test");
                    if (result.ok) {
                        AICompanion.showToast(t("settings.testSuccess"), "success");
                        this.style.color = "var(--success, #4caf50)";
                        this.textContent = t("settings.test");
                    } else {
                        AICompanion.showToast(result.error || t("settings.testFailed"), "error");
                        this.style.color = "var(--danger)";
                        this.textContent = t("settings.test");
                    }
                } catch (e) {
                    AICompanion.showToast(t("settings.testFailed"), "error");
                    this.style.color = "var(--danger)";
                    this.textContent = t("settings.test");
                } finally {
                    this.disabled = false;
                }
            });
        });
        cardsEl.querySelectorAll(".model-btn-default").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const id = parseInt(btn.dataset.id);
                try {
                    await AICompanion.apiPost("/api/settings/models/" + id + "/default", {});
                    AICompanion.showToast(t("settings.defaultSet"), "success");
                    loadModels();
                } catch (e) {
                    AICompanion.showToast(t("settings.setDefaultFailed"), "error");
                }
            });
        });
        cardsEl.querySelectorAll(".model-btn-delete").forEach((btn) => {
            btn.addEventListener("click", () => {
                const id = parseInt(btn.dataset.id);
                const model = allModels.find((m) => m.id === id);
                AICompanion.showModal(t("settings.deleteModel") + "?", `
                    <p style="color: var(--text-secondary); font-size: 14px;">
                        ${t("settings.confirmDeleteModel")}: <strong>${escapeHtml(model ? model.name : "")}</strong>
                    </p>
                `, [
                    { label: t("common.cancel"), style: "btn-secondary" },
                    {
                        label: t("common.delete"), style: "btn-danger", onClick: async () => {
                            try {
                                await AICompanion.apiDelete("/api/settings/models/" + id);
                                AICompanion.showToast(t("settings.modelDeleted"), "success");
                                loadModels();
                            } catch (e) {
                                AICompanion.showToast(t("settings.deleteFailed"), "error");
                            }
                            return true;
                        }
                    },
                ]);
            });
        });
        cardsEl.querySelectorAll(".model-card-toggle .toggle-switch").forEach((sw) => {
            sw.addEventListener("click", async function() {
                const id = parseInt(this.dataset.id);
                const enabled = !this.classList.contains("on");
                try {
                    await AICompanion.apiPost("/api/settings/models/" + id + "/toggle", { enabled });
                    this.classList.toggle("on");
                    AICompanion.showToast(enabled ? t("settings.modelEnabled") : t("settings.modelDisabled"), "success");
                    const card = this.closest(".model-card");
                    if (card) card.classList.toggle("disabled", !enabled);
                } catch (e) {
                    AICompanion.showToast(t("settings.toggleFailed"), "error");
                }
            });
        });
    }

    function openModelModal(editId) {
        const isEdit = editId !== undefined;
        const model = isEdit ? allModels.find((m) => m.id === editId) : null;
        const title = isEdit ? t("settings.editModel") : t("settings.addModel");

        const purposes = [
            { value: "chat", label: t("settings.purposeChat") },
            { value: "terminal", label: t("settings.purposeTerminal") },
            { value: "summary", label: t("settings.purposeSummary") },
            { value: "embedding", label: t("settings.purposeEmbedding") },
        ];

        const modalResult = AICompanion.showModal(title, `
            <div class="modal-form">
                <div class="field-group">
                    <label>${t("settings.name")}</label>
                    <input type="text" id="mmName" value="${escapeHtml(model ? model.name : "")}" placeholder="${t("settings.name")}">
                </div>
                <div class="field-group">
                    <label>${t("settings.providerUrl")}</label>
                    <input type="text" id="mmProviderUrl" value="${escapeHtml(model ? model.provider_url : "")}" placeholder="https://api.openai.com/v1">
                </div>
                <div class="field-group">
                    <label>${t("settings.apiKey")}</label>
                    <input type="password" id="mmApiKey" value="${escapeHtml(model ? model.api_key : "")}" placeholder="sk-...">
                </div>
                <div class="field-group">
                    <label>${t("settings.modelName")}</label>
                    <input type="text" id="mmModelName" value="${escapeHtml(model ? model.model_name : "")}" placeholder="gpt-4o-mini">
                </div>
                <div class="field-group">
                    <label>${t("settings.temperature")}: <span class="range-val" id="mmTempVal">${model ? (model.temperature ?? 0.8) : 0.8}</span></label>
                    <input type="range" id="mmTemperature" min="0" max="2" step="0.1" value="${model ? (model.temperature ?? 0.8) : 0.8}">
                </div>
                <div class="field-group">
                    <label>${t("settings.maxTokens")}</label>
                    <input type="number" id="mmMaxTokens" value="${model ? (model.max_tokens ?? 2048) : 2048}" placeholder="2048">
                </div>
                <div class="field-group">
                    <label>${t("settings.purpose")}</label>
                    <select id="mmPurpose">
                        ${purposes.map((p) => `<option value="${p.value}" ${(model ? model.purpose : "chat") === p.value ? "selected" : ""}>${p.label}</option>`).join("")}
                    </select>
                </div>
                <div class="checkbox-row">
                    <input type="checkbox" id="mmIsDefault" ${model && model.is_default ? "checked" : ""}>
                    <label for="mmIsDefault" style="margin-bottom:0;">${t("settings.isDefault")}</label>
                </div>
                <div class="checkbox-row">
                    <input type="checkbox" id="mmEnabled" ${!model || model.enabled !== false ? "checked" : ""}>
                    <label for="mmEnabled" style="margin-bottom:0;">${t("settings.enabled")}</label>
                </div>
            </div>
        `, [
            { label: t("common.cancel"), style: "btn-secondary" },
            {
                label: t("common.save"), style: "btn-primary", onClick: async (content) => {
                    const payload = {
                        name: content.querySelector("#mmName").value.trim(),
                        provider_url: content.querySelector("#mmProviderUrl").value.trim(),
                        api_key: content.querySelector("#mmApiKey").value.trim(),
                        model_name: content.querySelector("#mmModelName").value.trim(),
                        temperature: parseFloat(content.querySelector("#mmTemperature").value) || 0.8,
                        max_tokens: parseInt(content.querySelector("#mmMaxTokens").value) || 2048,
                        purpose: content.querySelector("#mmPurpose").value,
                        is_default: content.querySelector("#mmIsDefault").checked,
                        enabled: content.querySelector("#mmEnabled").checked,
                    };
                    if (!payload.name || !payload.provider_url || !payload.model_name) {
                        AICompanion.showToast(t("toast.fillFields"), "error");
                        return false;
                    }
                    try {
                        if (isEdit) {
                            // v4: Use PUT for updates, backend expects PUT
                            await AICompanion.apiPut("/api/settings/models/" + editId, payload);
                            AICompanion.showToast(t("settings.modelUpdated"), "success");
                        } else {
                            await AICompanion.apiPost("/api/settings/models", payload);
                            AICompanion.showToast(t("settings.modelSaved"), "success");
                        }
                        loadModels();
                        return true;
                    } catch (e) {
                        AICompanion.showToast(t("settings.saveModelFailed"), "error");
                        return false;
                    }
                }
            },
        ]);

        const tempInput = modalResult.content.querySelector("#mmTemperature");
        const tempVal = modalResult.content.querySelector("#mmTempVal");
        if (tempInput && tempVal) {
            tempInput.addEventListener("input", () => { tempVal.textContent = tempInput.value; });
        }
    }

    document.getElementById("addModelBtn").addEventListener("click", () => openModelModal());

    // --- Avatar crop modal ---
    function showAvatarCropModal(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                AICompanion.showModal(t("settings.cropAvatar"), `
                    <div style="text-align: center;">
                        <canvas id="cropCanvas" width="280" height="280"
                            style="border-radius: 50%; border: 3px solid var(--accent); touch-action: none;"></canvas>
                        <div style="margin-top: 12px; font-size: 13px; color: var(--text-muted);">
                            ${t("settings.cropHint")}
                        </div>
                        <div style="margin-top: 8px;">
                            <button class="btn btn-sm" id="zoomOutBtn" style="margin-right: 8px;">-</button>
                            <button class="btn btn-sm" id="zoomInBtn">+</button>
                        </div>
                    </div>
                `, [
                    { label: t("common.cancel"), style: "btn-secondary" },
                    {
                        label: t("common.save"), onClick: (content) => {
                            const canvas = content.querySelector("#cropCanvas");
                            const outCanvas = document.createElement("canvas");
                            outCanvas.width = 256;
                            outCanvas.height = 256;
                            const outCtx = outCanvas.getContext("2d");
                            outCtx.save();
                            outCtx.beginPath();
                            outCtx.arc(128, 128, 128, 0, Math.PI * 2);
                            outCtx.clip();
                            outCtx.drawImage(canvas, 0, 0, 280, 280, 0, 0, 256, 256);
                            outCtx.restore();
                            outCanvas.toBlob(async (blob) => {
                                const formData = new FormData();
                                formData.append("file", blob, "avatar.png");
                                const result = await AICompanion.apiPost("/api/settings/avatar", formData, true);
                                if (result.status === "saved") {
                                    AICompanion.showToast(t("settings.avatarUpdated"), "success");
                                    document.getElementById("avatarPreview").src = "/static/assets/ai-avatar.png?t=" + Date.now();
                                } else {
                                    AICompanion.showToast(result.error || t("settings.uploadFailed"), "error");
                                }
                            }, "image/png");
                            return true;
                        }
                    }
                ]);
                setTimeout(() => initCropCanvas(img), 100);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function initCropCanvas(img) {
        const canvas = document.getElementById("cropCanvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const cw = canvas.width, ch = canvas.height;
        let scale = Math.max(cw / img.width, ch / img.height);
        let offsetX = (cw - img.width * scale) / 2;
        let offsetY = (ch - img.height * scale) / 2;

        function draw() {
            ctx.clearRect(0, 0, cw, ch);
            ctx.save();
            ctx.beginPath();
            ctx.arc(cw / 2, ch / 2, cw / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, offsetX, offsetY, img.width * scale, img.height * scale);
            ctx.restore();
        }
        draw();

        let isDragging = false, lastX = 0, lastY = 0;
        function getPoint(e) {
            const rect = canvas.getBoundingClientRect();
            const t = e.touches ? e.touches[0] : e;
            return { x: t.clientX - rect.left, y: t.clientY - rect.top };
        }
        function onStart(e) { e.preventDefault(); isDragging = true; const p = getPoint(e); lastX = p.x; lastY = p.y; }
        function onMove(e) {
            if (!isDragging) return; e.preventDefault();
            const p = getPoint(e);
            offsetX += p.x - lastX; offsetY += p.y - lastY;
            lastX = p.x; lastY = p.y; draw();
        }
        function onEnd() { isDragging = false; }

        canvas.addEventListener("touchstart", onStart, { passive: false });
        canvas.addEventListener("touchmove", onMove, { passive: false });
        canvas.addEventListener("touchend", onEnd);
        canvas.addEventListener("mousedown", onStart);
        canvas.addEventListener("mousemove", onMove);
        canvas.addEventListener("mouseup", onEnd);
        canvas.addEventListener("mouseleave", onEnd);

        const zoomIn = document.getElementById("zoomInBtn");
        const zoomOut = document.getElementById("zoomOutBtn");
        if (zoomIn) zoomIn.addEventListener("click", () => {
            scale *= 1.15;
            offsetX = cw / 2 - (cw / 2 - offsetX) * 1.15;
            offsetY = ch / 2 - (ch / 2 - offsetY) * 1.15;
            draw();
        });
        if (zoomOut) zoomOut.addEventListener("click", () => {
            scale /= 1.15;
            offsetX = cw / 2 - (cw / 2 - offsetX) / 1.15;
            offsetY = ch / 2 - (ch / 2 - offsetY) / 1.15;
            draw();
        });
    }

    // --- Load settings functions ---
    async function loadAllSettings() {
        // Chat AI config (legacy compat)
        try {
            const apiConfig = await AICompanion.apiGet("/api/settings/api-config");
            document.getElementById("apiProviderUrl").value = apiConfig.provider_url || "";
            document.getElementById("apiKey").value = apiConfig.api_key || "";
            document.getElementById("apiModelName").value = apiConfig.model_name || "";
            document.getElementById("apiTemperature").value = apiConfig.temperature ?? 0.8;
            document.getElementById("tempVal").textContent = apiConfig.temperature ?? 0.8;
            document.getElementById("apiMaxTokens").value = apiConfig.max_tokens ?? 2048;
            document.getElementById("maxTokensVal").textContent = apiConfig.max_tokens ?? 2048;
            const sb = document.getElementById("apiStatusBadge");
            if (apiConfig.provider_url && apiConfig.api_key && apiConfig.model_name) { sb.textContent = t("settings.configured"); sb.className = "badge badge-success"; }
            else { sb.textContent = t("settings.notSet"); sb.className = "badge badge-warning"; }
        } catch (e) {}

        // Embedding config
        try {
            const ec = await AICompanion.apiGet("/api/settings/embedding-config");
            document.getElementById("embedProviderUrl").value = ec.provider_url || "";
            document.getElementById("embedApiKey").value = ec.api_key || "";
            document.getElementById("embedModelName").value = ec.model_name || "";
            document.getElementById("embedDimensions").value = ec.dimensions || 1536;
            const et = document.getElementById("embedMemoryToggle");
            if (ec.use_for_memory) et.classList.add("on");
            // v4: Prevent duplicate toggle listeners on re-load
            if (!et.dataset.v4Listener) {
                et.dataset.v4Listener = "1";
                et.addEventListener("click", function() { this.classList.toggle("on"); });
            }
            const eb = document.getElementById("embedStatusBadge");
            if (ec.provider_url && ec.api_key && ec.model_name) { eb.textContent = t("settings.configured"); eb.className = "badge badge-success"; }
            else { eb.textContent = t("settings.notSet"); eb.className = "badge badge-warning"; }
        } catch (e) {}

        // Personality (persisted to server)
        try {
            const p = await AICompanion.apiGet("/api/settings/personality");
            document.getElementById("personalityName").value = p.name || "";
            document.getElementById("personalityDesc").value = p.description || "";
            document.getElementById("personalityGreeting").value = p.greeting || "";
            document.getElementById("personalityTone").value = p.tone || "friendly";
            renderTraits(p.traits || []);
        } catch (e) {}

        // Auto summary config
        try {
            const sc = await AICompanion.apiGet("/api/settings/summary-config");
            summaryConfig = {
                enabled: sc.enabled || false,
                interval_hours: sc.interval_hours || 6,
                min_messages: sc.min_messages || 10,
            };
            const st = document.getElementById("summaryToggle");
            if (summaryConfig.enabled) st.classList.add("on");
            // v4: Prevent duplicate toggle listeners on re-load
            if (!st.dataset.v4Listener) {
                st.dataset.v4Listener = "1";
                st.addEventListener("click", function() { this.classList.toggle("on"); });
            }
            document.getElementById("summaryInterval").value = summaryConfig.interval_hours;
            document.getElementById("minMessages").value = summaryConfig.min_messages;
        } catch (e) {}
    }

    async function loadTools() {
        try {
            const data = await AICompanion.apiGet("/api/smart-terminal/tools");
            const tl = document.getElementById("toolsList");
            tl.innerHTML = "";
            (data.tools ? Object.values(data.tools) : []).forEach((tool) => {
                const row = document.createElement("div");
                row.className = "toggle-row";
                row.innerHTML = `
                    <div><div class="toggle-label">${escapeHtml(tool.name)}</div><div class="toggle-desc">${escapeHtml(tool.description)}</div></div>
                    <div class="toggle-switch ${tool.enabled ? "on" : ""}" data-tool="${tool.key}"></div>`;
                tl.appendChild(row);
            });
            tl.querySelectorAll(".toggle-switch").forEach((sw) => {
                sw.addEventListener("click", async function() {
                    const key = this.dataset.tool;
                    const enabled = !this.classList.contains("on");
                    this.classList.toggle("on");
                    await AICompanion.apiPost("/api/smart-terminal/tools/toggle", { tool_key: key, enabled });
                    AICompanion.showToast(enabled ? t("settings.toolEnabled") : t("settings.toolDisabled"), "success");
                });
            });
        } catch (e) {
            document.getElementById("toolsList").innerHTML = '<div class="toggle-desc">' + t("terminal.error") + '</div>';
        }
    }

    function renderTraits(traits) {
        currentTraits = [...traits];
        const tc = document.getElementById("traitsContainer");
        tc.innerHTML = "";
        currentTraits.forEach((trait, i) => {
            const tag = document.createElement("span");
            tag.className = "trait-tag";
            tag.innerHTML = `${escapeHtml(trait)} <span class="trait-remove" data-idx="${i}">x</span>`;
            tc.appendChild(tag);
        });
        tc.querySelectorAll(".trait-remove").forEach((el) => {
            el.addEventListener("click", () => { currentTraits.splice(parseInt(el.dataset.idx), 1); renderTraits(currentTraits); });
        });
    }

    // --- Event handlers ---
    document.getElementById("apiTemperature").addEventListener("input", function() { document.getElementById("tempVal").textContent = this.value; });
    document.getElementById("apiMaxTokens").addEventListener("input", function() { document.getElementById("maxTokensVal").textContent = this.value; });

    document.getElementById("saveApiBtn").addEventListener("click", async () => {
        const config = {
            provider_url: document.getElementById("apiProviderUrl").value.trim(),
            api_key: document.getElementById("apiKey").value.trim(),
            model_name: document.getElementById("apiModelName").value.trim(),
            temperature: parseFloat(document.getElementById("apiTemperature").value),
            max_tokens: parseInt(document.getElementById("apiMaxTokens").value),
        };
        await AICompanion.apiPost("/api/settings/api-config", config);
        AICompanion.showToast(t("settings.apiSaved"), "success");
    });

    document.getElementById("saveEmbedBtn").addEventListener("click", async () => {
        const config = {
            provider_url: document.getElementById("embedProviderUrl").value.trim(),
            api_key: document.getElementById("embedApiKey").value.trim(),
            model_name: document.getElementById("embedModelName").value.trim(),
            dimensions: parseInt(document.getElementById("embedDimensions").value) || 1536,
            use_for_memory: document.getElementById("embedMemoryToggle").classList.contains("on"),
        };
        await AICompanion.apiPost("/api/settings/embedding-config", config);
        AICompanion.showToast(t("settings.embedSaved"), "success");
    });

    document.getElementById("addTraitBtn").addEventListener("click", () => {
        const input = document.getElementById("newTraitInput");
        const trait = input.value.trim();
        if (trait && !currentTraits.includes(trait)) { currentTraits.push(trait); renderTraits(currentTraits); }
        input.value = "";
    });
    document.getElementById("newTraitInput").addEventListener("keydown", (e) => { if (e.key === "Enter") document.getElementById("addTraitBtn").click(); });

    document.getElementById("savePersonalityBtn").addEventListener("click", async () => {
        const personality = {
            name: document.getElementById("personalityName").value.trim(),
            description: document.getElementById("personalityDesc").value.trim(),
            greeting: document.getElementById("personalityGreeting").value.trim(),
            tone: document.getElementById("personalityTone").value,
            traits: currentTraits,
            system_prompt: "",
        };
        await AICompanion.apiPost("/api/settings/personality", personality);
        AICompanion.showToast(t("settings.personalitySaved"), "success");
    });

    document.getElementById("saveSummaryBtn").addEventListener("click", async () => {
        const config = {
            enabled: document.getElementById("summaryToggle").classList.contains("on"),
            interval_hours: parseInt(document.getElementById("summaryInterval").value) || 6,
            min_messages: parseInt(document.getElementById("minMessages").value) || 10,
        };
        try {
            await AICompanion.apiPost("/api/settings/summary-config", config);
            AICompanion.showToast(t("settings.summarySaved"), "success");
        } catch (e) {
            AICompanion.showToast(t("settings.summarySaveFailed"), "error");
        }
    });

    document.getElementById("clearChatBtn").addEventListener("click", () => {
        AICompanion.showModal(t("settings.clearChat") + "?", `<p style="color: var(--text-secondary); font-size: 14px;">${t("settings.clearChatConfirm")}</p>`, [
            { label: t("common.cancel"), style: "btn-secondary" },
            { label: t("common.delete"), style: "btn-danger", onClick: async () => { await AICompanion.apiDelete("/api/chat/history"); AICompanion.showToast(t("settings.chatHistoryCleared"), "success"); return true; } },
        ]);
    });

    document.getElementById("testApiBtn").addEventListener("click", async () => {
        AICompanion.showToast(t("settings.testing"), "");
        try {
            const status = await AICompanion.apiGet("/api/settings/status");
            if (status.api_configured) AICompanion.showToast(t("settings.apiConfigured") + status.model_name, "success");
            else AICompanion.showToast(t("settings.apiNotConfigured"), "error");
        } catch (e) { AICompanion.showToast(t("settings.testFailed") + e.message, "error"); }
    });
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// v4: Add helper to show currently selected chat model badge in any page header
async function getActiveModelBadge() {
    try {
        const data = await AICompanion.apiGet("/api/settings/models");
        const active = (data.models || []).find((m) => m.is_default && m.enabled !== false);
        if (active) {
            return `<span class="model-badge" title="${t("settings.modelBadgeTitle")}">${escapeHtml(active.name)}</span>`;
        }
        return "";
    } catch (e) {
        return "";
    }
}
