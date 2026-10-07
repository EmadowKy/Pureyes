<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { api, mediaUrl, uploadVideo } from "../lib/api";
import {
  dateTime,
  duration,
  localISO,
  seconds,
  statusLabel,
  validateClip,
} from "../lib/format";
import Icon from "../components/Icon.vue";
import Modal from "../components/Modal.vue";
import MediaPlayer from "../components/MediaPlayer.vue";
import Investigation from "./Investigation.vue";
const props = defineProps({ workspace: Object, jumpConversation: String }),
  emit = defineEmits(["back", "notify"]);
const tab = ref(props.jumpConversation ? "agent" : "clips"),
  segments = ref([]),
  faces = ref([]),
  error = ref(""),
  filter = ref(""),
  faceBackend = ref(null),
  detail = ref(null),
  player = ref(null),
  sources = ref([]),
  sourceId = ref(""),
  creating = ref(false),
  uploadProgress = ref(-1),
  saving = ref(false),
  faceDetail = ref(null),
  records = ref([]),
  targetGroup = ref(""),
  range = reactive({ start: "", end: "" }),
  featureForm = ref(null);
const form = reactive({
  start_offset: 0,
  end_offset: 0,
  start_time: localISO(Date.now() - 600000),
  end_time: localISO(),
  remark: "",
  enable_preprocess: true,
  sample_fps: 1,
  resolution: "1080P",
});
const source = computed(() =>
    sources.value.find((s) => s.id === sourceId.value),
  ),
  visibleRecords = computed(() =>
    records.value.filter(
      (r) =>
        (!range.start || r.end_time_offset >= seconds(range.start)) &&
        (!range.end || r.start_time_offset <= seconds(range.end)),
    ),
  );
let timer,
  loading = false,
  alive = true,
  uploadController;
const rateSamples = new Map(),
  rates = ref({});
const clipStatus = (value) =>
  ({ processing: "预处理中", pending: "等待预处理", completed: "预处理完成" })[
    value
  ] || statusLabel(value);
