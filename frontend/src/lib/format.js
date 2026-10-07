export const statusLabel = (s) =>
  ({
    processing: "调查中",
    completed: "已完成",
    failed: "失败",
    stopped: "已停止",
    pending: "等待处理",
    none: "未预处理",
    online: "在线",
    offline: "离线",
    accepted: "已加入",
    idle: "待命",
  })[s] ||
  s ||
  "待命";
export function duration(value = 0) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  return n >= 3600
    ? `${Math.floor(n / 3600)}:${String(Math.floor(n / 60) % 60).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`
    : `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}
export function seconds(value) {
  if (typeof value === "number") return value;
  const parts = String(value).split(":").map(Number);
  return parts.some((x) => !Number.isFinite(x) || x < 0)
    ? NaN
    : parts.reduce((total, x) => total * 60 + x, 0);
}
export const dateTime = (value) =>
  value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "—";
export const localISO = (value = Date.now()) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19);
};
export const toolLabel = (name) =>
  ({
    read_frames: "核验画面",
    read_frame_image: "查看画面",
    track_target: "追踪目标",
    search_face_tracks: "查找人脸",
    search_video_text: "核对文字",
    search_visual_semantics: "检索画面线索",
    search_visual_semantics_batch: "跨视频检索",
    search_objects: "查找目标",
    list_objects: "查看目标",
    get_video_metadata: "查看视频信息",
  })[name] || name;
const labels = {
  query: "检索内容",
  text: "文字",
  video_id: "视频编号",
  video_index: "视频编号",
  video_num: "视频编号",
  segment_id: "片段编号",
  time: "时间点",
  timestamp: "时间点",
  timestamp_sec: "时间（秒）",
  time_sec: "时间（秒）",
  start_time: "开始时间",
  end_time: "结束时间",
  target_id: "目标编号",
  track_id: "轨迹编号",
  object_type: "目标类别",
  limit: "数量",
  top_k: "候选数量",
  frames: "核验画面",
  times: "时间点",
  face_group_id: "人脸分组",
  description: "描述",
  relevance: "相关性",
  evidence_sufficiency: "证据充分度",
};
export function readableFields(value, prefix = "") {
  if (Array.isArray(value))
    return value.flatMap((v, i) => readableFields(v, `${prefix} ${i + 1}`));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) =>
      readableFields(
        v,
        `${prefix ? prefix + " · " : ""}${labels[k] || k.replaceAll("_", " ")}`,
      ),
    );
  return [{ label: prefix, value: value === null ? "—" : String(value) }];
}
export function coverageSegments(ranges, start, end) {
  const span = end - start;
  if (span <= 0) return [];
  return (ranges || [])
    .map((r) => ({
      start: Math.max(start, +new Date(r.start_time)),
      end: Math.min(end, +new Date(r.end_time)),
    }))
    .filter((r) => r.end > r.start)
    .map((r) => ({
      left: ((r.start - start) / span) * 100,
      width: ((r.end - r.start) / span) * 100,
    }));
}
export function validateClip(source, form) {
  if (!source) throw new Error("请选择视频源");
  const start =
    source.source_type === "monitor"
      ? +new Date(form.start_time) / 1000
      : Number(form.start_offset);
  const end =
    source.source_type === "monitor"
      ? +new Date(form.end_time) / 1000
      : Number(form.end_offset);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    start < 0 ||
    end - start > 7200
  )
    throw new Error("截取范围需有效、结束晚于开始，且不超过两小时");
  if (
    source.source_type !== "monitor" &&
    source.duration &&
    end > source.duration + 0.1
  )
    throw new Error("结束时间超出视频长度");
  return {
    ...form,
    start_offset: start,
    end_offset: end,
    source_type: source.source_type,
    monitor_id: source.monitor_id,
    filepath: source.filepath,
    video_name: source.raw_filename || source.name,
  };
}
