<script setup>
import { computed } from "vue";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { seconds } from "../lib/format";
const props = defineProps({ text: String });
const emit = defineEmits(["evidence"]);
const html = computed(() => {
  const text = (props.text || "")
    .split(/\r?\n/)
    .filter((line) => !/^\s*FRAME_OBSERVATION\b/i.test(line))
    .join("\n");
  const linked = text.replace(
    /\[video:\s*["']?(\d+)["']?\s*,\s*time:\s*["']?([\d:]+)["']?\s*\]/gi,
    (_, video, time) =>
      `[视频 ${video} · ${time}](#evidence-${video}-${seconds(time)})`,
  );
  return DOMPurify.sanitize(marked.parse(linked), {
    FORBID_TAGS: ["style", "iframe", "form", "input", "video", "audio"],
    FORBID_ATTR: ["style"],
  });
});
function click(e) {
  const link = e.target.closest("a");
  if (!link) return;
  const match = link.getAttribute("href")?.match(/^#evidence-(\d+)-([\d.]+)$/);
  if (match) {
    e.preventDefault();
    emit("evidence", { video: Number(match[1]), time: Number(match[2]) });
  } else {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
}
</script>
<template><div class="answer" v-html="html" @click="click" /></template>
