import type { Client } from "@icqqjs/icqq";
import { Actions, type IpcRequest, type IpcResponse } from "./protocol.js";
import { parseMessage, stringifyMessage } from "@/lib/parse-message.js";
import fs from "node:fs/promises";

type Handler = (
  client: Client,
  params: Record<string, unknown>,
) => Promise<unknown>;

/** Extract group_id from params (accepts both group_id and gid) */
function gid(p: Record<string, unknown>): number {
  return Number(p.group_id ?? p.gid);
}
/** Extract user_id from params (accepts both user_id and uid) */
function uid(p: Record<string, unknown>): number {
  return Number(p.user_id ?? p.uid);
}
/** Extract message_id from params */
function msgid(p: Record<string, unknown>): string {
  return (p.message_id ?? p.msgid) as string;
}

const handlers: Record<string, Handler> = {
  // ── 基础 ──
  [Actions.PING]: async () => ({ pong: true, time: Date.now() }),

  [Actions.GET_STATUS]: async (client) => ({
    uin: client.uin,
    nickname: client.nickname,
    online: client.isOnline(),
    sex: client.sex,
    age: client.age,
    friendCount: client.fl.size,
    groupCount: client.gl.size,
  }),

  [Actions.GET_SELF_PROFILE]: async (client) => ({
    uin: client.uin,
    nickname: client.nickname,
    sex: client.sex,
    age: client.age,
    friendCount: client.fl.size,
    groupCount: client.gl.size,
    blacklistCount: client.blacklist.size,
  }),

  // ── 列表 ──
  [Actions.LIST_FRIENDS]: async (client) =>
    [...client.fl.values()].map((f) => ({
      user_id: f.user_id,
      nickname: f.nickname,
      remark: f.remark,
      sex: f.sex,
      class_id: f.class_id,
    })),

  [Actions.LIST_GROUPS]: async (client) =>
    [...client.gl.values()].map((g) => ({
      group_id: g.group_id,
      group_name: g.group_name,
      member_count: g.member_count,
      max_member_count: g.max_member_count,
      owner_id: g.owner_id,
    })),

  [Actions.LIST_GROUP_MEMBERS]: async (client, params) => {
    const g = gid(params);
    const members = await client.pickGroup(g).getMemberMap();
    return [...members.values()].map((m) => ({
      user_id: m.user_id,
      nickname: m.nickname,
      card: m.card,
      role: m.role,
      title: m.title,
      join_time: m.join_time,
      last_sent_time: m.last_sent_time,
      level: m.level,
      shutup_time: m.shutup_time,
    }));
  },

  [Actions.LIST_BLACKLIST]: async (client) =>
    [...client.blacklist].map((uin) => ({ user_id: uin })),

  [Actions.LIST_FRIEND_CLASSES]: async (client) =>
    [...client.classes.entries()].map(([id, name]) => ({ id, name })),

  // ── 查看信息 ──
  [Actions.GET_FRIEND_INFO]: async (client, params) => {
    const u = uid(params);
    const info = client.fl.get(u);
    if (info) return info;
    return await client.pickUser(u).getSimpleInfo();
  },

  [Actions.GET_GROUP_INFO]: async (client, params) => {
    return await client.getGroupInfo(gid(params), true);
  },

  [Actions.GET_GROUP_MEMBER_INFO]: async (client, params) => {
    return await client.getGroupMemberInfo(gid(params), uid(params), true);
  },

  [Actions.GET_STRANGER_INFO]: async (client, params) => {
    return await client.getStrangerInfo(uid(params));
  },

  // ── 消息发送 ──
  [Actions.SEND_PRIVATE_MSG]: async (client, params) => {
    const message = parseMessage(params.message as string);
    return await client.pickFriend(uid(params)).sendMsg(message);
  },

  [Actions.SEND_GROUP_MSG]: async (client, params) => {
    const message = parseMessage(params.message as string);
    return await client.pickGroup(gid(params)).sendMsg(message);
  },

  // ── 消息操作 ──
  [Actions.RECALL_MSG]: async (client, params) => {
    return await client.deleteMsg(msgid(params));
  },

  [Actions.GET_MSG]: async (client, params) => {
    return await client.getMsg(msgid(params));
  },

  [Actions.HISTORY_PRIVATE]: async (client, params) => {
    const count = params.count ? Number(params.count) : 20;
    const time = params.time ? Number(params.time) : undefined;
    const msgs = await client.pickUser(uid(params)).getChatHistory(time, count);
    return msgs.map((m) => ({
      message_id: m.message_id,
      user_id: m.user_id,
      from_id: m.from_id,
      to_id: m.to_id,
      nickname: m.sender?.nickname ?? String(m.user_id),
      raw_message: stringifyMessage(m.message),
      time: m.time,
    }));
  },

  [Actions.HISTORY_GROUP]: async (client, params) => {
    const count = params.count ? Number(params.count) : 20;
    const seq = params.seq ? Number(params.seq) : undefined;
    const msgs = await client.pickGroup(gid(params)).getChatHistory(seq, count);
    return msgs.map((m) => ({
      message_id: m.message_id,
      user_id: m.user_id,
      group_id: m.group_id,
      nickname: m.sender?.nickname ?? String(m.user_id),
      card: (m.sender as any)?.card ?? "",
      raw_message: stringifyMessage(m.message),
      time: m.time,
    }));
  },

  [Actions.MARK_READ]: async (client, params) => {
    await client.reportReaded(msgid(params));
    return { ok: true };
  },

  [Actions.DELETE_MSG]: async (client, params) => {
    return await client.deleteMsg(msgid(params));
  },

  // ── 个人设置 ──
  [Actions.SET_NICKNAME]: async (client, params) => {
    return await client.setNickname(params.nickname as string);
  },

  [Actions.SET_GENDER]: async (client, params) => {
    return await client.setGender(Number(params.gender) as 0 | 1 | 2);
  },

  [Actions.SET_BIRTHDAY]: async (client, params) => {
    return await client.setBirthday(params.birthday as string);
  },

  [Actions.SET_SIGNATURE]: async (client, params) => {
    return await client.setSignature(params.signature as string);
  },

  [Actions.SET_DESCRIPTION]: async (client, params) => {
    return await client.setDescription(params.description as string);
  },

  [Actions.SET_AVATAR]: async (client, params) => {
    const filePath = params.file as string;
    const buf = await fs.readFile(filePath);
    await client.setAvatar(buf);
    return { ok: true };
  },

  [Actions.SET_ONLINE_STATUS]: async (client, params) => {
    return await client.setOnlineStatus(Number(params.status));
  },

  // ── 群设置 ──
  [Actions.SET_GROUP_NAME]: async (client, params) => {
    return await client.setGroupName(gid(params), params.name as string);
  },

  [Actions.SET_GROUP_AVATAR]: async (client, params) => {
    const filePath = params.file as string;
    const buf = await fs.readFile(filePath);
    await client.setGroupPortrait(gid(params), buf);
    return { ok: true };
  },

  [Actions.SET_GROUP_CARD]: async (client, params) => {
    return await client.setGroupCard(gid(params), uid(params), params.card as string);
  },

  [Actions.SET_GROUP_TITLE]: async (client, params) => {
    const duration = params.duration ? Number(params.duration) : undefined;
    return await client.setGroupSpecialTitle(
      gid(params),
      uid(params),
      params.title as string,
      duration,
    );
  },

  [Actions.SET_GROUP_ADMIN]: async (client, params) => {
    const enable = params.enable !== false;
    return await client.setGroupAdmin(gid(params), uid(params), enable);
  },

  [Actions.SET_GROUP_REMARK]: async (client, params) => {
    await client.pickGroup(gid(params)).setRemark(params.remark as string);
    return { ok: true };
  },

  // ── 群管理 ──
  [Actions.GROUP_MUTE]: async (client, params) => {
    const duration = params.duration !== undefined ? Number(params.duration) : 600;
    return await client.setGroupBan(gid(params), uid(params), duration);
  },

  [Actions.GROUP_MUTE_ALL]: async (client, params) => {
    const enable = params.enable !== false;
    return await client.setGroupWholeBan(gid(params), enable);
  },

  [Actions.GROUP_KICK]: async (client, params) => {
    const block = params.block === true;
    const msg = (params.message as string) ?? "";
    return await client.setGroupKick(gid(params), uid(params), block, msg);
  },

  [Actions.GROUP_QUIT]: async (client, params) => {
    return await client.pickGroup(gid(params)).quit();
  },

  [Actions.GROUP_INVITE]: async (client, params) => {
    return await client.inviteFriend(gid(params), uid(params));
  },

  [Actions.GROUP_POKE]: async (client, params) => {
    return await client.sendGroupPoke(gid(params), uid(params));
  },

  [Actions.GROUP_ANNOUNCE]: async (client, params) => {
    return await client.sendGroupNotice(gid(params), params.content as string);
  },

  [Actions.GROUP_SIGN]: async (client, params) => {
    return await client.sendGroupSign(gid(params));
  },

  [Actions.GROUP_ESSENCE_ADD]: async (client, params) => {
    return await client.setEssenceMessage(msgid(params));
  },

  [Actions.GROUP_ESSENCE_REMOVE]: async (client, params) => {
    return await client.removeEssenceMessage(msgid(params));
  },

  [Actions.GROUP_ALLOW_ANONY]: async (client, params) => {
    const enable = params.enable !== false;
    return await client.setGroupAnonymous(gid(params), enable);
  },

  [Actions.GROUP_MUTED_LIST]: async (client, params) => {
    return await client.pickGroup(gid(params)).getMuteMemberList();
  },

  [Actions.GROUP_AT_ALL_REMAIN]: async (client, params) => {
    return await client.pickGroup(gid(params)).getAtAllRemainder();
  },

  // ── 好友操作 ──
  [Actions.FRIEND_POKE]: async (client, params) => {
    return await client.pickFriend(uid(params)).poke();
  },

  [Actions.FRIEND_LIKE]: async (client, params) => {
    const times = params.times ? Number(params.times) : 1;
    return await client.sendLike(uid(params), times);
  },

  [Actions.FRIEND_DELETE]: async (client, params) => {
    const block = params.block === true;
    return await client.deleteFriend(uid(params), block);
  },

  [Actions.FRIEND_REMARK]: async (client, params) => {
    await client.pickFriend(uid(params)).setRemark(params.remark as string);
    return { ok: true };
  },

  [Actions.FRIEND_CLASS]: async (client, params) => {
    const classId = Number(params.class_id);
    await client.pickFriend(uid(params)).setClass(classId);
    return { ok: true };
  },

  // ── 系统消息/请求 ──
  [Actions.GET_SYSTEM_MSG]: async (client) => {
    const msgs = await client.getSystemMsg();
    // getSystemMsg() may return an array or { friend: [], group: [] }
    let raw: any[];
    if (Array.isArray(msgs)) {
      raw = msgs;
    } else if (msgs && typeof msgs === "object") {
      const obj = msgs as Record<string, unknown>;
      const friend = Array.isArray(obj.friend) ? obj.friend : [];
      const group = Array.isArray(obj.group) ? obj.group : [];
      raw = [...friend, ...group];
    } else {
      raw = [];
    }
    const all = raw.map((m: any) => ({
      type: m.request_type ?? m.sub_type ?? "unknown",
      user_id: m.user_id,
      nickname: m.nickname,
      group_id: m.group_id,
      group_name: m.group_name,
      comment: m.comment,
      flag: m.flag,
      seq: m.seq,
      time: m.time,
    }));
    return {
      friendRequests: all.filter((m) => m.type === "friend" || (!m.group_id && m.user_id)),
      groupRequests: all.filter((m) => m.type === "group" || m.group_id),
    };
  },

  [Actions.HANDLE_FRIEND_REQUEST]: async (client, params) => {
    const flag = params.flag as string;
    const approve = params.approve !== false;
    const remark = (params.remark as string) ?? "";
    const block = params.block === true;
    return await client.setFriendAddRequest(flag, approve, remark, block);
  },

  [Actions.HANDLE_GROUP_REQUEST]: async (client, params) => {
    const flag = params.flag as string;
    const approve = params.approve !== false;
    const reason = (params.reason as string) ?? "";
    const block = params.block === true;
    return await client.setGroupAddRequest(flag, approve, reason, block);
  },

  // ── 好友分组 ──
  [Actions.ADD_FRIEND_CLASS]: async (client, params) => {
    await client.addClass(params.name as string);
    return { ok: true };
  },

  [Actions.DELETE_FRIEND_CLASS]: async (client, params) => {
    await client.deleteClass(Number(params.id));
    return { ok: true };
  },

  [Actions.RENAME_FRIEND_CLASS]: async (client, params) => {
    await client.renameClass(Number(params.id), params.name as string);
    return { ok: true };
  },

  // ── 群文件系统 ──
  [Actions.GFS_LIST]: async (client, params) => {
    const g = gid(params);
    const pid = (params.pid as string) ?? "/";
    const gfs = client.acquireGfs(g);
    const files = await gfs.dir(pid);
    return files.map((f: any) => ({
      fid: f.fid,
      name: f.name,
      pid: f.pid,
      is_dir: f.is_dir ?? !f.md5,
      size: f.size,
      upload_time: f.upload_time ?? f.create_time,
      modify_time: f.modify_time,
      uploader: f.user_id,
      file_count: f.file_count,
    }));
  },

  [Actions.GFS_INFO]: async (client, params) => {
    const gfs = client.acquireGfs(gid(params));
    return await gfs.df();
  },

  [Actions.GFS_MKDIR]: async (client, params) => {
    const gfs = client.acquireGfs(gid(params));
    return await gfs.mkdir(params.name as string);
  },

  [Actions.GFS_DELETE]: async (client, params) => {
    const fid = params.fid as string;
    const gfs = client.acquireGfs(gid(params));
    await gfs.rm(fid);
    return { ok: true };
  },

  [Actions.GFS_RENAME]: async (client, params) => {
    const fid = params.fid as string;
    const name = params.name as string;
    const gfs = client.acquireGfs(gid(params));
    await gfs.rename(fid, name);
    return { ok: true };
  },

  [Actions.GFS_STAT]: async (client, params) => {
    const fid = params.fid as string;
    const gfs = client.acquireGfs(gid(params));
    return await gfs.stat(fid);
  },

  // ── 其他 ──
  [Actions.IMAGE_OCR]: async (client, params) => {
    const filePath = params.file as string;
    const buf = await fs.readFile(filePath);
    return await client.imageOcr(buf);
  },

  [Actions.RELOAD_FRIEND_LIST]: async (client) => {
    await client.reloadFriendList();
    return { ok: true, friendCount: client.fl.size };
  },

  [Actions.RELOAD_GROUP_LIST]: async (client) => {
    await client.reloadGroupList();
    return { ok: true, groupCount: client.gl.size };
  },

  // ── 文件传输 ──
  [Actions.SEND_PRIVATE_FILE]: async (client, params) => {
    const filePath = params.file as string;
    const u = uid(params);
    return await client.pickFriend(u).sendFile(filePath);
  },

  [Actions.SEND_GROUP_FILE]: async (client, params) => {
    const filePath = params.file as string;
    const g = gid(params);
    const pid = (params.pid as string) ?? "/";
    const name = (params.name as string) ?? undefined;
    return await client.pickGroup(g).sendFile(filePath, pid, name);
  },
};

export async function handleRequest(
  client: Client,
  req: IpcRequest,
): Promise<IpcResponse> {
  const handler = handlers[req.action];
  if (!handler) {
    return { id: req.id, ok: false, error: `未知操作: ${req.action}` };
  }
  try {
    const data = await handler(client, req.params);
    return { id: req.id, ok: true, data };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : JSON.stringify(err) ?? String(err);
    return {
      id: req.id,
      ok: false,
      error: message,
    };
  }
}
