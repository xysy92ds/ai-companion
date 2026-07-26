/* AI Companion - i18n Internationalization (zh-CN / en) */

const I18N = {
    "zh-CN": {
        // Navigation
        "nav.chat": "聊天",
        "nav.memory": "记忆",
        "nav.kb": "知识库",
        "nav.terminal": "终端",
        "nav.settings": "设置",

        // Page titles
        "title.chat": "AI 伙伴",
        "title.memory": "记忆与心灵",
        "title.kb": "知识库",
        "title.terminal": "智能终端",
        "title.settings": "设置",

        // Status
        "status.online": "在线",
        "status.offline": "离线",

        // Common
        "common.cancel": "取消",
        "common.save": "保存",
        "common.delete": "删除",
        "common.add": "添加",
        "common.search": "搜索",
        "common.close": "关闭",
        "common.confirm": "确认",
        "common.loading": "加载中...",

        // Toast
        "toast.saved": "保存成功！",
        "toast.deleted": "已删除",
        "toast.uploaded": "上传成功！",
        "toast.fillFields": "请填写完整信息",
        "toast.fillTitleContent": "请填写标题和内容",
        "toast.fillTitleDate": "请填写标题和日期",

        // Chat
        "chat.placeholder": "发送消息...",
        "chat.welcome.title": "嗨！我是你的 AI 伙伴。",
        "chat.welcome.desc": "去设置页面配置你的 AI API，就可以开始聊天了。",
        "chat.welcome.hint": "试试说：帮我搜索一下AI的最新新闻",
        "chat.connectionError": "连接失败：",
        "chat.terminalSuggest": "检测到搜索意图，发送后将自动联网搜索",

        // Memory - tabs
        "memory.tab.memories": "记忆",
        "memory.tab.persons": "人物",
        "memory.tab.schedule": "日程",
        "memory.tab.stats": "统计",

        // Memory - memories
        "memory.newMemory": "+ 新建记忆",
        "memory.noMemories": "还没有记忆",
        "memory.category": "分类",
        "memory.title": "标题",
        "memory.content": "内容",
        "memory.importance": "重要程度",
        "memory.created": "创建时间",
        "memory.recallCount": "回忆次数",
        "memory.retention": "记忆保留率",
        "memory.forgettingCurve": "遗忘曲线",
        "memory.recall": "回忆",
        "memory.byCategory": "按分类",
        "memory.consolidate": "AI 记忆整理",
        "memory.consolidating": "正在整理记忆...",
        "memory.consolidationDone": "记忆整理完成！",
        "memory.totalMemories": "总记忆数",
        "memory.dueForReview": "待复习",
        "memory.avgImportance": "平均重要性",
        "memory.categories": "分类数",
        "memory.memorySaved": "记忆已保存！",
        "memory.memoryDeleted": "记忆已删除",
        "memory.recalled": "已回忆！保留率：",

        // Memory - persons
        "memory.addPerson": "+ 添加人物",
        "memory.noPersons": "还没有记录人物",
        "memory.relationships": "关系",
        "memory.name": "姓名",
        "memory.description": "描述",
        "memory.color": "颜色",
        "memory.personAdded": "人物已添加！",
        "memory.enterName": "请输入姓名",

        // Memory - schedule
        "memory.newSchedule": "+ 新建日程",
        "memory.noSchedules": "还没有日程",
        "memory.date": "日期",
        "memory.time": "时间（可选）",
        "memory.scheduleAdded": "日程已添加！",
        "memory.whatToDo": "要做什么？",

        // KB
        "kb.upload": "上传文档 (txt / md / pdf)",
        "kb.searchPlaceholder": "搜索知识库...",
        "kb.noResults": "未找到结果",
        "kb.noDocuments": "还没有上传文档",
        "kb.documents": "文档列表",
        "kb.results": "个结果（",
        "kb.semantic": "语义",
        "kb.text": "文本",
        "kb.search2": "搜索）",
        "kb.match": "% 匹配",
        "kb.source": "来源：",
        "kb.uploading": "正在上传 ",
        "kb.uploadSuccess": "上传成功！",
        "kb.chunks": " 个分块，",
        "kb.embedded": " 个已嵌入向量。",
        "kb.docDeleted": "文档已删除",

        // Terminal
        "terminal.tab.smart": "AI 智能",
        "terminal.tab.manual": "手动",
        "terminal.smartPlaceholder": "告诉我你想做什么...",
        "terminal.smartHint": "比如：在 B站 搜索 AI 教程",
        "terminal.smartTitle": "告诉我你的需求！",
        "terminal.yourRequest": "你的请求",
        "terminal.aiThinking": "AI 思考中...",
        "terminal.aiGenerating": "正在生成命令",
        "terminal.aiGenerated": "AI 生成的命令",
        "terminal.output": "输出",
        "terminal.exit": "退出码",
        "terminal.error": "错误",
        "terminal.noAction": "无操作",
        "terminal.noSuitable": "未生成合适的命令。",
        "terminal.manualPlaceholder": "输入命令...",
        "terminal.manualMode": "手动终端模式",
        "terminal.running": "运行中",
        "terminal.requestFailed": "请求失败：",
        "terminal.blocked": "命令因安全原因被阻止。",

        // Settings
        "settings.appearance": "外观",
        "settings.language": "语言",
        "settings.avatar": "AI 头像",
        "settings.chatAIConfig": "聊天 AI 配置",
        "settings.embeddingAIConfig": "嵌入 AI 配置",
        "settings.personality": "人格设定",
        "settings.smartTools": "智能终端工具",
        "settings.dangerZone": "危险区域",
        "settings.providerUrl": "提供商 URL",
        "settings.apiKey": "API 密钥",
        "settings.modelName": "模型名称",
        "settings.temperature": "温度",
        "settings.maxTokens": "最大 Token 数",
        "settings.saveConfig": "保存配置",
        "settings.uploadAvatar": "上传新头像",
        "settings.cropAvatar": "裁剪头像",
        "settings.cropHint": "拖动移动，+/- 缩放",
        "settings.apiSaved": "API 配置已保存！",
        "settings.embedSaved": "嵌入配置已保存！",
        "settings.personalitySaved": "人格设定已保存！",
        "settings.configured": "已配置",
        "settings.notSet": "未设置",
        "settings.embedDesc": "与聊天 AI 分开配置。用于知识库向量搜索和可选的记忆检索。",
        "settings.embedUrl": "嵌入 API URL",
        "settings.embedKey": "嵌入 API 密钥",
        "settings.embedModel": "嵌入模型名称",
        "settings.dimensions": "向量维度",
        "settings.useForMemory": "用于记忆搜索",
        "settings.useForMemoryDesc": "用向量嵌入增强记忆检索",
        "settings.saveEmbed": "保存嵌入配置",
        "settings.name": "名称",
        "settings.description": "描述",
        "settings.greeting": "问候语",
        "settings.tone": "语气",
        "settings.traits": "特征",
        "settings.addTrait": "添加特征...",
        "settings.savePersonality": "保存人格设定",
        "settings.toolsDesc": "切换 AI 驱动的工具。开启后，AI 可以自动生成并执行命令。",
        "settings.clearChat": "清除所有聊天记录",
        "settings.clearChatConfirm": "这将永久删除所有对话消息，此操作无法撤销。",
        "settings.testApi": "测试 API 连接",
        "settings.testing": "正在测试 API...",
        "settings.apiConfigured": "API 已配置：",
        "settings.apiNotConfigured": "API 未配置。",
        "settings.testFailed": "测试失败：",
        "settings.chatHistoryCleared": "聊天记录已清除",
        "settings.toolEnabled": "工具已开启",
        "settings.toolDisabled": "工具已关闭",
        "settings.avatarUpdated": "头像已更新！",
        "settings.uploadFailed": "上传失败",

        "settings.aiModelManagement": "AI 模型管理",
        "settings.addModel": "添加模型",
        "settings.edit": "编辑",
        "settings.setDefault": "设为默认",
        "settings.enabled": "启用",
        "settings.defaultBadge": "默认",
        "settings.deleteModel": "删除模型",
        "settings.confirmDeleteModel": "确认删除模型",
        "settings.modelDeleted": "模型已删除",
        "settings.deleteFailed": "删除失败",
        "settings.modelEnabled": "模型已启用",
        "settings.modelDisabled": "模型已禁用",
        "settings.toggleFailed": "切换失败",
        "settings.defaultSet": "已设为默认",
        "settings.setDefaultFailed": "设置默认失败",
        "settings.editModel": "编辑模型",
        "settings.purpose": "用途",
        "settings.purposeChat": "聊天",
        "settings.purposeTerminal": "终端",
        "settings.purposeSummary": "总结",
        "settings.purposeEmbedding": "嵌入",
        "settings.isDefault": "设为默认",
        "settings.modelUpdated": "模型已更新",
        "settings.modelSaved": "模型已保存",
        "settings.saveModelFailed": "保存模型失败",
        "settings.loadModelsFailed": "加载模型失败",
        "settings.noModels": "暂无模型",

        "settings.autoSummary": "自动总结",
        "settings.autoSummaryDesc": "自动总结聊天内容，生成记忆摘要。",
        "settings.autoSummaryEnabled": "启用自动总结",
        "settings.autoSummaryEnabledDesc": "自动将聊天内容总结为记忆。",
        "settings.summaryInterval": "总结间隔（小时）",
        "settings.minMessages": "最少消息数",
        "settings.saveSummary": "保存总结配置",
        "settings.summarySaved": "总结配置已保存",
        "settings.summarySaveFailed": "保存总结配置失败",

        // Personality tones
        "tone.friendly": "友好",
        "tone.professional": "专业",
        "tone.playful": "俏皮",
        "tone.casual": "随意",
        "tone.formal": "正式",

        // Theme names
        "theme.midnight": "午夜",
        "theme.ocean": "海洋",
        "theme.sakura": "樱花",
        "theme.light": "明亮",

        // Memory categories
        "cat.general": "通用",
        "cat.person": "人物",
        "cat.event": "事件",
        "cat.feeling": "情感",
        "cat.plan": "计划",
        "cat.consolidation": "整理",
    },

    "en": {
        // Navigation
        "nav.chat": "Chat",
        "nav.memory": "Memory",
        "nav.kb": "Knowledge",
        "nav.terminal": "Terminal",
        "nav.settings": "Settings",

        // Page titles
        "title.chat": "AI Companion",
        "title.memory": "Memory & Mind",
        "title.kb": "Knowledge Base",
        "title.terminal": "Smart Terminal",
        "title.settings": "Settings",

        // Status
        "status.online": "online",
        "status.offline": "offline",

        // Common
        "common.cancel": "Cancel",
        "common.save": "Save",
        "common.delete": "Delete",
        "common.add": "Add",
        "common.search": "Search",
        "common.close": "Close",
        "common.confirm": "Confirm",
        "common.loading": "Loading...",

        // Toast
        "toast.saved": "Saved successfully!",
        "toast.deleted": "Deleted",
        "toast.uploaded": "Uploaded!",
        "toast.fillFields": "Please fill in all fields",
        "toast.fillTitleContent": "Fill in title and content",
        "toast.fillTitleDate": "Fill in title and date",

        // Chat
        "chat.placeholder": "Send a message...",
        "chat.welcome.title": "Hi! I'm your AI companion.",
        "chat.welcome.desc": "Go to Settings to configure your AI API and start chatting.",
        "chat.welcome.hint": "Try: search for latest AI news",
        "chat.connectionError": "Connection failed: ",

        // Memory - tabs
        "memory.tab.memories": "Memories",
        "memory.tab.persons": "Persons",
        "memory.tab.schedule": "Schedule",
        "memory.tab.stats": "Stats",

        // Memory - memories
        "memory.newMemory": "+ New Memory",
        "memory.noMemories": "No memories yet",
        "memory.category": "Category",
        "memory.title": "Title",
        "memory.content": "Content",
        "memory.importance": "Importance",
        "memory.created": "Created",
        "memory.recallCount": "Recall Count",
        "memory.retention": "Retention",
        "memory.forgettingCurve": "Forgetting Curve",
        "memory.recall": "Recall",
        "memory.byCategory": "By Category",
        "memory.consolidate": "AI Memory Consolidation",
        "memory.consolidating": "Consolidating memories...",
        "memory.consolidationDone": "Memory consolidation complete!",
        "memory.totalMemories": "Total Memories",
        "memory.dueForReview": "Due for Review",
        "memory.avgImportance": "Avg Importance",
        "memory.categories": "Categories",
        "memory.memorySaved": "Memory saved!",
        "memory.memoryDeleted": "Memory deleted",
        "memory.recalled": "Recalled! Retention: ",

        // Memory - persons
        "memory.addPerson": "+ Add Person",
        "memory.noPersons": "No persons tracked yet",
        "memory.relationships": "Relationships",
        "memory.name": "Name",
        "memory.description": "Description",
        "memory.color": "Color",
        "memory.personAdded": "Person added!",
        "memory.enterName": "Enter a name",

        // Memory - schedule
        "memory.newSchedule": "+ New Schedule",
        "memory.noSchedules": "No schedules yet",
        "memory.date": "Date",
        "memory.time": "Time (optional)",
        "memory.scheduleAdded": "Schedule added!",
        "memory.whatToDo": "What to do?",

        // KB
        "kb.upload": "Upload document (txt / md / pdf)",
        "kb.searchPlaceholder": "Search knowledge base...",
        "kb.noResults": "No results found",
        "kb.noDocuments": "No documents uploaded yet",
        "kb.documents": "Documents",
        "kb.results": " results (",
        "kb.semantic": "semantic",
        "kb.text": "text",
        "kb.search2": " search)",
        "kb.match": "% match",
        "kb.source": "Source: ",
        "kb.uploading": "Uploading ",
        "kb.uploadSuccess": "Uploaded!",
        "kb.chunks": " chunks, ",
        "kb.embedded": " embedded.",
        "kb.docDeleted": "Document deleted",

        // Terminal
        "terminal.tab.smart": "AI Smart",
        "terminal.tab.manual": "Manual",
        "terminal.smartPlaceholder": "Tell me what you want to do...",
        "terminal.smartHint": "e.g. \"Search Bilibili for AI tutorials\"",
        "terminal.smartTitle": "Tell me what you need!",
        "terminal.yourRequest": "Your Request",
        "terminal.aiThinking": "AI Thinking...",
        "terminal.aiGenerating": "Generating command",
        "terminal.aiGenerated": "AI Generated Command",
        "terminal.output": "Output",
        "terminal.exit": "exit",
        "terminal.error": "Error",
        "terminal.noAction": "No Action",
        "terminal.noSuitable": "No suitable command generated.",
        "terminal.manualPlaceholder": "Enter command...",
        "terminal.manualMode": "Manual terminal mode",
        "terminal.running": "Running",
        "terminal.requestFailed": "Request failed: ",
        "terminal.blocked": "Generated command was blocked for safety.",

        // Settings
        "settings.appearance": "Appearance",
        "settings.language": "Language",
        "settings.avatar": "AI Avatar",
        "settings.chatAIConfig": "Chat AI Configuration",
        "settings.embeddingAIConfig": "Embedding AI Configuration",
        "settings.personality": "Personality",
        "settings.smartTools": "Smart Terminal Tools",
        "settings.dangerZone": "Danger Zone",
        "settings.providerUrl": "Provider URL",
        "settings.apiKey": "API Key",
        "settings.modelName": "Model Name",
        "settings.temperature": "Temperature",
        "settings.maxTokens": "Max Tokens",
        "settings.saveConfig": "Save Configuration",
        "settings.uploadAvatar": "Upload New Avatar",
        "settings.cropAvatar": "Crop Avatar",
        "settings.cropHint": "Drag to move, use +/- to zoom",
        "settings.apiSaved": "API configuration saved!",
        "settings.embedSaved": "Embedding config saved!",
        "settings.personalitySaved": "Personality saved!",
        "settings.configured": "configured",
        "settings.notSet": "not set",
        "settings.embedDesc": "Separate from chat AI. Used for knowledge base vector search and optional memory retrieval.",
        "settings.embedUrl": "Embedding Provider URL",
        "settings.embedKey": "Embedding API Key",
        "settings.embedModel": "Embedding Model Name",
        "settings.dimensions": "Vector Dimensions",
        "settings.useForMemory": "Use for Memory Search",
        "settings.useForMemoryDesc": "Enhance memory retrieval with embeddings",
        "settings.saveEmbed": "Save Embedding Config",
        "settings.name": "Name",
        "settings.description": "Description",
        "settings.greeting": "Greeting",
        "settings.tone": "Tone",
        "settings.traits": "Traits",
        "settings.addTrait": "Add trait...",
        "settings.savePersonality": "Save Personality",
        "settings.toolsDesc": "Toggle AI-powered tools. When enabled, AI can auto-generate and execute commands.",
        "settings.clearChat": "Clear All Chat History",
        "settings.clearChatConfirm": "This will permanently delete all conversation messages. This action cannot be undone.",
        "settings.testApi": "Test API Connection",
        "settings.testing": "Testing API...",
        "settings.apiConfigured": "API is configured: ",
        "settings.apiNotConfigured": "API not configured.",
        "settings.testFailed": "Test failed: ",
        "settings.chatHistoryCleared": "Chat history cleared",
        "settings.toolEnabled": "Tool enabled",
        "settings.toolDisabled": "Tool disabled",
        "settings.avatarUpdated": "Avatar updated!",
        "settings.uploadFailed": "Upload failed",

        "settings.aiModelManagement": "AI Model Management",
        "settings.addModel": "Add Model",
        "settings.edit": "Edit",
        "settings.setDefault": "Set Default",
        "settings.enabled": "Enabled",
        "settings.defaultBadge": "Default",
        "settings.deleteModel": "Delete Model",
        "settings.confirmDeleteModel": "Confirm delete model",
        "settings.modelDeleted": "Model deleted",
        "settings.deleteFailed": "Delete failed",
        "settings.modelEnabled": "Model enabled",
        "settings.modelDisabled": "Model disabled",
        "settings.toggleFailed": "Toggle failed",
        "settings.defaultSet": "Default set",
        "settings.setDefaultFailed": "Set default failed",
        "settings.editModel": "Edit Model",
        "settings.purpose": "Purpose",
        "settings.purposeChat": "Chat",
        "settings.purposeTerminal": "Terminal",
        "settings.purposeSummary": "Summary",
        "settings.purposeEmbedding": "Embedding",
        "settings.isDefault": "Set as default",
        "settings.modelUpdated": "Model updated",
        "settings.modelSaved": "Model saved",
        "settings.saveModelFailed": "Save model failed",
        "settings.loadModelsFailed": "Load models failed",
        "settings.noModels": "No models yet",

        "settings.autoSummary": "Auto Summary",
        "settings.autoSummaryDesc": "Auto-summarize conversations into memory.",
        "settings.autoSummaryEnabled": "Enable auto-summary",
        "settings.autoSummaryEnabledDesc": "Automatically summarize chats into memories.",
        "settings.summaryInterval": "Summary interval (hours)",
        "settings.minMessages": "Min messages",
        "settings.saveSummary": "Save summary config",
        "settings.summarySaved": "Summary config saved",
        "settings.summarySaveFailed": "Save summary config failed",

        // Personality tones
        "tone.friendly": "Friendly",
        "tone.professional": "Professional",
        "tone.playful": "Playful",
        "tone.casual": "Casual",
        "tone.formal": "Formal",

        // Theme names
        "theme.midnight": "Midnight",
        "theme.ocean": "Ocean",
        "theme.sakura": "Sakura",
        "theme.light": "Light",

        // Memory categories
        "cat.general": "General",
        "cat.person": "Person",
        "cat.event": "Event",
        "cat.feeling": "Feeling",
        "cat.plan": "Plan",
        "cat.consolidation": "Consolidation",
    },
};

// --- Language state ---
let currentLang = "zh-CN";

function t(key) {
    const dict = I18N[currentLang] || I18N["zh-CN"];
    return dict[key] || I18N["zh-CN"][key] || I18N["en"][key] || key;
}

async function loadLanguage() {
    try {
        const data = await fetch("/api/settings/language").then((r) => r.json());
        currentLang = data.lang || "zh-CN";
    } catch (e) {
        currentLang = "zh-CN";
    }
    document.documentElement.lang = currentLang;
}

async function setLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    try {
        await fetch("/api/settings/language", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lang }),
        });
    } catch (e) {}
    // Re-render current page
    if (window.AICompanion) {
        window.AICompanion.switchPage(window.AICompanion.currentPage || "chat");
    }
}

// Detect browser language on first load
function detectLanguage() {
    const browserLang = navigator.language || navigator.userLanguage || "en";
    if (browserLang.startsWith("zh")) {
        return "zh-CN";
    }
    return "en";
}
