<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import Icon from "./Icon.vue";
import {
  lockPageScroll,
  registerLayer,
  isTopLayer,
  trapFocus,
} from "../lib/overlay";
defineProps({ title: String, wide: Boolean });
const emit = defineEmits(["close"]),
  dialog = ref(),
  previous = document.activeElement;
let releaseScroll, releaseLayer;
function key(event) {
  if (!isTopLayer(dialog.value)) return;
  if (event.key === "Escape") {
    event.preventDefault();
    emit("close");
  }
  trapFocus(event, dialog.value);
}
onMounted(() => {
  releaseScroll = lockPageScroll();
  releaseLayer = registerLayer(dialog.value);
  document.addEventListener("keydown", key);
  (
    dialog.value.querySelector(
      "input:not([type=file]):not([disabled]),select:not([disabled]),textarea:not([disabled])",
    ) || dialog.value.querySelector("button")
  )?.focus();
});
onUnmounted(() => {
  releaseScroll?.();
  releaseLayer?.();
  document.removeEventListener("keydown", key);
  if (previous?.isConnected) previous.focus({ preventScroll: true });
});
</script>
<template>
  <Teleport to="body"
    ><Transition name="dialog" appear
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
            <button
              class="icon-button"
              aria-label="关闭"
              @click="emit('close')"
            >
              <Icon name="close" />
            </button>
          </header>
          <slot />
        </section></div></Transition
  ></Teleport>
</template>