async function load() {
  if (loading) return;
  loading = true;
  try {
    const rows = await api(`/workspaces/${props.workspace.id}/segments`);
    if (!alive) return;
    const now = Date.now(),
      speed = {};
    for (const row of rows) {
      const prev = rateSamples.get(row.id);
      if (prev && row.progress > prev.progress)
        speed[row.id] = (
          ((row.progress - prev.progress) / (now - prev.at)) *
          60000
        ).toFixed(1);
      else speed[row.id] = rates.value[row.id];
      rateSamples.set(row.id, { progress: row.progress, at: now });
    }
    segments.value = rows;
    if (detail.value)
      detail.value = rows.find((row) => row.id === detail.value.id) || null;
    rates.value = speed;
    error.value = "";
    if (tab.value === "faces") await loadFaces();
  } catch (e) {
    if (alive) error.value = e.message;
  } finally {
    loading = false;
  }
}
async function loadFaces() {
  try {
    const data = await api(
      `/workspaces/${props.workspace.id}/faces${filter.value ? "?segment_id=" + filter.value : ""}`,
    );
    if (alive) faces.value = data;
  } catch (e) {
    error.value = e.message;
  }
}
async function create() {
  try {
    sources.value = await api(
      `/workspaces/${props.workspace.id}/video-sources`,
    );
    sourceId.value = "";
    form.remark = "";
    creating.value = true;
  } catch (e) {
    emit("notify", e.message);
  }
}
watch(source, (s) => {
  if (s && s.source_type !== "monitor") {
    form.start_offset = 0;
    form.end_offset = s.duration || 0;
  }
});
async function upload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  uploadController = new AbortController();
  uploadProgress.value = 0;
  try {
    const s = await uploadVideo(
      props.workspace.id,
      file,
      (n) => (uploadProgress.value = n),
      uploadController.signal,
    );
    sources.value = [s, ...sources.value];
    sourceId.value = s.id;
    emit("notify", "视频已上传，请确认截取范围");
  } catch (e) {
    if (e.name !== "AbortError") emit("notify", e.message);
  } finally {
    uploadProgress.value = -1;
    e.target.value = "";
  }
}
function closeCreate() {
  uploadController?.abort();
  creating.value = false;
}
async function saveClip() {
  saving.value = true;
  try {
    const body = validateClip(source.value, form);
    await api(`/workspaces/${props.workspace.id}/segments`, {
      method: "POST",
      body,
    });
    creating.value = false;
    await load();
    emit("notify", "片段已创建");
  } catch (e) {
    emit("notify", e.message);
  } finally {
    saving.value = false;
  }
}
async function editRemark() {
  const remark = prompt("片段备注", detail.value.remark || "");
  if (remark === null) return;
  try {
    await api(`/workspaces/segments/${detail.value.id}`, {
      method: "PUT",
      body: { remark },
    });
    detail.value.remark = remark;
    await load();
  } catch (e) {
    emit("notify", e.message);
  }
}
async function removeClip() {
  if (!confirm("删除片段及其特征？引用此片段的调查需先保留或删除。")) return;
  try {
    await api(`/workspaces/segments/${detail.value.id}`, { method: "DELETE" });
    detail.value = null;
    await load();
  } catch (e) {
    emit("notify", e.message);
  }
}
async function features(action) {
  try {
    if (action === "DELETE" && !confirm("清除检索索引与人脸线索，保留视频？"))
      return;
    await api(
      `/workspaces/segments/${detail.value.id}/${action === "DELETE" ? "features" : "preprocess"}`,
      {
        method: action,
        body: action === "POST" ? featureForm.value : undefined,
      },
    );
    featureForm.value = null;
    detail.value = null;
    await load();
  } catch (e) {
    emit("notify", e.message);
  }
}
async function openFace(face) {
  faceDetail.value = face;
  targetGroup.value = "";
  range.start = "";
  range.end = "";
  records.value = [];
  try {
    records.value = await api(
      `/workspaces/${props.workspace.id}/faces/${face.id}/records${filter.value ? "?segment_id=" + filter.value : ""}`,
    );
  } catch (e) {
    emit("notify", e.message);
  }
}
async function move(record) {
  try {
    await api(
      `/workspaces/${props.workspace.id}/faces/records/${record.id}/move`,
      {
        method: "POST",
        body: targetGroup.value
          ? { target_group_id: Number(targetGroup.value) }
          : {},
      },
    );
    await loadFaces();
    await openFace(faceDetail.value);
  } catch (e) {
    emit("notify", e.message);
  }
}
async function merge() {
  if (!targetGroup.value) return emit("notify", "请选择目标分组");
  if (!confirm("将此人脸分组的全部记录合并到选定分组？")) return;
  try {
    await api(`/workspaces/${props.workspace.id}/faces/merge`, {
      method: "POST",
      body: {
        source_group_id: faceDetail.value.id,
        target_group_id: Number(targetGroup.value),
      },
    });
    faceDetail.value = null;
    await loadFaces();
  } catch (e) {
    emit("notify", e.message);
  }
}
watch(tab, (v) => {
  if (v === "faces") loadFaces();
});
watch(filter, loadFaces);
onMounted(async () => {
  await load();
  try {
    faceBackend.value = await api("/workspaces/face-backend");
  } catch {}
  timer = setInterval(load, 5000);
});
onUnmounted(() => {
  alive = false;
  clearInterval(timer);
  uploadController?.abort();
});
</script>
<template>
  <header class="page-heading">
    <div>
      <button class="icon-button" @click="emit('back')">
        <Icon name="back" />工作区列表
      </button>
      <h1>{{ workspace.name }}</h1>
      <p>视频片段、人脸线索与团队调查</p>
    </div>
    <button v-if="tab === 'clips'" class="primary" @click="create">
      <Icon name="plus" />截取新片段
    </button>
  </header>
  <div class="tabs">
    <button :class="{ active: tab === 'clips' }" @click="tab = 'clips'">
      <Icon name="clip" />片段</button
    ><button :class="{ active: tab === 'faces' }" @click="tab = 'faces'">
      <Icon name="face" />人脸</button
    ><button :class="{ active: tab === 'agent' }" @click="tab = 'agent'">
      <Icon name="agent" />调查问答
    </button>
  </div>
  <p v-if="error" class="error" role="alert">
    {{ error }} <button @click="load">重新加载</button>
  </p>
  <template v-if="tab === 'clips'"
    ><div class="card-grid">
      <article v-for="s in segments" :key="s.id" class="clip-card">
        <button style="border: 0; padding: 0; width: 100%" @click="detail = s">
          <img
            :src="mediaUrl(s.thumbnail_url)"
            :alt="s.remark || s.video_name"
            loading="lazy"
          />
        </button>
        <div class="card-body">
          <h3>{{ s.remark || s.video_name }}</h3>
          <p>
            {{ duration(s.duration) }} · {{ s.resolution }} ·
            {{ s.sample_fps }} FPS
          </p>
          <div class="row">
            <span :class="['badge', s.status]">{{ clipStatus(s.status) }}</span
            ><button @click="detail = s">查看片段</button>
          </div>
          <template v-if="['pending', 'processing'].includes(s.status)"
            ><progress :value="s.progress" max="100" />
            <p>
              {{ s.progress }}% ·
              {{
                rates[s.id] ? "约 " + rates[s.id] + "% / 分钟" : "等待新进度"
              }}
            </p></template
          >
          <p v-if="s.error_msg" class="error">{{ s.error_msg }}</p>
        </div>
      </article>
    </div>
    <div v-if="!segments.length" class="empty">
      <Icon name="clip" />
      <h2>添加第一段调查录像</h2>
      <p>上传本地视频或从同组监控中截取片段。</p>
      <button @click="create">截取新片段</button>
    </div></template
  >
  <template v-else-if="tab === 'faces'"
    ><div class="toolbar">
      <h2>人脸线索</h2>
      <select v-model="filter" aria-label="按片段筛选" style="max-width: 300px">
        <option value="">全部片段</option>
        <option v-for="s in segments" :key="s.id" :value="s.id">
          {{ s.remark || s.video_name }}
        </option></select
      ><button @click="loadFaces"><Icon name="refresh" />刷新</button>
    </div>
    <p v-if="faces.some((f) => f.needs_classification)" class="privacy-note">
      部分抓拍等待鸿蒙手机归类，请在鸿蒙端使用本机人脸能力处理；网页可查看抓拍与管理已有分组。
    </p>
    <div class="card-grid">
      <article v-for="f in faces" :key="f.id" class="clip-card">
        <button style="padding: 0; border: 0; width: 100%" @click="openFace(f)">
          <img
            class="face-cover"
            :src="mediaUrl(f.avatar_url)"
            :alt="f.name"
            loading="lazy"
          />
        </button>
        <div class="card-body">
          <h3>{{ f.name }}</h3>
          <p>
            {{ f.record_count }} 条出现记录
            <span v-if="f.is_legacy" class="badge">旧版线索 · 待重建</span>
          </p>
          <button @click="openFace(f)">查看出现记录</button>
        </div>
      </article>
    </div>
    <div v-if="!faces.length" class="empty">
      <h2>暂无人脸线索</h2>
      <p>先对视频片段进行完整预处理。</p>
    </div></template
  >
  <Investigation
    v-else
    :workspace="workspace"
    :segments="segments"
    :jump-conversation="jumpConversation"
    @notify="emit('notify', $event)"
    @play="player = $event"
  />
  <Modal
    v-if="detail"
    :title="detail.remark || detail.video_name"
    wide
    @close="detail = null"
    ><MediaPlayer :src="detail.media_url" />
    <p class="muted">
      {{ duration(detail.duration) }} · {{ detail.resolution }} ·
      {{ detail.sample_fps }} FPS · {{ clipStatus(detail.status) }}
    </p>
    <div class="row">
      <button @click="editRemark">编辑备注</button
      ><button
        :disabled="['pending', 'processing'].includes(detail.status)"
        @click="
          featureForm = {
            sample_fps: detail.sample_fps || 1,
            resolution: detail.resolution || '1080P',
          }
        "
      >
        开始预处理</button
      ><button
        :disabled="['pending', 'processing'].includes(detail.status)"
        @click="features('DELETE')"
      >
        清除特征</button
      ><button
        class="danger"
        :disabled="['pending', 'processing'].includes(detail.status)"
        @click="removeClip"
      >
        删除片段
      </button>
    </div>
    <form
      v-if="featureForm"
      style="margin-top: 20px"
      @submit.prevent="features('POST')"
    >
      <div class="row">
        <label
          >采样率<select v-model.number="featureForm.sample_fps">
            <option :value="0.5">0.5 FPS</option>
            <option :value="1">1 FPS</option>
            <option :value="2">2 FPS</option>
          </select></label
        ><label
          >画质<select v-model="featureForm.resolution">
            <option v-for="r in ['480P', '720P', '1080P', '4K']" :key="r">
              {{ r }}
            </option>
          </select></label
        >
      </div>
      <button class="primary">确认预处理</button>
    </form></Modal
  >
  <Modal v-if="creating" title="截取新片段" wide @close="closeCreate"
    ><form @submit.prevent="saveClip">
      <div class="row">
        <label
          >视频源<select v-model="sourceId" required>
            <option disabled value="">选择视频源</option>
            <option v-for="s in sources" :key="s.id" :value="s.id">
              {{ s.name }}
            </option>
          </select></label
        ><label
          >上传本地视频<input
            type="file"
            accept=".mp4,.avi,.mov,.mkv,.webm"
            :disabled="uploadProgress >= 0"
            @change="upload"
        /></label>
      </div>
      <div v-if="uploadProgress >= 0">
        <progress :value="uploadProgress" max="100" />
        <p>
          上传 {{ uploadProgress }}%
          <button type="button" @click="uploadController.abort()">
            取消上传
          </button>
        </p>
      </div>
      <template v-if="source"
        ><MediaPlayer v-if="source.media_url" :src="source.media_url" />
        <div v-if="source.source_type === 'monitor'" class="row">
          <label
            >开始时间<input
              v-model="form.start_time"
              type="datetime-local"
              step="1"
              required /></label
          ><label
            >结束时间<input
              v-model="form.end_time"
              type="datetime-local"
              step="1"
              required
          /></label>
        </div>
        <div v-else class="row">
          <label
            >开始（秒）<input
              v-model.number="form.start_offset"
              type="number"
              min="0"
              :max="source.duration"
              step="0.1"
              required /></label
          ><label
            >结束（秒）<input
              v-model.number="form.end_offset"
              type="number"
              min="0"
              :max="source.duration"
              step="0.1"
              required
          /></label></div></template
      ><label>备注<input v-model="form.remark" maxlength="256" /></label
      ><label class="row"
        ><input v-model="form.enable_preprocess" type="checkbox" />AI
        特征提取与识别预处理</label
      >
      <div v-if="form.enable_preprocess" class="row">
        <label
          >采样率<select v-model.number="form.sample_fps">
            <option :value="0.5">0.5 FPS</option>
            <option :value="1">1 FPS</option>
            <option :value="2">2 FPS</option>
          </select></label
        ><label
          >画质<select v-model="form.resolution">
            <option v-for="r in ['480P', '720P', '1080P', '4K']" :key="r">
              {{ r }}
            </option>
          </select></label
        >
      </div>
      <button
        class="primary"
        :disabled="saving || uploadProgress >= 0 || !source"
      >
        {{ saving ? "正在截取…" : "创建片段" }}
      </button>
    </form></Modal
  >
  <Modal
    v-if="faceDetail"
    :title="faceDetail.name"
    wide
    @close="faceDetail = null"
    ><div class="row">
      <label
        >开始（mm:ss）<input v-model="range.start" placeholder="00:00" /></label
      ><label
        >结束（mm:ss）<input v-model="range.end" placeholder="不限" /></label
      ><label
        >目标分组<select v-model="targetGroup">
          <option value="">单独成组</option>
          <option
            v-for="f in faces.filter((x) => x.id !== faceDetail.id)"
            :key="f.id"
            :value="f.id"
          >
            {{ f.name }}
          </option>
        </select></label
      ><button :disabled="!targetGroup" @click="merge">合并整个分组</button>
    </div>
    <div class="card-grid" style="margin-top: 20px">
      <article v-for="r in visibleRecords" :key="r.id" class="clip-card">
        <img
          class="face-cover"
          :src="mediaUrl(r.crop_url)"
          alt="人脸抓拍"
          loading="lazy"
        />
        <div class="card-body">
          <h3>{{ r.video_name }}</h3>
          <p>{{ r.time_range_str }}</p>
          <div class="row">
            <button
              @click="
                player = {
                  src: r.segment_media_url,
                  start: r.start_time_offset,
                  title: r.video_name,
                }
              "
            >
              定位原视频</button
            ><button @click="move(r)">
              {{ targetGroup ? "移动记录" : "单独成组" }}
            </button>
          </div>
        </div>
      </article>
    </div>
    <p v-if="!visibleRecords.length" class="empty">此范围没有出现记录</p></Modal
  >
  <Modal
    v-if="player"
    :title="player.title || '证据视频'"
    wide
    @close="player = null"
    ><MediaPlayer :src="player.src" :start="player.start || 0"
  /></Modal>
</template>
