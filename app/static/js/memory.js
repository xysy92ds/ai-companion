/* AI Companion - Memory Page v3 (i18n) */

function renderMemoryPage(container) {
    container.innerHTML = `
        <style>
            .memory-card {
                background: var(--bg-card);
                border-radius: var(--radius);
                padding: 14px;
                margin: 8px 12px;
                box-shadow: var(--shadow);
                cursor: pointer;
                transition: transform 0.1s;
            }
            .memory-card:active { transform: scale(0.98); }
            .memory-card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 6px;
            }
            .memory-card-title { font-size: 14px; font-weight: 600; }
            .memory-card-content { font-size: 13px; color: var(--text-secondary); line-height: 1.4; }
            .importance-bar { width: 100%; height: 3px; border-radius: 2px; background: var(--bg-input); margin-top: 8px; overflow: hidden; }
            .importance-fill { height: 100%; border-radius: 2px; background: var(--accent); transition: width 0.3s; }
            .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 12px; }
            .stat-card { background: var(--bg-card); border-radius: var(--radius); padding: 14px; text-align: center; }
            .stat-value { font-size: 24px; font-weight: 700; color: var(--accent); }
            .stat-label { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
            .memory-detail { padding: 16px; }
            .memory-detail .field { margin-bottom: 12px; }
            .memory-detail .field-label { font-size: 12px; color: var(--text-muted); margin-bottom: 2px; }
            .memory-detail .field-value { font-size: 15px; }
            .curve-chart { width: 100%; height: 120px; margin-top: 8px; }
            .person-node {
                display: inline-flex; align-items: center; gap: 6px;
                padding: 6px 12px; border-radius: 100px; font-size: 13px;
                margin: 4px; cursor: pointer;
            }
            .schedule-item {
                display: flex; align-items: center; gap: 12px;
                padding: 12px 14px; background: var(--bg-card);
                border-radius: var(--radius); margin: 8px 12px;
            }
            .schedule-checkbox {
                width: 22px; height: 22px; border: 2px solid var(--text-muted);
                border-radius: 50%; cursor: pointer; flex-shrink: 0;
                display: flex; align-items: center; justify-content: center;
            }
            .schedule-checkbox.done {
                border-color: var(--success); background: var(--success);
            }
            .schedule-info { flex: 1; }
            .schedule-title { font-size: 14px; }
            .schedule-title.done { text-decoration: line-through; color: var(--text-muted); }
            .schedule-time { font-size: 12px; color: var(--text-muted); }
        </style>
        <div class="tab-bar">
            <button class="tab active" data-tab="memories">${t("memory.tab.memories")}</button>
            <button class="tab" data-tab="persons">${t("memory.tab.persons")}</button>
            <button class="tab" data-tab="schedule">${t("memory.tab.schedule")}</button>
            <button class="tab" data-tab="stats">${t("memory.tab.stats")}</button>
        </div>
        <div id="memoryContent"></div>
    `;

    // Tab switching
    container.querySelectorAll(".tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            container.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");
            switchMemoryTab(tab.dataset.tab);
        });
    });

    switchMemoryTab("memories");

    function switchMemoryTab(tab) {
        const content = document.getElementById("memoryContent");
        content.innerHTML = "";
        switch (tab) {
            case "memories": renderMemoriesTab(content); break;
            case "persons": renderPersonsTab(content); break;
            case "schedule": renderScheduleTab(content); break;
            case "stats": renderStatsTab(content); break;
        }
    }

    async function renderMemoriesTab(el) {
        el.innerHTML = '<div class="empty-state"><div class="spinner" style="margin: 0 auto;"></div></div>';

        // Add button
        const addBtn = document.createElement("div");
        addBtn.style.cssText = "padding: 12px; text-align: center;";
        addBtn.innerHTML = '<button class="btn btn-full" id="addMemoryBtn">' + t("memory.newMemory") + '</button>';
        el.appendChild(addBtn);

        const data = await AICompanion.apiGet("/api/memory/list?limit=50");
        const memories = data.memories || [];

        if (memories.length === 0) {
            el.innerHTML += '<div class="empty-state"><div class="empty-state-icon">&#129504;</div><div>' + t("memory.noMemories") + '</div></div>';
        }

        memories.forEach((mem) => {
            const card = document.createElement("div");
            card.className = "memory-card fade-in";
            const importancePct = Math.round((mem.importance || 0.5) * 100);
            const date = new Date(mem.created_at).toLocaleDateString();
            card.innerHTML = `
                <div class="memory-card-header">
                    <span class="memory-card-title">${escapeHtml(mem.title)}</span>
                    <span class="badge">${escapeHtml(t("cat." + mem.category) || mem.category)}</span>
                </div>
                <div class="memory-card-content">${escapeHtml(truncate(mem.content, 100))}</div>
                <div class="importance-bar"><div class="importance-fill" style="width: ${importancePct}%;"></div></div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${date} | ${t("memory.recallCount")}: ${mem.recall_count}</div>
            `;
            card.addEventListener("click", () => showMemoryDetail(mem));
            el.appendChild(card);
        });

        document.getElementById("addMemoryBtn").addEventListener("click", () => showAddMemoryModal());
    }

    function showAddMemoryModal() {
        AICompanion.showModal(t("memory.newMemory"), `
            <div class="field-group">
                <label class="label">${t("memory.category")}</label>
                <select class="input" id="newMemCategory">
                    <option value="general">${t("cat.general")}</option>
                    <option value="person">${t("cat.person")}</option>
                    <option value="event">${t("cat.event")}</option>
                    <option value="feeling">${t("cat.feeling")}</option>
                    <option value="plan">${t("cat.plan")}</option>
                </select>
            </div>
            <div class="field-group">
                <label class="label">${t("memory.title")}</label>
                <input class="input" id="newMemTitle" placeholder="${t("memory.title")}">
            </div>
            <div class="field-group">
                <label class="label">${t("memory.content")}</label>
                <textarea class="input" id="newMemContent" rows="4" placeholder="${t("memory.content")}"></textarea>
            </div>
            <div class="field-group">
                <label class="label">${t("memory.importance")}: <span id="importanceVal">0.5</span></label>
                <input type="range" min="0" max="1" step="0.1" value="0.5" id="newMemImportance" style="width: 100%;">
            </div>
        `, [
            { label: t("common.cancel"), style: "btn-secondary" },
            {
                label: t("common.save"),
                onClick: async (content) => {
                    const category = content.querySelector("#newMemCategory").value;
                    const title = content.querySelector("#newMemTitle").value.trim();
                    const body = content.querySelector("#newMemContent").value.trim();
                    const importance = parseFloat(content.querySelector("#newMemImportance").value);
                    if (!title || !body) { AICompanion.showToast(t("toast.fillTitleContent"), "error"); return false; }
                    await AICompanion.apiPost("/api/memory/", { category, title, content: body, importance });
                    AICompanion.showToast(t("memory.memorySaved"), "success");
                    switchMemoryTab("memories");
                    return true;
                }
            }
        ]);

        // Update importance display
        setTimeout(() => {
            const slider = document.getElementById("newMemImportance");
            const display = document.getElementById("importanceVal");
            slider.addEventListener("input", () => { display.textContent = slider.value; });
        }, 100);
    }

    async function showMemoryDetail(mem) {
        const modal = AICompanion.showModal(mem.title || t("memory.tab.memories"), `
            <div class="memory-detail">
                <div class="field"><div class="field-label">${t("memory.category")}</div><div class="field-value"><span class="badge">${escapeHtml(t("cat." + mem.category) || mem.category)}</span></div></div>
                <div class="field"><div class="field-label">${t("memory.content")}</div><div class="field-value">${escapeHtml(mem.content)}</div></div>
                <div class="field"><div class="field-label">${t("memory.importance")}</div><div class="field-value">${Math.round((mem.importance || 0) * 100)}%</div></div>
                <div class="field"><div class="field-label">${t("memory.created")}</div><div class="field-value">${new Date(mem.created_at).toLocaleString()}</div></div>
                <div class="field"><div class="field-label">${t("memory.recallCount")}</div><div class="field-value">${mem.recall_count}</div></div>
                <div class="field"><div class="field-label">${t("memory.retention")}</div><div class="field-value" id="retentionVal">${t("common.loading")}</div></div>
                <div class="field"><div class="field-label">${t("memory.forgettingCurve")}</div>
                    <canvas class="curve-chart" id="curveChart" width="300" height="120"></canvas>
                </div>
            </div>
        `, [
            { label: t("common.delete"), style: "btn-danger", onClick: async () => {
                await AICompanion.apiDelete("/api/memory/" + mem.id);
                AICompanion.showToast(t("memory.memoryDeleted"), "success");
                switchMemoryTab("memories");
            }},
            { label: t("memory.recall"), onClick: async () => {
                const result = await AICompanion.apiPost("/api/memory/" + mem.id + "/recall?quality=4", {});
                if (result.retention_pct !== undefined) {
                    document.getElementById("retentionVal").textContent = result.retention_pct + "%";
                    AICompanion.showToast(t("memory.recalled") + result.retention_pct + "%", "success");
                }
            }},
        ]);

        // Load forgetting curve
        try {
            const curveData = await AICompanion.apiGet("/api/memory/" + mem.id + "/curve?days=30");
            drawCurveChart(curveData.data || []);
        } catch (e) { /* ignore */ }

        // Load recall data
        try {
            const recallResult = await AICompanion.apiGet("/api/memory/" + mem.id);
            const retentionEl = document.getElementById("retentionVal");
            if (retentionEl) {
                // Approximate retention from current time
                const created = new Date(mem.created_at);
                const now = new Date();
                const elapsedDays = (now - created) / 86400000;
                const interval = mem.interval || 1.0;
                const retention = Math.exp(-elapsedDays / Math.max(0.01, interval)) * 100;
                retentionEl.textContent = retention.toFixed(1) + "%";
            }
        } catch (e) { /* ignore */ }
    }

    function drawCurveChart(data) {
        const canvas = document.getElementById("curveChart");
        if (!canvas || !data.length) return;
        const ctx = canvas.getContext("2d");
        const w = canvas.width;
        const h = canvas.height;
        const padding = 10;

        ctx.clearRect(0, 0, w, h);

        // Draw axis
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.beginPath();
        ctx.moveTo(padding, h - padding);
        ctx.lineTo(w - padding, h - padding);
        ctx.stroke();

        // Draw curve
        ctx.strokeStyle = "#6366f1";
        ctx.lineWidth = 2;
        ctx.beginPath();
        data.forEach((point, i) => {
            const x = padding + (i / (data.length - 1)) * (w - 2 * padding);
            const y = h - padding - (point.retention / 100) * (h - 2 * padding);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Fill area
        ctx.lineTo(w - padding, h - padding);
        ctx.lineTo(padding, h - padding);
        ctx.closePath();
        ctx.fillStyle = "rgba(99, 102, 241, 0.1)";
        ctx.fill();
    }

    async function renderPersonsTab(el) {
        el.innerHTML = '<div class="empty-state"><div class="spinner" style="margin: 0 auto;"></div></div>';

        const addBtn = document.createElement("div");
        addBtn.style.cssText = "padding: 12px; text-align: center;";
        addBtn.innerHTML = '<button class="btn btn-full" id="addPersonBtn">' + t("memory.addPerson") + '</button>';
        el.appendChild(addBtn);

        const graphData = await AICompanion.apiGet("/api/memory/relationships/graph");
        const nodes = graphData.nodes || [];
        const edges = graphData.edges || [];

        if (nodes.length === 0) {
            el.innerHTML += '<div class="empty-state"><div class="empty-state-icon">&#128101;</div><div>' + t("memory.noPersons") + '</div></div>';
            return;
        }

        // Simple node list
        nodes.forEach((node) => {
            const personEl = document.createElement("div");
            personEl.className = "person-node";
            personEl.style.background = node.color + "22";
            personEl.style.color = node.color;
            personEl.innerHTML = `<span style="font-size: 16px;">${getIconEmoji(node.icon)}</span>${escapeHtml(node.label)}`;
            el.appendChild(personEl);
        });

        // Show relationships
        if (edges.length > 0) {
            const relSection = document.createElement("div");
            relSection.style.cssText = "padding: 12px; margin-top: 12px;";
            relSection.innerHTML = "<div style='font-size: 13px; color: var(--text-muted); margin-bottom: 8px;'>" + t("memory.relationships") + "</div>";
            edges.forEach((edge) => {
                const sourceNode = nodes.find((n) => n.id === edge.source);
                const targetNode = nodes.find((n) => n.id === edge.target);
                if (sourceNode && targetNode) {
                    const relEl = document.createElement("div");
                    relEl.style.cssText = "padding: 8px 0; font-size: 14px; border-bottom: 1px solid var(--border);";
                    relEl.innerHTML = `${escapeHtml(sourceNode.label)} <span class="badge">${escapeHtml(edge.label)}</span> ${escapeHtml(targetNode.label)}`;
                    relSection.appendChild(relEl);
                }
            });
            el.appendChild(relSection);
        }

        document.getElementById("addPersonBtn").addEventListener("click", () => showAddPersonModal());
    }

    function showAddPersonModal() {
        const colors = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
        AICompanion.showModal(t("memory.addPerson").replace("+ ", ""), `
            <div class="field-group">
                <label class="label">${t("memory.name")}</label>
                <input class="input" id="personName" placeholder="${t("memory.name")}">
            </div>
            <div class="field-group">
                <label class="label">${t("memory.description")}</label>
                <textarea class="input" id="personDesc" rows="2" placeholder="${t("memory.description")}"></textarea>
            </div>
            <div class="field-group">
                <label class="label">${t("memory.color")}</label>
                <div id="colorPicker" style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${colors.map((c, i) => `<div class="color-dot" data-color="${c}" style="width: 32px; height: 32px; border-radius: 50%; background: ${c}; cursor: pointer; border: ${i === 0 ? "3px solid white" : "none"};"></div>`).join("")}
                </div>
            </div>
        `, [
            { label: t("common.cancel"), style: "btn-secondary" },
            {
                label: t("common.add"), onClick: async (content) => {
                    const name = content.querySelector("#personName").value.trim();
                    const desc = content.querySelector("#personDesc").value.trim();
                    const selected = content.querySelector(".color-dot[style*='border']");
                    const color = selected ? selected.dataset.color : "#6366f1";
                    if (!name) { AICompanion.showToast(t("memory.enterName"), "error"); return false; }
                    await AICompanion.apiPost("/api/memory/persons/", { name, description: desc, color });
                    AICompanion.showToast(t("memory.personAdded"), "success");
                    switchMemoryTab("persons");
                    return true;
                }
            }
        ]);

        // Color picker
        setTimeout(() => {
            document.querySelectorAll(".color-dot").forEach((dot) => {
                dot.addEventListener("click", () => {
                    document.querySelectorAll(".color-dot").forEach((d) => d.style.border = "none");
                    dot.style.border = "3px solid white";
                });
            });
        }, 100);
    }

    async function renderScheduleTab(el) {
        const today = new Date().toISOString().split("T")[0];
        el.innerHTML = '<div class="empty-state"><div class="spinner" style="margin: 0 auto;"></div></div>';

        const addBtn = document.createElement("div");
        addBtn.style.cssText = "padding: 12px; text-align: center;";
        addBtn.innerHTML = '<button class="btn btn-full" id="addSchedBtn">' + t("memory.newSchedule") + '</button>';
        el.appendChild(addBtn);

        const data = await AICompanion.apiGet("/api/memory/schedules/list?limit=50");
        const schedules = data.schedules || [];

        if (schedules.length === 0) {
            el.innerHTML += '<div class="empty-state"><div class="empty-state-icon">&#128197;</div><div>' + t("memory.noSchedules") + '</div></div>';
            return;
        }

        schedules.forEach((sched) => {
            const item = document.createElement("div");
            item.className = "schedule-item";
            item.innerHTML = `
                <div class="schedule-checkbox ${sched.completed ? "done" : ""}" data-id="${sched.id}">
                    ${sched.completed ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ""}
                </div>
                <div class="schedule-info">
                    <div class="schedule-title ${sched.completed ? "done" : ""}">${escapeHtml(sched.title)}</div>
                    <div class="schedule-time">${sched.date} ${sched.time || ""}</div>
                </div>
                <button class="btn btn-sm btn-danger" data-delete="${sched.id}" style="padding: 4px 8px;">x</button>
            `;
            el.appendChild(item);
        });

        // Toggle schedule
        el.querySelectorAll(".schedule-checkbox").forEach((cb) => {
            cb.addEventListener("click", async () => {
                await AICompanion.apiPost("/api/memory/schedules/" + cb.dataset.id + "/toggle", {});
                renderScheduleTab(el);
            });
        });

        // Delete schedule
        el.querySelectorAll("[data-delete]").forEach((btn) => {
            btn.addEventListener("click", async () => {
                await AICompanion.apiDelete("/api/memory/schedules/" + btn.dataset.delete);
                renderScheduleTab(el);
            });
        });

        document.getElementById("addSchedBtn").addEventListener("click", () => {
            AICompanion.showModal(t("memory.newSchedule").replace("+ ", ""), `
                <div class="field-group"><label class="label">${t("memory.title")}</label><input class="input" id="schedTitle" placeholder="${t("memory.whatToDo")}"></div>
                <div class="field-group"><label class="label">${t("memory.date")}</label><input type="date" class="input" id="schedDate" value="${today}"></div>
                <div class="field-group"><label class="label">${t("memory.time")}</label><input type="time" class="input" id="schedTime"></div>
                <div class="field-group"><label class="label">${t("memory.description")}</label><textarea class="input" id="schedDesc" rows="2"></textarea></div>
            `, [
                { label: t("common.cancel"), style: "btn-secondary" },
                { label: t("common.add"), onClick: async (c) => {
                    const title = c.querySelector("#schedTitle").value.trim();
                    const date = c.querySelector("#schedDate").value;
                    const time = c.querySelector("#schedTime").value || null;
                    const desc = c.querySelector("#schedDesc").value.trim();
                    if (!title || !date) { AICompanion.showToast(t("toast.fillTitleDate"), "error"); return false; }
                    await AICompanion.apiPost("/api/memory/schedules/", { title, date, time, description: desc });
                    AICompanion.showToast(t("memory.scheduleAdded"), "success");
                    switchMemoryTab("schedule");
                    return true;
                }}
            ]);
        });
    }

    async function renderStatsTab(el) {
        el.innerHTML = '<div class="empty-state"><div class="spinner" style="margin: 0 auto;"></div></div>';

        const stats = await AICompanion.apiGet("/api/memory/stats/summary");

        el.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${stats.total_memories || 0}</div>
                    <div class="stat-label">${t("memory.totalMemories")}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.due_for_review || 0}</div>
                    <div class="stat-label">${t("memory.dueForReview")}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${(stats.avg_importance || 0).toFixed(2)}</div>
                    <div class="stat-label">${t("memory.avgImportance")}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${Object.keys(stats.by_category || {}).length}</div>
                    <div class="stat-label">${t("memory.categories")}</div>
                </div>
            </div>
        `;

        // Category breakdown
        const categories = stats.by_category || {};
        if (Object.keys(categories).length > 0) {
            const catEl = document.createElement("div");
            catEl.className = "card";
            catEl.innerHTML = "<div class='card-title'>" + t("memory.byCategory") + "</div>";
            for (const [cat, count] of Object.entries(categories)) {
                const row = document.createElement("div");
                row.style.cssText = "display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);";
                const catLabel = t("cat." + cat) || cat;
                row.innerHTML = `<span style="text-transform: capitalize;">${escapeHtml(catLabel)}</span><span class="badge">${count}</span>`;
                catEl.appendChild(row);
            }
            el.appendChild(catEl);
        }

        // AI consolidation button
        const consolidateBtn = document.createElement("div");
        consolidateBtn.style.cssText = "padding: 12px;";
        consolidateBtn.innerHTML = '<button class="btn btn-full" id="consolidateBtn">' + t("memory.consolidate") + '</button>';
        el.appendChild(consolidateBtn);

        document.getElementById("consolidateBtn").addEventListener("click", async () => {
            AICompanion.showToast(t("memory.consolidating"), "");
            const result = await AICompanion.apiPost("/api/memory/consolidate", {});
            if (result.error) {
                AICompanion.showToast(result.error, "error");
            } else {
                AICompanion.showToast(t("memory.consolidationDone"), "success");
                switchMemoryTab("stats");
            }
        });
    }
}

// --- Helpers ---------------------------------------------------------------

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function truncate(str, len) {
    if (!str) return "";
    return str.length > len ? str.substring(0, len) + "..." : str;
}

function getIconEmoji(icon) {
    const icons = { person: "\u{1F464}", star: "\u{2B50}", heart: "\u{1F496}", briefcase: "\u{1F4BC}" };
    return icons[icon] || "\u{1F464}";
}
