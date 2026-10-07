<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { api } from "../lib/api";
import {
  duration,
  statusLabel,
  toolLabel,
  readableFields,
  seconds,
} from "../lib/format";
import Icon from "../components/Icon.vue";
import Answer from "../components/Answer.vue";
import Modal from "../components/Modal.vue";
const props = defineProps({
    workspace: Object,
    segments: Array,
    jumpConversation: String,
  }),
  emit = defineEmits(["notify", "play"]);
const conversations = ref([]),
  current = ref(null),
  messages = ref([]),
  configs = ref([]),
  configId = ref(""),
  question = ref(""),
  selectedIds = ref([]),
  creating = ref(false),
  busy = ref(false),
  error = ref(""),
  rename = ref(null),
  newTitle = ref(""),
  menu = ref(""),
  clock = ref(Date.now());
const running = computed(() =>
    messages.value.some((m) => m.status === "processing"),
  ),
  references = computed(() =>
    (current.value?.segment_ids || selectedIds.value)
      .map((id) => props.segments.find((s) => s.id === id))
      .filter(Boolean),
  );
let pollTimer,
  clockTimer,
  loading = false,
  generation = 0,
  alive = true;
async function list() {
  const rows = await api(
    `/workspaces/${props.workspace.id}/agent/conversations`,
  );
  if (alive) conversations.value = rows;
}
async function loadConfigs() {
  try {
    configs.value = await api(
      `/workspaces/${props.workspace.id}/model-configs`,
    );
    if (!configs.value.some((c) => c.id === Number(configId.value)))
      configId.value = configs.value[0]?.id || "";
  } catch (e) {
    error.value = e.message;
  }
}
async function open(conversation) {
  const run = ++generation;
  current.value = conversation;
  creating.value = false;
  messages.value = [];
  question.value = "";
  error.value = "";
  await read(run);
}
async function read(run = generation) {
  if (!current.value) return;
  const id = current.value.id;
  try {
    const data = await api(`/workspaces/agent/conversations/${id}/messages`);
    if (!alive || run !== generation || id !== current.value?.id) return;
    current.value = data.conversation;
    messages.value = data.messages || [];
    error.value = "";
  } catch (e) {
    if (run === generation) error.value = e.message;
  }
}
function start() {
  generation++;
  current.value = null;
  messages.value = [];
  selectedIds.value = [];
  question.value = "";
  creating.value = true;
  error.value = "";
  loadConfigs();
}
async function send() {
  if (busy.value || running.value) return;
  const text = question.value.trim();
  if (!text) return;
  if (!configId.value) return emit("notify", "请先配置并选择模型");
  if (
    !current.value &&
    (!selectedIds.value.length || selectedIds.value.length > 20)
  )
    return emit("notify", "请选择 1–20 个视频片段");
  busy.value = true;
  try {
    const data = await api(`/workspaces/${props.workspace.id}/qa`, {
      method: "POST",
      body: {
        question: text,
        model_config_id: Number(configId.value),
        ...(current.value
          ? { conversation_id: current.value.id }
          : { segment_ids: selectedIds.value }),
      },
    });
    question.value = "";
    await list();
    await open(
      conversations.value.find((c) => c.id === data.conversation_id) || {
        id: data.conversation_id,
        segment_ids: [...selectedIds.value],
      },
    );
    emit("notify", "调查已开始");
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
async function stop(task) {
  if (!confirm("停止当前这一轮调查？已保存记录会保留。")) return;
  try {
    await api(`/workspaces/qa/${task.id}/stop`, { method: "POST" });
    await read();
  } catch (e) {
    emit("notify", e.message);
  }
}
async function remove(c) {
  if (!confirm(`删除调查“${c.title}”及全部问答？视频片段将保留。`)) return;
  try {
    await api(`/workspaces/agent/conversations/${c.id}`, { method: "DELETE" });
    if (current.value?.id === c.id) {
      generation++;
      current.value = null;
      messages.value = [];
    }
    await list();
  } catch (e) {
    emit("notify", e.message);
  }
}
async function saveTitle() {
  try {
    await api(`/workspaces/agent/conversations/${rename.value.id}`, {
      method: "PUT",
      body: { title: newTitle.value.trim() },
    });
    if (current.value?.id === rename.value.id)
      current.value.title = newTitle.value.trim();
    rename.value = null;
    await list();
  } catch (e) {
    emit("notify", e.message);
  }
}
function elapsed(m) {
  return m.status === "processing"
    ? (clock.value - +new Date(m.created_at)) / 1000
    : m.elapsed_seconds;
}
function entries(m) {
  return m.process_entries?.length
    ? m.process_entries
    : (m.tool_calls || []).map((_, i) => ({ kind: "tool", tool_index: i }));
}
function evidence(item) {
  const segment = references.value[item.video - 1];
  if (!segment) return emit("notify", "对应视频不在当前引用片段中");
  emit("play", {
    src: segment.media_url,
    start: item.time,
    title: segment.remark || segment.video_name,
  });
}
function toolEvidence(item) {
  const bySegment = references.value.findIndex(
    (s) => s.id === Number(item.segment_id),
  );
  const video =
    bySegment >= 0
      ? bySegment + 1
      : Number(item.video_num || item.video_index || item.video_id || 1);
  const time = seconds(
    item.timestamp_sec ?? item.time ?? item.timestamp ?? item.time_sec ?? 0,
  );
  if (!Number.isFinite(time)) return emit("notify", "证据时间点无效");
  evidence({ video, time });
}
async function share(m) {
  const text = `${m.question}\n\n${m.answer}`;
  try {
    if (navigator.share)
      await navigator.share({ title: current.value.title, text });
    else {
      await navigator.clipboard.writeText(text);
      emit("notify", "结论已复制");
    }
  } catch (e) {
    if (e.name !== "AbortError")
      emit("notify", "分享未完成，请在 HTTPS 环境使用或手动复制结论");
  }
}
async function poll() {
  if (loading) return;
  loading = true;
  try {
    await list();
    if (current.value) await read();
  } catch (e) {
    if (alive) error.value = e.message;
  } finally {
    loading = false;
  }
}
onMounted(async () => {
  await loadConfigs();
  try {
    await list();
    if (props.jumpConversation)
      await open(
        conversations.value.find((c) => c.id === props.jumpConversation) || {
          id: props.jumpConversation,
        },
      );
  } catch (e) {
    error.value = e.message;
  }
  pollTimer = setInterval(poll, 2500);
  clockTimer = setInterval(() => (clock.value = Date.now()), 1000);
});
watch(
  () => props.jumpConversation,
  (id) => {
    if (id) open(conversations.value.find((c) => c.id === id) || { id });
  },
);
onUnmounted(() => {
  alive = false;
  generation++;
  clearInterval(pollTimer);
  clearInterval(clockTimer);
});
</script>
<template>
  <div class="conversation-layout">
    <aside class="conversation-list">
      <button class="primary" @click="start">
        <Icon name="plus" />新建调查
      </button>
      <article
        v-for="c in conversations"
        :key="c.id"
        :class="['conversation-link', { active: current?.id === c.id }]"
      >
        <button @click="open(c)">{{ c.title }}</button>
        <p>{{ c.turn_count }} 轮 · {{ statusLabel(c.latest_status) }}</p>
        <details v-if="c.can_manage">
          <summary aria-label="会话操作">⋯ 更多</summary>
          <button
            @click="
              rename = c;
              newTitle = c.title;
            "
          >
            修改标题</button
          ><button
            class="danger"
            :disabled="c.latest_status === 'processing'"
            @click="remove(c)"
          >
            删除记录
          </button>
        </details>
      </article>
    </aside>
    <main class="conversation-body">
      <p v-if="error" class="error" role="alert">
        {{ error }}<button @click="poll">重试加载</button>
      </p>
      <template v-if="creating || current"
        ><header>
          <h2>{{ current?.title || "开始新的调查" }}</h2>
          <button v-if="current" @click="start">+ 新建</button>
        </header>
        <div v-if="creating" class="panel">
          <h3>选择调查片段</h3>
          <div class="selection-list">
            <label v-for="s in segments" :key="s.id"
              ><input
                v-model="selectedIds"
                :value="s.id"
                type="checkbox"
                :disabled="['processing', 'pending'].includes(s.status)"
              /><span
                >{{ s.remark || s.video_name }} · {{ duration(s.duration) }}
                <small>{{ statusLabel(s.status) }}</small></span
              ></label
            >
          </div>
          <p class="muted">已选择 {{ selectedIds.length }} / 20 个片段</p>
        </div>
        <details v-else class="evidence-scope">
          <summary>引用片段 · {{ references.length }}</summary>
          <button
            v-for="(s, i) in references"
            :key="s.id"
            @click="evidence({ video: i + 1, time: 0 })"
          >
            视频 {{ i + 1 }} · {{ s.remark || s.video_name }} ·
            {{ duration(s.duration) }}
          </button>
        </details>
        <article v-for="m in messages" :key="m.id" class="turn">
          <div class="row">
            <small class="muted"
              >第 {{ m.turn_index }} 轮 · {{ m.creator_id }}</small
            ><span :class="['badge', m.status]">{{
              statusLabel(m.status)
            }}</span>
          </div>
          <div class="turn-question">
            <small class="muted">{{ m.model_config_label }}</small>
            <p>{{ m.question }}</p>
          </div>
          <div class="agent-heading">
            <Icon name="agent" />调查 Agent
            <small>用时 {{ duration(elapsed(m)) }}</small
            ><button
              v-if="m.status === 'processing'"
              class="danger"
              @click="stop(m)"
            >
              停止本轮
            </button>
          </div>
          <details :open="m.status === 'processing'" class="process">
            <summary>
              <Icon name="chevron" />{{
                m.status === "processing" ? "调查过程" : "查看调查过程"
              }}
              · {{ m.tool_calls?.length || 0 }} 次工具调用
            </summary>
            <template v-for="(entry, i) in entries(m)" :key="i"
              ><p v-if="entry.kind === 'commentary'" class="process-note">
                {{ entry.text }}
              </p>
              <details
                v-else-if="m.tool_calls?.[entry.tool_index]"
                class="tool-row"
              >
                <summary>
                  <Icon
                    :name="
                      m.tool_calls[entry.tool_index].status === 'running'
                        ? 'refresh'
                        : 'check'
                    "
                  />{{ toolLabel(m.tool_calls[entry.tool_index].name)
                  }}<span class="muted">{{
                    m.tool_calls[entry.tool_index].status === "running"
                      ? "正在执行"
                      : ""
                  }}</span
                  ><Icon name="chevron" />
                </summary>
                <div class="tool-fields">
                  <dl>
                    <template
                      v-for="(field, j) in readableFields(
                        m.tool_calls[entry.tool_index].params || {},
                      )"
                      :key="j"
                      ><dt>{{ field.label }}</dt>
                      <dd>{{ field.value }}</dd></template
                    >
                  </dl>
                  <p>{{ m.tool_calls[entry.tool_index].summary }}</p>
                  <button
                    v-for="(point, j) in m.tool_calls[entry.tool_index]
                      .evidence || []"
                    :key="j"
                    @click="toolEvidence(point)"
                  >
                    {{ point.label || "核对原画面" }} ·
                    {{
                      duration(
                        seconds(
                          point.timestamp_sec ??
                            point.time ??
                            point.timestamp ??
                            point.time_sec ??
                            0,
                        ),
                      )
                    }}
                  </button>
                </div>
              </details></template
            >
            <p v-if="!entries(m).length" class="muted">
              {{
                m.status === "processing"
                  ? "正在准备视频与工具…"
                  : "没有工具调用记录"
              }}
            </p>
          </details>
          <Answer
            v-if="m.status === 'completed'"
            :text="m.answer"
            @evidence="evidence"
          />
          <p v-else-if="m.status === 'failed'" class="error">
            {{ m.answer || "调查失败，请检查模型配置并重试" }}
          </p>
          <button v-if="m.status === 'completed'" @click="share(m)">
            分享结论</button
          ><button
            v-if="m.status === 'failed' && !running"
            @click="
              question = m.question;
              send();
            "
          >
            重新尝试这一问
          </button>
        </article>
        <form class="composer" @submit.prevent="send">
          <textarea
            v-model="question"
            :disabled="running"
            maxlength="4000"
            :placeholder="
              current
                ? '继续追问，沿用这些视频片段…'
                : '描述需要核查的事件或目标…'
            "
            required
            aria-label="调查问题"
          />
          <div class="row">
            <select v-model="configId" aria-label="本轮模型配置">
              <option v-if="!configs.length" value="">
                请在账号与模型中添加配置
              </option>
              <option v-for="c in configs" :key="c.id" :value="c.id">
                {{ c.name }} · {{ c.model }}
              </option></select
            ><button
              type="button"
              aria-label="刷新模型配置"
              @click="loadConfigs"
            >
              <Icon name="refresh" /></button
            ><button
              class="primary"
              :disabled="busy || running || !configId || !question.trim()"
            >
              <Icon name="send" />{{
                busy ? "正在提交…" : current ? "发送追问" : "开始调查"
              }}
            </button>
          </div>
        </form></template
      >
      <div v-else class="empty">
        <Icon name="agent" />
        <h2>沿着证据，展开一次调查</h2>
        <p>选择多个片段提问，并在同一条调查中继续追问。</p>
        <button class="primary" @click="start">新建调查</button>
      </div>
    </main>
  </div>
  <Modal v-if="rename" title="修改调查标题" @close="rename = null"
    ><form @submit.prevent="saveTitle">
      <label>标题<input v-model="newTitle" required maxlength="160" /></label
      ><button class="primary">保存标题</button>
    </form></Modal
  >
</template>
