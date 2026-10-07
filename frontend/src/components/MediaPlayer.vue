<script setup>
import { nextTick, onUnmounted, ref, watch } from "vue";
import Hls from "hls.js";
import { mediaUrl, renewMedia } from "../lib/api";
import Icon from "./Icon.vue";
const props = defineProps({
  src: String,
  start: { type: Number, default: 0 },
  live: Boolean,
});
const emit = defineEmits(["time", "ended", "playing"]);
const video = ref(),
  shell = ref(),
  error = ref(""),
  zoom = ref(1),
  pan = ref({ x: 0, y: 0 });
let hls,
  generation = 0,
  renewCount = 0,
  renewTimer,
  drag,
  pointers = new Map(),
  pinchDistance;
function reset() {
  zoom.value = 1;
  pan.value = { x: 0, y: 0 };
}
async function load(value) {
  const run = ++generation;
  hls?.destroy();
  hls = null;
  clearTimeout(renewTimer);
  reset();
  error.value = "";
  renewCount = 0;
  await nextTick();
  if (!video.value || run !== generation) return;
  video.value.removeAttribute("src");
  video.value.load();
  if (!value) return;
  attach(mediaUrl(value), run);
}
function attach(url, run) {
  if (run !== generation || !video.value) return;
  hls?.destroy();
  hls = null;
  if (
    url.includes(".m3u8") &&
    !video.value.canPlayType("application/vnd.apple.mpegurl")
  ) {
    if (!Hls.isSupported()) {
      error.value = "此浏览器不支持直播播放，请使用最新版浏览器";
      return;
    }
    hls = new Hls({
      xhrSetup: (xhr, resource) => {
        const target = new URL(resource, new URL(url, location.origin));
        const signature = new URL(url, location.origin).search;
        // Only propagate the signed monitor query to its own HLS segments.
        if (
          !target.search &&
          target.origin === new URL(url, location.origin).origin &&
          target.pathname.startsWith(
            new URL(url, location.origin).pathname.replace(/[^/]*$/, ""),
          )
        )
          xhr.open("GET", target.href + signature, true);
      },
    });
    hls.loadSource(url);
    hls.attachMedia(video.value);
    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal && run === generation) retry();
    });
  } else video.value.src = url;
  clearTimeout(renewTimer);
  renewTimer = setTimeout(() => retry(true), 30 * 60000);
}
async function retry(silent = false) {
  const run = generation;
  if (renewCount++ >= 2 && !silent) {
    error.value = "视频未能加载，请重试或检查录像是否可用";
    return;
  }
  try {
    const at = video.value?.currentTime || props.start;
    const url = await renewMedia(props.src);
    if (run !== generation) return;
    error.value = "";
    attach(url, run);
    video.value.onloadedmetadata = () => {
      if (!props.live) video.value.currentTime = at;
      video.value.play().catch(() => {});
    };
  } catch (e) {
    if (run === generation && !silent) error.value = e.message;
  }
}
function loaded() {
  if (!props.live && video.value && props.start)
    video.value.currentTime = props.start;
}
async function fullscreen() {
  try {
    if (!document.fullscreenElement) await shell.value.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    error.value = "浏览器未允许全屏";
  }
}
function down(e) {
  if (e.target !== video.value) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  video.value.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, y: e.clientY, ...pan.value };
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
  }
}
function move(e) {
  if (!pointers.has(e.pointerId)) return;
  const old = pointers.get(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()],
      d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchDistance)
      zoom.value = Math.max(1, Math.min(5, (zoom.value * d) / pinchDistance));
    pinchDistance = d;
    pan.value = {
      x: pan.value.x + (e.clientX - old.x) / 2,
      y: pan.value.y + (e.clientY - old.y) / 2,
    };
  } else if (zoom.value > 1)
    pan.value = {
      x: pan.value.x + e.clientX - old.x,
      y: pan.value.y + e.clientY - old.y,
    };
}
function up(e) {
  pointers.delete(e.pointerId);
  pinchDistance = undefined;
  drag = null;
}
watch(
  () => props.src,
  (value) => load(value),
  { immediate: true },
);
watch(
  () => props.start,
  (value) => {
    if (video.value && Number.isFinite(value)) video.value.currentTime = value;
  },
);
onUnmounted(() => {
  generation++;
  hls?.destroy();
  clearTimeout(renewTimer);
});
</script>
<template>
  <div ref="shell" class="video-shell">
    <video
      ref="video"
      controls
      playsinline
      preload="metadata"
      :autoplay="live"
      :muted="live"
      :style="{
        transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
        touchAction: zoom > 1 ? 'none' : 'auto',
      }"
      @loadedmetadata="loaded"
      @playing="
        error = '';
        renewCount = 0;
        emit('playing');
      "
      @error="src && retry()"
      @timeupdate="emit('time', $event.currentTarget.currentTime)"
      @ended="emit('ended')"
      @pointerdown="down"
      @pointermove="move"
      @pointerup="up"
      @pointercancel="up"
    />
    <div v-if="error" class="video-error">
      <p>{{ error }}</p>
      <button @click="load(src)">重新加载</button>
    </div>
    <div class="video-tools">
      <label
        >画面缩放<input
          v-model.number="zoom"
          type="range"
          min="1"
          max="5"
          step="0.1"
          aria-label="画面缩放" /></label
      ><button @click="reset">还原画面</button
      ><button @click="fullscreen"><Icon name="fullscreen" />全屏</button>
    </div>
  </div>
</template>
