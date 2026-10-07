<script setup>
import { computed, ref, watch } from "vue";
import { mediaUrl } from "../lib/api";
const props = defineProps({ src: String, name: String });
const failed = ref(false);
const source = computed(() => mediaUrl(props.src));
watch(source, () => {
  failed.value = false;
});
</script>
<template>
  <img
    v-if="source && !failed"
    class="avatar user-avatar"
    :src="source"
    :alt="`${name || '用户'}的头像`"
    @error="failed = true"
  />
  <span
    v-else
    class="avatar user-avatar"
    role="img"
    :aria-label="`${name || '用户'}的备用头像`"
    >{{ name?.trim().slice(0, 1) || "人" }}</span
  >
</template>
<style scoped>
.user-avatar {
  flex-shrink: 0;
  overflow: hidden;
}
</style>
