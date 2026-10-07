<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { api, mediaUrl } from "../lib/api";
import { coverageSegments, localISO, dateTime } from "../lib/format";
import Icon from "../components/Icon.vue";
import Modal from "../components/Modal.vue";
import MediaPlayer from "../components/MediaPlayer.vue";
const props = defineProps({ group: Object }),
  emit = defineEmits(["notify"]);
const monitors = ref([]),
  selected = ref(null),
  history = ref(null),
  live = ref(true),
  precision = ref("minute"),
  anchor = ref(Date.now()),
  src = ref(""),
  seek = ref(0),
  playbackBase = ref(0),
  recordingEnd = ref(null),
  gap = ref(false),
  error = ref(""),
  loading = ref(false),
  edit = ref(null);
const fields = reactive({ name: "", stream_url: "" });
const start = computed(() =>
  history.value ? +new Date(history.value.window_start) : anchor.value - 360000,
);
const end = computed(() =>
  Math.min(
    history.value ? +new Date(history.value.window_end) : Date.now(),
    Date.now(),
  ),
);
const bars = computed(() =>
  coverageSegments(history.value?.available_ranges, start.value, end.value),
);
const steps = { day: 86400, hour: 3600, minute: 60, second: 1 };
let timer,
  generation = 0,
  historyGeneration = 0,
  polling = false;
