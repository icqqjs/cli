# @icqqjs/cli

基于 [icqq](https://github.com/icqqjs/icqq) 的命令行 QQ 客户端，使用 React Ink 构建交互式终端 UI。

## 安装

```bash
npm install -g @icqqjs/cli
```

### 安装 icqq 核心依赖

CLI 的核心协议库 `@icqqjs/icqq` 托管在 GitHub Packages，首次使用需要额外安装：

```bash
# 一键安装（自动配置 .npmrc + 安装 icqq）
icqq setup
```

<details>
<summary>手动安装</summary>

1. 配置 npm scope：

```bash
echo '@icqqjs:registry=https://npm.pkg.github.com' >> ~/.npmrc
```

2. 登录 GitHub Packages（需要具有 `read:packages` 权限的 [Personal Access Token](https://github.com/settings/tokens/new)）：

```bash
npm login --scope=@icqqjs --auth-type=legacy --registry=https://npm.pkg.github.com
```

3. 安装：

```bash
npm install -g @icqqjs/icqq
```

</details>

## 快速开始

```bash
# 交互式登录
icqq login

# 快速重连（使用已保存的 token）
icqq login -r

# 指定账号快速重连
icqq login -q 12345 -r
```

## 多实例支持

通过 `-u` 全局参数或 `ICQQ_CURRENT_UIN` 环境变量指定操作的账号，默认使用 `currentUin`。

```bash
icqq -u 12345 profile
ICQQ_CURRENT_UIN=12345 icqq friend list
```

## 命令一览

### 账号

| 命令 | 说明 |
|------|------|
| `icqq login` | 登录 QQ 账号并启动守护进程 |
| `icqq login -r` | 使用已保存 token 快速重连 |
| `icqq status` | 查看所有守护进程状态 |
| `icqq stop` | 停止守护进程 |
| `icqq switch [uin]` | 切换当前操作的账号 |
| `icqq profile` | 查看个人资料 |
| `icqq requests` | 查看待处理的好友/群请求 |

### 配置

| 命令 | 说明 |
|------|------|
| `icqq config get` | 查看所有配置 |
| `icqq config get <key>` | 查看指定配置项 |
| `icqq config set <key> <value>` | 设置配置项 |

### 消息

| 命令 | 说明 |
|------|------|
| `icqq friend send <qq> <message>` | 发送私聊消息 |
| `icqq group send <gid> <message>` | 发送群消息 |
| `icqq friend chat <qq>` | 进入好友交互聊天 |
| `icqq group chat <gid>` | 进入群交互聊天 |
| `icqq friend chat history <qq>` | 查看好友聊天记录 |
| `icqq group chat history <gid>` | 查看群聊天记录 |
| `icqq recall <msgid>` | 撤回消息 |
| `icqq msg get <msgid>` | 查看消息详情 |
| `icqq msg mark-read <msgid>` | 标记消息已读 |
| `icqq forward get <msgid>` | 查看合并转发消息 |

消息支持 CQ 码语法：

```
[face:id]    表情
[image:path] 图片
[at:uid]     @某人
[at:all]     @全体成员
[dice]       骰子
[rps]        猜拳
```

### 好友

| 命令 | 说明 |
|------|------|
| `icqq friend list` | 好友列表 |
| `icqq friend view <qq>` | 查看好友资料 |
| `icqq friend add <qq>` | 添加好友（可通过群） |
| `icqq friend delete <qq>` | 删除好友 |
| `icqq friend like <qq>` | 点赞 |
| `icqq friend poke <qq>` | 戳一戳 |
| `icqq friend remark <qq> <name>` | 设置好友备注 |
| `icqq friend avatar-url <qq>` | 获取好友头像 URL |
| `icqq friend send-file <qq> <file>` | 发送文件给好友 |
| `icqq friend file-info <qq> <fid>` | 获取私聊文件信息 |
| `icqq friend file-url <qq> <fid>` | 获取私聊文件下载链接 |
| `icqq friend recall-file <qq> <fid>` | 撤回发送给好友的文件 |

### 好友分组

| 命令 | 说明 |
|------|------|
| `icqq friend class list` | 查看好友分组 |
| `icqq friend class add <name>` | 创建好友分组 |
| `icqq friend class delete <id>` | 删除好友分组 |
| `icqq friend class rename <id> <name>` | 重命名好友分组 |
| `icqq friend class set <qq> <id>` | 移动好友到分组 |

### 群

| 命令 | 说明 |
|------|------|
| `icqq group list` | 群列表 |
| `icqq group view <gid>` | 查看群信息 |
| `icqq group member list <gid>` | 群成员列表 |
| `icqq group member view <gid> <qq>` | 查看群成员资料 |
| `icqq group invite <gid> <qq>` | 邀请入群 |
| `icqq group kick <gid> <qq>` | 踢出群成员 |
| `icqq group mute <gid> <qq> [duration]` | 禁言 |
| `icqq group mute-all <gid>` | 全体禁言 |
| `icqq group mute-anon <gid> <flag>` | 禁言匿名成员 |
| `icqq group muted-list <gid>` | 查看禁言列表 |
| `icqq group poke <gid> <qq>` | 戳一戳 |
| `icqq group quit <gid>` | 退群 |
| `icqq group sign <gid>` | 群签到 |
| `icqq group announce <gid> <content>` | 发群公告 |
| `icqq group avatar-url <gid>` | 获取群头像 URL |
| `icqq group anon-info <gid>` | 查看群匿名信息 |
| `icqq group at-all-remain <gid>` | 查看 @全体 剩余次数 |
| `icqq group share <gid>` | 获取群分享链接 |
| `icqq group screen-member <gid> <qq>` | 屏蔽/取消屏蔽群成员消息 |
| `icqq group reaction add <msgid> <emoji>` | 消息表态 |
| `icqq group reaction remove <msgid> <emoji>` | 取消表态 |

### 群设置

| 命令 | 说明 |
|------|------|
| `icqq group set name <gid> <name>` | 修改群名 |
| `icqq group set avatar <gid> <file>` | 修改群头像 |
| `icqq group set card <gid> <qq> <card>` | 修改群名片 |
| `icqq group set title <gid> <qq> <title>` | 设置群头衔 |
| `icqq group set admin <gid> <qq>` | 设置/取消管理员 |
| `icqq group set remark <gid> <name>` | 修改群备注 |
| `icqq group set anonymous <gid>` | 开关匿名 |
| `icqq group set join-type <gid> <type>` | 设置加群方式 |
| `icqq group set rate-limit <gid> <limit>` | 设置发言频率限制 |

### 群精华 / 群文件

| 命令 | 说明 |
|------|------|
| `icqq group essence add <msgid>` | 添加精华消息 |
| `icqq group essence remove <msgid>` | 移除精华消息 |
| `icqq group fs list <gid>` | 群文件列表 |
| `icqq group fs info <gid>` | 查看群文件系统信息 |
| `icqq group fs stat <gid> <fid>` | 查看文件/目录详情 |
| `icqq group fs mkdir <gid> <name>` | 创建文件夹 |
| `icqq group fs delete <gid> <fid>` | 删除文件 |
| `icqq group fs rename <gid> <fid> <name>` | 重命名文件 |
| `icqq group fs upload <gid> <file>` | 上传文件 |
| `icqq group fs download <gid> <fid>` | 获取下载链接 |
| `icqq group fs move <gid> <fid> <pid>` | 移动文件 |
| `icqq group fs forward <gid> <fid> <target_gid>` | 转发到其他群 |
| `icqq group fs forward-offline <gid> <fid>` | 转为离线文件 |

### 个人设置

| 命令 | 说明 |
|------|------|
| `icqq set nickname <name>` | 修改昵称 |
| `icqq set avatar <file>` | 修改头像 |
| `icqq set signature <text>` | 修改签名 |
| `icqq set gender <gender>` | 修改性别 |
| `icqq set birthday <date>` | 修改生日 |
| `icqq set description <text>` | 修改简介 |
| `icqq set online-status <status>` | 修改在线状态 |

### 其他

| 命令 | 说明 |
|------|------|
| `icqq blacklist` | 黑名单列表 |
| `icqq ocr <file>` | 图片文字识别 |
| `icqq request accept <flag>` | 接受请求 |
| `icqq request reject <flag>` | 拒绝请求 |
| `icqq webhook` | 查看 Webhook 配置 |
| `icqq webhook set <url>` | 设置 Webhook 推送地址 |
| `icqq webhook off` | 关闭 Webhook 推送 |
| `icqq notify` | 查看通知状态 |
| `icqq notify on` | 开启系统通知 |
| `icqq notify off` | 关闭系统通知 |
| `icqq convert uid <qq>` | QQ 号转 UID |
| `icqq convert uin <uid>` | UID 转 QQ 号 |
| `icqq get client-key` | 获取 ClientKey |
| `icqq get pskey` | 获取 PSKey |
| `icqq get video-url <vid>` | 获取短视频下载链接 |
| `icqq stranger view <qq>` | 查看陌生人资料 |
| `icqq stranger status <qq>` | 查看陌生人在线状态 |
| `icqq stranger add-setting <qq>` | 查看加好友设置 |
| `icqq stamp list` | 查看漫游表情列表 |
| `icqq stamp delete` | 删除漫游表情 |
| `icqq cache clean` | 清理缓存 |
| `icqq reload friends` | 重载好友列表 |
| `icqq reload groups` | 重载群列表 |
| `icqq reload blacklist` | 重载黑名单 |
| `icqq reload guilds` | 重载频道列表 |
| `icqq reload strangers` | 重载陌生人列表 |
| `icqq completion [shell]` | 生成 Shell 自动补全脚本 |

### 频道（Guild）

| 命令 | 说明 |
|------|------|
| `icqq guild list` | 频道列表 |
| `icqq guild info <guild_id>` | 查看频道信息 |
| `icqq guild members <guild_id>` | 频道成员列表 |
| `icqq guild channel list <guild_id>` | 子频道列表 |
| `icqq guild channel send <guild_id> <channel_id> <message>` | 发送子频道消息 |
| `icqq guild channel chat <guild_id> <channel_id>` | 进入子频道聊天模式 |
| `icqq guild channel recall <guild_id> <channel_id> <seq>` | 撤回子频道消息 |
| `icqq guild channel share <guild_id> <channel_id> <url> <title>` | 发送互联分享 |
| `icqq guild channel forum-url <guild_id> <channel_id> <forum_id>` | 获取帖子 URL |

## 架构

```
┌──────────────────────────────────────────────────────┐
│                     icqq CLI                         │
│  ┌────────────┐  ┌────────────┐  ┌───────────────┐  │
│  │  Pastel     │  │  React Ink │  │  IPC Client   │  │
│  │  文件路由   │─▸│  终端 UI   │  │  (ipc-client) │  │
│  └────────────┘  └────────────┘  └───────┬───────┘  │
└──────────────────────────────────────────┬───────────┘
                                           │ Unix Socket
                                           │ + Token 认证
┌──────────────────────────────────────────┴───────────┐
│                   守护进程 (Daemon)                    │
│  ┌────────────┐  ┌────────────┐  ┌───────────────┐  │
│  │  icqq      │  │  IPC       │  │  Webhook      │  │
│  │  Client    │◂─│  Server    │─▸│  推送          │  │
│  │  (QQ协议)  │  │  (server)  │  │  (HTTP POST)  │  │
│  └─────┬──────┘  └────────────┘  └───────────────┘  │
└────────┼─────────────────────────────────────────────┘
         │
         ▼
   腾讯 QQ 服务器
```

- **CLI 层**：基于 [Pastel](https://github.com/nickstefan/pastel) 文件系统路由，`src/commands/` 目录结构即命令结构；React Ink 渲染终端 UI
- **IPC 通信**：CLI 与守护进程通过 `~/.icqq/<uin>/daemon.sock` Unix Socket 通信，首次连接需 Token 认证
- **守护进程**：登录后在后台运行，管理 icqq 客户端实例，自动断线重连（指数退避，最多 5 次）
- **Webhook**：可选配置，守护进程将消息事件 POST 到指定 URL
- **日志轮转**：守护进程日志 > 5MB 自动轮转

## 开发

```bash
pnpm install
pnpm build
npm link         # 本地全局注册 icqq 命令
```

### 发版流程

使用 [Changesets](https://github.com/changesets/changesets) 管理版本：

```bash
pnpm changeset        # 添加变更描述
git add . && git commit
git push              # 推送后 GitHub Actions 自动创建 Version PR
                      # 合并 Version PR 后自动发布到 GitHub Packages
```

## License

ISC
