# 🤖 AI Companion v4 - 部署与使用指南（含踩坑教程）

## 目录

- [项目概述](#项目概述)
- [方式零：PC / 服务器快速部署（最快）](#方式零pc--服务器快速部署最快)
- [验证可用的版本组合](#验证可用的版本组合)
- [文件结构](#文件结构)
- [方式一：Termux 部署（Android 手机）](#方式一termux-部署android-手机)
  - [第一步：安装 Termux](#第一步安装-termux)
  - [第二步：更新系统并安装基础工具](#第二步更新系统并安装基础工具)
  - [第三步：获取项目代码](#第三步获取项目代码)
  - [第四步：安装 Python 依赖](#第四步安装-python-依赖)
  - [第五步：启动应用](#第五步启动应用)
  - [第六步：浏览器访问](#第六步浏览器访问)
  - [第七步：添加到桌面（PWA）](#第七步添加到桌面pwa)
  - [第八步：开机自启（可选）](#第八步开机自启可选)
- [方式二：PC / 服务器手动部署](#方式二pc--服务器手动部署)
- [配置指南](#配置指南)
- [使用指南](#使用指南)
- [从旧版本升级](#从旧版本升级)
- [推送代码到 GitHub](#推送代码到-github)
- [打包成 APK](#打包成-apk)
- [常见问题汇总](#常见问题汇总)

---

## 项目概述

AI Companion 是一个通用 AI 伙伴应用 (手机 / PC / 服务器均可运行)，基于 **FastAPI + Web 前端** 架构，通过浏览器即可访问使用。

v3 新增功能：
- **中英双语 i18n**：完整国际化，默认中文，可在设置中一键切换英文
- **依赖版本锁定**：锁定到实测可用版本
- **启动优化**：run.sh 智能检测依赖，不再每次覆盖安装
- **踩坑文档**：每一步都标注了可能遇到的问题和解决方法

---

## 方式零：PC / 服务器快速部署（最快）

如果你用的是 Windows / macOS / Linux PC 或服务器，这是最快的方式：

### 步骤 1：安装 Python

| 系统 | 方法 |
|:---|:---|
| **Windows** | 从 [python.org](https://www.python.org/downloads/) 下载安装 Python 3.11+ |
| **macOS** | `brew install python3` |
| **Linux** | `sudo apt install python3 python3-pip` |

> **注意**：不需要安装 Rust 编译器，也不需要安装 Termux。

### 步骤 2：下载并启动

```bash
# 克隆项目
git clone https://github.com/xysy92ds/ai-companion.git
cd ai-companion

# 安装依赖
pip install -r requirements.txt

# 启动
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 步骤 3：访问

浏览器打开 `http://localhost:8000`

### 同局域网设备访问

PC 和手机在同一 WiFi 下，手机浏览器访问 `http://PC的IP地址:8000`

> 查看 PC IP：`ipconfig` (Windows) / `ifconfig` (macOS/Linux)

### PC 上常见问题

**问题：pip install 报错缺少 Rust**

> **原因**：Windows 上安装 pydantic v2 需要 Rust。但本项目使用 pydantic v1，不需要 Rust。
>
> **解决**：确保 requirements.txt 中是 `pydantic==1.10.26`，不是 v2。正常安装不会有此问题。

**问题：pip install 报错找不到 fastapi**

> **原因**：Python 环境未正确配置，pip 和 python 不是同一个环境。
>
> **解决**：使用 `python -m pip install -r requirements.txt` 确保使用正确的 pip。

**问题：Windows 运行 run.sh 报错**

> **原因**：run.sh 是 Bash 脚本，Windows 默认没有 Bash。
>
> **解决**：
> - Git Bash：`git bash` 然后 `./run.sh`
> - PowerShell：直接用 `python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`
> - WSL：在 WSL 中使用 `./run.sh`

**问题：启动后局域网设备无法访问**

> **原因**：Windows 防火墙拦截了 8000 端口。
>
> **解决**：
> 1. Windows 设置 -> 防火墙 -> 允许应用通过防火墙
> 2. 允许 Python 通过防火墙（专用 + 公用网络）
> 3. 或暂时关闭防火墙测试

---

## 验证可用的版本组合

以下版本组合已在 Termux Python 3.14 上实测通过：

| 包 | 版本 | 说明 |
|:---|:---|:---|
| Python | 3.14 | Termux 默认，无法降级 |
| FastAPI | 0.95.2 | 0.103+ 在 pydantic v1 下崩溃 |
| pydantic | 1.10.26 | v2 在 Python 3.14 上需要 Rust 编译，无法安装 |
| uvicorn | 0.23.2 | |
| httpx | 0.27.2 | |
| aiosqlite | 0.20.0 | |
| python-multipart | 0.0.12 | |
| PyPDF2 | 3.0.1 | 知识库 PDF 解析 |

> **关键**：不要升级 FastAPI 到 0.103 或更高版本！0.103+ 内部 openapi 模块使用了 pydantic v2 的写法，在 pydantic v1 + Python 3.14 下会报错 `unable to infer type`。

---

## 文件结构

```
ai-companion/
├── app/                              # 后端应用主目录
│   ├── __init__.py
│   ├── main.py                       # FastAPI 入口
│   ├── config.py                     # 全局配置 + 工具注册表
│   ├── database.py                   # SQLite（9张表）
│   ├── routers/                      # API 路由层
│   │   ├── __init__.py
│   │   ├── chat.py                   # 聊天 API
│   │   ├── settings.py               # 设置 API（含语言切换）
│   │   ├── memory.py                 # 记忆 API
│   │   ├── terminal.py               # 手动终端 API
│   │   ├── kb.py                     # 知识库 API
│   │   └── smart_terminal.py         # 智能终端 API
│   ├── services/                     # 业务逻辑层
│   │   ├── __init__.py
│   │   ├── chat_service.py           # AI对话
│   │   ├── memory_service.py         # 记忆系统
│   │   ├── terminal_service.py       # 手动终端
│   │   ├── kb_service.py             # 知识库
│   │   └── smart_terminal_service.py # 智能终端
│   └── static/                       # 前端静态文件
│       ├── index.html                # 主页面
│       ├── manifest.json             # PWA 配置
│       ├── sw.js                     # Service Worker
│       ├── css/style.css             # 4种主题
│       ├── js/
│       │   ├── i18n.js               # 中英双语翻译 [v3新增]
│       │   ├── app.js                # 核心
│       │   ├── chat.js               # 聊天页
│       │   ├── memory.js             # 记忆页
│       │   ├── kb.js                 # 知识库页
│       │   ├── terminal.js           # 智能终端页
│       │   └── settings.js           # 设置页
│       └── assets/
│           ├── icon-512.png
│           ├── icon-192.png
│           └── ai-avatar.png
├── data/                             # 运行时数据（自动创建）
│   ├── companion.db                  # SQLite 数据库
│   └── uploads/                      # 上传的文档
├── requirements.txt                  # 锁定版本
├── run.sh                            # 一键启动脚本
└── DEPLOYMENT.md                     # 本文档
```

---

## 第一步：安装 Termux

从 [F-Droid](https://f-droid.org/packages/com.termux/) 下载安装 Termux。

> **注意：不要从 Google Play 安装 Termux！**
> Google Play 上的 Termux 版本已过期，存在已知 bug。
> F-Droid 版本是最新的官方维护版本。

> **提示：** 如果手机不允许安装第三方应用，需要在系统设置中开启"允许安装未知来源应用"。

---

## 第二步：更新系统并安装基础工具

```bash
pkg update && pkg upgrade -y
pkg install -y python git
```

### 可能遇到的问题

**问题1：`pkg install` 出现 `[Y/n]` 提示卡住**

这是因为 Termux 的包管理器会弹出确认提示，如果在此处直接回到 `$` 提示符而没有确认，安装会中断。

**解决方法：** 在命令前加 `-y` 参数自动确认：

```bash
pkg install -y python git
```

**问题2：`pkg update` 报错，网络连接失败**

> **解决方法1：** 检查网络连接，确保手机能正常上网。
>
> **解决方法2：** 更换 Termux 镜像源为国内源：
> ```bash
> sed -i 's@^\(deb.*stable main\)$@#\1\ndeb https://mirrors.tuna.tsinghua.edu.cn/termux/apt/termux stable main@' $PREFIX/etc/apt/sources.list
> pkg update
> ```

**问题3：`git install` 失败，报错 `git: not found`**

> 这通常是因为上面的 `pkg install -y git` 没有执行成功。
>
> **解决方法：** 重新执行 `pkg install -y git`，确保用 `-y` 参数。
>
> 如果仍然失败：
> ```bash
> pkg install git
> ```
> 在提示处手动输入 `y` 并回车。

**问题4：`pkg upgrade` 耗时很久**

> `pkg upgrade` 会更新所有已安装的包，首次可能需要较长时间。
>
> **提醒：** 请耐心等待，不要中途按 Ctrl+C 或关闭 Termux。

---

## 第三步：获取项目代码

### 方式A：从 GitHub 克隆（推荐）

```bash
git clone https://github.com/xysy92ds/ai-companion.git ~/ai-companion
cd ~/ai-companion
```

> **可能遇到的问题：** `git clone` 报错 `fatal: unable to access`
>
> **解决方法：** 检查网络连接。如果在国内，可能需要配置代理：
> ```bash
> git config --global http.proxy http://127.0.0.1:端口号
> git config --global https.proxy http://127.0.0.1:端口号
> ```
> 或者使用手机 VPN。

### 方式B：从手机存储复制 tar.gz

```bash
# 授权存储访问
termux-setup-storage

# 搜索 tar.gz 文件位置（如果你下载到了手机）
find ~/storage/ -name "ai-companion*.tar.gz"

# 解压
tar xzf ~/storage/shared/Download/ai-companion-v3.tar.gz -C ~/
cd ~/ai-companion
```

> **可能遇到的问题：** `tar xzf` 报错 `No such file or directory`
>
> **解决方法：** 文件不在默认路径，先搜索找到实际位置：
> ```bash
> find ~/storage/ -name "ai-companion*.tar.gz"
> ```
> 找到路径后再执行解压。

### 方式C：从旧版本升级

如果你之前已经有 ai-companion 项目：

```bash
cd ~/ai-companion

# 拉取最新代码
git pull origin main

# 或者解压新 tar.gz 覆盖
# 先停掉正在运行的服务（Ctrl+C）
tar xzf ~/storage/shared/Download/ai-companion-v3.tar.gz -C ~/
# 这会覆盖旧文件，但 .git 目录不会被覆盖
```

> **注意：** 解压 tar.gz 会覆盖项目文件，但不会删除 `.git` 目录（如果你之前用 git 初始化过仓库）。所以你的 git 历史不会丢失。

> **警告：** 不要执行 `rm -rf ai-companion` 来删除旧项目！这会连同 `.git` 仓库一起删除。正确做法是直接解压覆盖。

---

## 第四步：安装 Python 依赖

```bash
cd ~/ai-companion
pip install -r requirements.txt
```

> **提醒：** 这一步可能需要等待 2-5 分钟，取决于网络速度。
> 如果卡在某个包的编译阶段，请查看下方的问题排查。

### 可能遇到的问题（重要！）

#### 问题1：`pip install` 卡在 `pydantic-core` 编译

**原因：** Termux 默认使用 Python 3.14，而 pydantic v2 的底层使用 Rust (PyO3) 编译，PyO3 0.22 不支持 Python 3.14 的 C API。

**尝试过但无效的方法（不要浪费时间尝试）：**
- 设置 `ANDROID_API_LEVEL` 环境变量 - 无效
- 设置 `PYO3_USE_ABI3_FORWARD_COMPATIBILITY` 环境变量 - 无效
- 强制编译 pydantic-core - 失败

**解决方法：** 项目已将 pydantic 锁定到 v1 (1.10.26)，不使用 v2。requirements.txt 已配置好，正常 `pip install -r requirements.txt` 即可。

如果之前误装了 pydantic v2，需要彻底清理：

```bash
pip uninstall -y fastapi starlette pydantic pydantic-core
rm -rf /data/data/com.termux/files/usr/lib/python3.14/site-packages/fastapi*
rm -rf /data/data/com.termux/files/usr/lib/python3.14/site-packages/starlette*
rm -rf /data/data/com.termux/files/usr/lib/python3.14/site-packages/pydantic*
pip install --no-cache-dir -r requirements.txt
```

#### 问题2：安装后启动报错 `unable to infer type`

**原因：** FastAPI 0.103+ 内部 openapi 模块使用了 pydantic v2 的写法，在 pydantic v1 + Python 3.14 下不兼容。

**解决方法：** 降级到 FastAPI 0.95.2：

```bash
pip uninstall -y fastapi starlette
pip install fastapi==0.95.2 uvicorn==0.23.2
```

requirements.txt 已锁定为 `fastapi==0.95.2`，正常安装不会有此问题。

#### 问题3：启动后报错 `module 'pydantic' has no attribute 'model_dump'`

**原因：** 代码中使用了 pydantic v2 的 `model_dump()` 方法，但安装的是 v1。

**解决方法：** 项目代码已全部改为使用 `dict()` 方法兼容 pydantic v1。如果你看到此错误，说明代码版本太旧，请重新拉取或解压最新版本。

#### 问题4：`pip install` 报错 `Rust compiler not found`

**原因：** 某些包需要 Rust 编译，Termux 环境不支持。

**解决方法：** requirements.txt 中的所有依赖都不需要 Rust 编译。如果遇到此错误，说明安装了不在 requirements.txt 中的包。请确保只安装 requirements.txt 中列出的包。

#### 问题5：旧版本包残留导致冲突

**症状：** `pip install` 成功但启动报错，或者 `pip list` 显示有多个版本的包。

**解决方法：** 彻底清理并重装：

```bash
# 卸载所有相关包
pip uninstall -y fastapi starlette pydantic pydantic-core uvicorn httpx aiosqlite python-multipart PyPDF2

# 删除残留目录
rm -rf /data/data/com.termux/files/usr/lib/python3.14/site-packages/fastapi*
rm -rf /data/data/com.termux/files/usr/lib/python3.14/site-packages/starlette*
rm -rf /data/data/com.termux/files/usr/lib/python3.14/site-packages/pydantic*
rm -rf /data/data/com.termux/files/usr/lib/python3.14/site-packages/uvicorn*

# 重新安装（不用缓存）
pip install --no-cache-dir -r requirements.txt
```

#### 问题6：`pip install` 很慢

> **解决方法：** 使用国内镜像源：
> ```bash
> pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
> ```

---

## 第五步：启动应用

```bash
cd ~/ai-companion

# 方式A: 一键脚本（推荐）
chmod +x run.sh
./run.sh

# 方式B: 直接启动
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

> **v3 改进：** run.sh 现在只在依赖缺失时才安装依赖，不会每次启动都重新安装（之前的问题：每次启动 `pip install -r requirements.txt` 会覆盖已装好的正确版本）。

### 可能遇到的问题

**问题1：`run.sh` 报错 `Permission denied`**

```bash
chmod +x run.sh
./run.sh
```

**问题2：启动报错 `ModuleNotFoundError`**

> 某个依赖没装上。重新执行 `pip install -r requirements.txt`。

**问题3：启动报错 `Address already in use` (端口被占用)**

> 之前的服务还在运行。先杀掉旧进程：
> ```bash
> pkill -f uvicorn
> ./run.sh
> ```

**问题4：启动成功但浏览器无法访问**

> 检查终端输出是否显示 `Uvicorn running on http://0.0.0.0:8000`。
> 如果显示 `http://127.0.0.1:8000`，检查防火墙设置。

---

## 第六步：浏览器访问

手机浏览器打开：`http://localhost:8000`

> **提示：** 建议使用 Chrome 浏览器，兼容性最好。

> **如果访问失败：**
> - 确认终端显示 `Uvicorn running on http://0.0.0.0:8000`
> - 确认 URL 是 `http://` 不是 `https://`
> - 尝试用 `http://127.0.0.1:8000`

---

## 第七步：添加到桌面（PWA）

1. Chrome 浏览器 -> 右上角菜单 (三个点)
2. -> "添加到主屏幕"
3. 从桌面图标打开，全屏使用

> **效果：** 添加到桌面后，会以全屏模式运行，看起来像一个原生 App。

---

## 第八步：开机自启（可选）

```bash
# 安装 Termux:Boot（从 F-Droid）
# 创建启动脚本
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/start-ai-companion << 'EOF'
#!/data/data/com.termux/files/usr/bin/sh
termux-wake-lock
cd ~/ai-companion
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
EOF
chmod +x ~/.termux/boot/start-ai-companion
```

> **前提：** 需要安装 Termux:Boot 应用（从 F-Droid 下载）。安装后不要打开它，它会在开机时自动运行 `~/.termux/boot/` 下的脚本。

---

## 方式二：PC / 服务器手动部署

如果你不用一键脚本，想手动在 PC / 服务器 / 树莓派上部署：

### 前提

- Python 3.11+（Windows/macOS/Linux 均可）
- git（可选，用来更新）
- 不需要 Termux，不需要 Rust

### 步骤

```bash
# 1. 克隆项目（或直接下载 zip 解压）
git clone https://github.com/xysy92ds/ai-companion.git ~/ai-companion
cd ~/ai-companion

# 2. 安装依赖（Windows 用 python -m pip）
pip install -r requirements.txt
# 或 python -m pip install -r requirements.txt

# 3. 启动
# Linux/macOS:
chmod +x run.sh
./run.sh

# Windows (PowerShell):
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### PC 端常见问题

**Q: Windows 上 `pip install` 报错找不到 Rust**

> 确保 requirements.txt 中是 `pydantic==1.10.26`，不是 v2。v2 才需要 Rust，本项目使用 v1。

**Q: Windows 上 `run.sh` 无法运行**

> `run.sh` 是 Bash 脚本，Windows 没有 Bash。三种解决方案：
> 1. 安装 Git Bash，在 Git Bash 中运行 `./run.sh`
> 2. 直接用 PowerShell 运行 `python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`
> 3. 安装 WSL（Windows Subsystem for Linux），在 WSL 中运行 `./run.sh`

**Q: 局域网其他设备无法访问**

> 1. 确认启动时使用了 `--host 0.0.0.0`（不是 `127.0.0.1`）
> 2. Windows：防火墙 -> 允许 Python 通过（专用+公用）
> 3. 查看 PC IP：`ipconfig` (Win) / `ifconfig` (Mac/Linux)

**Q: Mac 上 `pip install` 报错 Permission denied**

> 使用 `--user` 参数：`pip install --user -r requirements.txt`
> 或创建虚拟环境：`python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`

---

## 配置指南

首次进入应用后，点击底部导航栏的 **设置**：

### 1. 切换语言

设置 -> 外观 -> 语言 -> 选择 "中文" 或 "English"

> 默认中文。切换后界面立即重新渲染，所有文本翻译为所选语言。

### 2. 配置聊天 AI API

设置 -> "聊天 AI 配置"：
- **Provider URL**: API 地址（如 `https://api.openai.com/v1`）
- **API Key**: 密钥
- **Model Name**: 模型名（如 `gpt-4o-mini`）
- **Temperature**: 0-2，越高越有创造性
- **Max Tokens**: 最大响应长度

点击 "保存配置" -> 状态徽章变为 "已配置"（绿色）

### 3. 配置嵌入 AI（知识库用，可选）

设置 -> "嵌入 AI 配置"：
- **Provider URL**: embedding API 地址
- **API Key**: embedding 专用密钥（可与聊天 AI 相同或不同）
- **Model Name**: 模型名（如 `text-embedding-3-small`）
- **Vector Dimensions**: 向量维度
- **Use for Memory Search**: 开启后记忆检索也使用向量搜索

### 4. 人格设定

设置 -> "人格设定"：
- **Name**: AI 的名字
- **Description**: 性格描述
- **Greeting**: 问候语
- **Tone**: 语气（友好/专业/俏皮/随意/正式）
- **Traits**: 特征标签（可添加多个）

### 5. 上传 AI 头像

设置 -> "AI 头像" -> "上传新头像" -> 选择图片 -> 拖拽调整位置 -> +/- 缩放 -> "保存"

### 6. 切换主题

设置 -> 外观 -> 选择主题：
- **Midnight** (午夜): 深紫色暗色主题（默认）
- **Ocean** (海洋): 蓝绿色海洋风格
- **Sakura** (樱花): 暖粉色柔和风格
- **Light** (明亮): 干净亮色主题

### 7. 智能终端工具开关

设置 -> "智能终端工具"：每个工具可独立开关：
- Bilibili Search: 搜索 B 站视频
- Web Search: 搜索网页
- Find Files: 查找手机文件
- Install Package: 安装软件包
- Fetch Webpage: 抓取网页内容

---

## 使用指南

### 聊天

- 底部导航 "聊天" -> 输入框输入消息 -> 发送
- 支持 Enter 发送，Shift+Enter 换行
- AI 回复流式输出（逐字显示）

### 记忆系统

底部导航 "记忆" -> 4 个标签页：

1. **记忆**：查看/添加/删除记忆，查看遗忘曲线，回忆记忆
2. **人物**：添加人物，查看人物关系图
3. **日程**：添加每日日程，勾选完成
4. **统计**：记忆统计，AI 记忆整理

### 知识库

1. 底部导航 "知识库" -> "上传文档" 区域 -> 选择 txt/md/pdf 文件
2. 系统自动解析、分块、生成向量嵌入
3. 搜索框输入查询 -> 语义检索最相关内容
4. 显示匹配度百分比和来源文档

### 智能终端

底部导航 "终端" -> 两种模式：

**AI Smart 模式：** 用自然语言描述需求，AI 自动生成并执行命令。
- "帮我搜索B站上关于AI教程的视频"
- "查找手机里的PDF文件"
- "安装 ffmpeg"
- "帮我看看 https://example.com 这个网页"

**Manual 模式：** 直接输入 Shell 命令执行。

---

## 从旧版本升级

### 从 v2 升级到 v3

1. 停止当前服务（终端按 `Ctrl+C`）
2. 获取最新代码：
   ```bash
   cd ~/ai-companion
   git pull origin main
   ```
   或解压新的 tar.gz 覆盖：
   ```bash
   tar xzf ~/storage/shared/Download/ai-companion-v3.tar.gz -C ~/
   ```
3. 重新安装依赖（版本已更新）：
   ```bash
   pip install -r requirements.txt
   ```
4. 重启：
   ```bash
   ./run.sh
   ```

> **注意：** 升级后数据库自动迁移，原有数据不会丢失。

> **如果你之前遇到了 pydantic 版本冲突：**
> ```bash
> pip uninstall -y fastapi starlette pydantic pydantic-core
> rm -rf /data/data/com.termux/files/usr/lib/python3.14/site-packages/fastapi*
> rm -rf /data/data/com.termux/files/usr/lib/python3.14/site-packages/starlette*
> rm -rf /data/data/com.termux/files/usr/lib/python3.14/site-packages/pydantic*
> pip install --no-cache-dir -r requirements.txt
> ```

---

## 推送到 GitHub

如果你修改了代码想推送到 GitHub：

```bash
cd ~/ai-companion

# 查看改了什么
git status

# 添加所有更改
git add -A

# 提交
git commit -m "update: describe what you changed"

# 推送
git push origin main
```

> **注意：** 推送时可能需要输入 GitHub 用户名和 Token（不是密码）。Token 在 GitHub -> Settings -> Developer settings -> Personal access tokens 中生成。

---

## 打包成 APK

### 前提条件
- 需要有 HTTPS 的服务器（或 ngrok 隧道暴露）

### 使用 ngrok 暴露 HTTPS

```bash
# PC 上安装 ngrok
ngrok http 8000
# 获得 https://abc123.ngrok.io
```

### 使用 Bubblewrap 打包

```bash
# 安装 Node.js
pkg install -y nodejs

# 安装 Bubblewrap
npm install -g @bubblewrap/cli

# 初始化（用你的 HTTPS URL）
bubblewrap init --manifest https://abc123.ngrok.io/static/manifest.json

# 构建 APK
bubblewrap build

# 安装
termux-open app-release-signed.apk
```

---

## 常见问题汇总

### Q: `pkg install` 卡在 `[Y/n]` 提示

在命令前加 `-y` 参数：`pkg install -y 包名`

### Q: `pip install` 卡在 pydantic-core 编译

Python 3.14 + PyO3 0.22 不兼容。项目已锁定 pydantic v1，不需要 v2。确保 requirements.txt 中是 `pydantic==1.10.26`。

### Q: 设置了 `ANDROID_API_LEVEL` 和 `PYO3_USE_ABI3_FORWARD_COMPATIBILITY` 还是不行

这些环境变量对 Python 3.14 + PyO3 0.22 无效，不要浪费时间尝试。直接使用 pydantic v1。

### Q: FastAPI 启动报错 `unable to infer type`

FastAPI 0.103+ 使用了 pydantic v2 写法。降到 FastAPI 0.95.2：`pip install fastapi==0.95.2`

### Q: `run.sh` 每次启动都重新安装依赖

v3 已修复此问题。run.sh 现在只在检测到依赖缺失时才安装。如果你仍在用旧版 run.sh，请更新。

### Q: 误删了 `ai-companion` 目录，git 仓库也没了

不要执行 `rm -rf ai-companion`！如果误删了，重新解压 tar.gz 或 `git clone` 即可。

### Q: 智能终端执行失败

确保聊天 AI 已配置（Provider URL + API Key + Model Name）。智能终端使用聊天 AI 来生成命令。

### Q: 知识库搜索没有语义结果

确保嵌入 AI 已配置。未配置时回退为文本匹配搜索。

### Q: 头像上传后不更新

浏览器缓存导致。URL 已加时间戳参数，刷新页面即可。

### Q: PDF 上传失败

`pip install PyPDF2` 安装 PDF 解析库。

### Q: 某个工具被禁用后还能用吗

在设置 -> 智能终端工具 中重新开启即可。

### Q: 语言切换后部分文本未翻译

刷新页面。如果仍有问题，清除浏览器缓存后重新访问。

---

## 兼容的 API 提供商

### 聊天 AI

| 提供商 | URL | 模型 |
|:---|:---|:---|
| OpenAI | `https://api.openai.com/v1` | gpt-4o-mini, gpt-4o |
| DeepSeek | `https://api.deepseek.com/v1` | deepseek-chat |
| Moonshot | `https://api.moonshot.cn/v1` | moonshot-v1-8k |
| 智谱 | `https://open.bigmodel.cn/api/paas/v4` | glm-4-flash |
| 本地 Ollama | `http://localhost:11434/v1` | llama3.2 |

### 嵌入 AI

| 提供商 | URL | 模型 |
|:---|:---|:---|
| OpenAI | `https://api.openai.com/v1` | text-embedding-3-small |
| 智谱 | `https://open.bigmodel.cn/api/paas/v4` | embedding-3 |
| 本地 Ollama | `http://localhost:11434/v1` | nomic-embed-text |

---

## 数据库表结构（9张表）

| 表名 | 用途 |
|:---|:---|
| configs | API配置、人格、主题、工具开关、语言偏好（JSON键值对） |
| conversations | 聊天消息历史 |
| memories | 记忆条目（含SM-2遗忘曲线参数） |
| persons | 人物信息（关系图节点） |
| relationships | 人物关系（关系图边） |
| schedules | 每日日程 |
| commands | 命令执行历史（含source字段区分手动/AI） |
| kb_documents | 知识库文档元数据 |
| kb_chunks | 文本分块及向量嵌入 |