async function load() {
  if (!props.group) return;
  try {
    monitors.value = await api(`/monitors/${props.group.id}`);
    error.value = "";
  } catch (e) {
    error.value = e.message;
  }
}
async function ranges() {
  if (!selected.value) return;
  const id = selected.value.id;
  const run = ++historyGeneration;
  try {
    const result = await api(
      `/monitors/${id}/history?anchor=${encodeURIComponent(localISO(anchor.value))}&granularity=${precision.value}&window=6`,
    );
    if (run === historyGeneration && id === selected.value?.id)
      history.value = result;
  } catch (e) {
    if (run === historyGeneration) error.value = e.message;
  }
}
async function open(m) {
  selected.value = m;
  history.value = null;
  live.value = true;
  gap.value = false;
  src.value = m.live_url || m.media_url;
  anchor.value = Date.now();
  await ranges();
}
async function jump(value) {
  const run = ++generation;
  anchor.value = Number(value);
  error.value = "";
  loading.value = true;
  src.value = "";
  if (anchor.value >= Date.now() - 2000) {
    live.value = true;
    gap.value = false;
    src.value = selected.value.live_url || selected.value.media_url;
    anchor.value = Date.now();
    loading.value = false;
    await ranges();
    return;
  }
  live.value = false;
  try {
    const result = await api(
      `/monitors/${selected.value.id}/playback?time=${encodeURIComponent(localISO(anchor.value))}`,
    );
    if (run !== generation) return;
    src.value = result.playback_url;
    seek.value = result.seek_offset_seconds;
    playbackBase.value = anchor.value - result.seek_offset_seconds * 1000;
    recordingEnd.value = result.segment_end_time;
    gap.value = false;
  } catch (e) {
    if (run !== generation) return;
    src.value = "";
    gap.value = e.status === 404;
    if (!gap.value) error.value = e.message;
  } finally {
    if (run === generation) {
      loading.value = false;
      await ranges();
    }
  }
}
function playbackTime(time) {
  if (!live.value && !gap.value && !loading.value)
    anchor.value = playbackBase.value + time * 1000;
}
function nextRecording() {
  if (!live.value && recordingEnd.value)
    jump(+new Date(recordingEnd.value) + 50);
}
async function save() {
  try {
    await api(`/monitors/${edit.value.id || props.group.id}`, {
      method: edit.value.id ? "PUT" : "POST",
      body: fields,
    });
    edit.value = null;
    await load();
    emit("notify", "监控已保存");
  } catch (e) {
    error.value = e.message;
  }
}
function showEdit(m = {}) {
  fields.name = m.name || "";
  fields.stream_url = m.stream_url || "";
  edit.value = m;
}
async function remove(m) {
  if (!confirm(`删除监控“${m.name}”？其录像也会被移除。`)) return;
  try {
    await api(`/monitors/${m.id}`, { method: "DELETE" });
    await load();
  } catch (e) {
    emit("notify", e.message);
  }
}
async function poll() {
  if (polling) return;
  polling = true;
  try {
    if (selected.value) {
      if (live.value) anchor.value = Date.now();
      await ranges();
    } else await load();
  } finally {
    polling = false;
  }
}
onMounted(() => {
  load();
  timer = setInterval(poll, 10000);
});
onUnmounted(() => {
  generation++;
  historyGeneration++;
  clearInterval(timer);
});
</script>
<template>
  <header class="page-heading">
    <div>
      <p class="eyebrow">现场与历史</p>
      <h1>{{ selected?.name || "监控与回放" }}</h1>
      <p>在时间轴上定位录像，核对事件发生前后的画面。</p>
    </div>
    <button
      v-if="selected"
      @click="
        selected = null;
        src = '';
        generation++;
      "
    >
      <Icon name="back" />返回监控</button
    ><button v-else-if="group?.is_creator" class="primary" @click="showEdit()">
      <Icon name="plus" />添加监控
    </button>
  </header>
  <p v-if="error" class="error" role="alert">
    {{ error }}<button @click="load">重试</button>
  </p>
  <template v-if="selected"
    ><MediaPlayer
      v-if="src && !gap"
      :src="src"
      :start="seek"
      :live="live"
      @playing="error = ''"
      @time="playbackTime"
      @ended="nextRecording"
    />
    <div
      v-else
      class="video-shell empty"
      style="background: #050b11; color: white; height: 350px"
    >
      {{
        loading
          ? "正在定位录像…"
          : gap
            ? "此时间没有可回放录像"
            : "暂无实时画面"
      }}
    </div>
    <section class="panel">
      <div class="toolbar">
        <div class="row">
          <span :class="['badge', live ? 'online' : 'idle']">{{
            live ? "实时 · 跟随最新" : "回放"
          }}</span
          ><span>{{ dateTime(anchor) }}</span>
        </div>
        <button @click="jump(Date.now())">回到实时</button>
      </div>
      <div class="timeline">
        <div class="timeline-track" />
        <span
          v-for="(bar, i) in bars"
          :key="i"
          class="timeline-range"
          :style="{ left: bar.left + '%', width: bar.width + '%' }"
        /><input
          type="range"
          :min="start"
          :max="end"
          :step="steps[precision] * 1000"
          :value="Math.min(anchor, end)"
          aria-label="录像时间轴"
          @input="
            live = false;
            anchor = Number($event.target.value);
          "
          @change="jump($event.target.value)"
        />
      </div>
      <div class="timeline-labels">
        <span>{{ dateTime(start) }}</span
        ><span>{{ dateTime(end) }}</span>
      </div>
      <div class="row" style="margin-top: 22px">
        <label
          >时间精度<select v-model="precision" @change="ranges">
            <option value="day">天</option>
            <option value="hour">时</option>
            <option value="minute">分</option>
            <option value="second">秒</option>
          </select></label
        ><label
          >定位时间<input
            type="datetime-local"
            :value="localISO(anchor)"
            step="1"
            @change="jump(+new Date($event.target.value))"
        /></label>
      </div>
      <p class="muted" style="margin: 16px 0 0">
        蓝色区间为可回放录像，空白区间没有录像。{{ loading ? "正在定位…" : "" }}
      </p>
    </section></template
  >
  <div v-else class="card-grid">
    <article v-for="m in monitors" :key="m.id" class="clip-card">
      <button style="border: 0; padding: 0; width: 100%" @click="open(m)">
        <img
          v-if="m.cover_url"
          :src="mediaUrl(m.cover_url)"
          :alt="m.name"
          loading="lazy"
        />
        <div
          v-else
          class="empty"
          style="width: 100%; background: #112e42; color: #b6c9d6"
        >
          <Icon name="monitor" />
        </div>
      </button>
      <div class="card-body">
        <h3>{{ m.name }}</h3>
        <div class="row">
          <span :class="['badge', m.status]">{{
            m.status === "online" ? "在线" : "离线"
          }}</span
          ><button @click="open(m)">查看画面</button
          ><template v-if="m.can_manage"
            ><button @click="showEdit(m)">编辑</button
            ><button class="danger" @click="remove(m)">删除</button></template
          >
        </div>
      </div>
    </article>
  </div>
  <p v-if="!selected && !monitors.length" class="empty">
    {{ group ? "暂无监控，请由组长添加视频源。" : "请先选择小组。" }}
  </p>
  <Modal v-if="edit" title="监控设置" @close="edit = null"
    ><form @submit.prevent="save">
      <label>名称<input v-model="fields.name" required maxlength="128" /></label
      ><label
        >视频流地址<input
          v-model="fields.stream_url"
          required
          placeholder="RTSP 或 HTTP 视频流" /></label
      ><button class="primary">保存监控</button>
    </form></Modal
  >
</template>
