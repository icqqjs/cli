# @icqqjs/cli

基于 [icqq](https://github.com/icqqjs/icqq) 的命令行 QQ 客户端，使用 React Ink 构建交互式终端 UI。

## 安装

### 1. 配置鉴权

由于包托管在 GitHub Packages，安装前需要先完成鉴权。

在你的项目根目录新建 `.npmrc`，写入：

```
@icqqjs:registry=https://npm.pkg.github.com
```

然后在命令行登录：

```bash
npm login --scope=@icqqjs --auth-type=legacy --registry=https://npm.pkg.github.com
```

根据提示输入：

| 字段 | 说明 |
|------|------|
| Username | 你的 GitHub 账号 |
| Password | 前往 https://github.com/settings/tokens/new 创建，Scopes 勾选 `read:packages` |
| Email | 你的公开邮箱地址 |

### 2. 安装

```bash
npm install -g @icqqjs/cli
```

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

通过 `-u` 全局参数或 `ICQQ_CURRENT_UIN` 环境变量指定操作的账号，默认使用 `defaultUin`。

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
| `icqq send private <qq> <message>` | 发送私聊消息 |
| `icqq send group <gid> <message>` | 发送群消息 |
| `icqq send temp <qq> <message> -g <gid>` | 发送临时消息 |
| `icqq friend chat <qq>` | 进入好友交互聊天 |
| `icqq group chat <gid>` | 进入群交互聊天 |
| `icqq friend chat history <qq>` | 查看好友聊天记录 |
| `icqq group chat history <gid>` | 查看群聊天记录 |
| `icqq recall <msgid>` | 撤回消息 |

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
| `icqq friend delete <qq>` | 删除好友 |
| `icqq friend like <qq>` | 点赞 |
| `icqq friend poke <qq>` | 戳一戳 |
| `icqq friend remark <qq> <name>` | 设置好友备注 |

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
| `icqq group poke <gid> <qq>` | 戳一戳 |
| `icqq group quit <gid>` | 退群 |
| `icqq group sign <gid>` | 群签到 |
| `icqq group announce <gid> <content>` | 发群公告 |

### 群设置

| 命令 | 说明 |
|------|------|
| `icqq group set name <gid> <name>` | 修改群名 |
| `icqq group set avatar <gid> <file>` | 修改群头像 |
| `icqq group set card <gid> <qq> <card>` | 修改群名片 |
| `icqq group set title <gid> <qq> <title>` | 设置群头衔 |
| `icqq group set admin <gid> <qq>` | 设置/取消管理员 |
| `icqq group set remark <gid> <name>` | 修改群备注 |

### 群精华 / 群文件

| 命令 | 说明 |
|------|------|
| `icqq group essence add <gid> <msgid>` | 添加精华消息 |
| `icqq group essence remove <gid> <msgid>` | 移除精华消息 |
| `icqq group fs list <gid>` | 群文件列表 |
| `icqq group fs info <gid> <fid>` | 文件详情 |
| `icqq group fs mkdir <gid> <name>` | 创建文件夹 |
| `icqq group fs delete <gid> <fid>` | 删除文件 |
| `icqq group fs rename <gid> <fid> <name>` | 重命名文件 |

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

## 架构

- **守护进程**：登录后在后台运行，通过 Unix Domain Socket（IPC）与 CLI 通信
- **Webhook**：可选配置，守护进程将消息事件 POST 到指定 URL
- **文件路由**：基于 [Pastel](https://github.com/nickstefan/pastel) 的文件系统路由，`src/commands/` 目录结构即命令结构

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
