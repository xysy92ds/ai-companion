/* AI Companion - Knowledge Base Page v3 (i18n) */

function renderKbPage(container) {
    container.innerHTML = `
        <style>
            .kb-stats-grid {
                display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 12px;
            }
            .kb-stat-card {
                background: var(--bg-card); border-radius: var(--radius); padding: 12px; text-align: center;
            }
            .kb-stat-value { font-size: 22px; font-weight: 700; color: var(--accent); }
            .kb-stat-label { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
            .kb-upload-zone {
                margin: 0 12px 12px; padding: 24px; text-align: center;
                border: 2px dashed var(--border); border-radius: var(--radius);
                background: var(--bg-card); cursor: pointer; transition: border-color 0.2s;
            }
            .kb-upload-zone:active { border-color: var(--accent); }
            .kb-upload-icon { font-size: 32px; margin-bottom: 8px; opacity: 0.5; }
            .kb-upload-text { font-size: 14px; color: var(--text-secondary); }
            .kb-search-bar {
                display: flex; gap: 8px; padding: 0 12px 12px;
            }
            .kb-search-input {
                flex: 1; padding: 10px 14px; background: var(--bg-input);
                border: 1px solid var(--border); border-radius: var(--radius-sm);
                color: var(--text-primary); font-size: 14px; outline: none;
            }
            .kb-search-input:focus { border-color: var(--accent); }
            .kb-doc-item {
                display: flex; align-items: center; gap: 12px;
                padding: 12px 14px; background: var(--bg-card);
                border-radius: var(--radius); margin: 8px 12px;
            }
            .kb-doc-icon { font-size: 24px; flex-shrink: 0; }
            .kb-doc-info { flex: 1; }
            .kb-doc-name { font-size: 14px; font-weight: 500; }
            .kb-doc-meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
            .kb-search-result {
                background: var(--bg-card); border-radius: var(--radius); margin: 8px 12px;
                padding: 14px; box-shadow: var(--shadow);
            }
            .kb-result-score {
                display: inline-block; padding: 2px 8px; border-radius: 100px;
                font-size: 11px; font-weight: 600; background: var(--accent-soft); color: var(--accent);
                margin-bottom: 6px;
            }
            .kb-result-content {
                font-size: 13px; color: var(--text-secondary); line-height: 1.5;
                max-height: 150px; overflow-y: auto; white-space: pre-wrap;
            }
            .kb-result-source {
                font-size: 11px; color: var(--text-muted); margin-top: 6px;
            }
        </style>
        <div class="kb-stats-grid" id="kbStats"></div>
        <div class="kb-upload-zone" id="kbUploadZone">
            <div class="kb-upload-icon">&#128229;</div>
            <div class="kb-upload-text">${t("kb.upload")}</div>
            <input type="file" id="kbFileInput" accept=".txt,.md,.pdf" style="display:none;">
        </div>
        <div class="kb-search-bar">
            <input type="text" class="kb-search-input" id="kbSearchInput" placeholder="${t("kb.searchPlaceholder")}">
            <button class="btn btn-sm" id="kbSearchBtn">${t("common.search")}</button>
        </div>
        <div id="kbResults"></div>
        <div id="kbDocsList"></div>
    `;

    loadStats();
    loadDocuments();

    // Upload
    const uploadZone = document.getElementById("kbUploadZone");
    const fileInput = document.getElementById("kbFileInput");

    uploadZone.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        AICompanion.showToast(t("kb.uploading") + file.name + "...", "");
        const formData = new FormData();
        formData.append("file", file);
        try {
            const result = await AICompanion.apiPost("/api/kb/upload", formData, true);
            if (result.error) {
                AICompanion.showToast(result.error, "error");
            } else {
                AICompanion.showToast(t("kb.uploadSuccess") + " " + result.chunks + t("kb.chunks") + result.embedded + t("kb.embedded"), "success");
                loadStats();
                loadDocuments();
            }
        } catch (e) {
            AICompanion.showToast(t("settings.uploadFailed") + ": " + e.message, "error");
        }
        fileInput.value = "";
    });

    // Search
    const searchInput = document.getElementById("kbSearchInput");
    searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });
    document.getElementById("kbSearchBtn").addEventListener("click", doSearch);

    async function doSearch() {
        const query = searchInput.value.trim();
        if (!query) return;
        const resultsEl = document.getElementById("kbResults");
        resultsEl.innerHTML = '<div class="empty-state"><div class="spinner" style="margin: 0 auto;"></div></div>';
        try {
            const data = await AICompanion.apiPost("/api/kb/search", { query, limit: 5 });
            if (!data.results || data.results.length === 0) {
                resultsEl.innerHTML = '<div class="empty-state"><div style="font-size: 32px; margin-bottom: 8px;">&#128269;</div><div style="font-size: 14px; color: var(--text-muted);">' + t("kb.noResults") + '</div></div>';
                return;
            }
            resultsEl.innerHTML = "";
            const header = document.createElement("div");
            header.style.cssText = "padding: 8px 12px; font-size: 13px; color: var(--text-muted);";
            const searchType = data.semantic ? t("kb.semantic") : t("kb.text");
            header.textContent = `${data.total}` + t("kb.results") + searchType + t("kb.search2");
            resultsEl.appendChild(header);

            data.results.forEach((result) => {
                const card = document.createElement("div");
                card.className = "kb-search-result fade-in";
                const score = Math.round((result.score || 0) * 100);
                card.innerHTML = `
                    <div class="kb-result-score">${score}${t("kb.match")}</div>
                    <div class="kb-result-content">${escapeHtml(result.content)}</div>
                    <div class="kb-result-source">${t("kb.source")}${escapeHtml(result.document || "unknown")}</div>
                `;
                resultsEl.appendChild(card);
            });
        } catch (e) {
            resultsEl.innerHTML = '<div class="empty-state"><div style="color: var(--danger);">' + t("terminal.error") + '</div></div>';
        }
    }

    async function loadStats() {
        try {
            const stats = await AICompanion.apiGet("/api/kb/stats");
            const el = document.getElementById("kbStats");
            el.innerHTML = `
                <div class="kb-stat-card"><div class="kb-stat-value">${stats.documents || 0}</div><div class="kb-stat-label">Documents</div></div>
                <div class="kb-stat-card"><div class="kb-stat-value">${stats.chunks || 0}</div><div class="kb-stat-label">Chunks</div></div>
                <div class="kb-stat-card"><div class="kb-stat-value">${stats.embedded || 0}</div><div class="kb-stat-label">Embedded</div></div>
            `;
        } catch (e) {}
    }

    async function loadDocuments() {
        try {
            const data = await AICompanion.apiGet("/api/kb/documents");
            const el = document.getElementById("kbDocsList");
            const docs = data.documents || [];
            if (docs.length === 0) {
                el.innerHTML = '<div class="empty-state" style="padding: 24px;"><div style="font-size: 32px; margin-bottom: 8px;">&#128218;</div><div style="font-size: 14px; color: var(--text-muted);">' + t("kb.noDocuments") + '</div></div>';
                return;
            }
            el.innerHTML = '<div style="padding: 8px 12px; font-size: 13px; color: var(--text-muted);">' + t("kb.documents") + '</div>';
            const icons = { txt: "&#128196;", md: "&#128221;", pdf: "&#128213;" };
            docs.forEach((doc) => {
                const item = document.createElement("div");
                item.className = "kb-doc-item fade-in";
                const icon = icons[doc.file_type] || "&#128196;";
                const sizeKb = Math.round(doc.file_size / 1024);
                item.innerHTML = `
                    <div class="kb-doc-icon">${icon}</div>
                    <div class="kb-doc-info">
                        <div class="kb-doc-name">${escapeHtml(doc.filename)}</div>
                        <div class="kb-doc-meta">${doc.chunk_count} chunks | ${sizeKb}KB | ${new Date(doc.created_at).toLocaleDateString()}</div>
                    </div>
                    <button class="btn btn-sm btn-danger" data-del="${doc.id}" style="padding: 4px 10px;">x</button>
                `;
                el.appendChild(item);
            });
            el.querySelectorAll("[data-del]").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    await AICompanion.apiDelete("/api/kb/documents/" + btn.dataset.del);
                    AICompanion.showToast(t("kb.docDeleted"), "success");
                    loadStats();
                    loadDocuments();
                });
            });
        } catch (e) {}
    }
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
