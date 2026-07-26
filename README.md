# 🤖 AI Companion v4-beta

> 通用 AI 伙伴应用 (手机 / PC / 服务器均可运行) -- 有记忆、有温度、能外接 API、能触摸互联网

[![Python](https://img.shields.io/badge/Python-3.14+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.95.2-green.svg)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## v4-beta 新功能

| 功能 | 说明 |
|:---|:---|
| 多AI模型 | 同时配置聊天/终端/总结/嵌入四个用途的独立AI模型，互不干扰 |
| 本地缓存 | 聊天消息先存 conversation_cache 表，支持多session |
| 自动总结 | 配置间隔小时数和最少消息数，AI自动总结对话并写入记忆系统 |
| 聊天联网 | 发送包含"搜索/网页/查找"等关键词时，AI自动调用智能终端搜索 |
| 终端修复 | 独立AI配置、JSON解析容错、执行结果自动AI总结 |
| 记忆导出 | JSON导出全部记忆数据（含人物/关系），支持导入恢复 |
| AI搜索记忆 | chat_service 注入记忆搜索，AI对话时自动参考相关记忆 |

## v3 更新亮点

| 更新项 | 说明 |
|:---|:---|
| 中英双语 | 完整 i18n 国际化，默认中文，可在设置中一键切换英文 |
| 依赖锁定 | requirements.txt 锁定到实测可用版本 |
| 启动优化 | run.sh 不再每次启动重新安装依赖，仅在缺失时安装 |
| 踩坑文档 | 每一步部署都标注了可能遇到的问题和解决方法 |

## 自动化工具

| 脚本 | 功能 |
|:---|:---|
| `install.sh` | **全自动安装**：检测环境、安装缺失依赖、处理版本冲突、下载代码、启动服务 |
| `run.sh` | **一键启动**：智能检测依赖缺失、仅在需要时安装、自动配置环境 |
| `manager.sh` | **交互式管理器**：彩色菜单，支持启动/停止/更新/备份/恢复/浏览器打开 |
| `update.sh` | **自动更新**：检测 GitHub 新版本、自动备份、执行更新、支持回滚 |
| `backup.sh` | **数据备份**：备份数据库/配置/头像/文档，支持定时自动备份和恢复 |

### 一键安装（推荐新手）

```bash
curl -L https://raw.githubusercontent.com/xysy92ds/ai-companion/main/install.sh -o install.sh
chmod +x install.sh
./install.sh
```

## 功能一览

| 功能 | 说明 |
|:---|:---|
| AI 聊天 | 外接任意 OpenAI 兼容 API，流式输出，人格注入，多模型切换 |
| 记忆系统 | SM-2 遗忘曲线、人物关系图、每日日程、AI 记忆整理、导出导入 |
| 知识库 | 上传 txt/md/pdf 文档，嵌入式 AI 向量检索 |
| 智能终端 | 自然语言 -> AI 自动生成命令 -> 安全执行 -> 结果可视化 |
| 聊天联网 | 聊天中输入搜索关键词，自动触发终端搜索并注入结果 |
| 多主题 | Midnight / Ocean / Sakura / Light 四种风格 |
| AI 头像 | 上传图片，客户端裁剪为圆形 |
| 工具开关 | B站搜索 / 网页搜索 / 文件查找 / 包安装 / 网页抓取 |
| PWA 离线 | 添加到桌面，全屏使用 |
| 中英双语 | i18n 国际化，默认中文，可切换英文 |
| 自动安装 | install.sh 全自动部署，处理所有依赖问题 |

## 快速开始

### 方式一：一键脚本安装（任意环境）

```bash
# 下载安装脚本
curl -L https://raw.githubusercontent.com/xysy92ds/ai-companion/main/install.sh -o install.sh
chmod +x install.sh
./install.sh
```

脚本会自动检测环境（Windows/Mac/Linux/Termux），安装所需依赖，下载代码，启动服务。

### 方式二：手动安装（PC / 服务器）

```bash
# 1. 克隆项目
git clone https://github.com/xysy92ds/ai-companion.git
cd ai-companion

# 2. 安装 Python 依赖
pip install -r requirements.txt

# 3. 启动
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
# 或在 Linux/macOS 上：
chmod +x run.sh
./run.sh
```

浏览器访问 `http://localhost:8000`

> 在 PC 上运行时，其他设备（手机/平板）只要在同一局域网，访问 `http://你的电脑IP:8000` 即可使用。

### 方式三：Termux（Android 手机）

```bash
# 1. 安装 Termux（从 F-Droid）
#    注意：不要从 Google Play 安装，版本已过期

# 2. 更新系统并安装基础工具
pkg update && pkg upgrade -y
pkg install -y python git

# 3. 克隆项目
git clone https://github.com/xysy92ds/ai-companion.git
cd ai-companion

# 4. 安装 Python 依赖
pip install -r requirements.txt

# 5. 启动
chmod +x run.sh
./run.sh

# 6. 访问
# 浏览器打开 http://localhost:8000
```

> **详细的踩坑教程请阅读 [DEPLOYMENT.md](DEPLOYMENT.md)**，每一步都标注了可能遇到的问题和解决方法。

## 配置

首次使用需要在 设置 -> "AI 模型管理" 页面：

1. **添加聊天 AI**：填入 Provider URL、API Key、模型名称，用途选择"聊天"
2. **添加终端 AI**（可选）：可以单独配置，也可以选择"使用聊天 AI"
3. **添加总结 AI**（可选）：AI自动总结对话时使用的模型
4. **嵌入 AI**（可选）：填入嵌入 AI 配置，用于知识库向量检索
5. **人格设定**：设置 AI 名字、性格、语气（自动持久化）
6. **头像**：上传图片裁剪为 AI 头像
7. **主题**：选择喜欢的主题风格
8. **语言**：选择中文或英文界面
9. **自动总结**：配置是否启用、间隔小时数、最少消息数
10. **智能工具**：开关智能终端工具

### 兼容的 API 提供商

| 提供商 | URL | 聊天模型 | 嵌入模型 |
|:---|:---|:---|:---|
| OpenAI | `https://api.openai.com/v1` | gpt-4o-mini | text-embedding-3-small |
| DeepSeek | `https://api.deepseek.com/v1` | deepseek-chat | - |
| Moonshot | `https://api.moonshot.cn/v1` | moonshot-v1-8k | - |
| 智谱 | `https://open.bigmodel.cn/api/paas/v4` | glm-4-flash | embedding-3 |
| 本地 Ollama | `http://localhost:11434/v1` | llama3.2 | nomic-embed-text |

## 技术栈

- **后端**：Python 3.14 / FastAPI 0.95.2 / pydantic 1.10.26 / SQLite (aiosqlite)
- **前端**：原生 HTML/CSS/JS（无框架，PWA）
- **AI**：OpenAI 兼容 API（流式 SSE）/ Embedding API（余弦相似度）
- **部署**：本地运行 / Termux / PC / 服务器 / PWA

## 项目结构

```
ai-companion/
├── app/
│   ├── main.py              # FastAPI 入口
│   ├── config.py            # 配置 + 工具注册表 + 终端触发关键词
│   ├── database.py          # SQLite（11张表含迁移）
│   ├── routers/             # 6 个 API 路由
│   ├── services/            # 5 个业务服务
│   └── static/              # 前端（PWA）
│       ├── css/style.css    # 4种主题
│       └── js/
│           ├── i18n.js      # 中英双语翻译
│           ├── app.js       # 核心（导航/API/主题/i18n）
│           ├── chat.js      # 聊天页（终端触发检测）
│           ├── memory.js    # 记忆页（导出导入）
│           ├── kb.js        # 知识库页
│           ├── terminal.js  # 智能终端页
│           └── settings.js  # 设置页（多模型管理）
├── data/                    # 运行时数据（自动创建）
├── .version                 # 当前版本标记
├── requirements.txt         # 锁定版本
├── install.sh               # 全自动安装脚本
├── run.sh                   # 一键启动
├── manager.sh               # 交互式管理器
├── update.sh                # 自动更新检测
├── backup.sh                # 数据备份与恢复
├── README.md                # 项目介绍
└── DEPLOYMENT.md            # 详细部署教程（含踩坑指南）
```

## License

MIT
