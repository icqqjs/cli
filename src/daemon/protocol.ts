export type IpcRequest = {
  id: string;
  action: string;
  params: Record<string, unknown>;
};

export type IpcResponse = {
  id: string;
  ok: boolean;
  data?: unknown;
  error?: string;
};

export type IpcEvent = {
  id: string;
  event: string;
  data: unknown;
};

export type IpcMessage = IpcResponse | IpcEvent;

export const Actions = {
  PING: "ping",

  // 列表
  LIST_FRIENDS: "list_friends",
  LIST_GROUPS: "list_groups",
  LIST_GROUP_MEMBERS: "list_group_members",
  LIST_BLACKLIST: "list_blacklist",
  LIST_FRIEND_CLASSES: "list_friend_classes",

  // 查看信息
  GET_FRIEND_INFO: "get_friend_info",
  GET_GROUP_INFO: "get_group_info",
  GET_GROUP_MEMBER_INFO: "get_group_member_info",
  GET_STRANGER_INFO: "get_stranger_info",
  GET_STATUS: "get_status",
  GET_SELF_PROFILE: "get_self_profile",

  // 发送消息
  SEND_PRIVATE_MSG: "send_private_msg",
  SEND_GROUP_MSG: "send_group_msg",

  // 消息操作
  RECALL_MSG: "recall_msg",
  GET_MSG: "get_msg",
  HISTORY_PRIVATE: "history_private",
  HISTORY_GROUP: "history_group",
  GET_PRIVATE_MSG_HISTORY: "history_private",
  GET_GROUP_MSG_HISTORY: "history_group",
  MARK_READ: "mark_read",
  DELETE_MSG: "delete_msg",

  // 个人设置
  SET_NICKNAME: "set_nickname",
  SET_GENDER: "set_gender",
  SET_BIRTHDAY: "set_birthday",
  SET_SIGNATURE: "set_signature",
  SET_DESCRIPTION: "set_description",
  SET_AVATAR: "set_avatar",
  SET_ONLINE_STATUS: "set_online_status",

  // 群设置
  SET_GROUP_NAME: "set_group_name",
  SET_GROUP_AVATAR: "set_group_avatar",
  SET_GROUP_CARD: "set_group_card",
  SET_GROUP_TITLE: "set_group_title",
  SET_GROUP_ADMIN: "set_group_admin",
  SET_GROUP_REMARK: "set_group_remark",

  // 群管理
  GROUP_MUTE: "group_mute",
  GROUP_MUTE_MEMBER: "group_mute",
  GROUP_MUTE_ALL: "group_mute_all",
  GROUP_KICK: "group_kick",
  GROUP_QUIT: "group_quit",
  GROUP_INVITE: "group_invite",
  GROUP_POKE: "group_poke",
  GROUP_ANNOUNCE: "group_announce",
  GROUP_SIGN: "group_sign",
  GROUP_ESSENCE_ADD: "group_essence_add",
  GROUP_ESSENCE_REMOVE: "group_essence_remove",
  GROUP_SET_ESSENCE: "group_essence_add",
  GROUP_REMOVE_ESSENCE: "group_essence_remove",
  GROUP_ALLOW_ANONY: "group_allow_anony",
  GROUP_MUTED_LIST: "group_muted_list",
  GROUP_AT_ALL_REMAIN: "group_at_all_remain",

  // 好友操作
  FRIEND_POKE: "friend_poke",
  FRIEND_LIKE: "friend_like",
  FRIEND_DELETE: "friend_delete",
  FRIEND_REMARK: "friend_remark",
  FRIEND_SET_REMARK: "friend_remark",
  FRIEND_CLASS: "friend_class",

  // 系统消息/请求
  GET_SYSTEM_MSG: "get_system_msg",
  HANDLE_FRIEND_REQUEST: "handle_friend_request",
  HANDLE_GROUP_REQUEST: "handle_group_request",

  // 好友分组
  ADD_FRIEND_CLASS: "add_friend_class",
  DELETE_FRIEND_CLASS: "delete_friend_class",
  RENAME_FRIEND_CLASS: "rename_friend_class",

  // 群文件系统
  GFS_LIST: "gfs_list",
  GFS_INFO: "gfs_info",
  GFS_MKDIR: "gfs_mkdir",
  GFS_DELETE: "gfs_delete",
  GFS_RENAME: "gfs_rename",
  GFS_STAT: "gfs_stat",

  // 其他功能
  IMAGE_OCR: "image_ocr",
  RELOAD_FRIEND_LIST: "reload_friend_list",
  RELOAD_GROUP_LIST: "reload_group_list",

  // 订阅
  SUBSCRIBE: "subscribe",
  UNSUBSCRIBE: "unsubscribe",

  // Webhook
  SET_WEBHOOK: "set_webhook",
  GET_WEBHOOK: "get_webhook",
} as const;
