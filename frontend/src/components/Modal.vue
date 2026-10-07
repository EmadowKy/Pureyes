<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import Icon from "./Icon.vue";
defineProps({ title: String, wide: Boolean });
const emit = defineEmits(["close"]),
  dialog = ref(),
  previous = document.activeElement;
function key(event) {
  if (event.key === "Escape") emit("close");
  if (event.key !== "Tab") return;
  const items = [
    ...dialog.value.querySelectorAll(
      "button,input,select,textarea,a[href],video[controls]",
    ),
  ].filter((x) => !x.disabled && x.offsetParent !== null);
  const first = items[0],
    last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
onMounted(() => {
  document.addEventListener("keydown", key);
  dialog.value.querySelector("input,button")?.focus();
});
onUnmounted(() => {
  document.removeEventListener("keydown", key);
  previous?.focus();
});
</script>
<template>
  <Teleport to="body"
    ><div class="modal-shade" @click.self="emit('close')">
      <section
        ref="dialog"
        class="modal"
        :class="{ wide }"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <header>
          <h2>{{ title }}</h2>
          <button class="icon-button" aria-label="关闭" @click="emit('close')">
            <Icon name="close" />
          </button>
        </header>
        <slot />
      </section></div
  ></Teleport>
</template>
