<script setup>
defineProps({ name: { type: String, default: "workspace" } });
const paths = {
  workspace: "M3 7h7l2-3h9v16H3Z M3 10h18",
  monitor: "M3 4h18v13H3Z M8 21h8 M12 17v4",
  group:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M18 8a3 3 0 0 1 0 6 M20 16a4 4 0 0 1 2 4",
  user: "M20 21v-2a7 7 0 0 0-14 0v2 M13 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  agent: "m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7Z",
  face: "M7 3H3v4 M17 3h4v4 M3 17v4h4 M21 17v4h-4 M8 10h.1 M16 10h.1 M8 15q4 4 8 0",
  clip: "M3 4h18v16H3Z M3 8h18 M7 4v4 M17 4v4 m-7 4 5 3-5 3Z",
  chevron: "m9 5 7 7-7 7",
  bell: "M18 8a6 6 0 0 0-12 0v7l-2 3h16l-2-3Z M10 21h4",
  back: "m14 5-7 7 7 7",
  plus: "M12 4v16 M4 12h16",
  play: "m8 4 12 8-12 8Z",
  check: "m5 12 4 4L20 5",
  close: "m5 5 14 14 M19 5 5 19",
  refresh: "M20 8a9 9 0 1 0 0 8 M20 2v6h-6",
  more: "M5 12h.1 M12 12h.1 M19 12h.1",
  key: "M8 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10 M12 12l9 9 M17 17l3-3",
  lock: "M6 10h12v11H6Z M8 10V6a4 4 0 0 1 8 0v4",
  send: "m3 3 18 9-18 9 3-9Z M6 12h15",
  search: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14 M15 15l6 6",
  fullscreen: "M3 8V3h5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5",
  logout: "M9 3H3v18h6 M13 7l5 5-5 5 M8 12h13",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  panel: "M3 4h18v16H3Z M9 4v16 m7-11-3 3 3 3",
  grid: "M3 3h7v7H3Z M14 3h7v7h-7Z M3 14h7v7H3Z M14 14h7v7h-7Z",
  list: "M3 5h3 M10 5h11 M3 12h3 M10 12h11 M3 19h3 M10 19h11",
  down: "m5 9 7 7 7-7",
};
</script>
<template>
  <svg
    class="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || paths.workspace" />
  </svg>
</template>
