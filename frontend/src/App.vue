<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import {
  api,
  clearSession,
  saveTokens,
  session,
  setServer,
  mediaUrl,
} from "./lib/api";
import { dateTime, duration, statusLabel } from "./lib/format";
import Icon from "./components/Icon.vue";
import Workspace from "./pages/Workspace.vue";
import Monitors from "./pages/Monitors.vue";
import People from "./pages/People.vue";
import Settings from "./pages/Settings.vue";
const page = ref("workspace"),
  groups = ref([]),
  groupId = ref(""),
  ready = ref(false),
  busy = ref(false),
  error = ref(""),
  toast = ref("");
const credentials = reactive({
  emp_id: "",
  password: "",
  server: session.server,
});
const selectedGroup = computed(() =>
  groups.value.find((g) => g.id === Number(groupId.value)),
);
const workspaces = ref([]),
  workspace = ref(null),
  jumpConversation = ref(""),
  tasks = ref([]),
  taskPanel = ref(false),
  taskError = ref("");
const nav = [
  { id: "workspace", label: "调查工作区", icon: "workspace" },
  { id: "monitor", label: "监控与回放", icon: "monitor" },
  { id: "group", label: "小组成员", icon: "group" },
  { id: "messages", label: "我的消息", icon: "bell" },
  { id: "settings", label: "账号与模型", icon: "key" },
];
let taskTimer,
  toastTimer,
  taskBusy = false;
const seenTasks = new Map();
function notify(text) {
  toast.value = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value = "";
  }, 5000);
}
async function boot() {
  try {
    session.user = await api("/users/me");
    groups.value = await api("/groups/");
    groupId.value = groups.value[0]?.id || "";
    ready.value = true;
    await refreshTasks();
  } catch (e) {
    error.value = e.message;
    if (!session.token) ready.value = false;
  }
}
async function login() {
  busy.value = true;
  error.value = "";
  try {
    setServer(credentials.server);
    saveTokens(
      await api("/auth/login", {
        method: "POST",
        body: {
          emp_id: credentials.emp_id.trim(),
          password: credentials.password,
        },
        auth: false,
      }),
    );
    credentials.password = "";
    await boot();
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
async function logout() {
  try {
    await api("/auth/logout", { method: "POST" });
  } catch (e) {
    notify(`已清除本机登录；服务端退出未确认：${e.message}`);
  }
  clearSession();
  groups.value = [];
  tasks.value = [];
  workspaces.value = [];
  workspace.value = null;
  seenTasks.clear();
  ready.value = false;
}
async function loadWorkspaces() {
  workspace.value = null;
  workspaces.value = [];
  error.value = "";
  if (!groupId.value) return;
  const id = groupId.value;
  try {
    const rows = await api(`/workspaces/${id}`);
    if (id === groupId.value) workspaces.value = rows;
  } catch (e) {
    error.value = e.message;
  }
}
async function newWorkspace() {
  const name = prompt("工作区名称")?.trim();
  if (!name) return;
  try {
    await api(`/workspaces/${groupId.value}`, {
      method: "POST",
      body: { name },
    });
    await loadWorkspaces();
    notify("工作区已创建");
  } catch (e) {
    notify(e.message);
  }
}
async function refreshGroups() {
  groups.value = await api("/groups/");
  if (!groups.value.some((g) => g.id === Number(groupId.value)))
    groupId.value = groups.value[0]?.id || "";
}
async function refreshTasks() {
  if (!session.token || taskBusy) return;
  taskBusy = true;
  try {
    const data = await api("/workspaces/agent/tasks");
    if (!session.token) return;
    tasks.value = data.tasks || [];
    taskError.value = "";
    for (const task of tasks.value) {
      if (
        seenTasks.get(task.task_id) === "processing" &&
        task.status !== "processing"
      ) {
        notify(`${task.title}：${statusLabel(task.status)}`);
        if ("Notification" in window && Notification.permission === "granted") {
          const notification = new Notification("清眸 · 调查状态更新", {
            body: `${statusLabel(task.status)} · 用时 ${duration(task.elapsed_seconds)}`,
            tag: task.task_id,
          });
          notification.onclick = () => {
            window.focus();
            openTask(task);
            notification.close();
          };
        }
      }
      seenTasks.set(task.task_id, task.status);
    }
  } catch (e) {
    taskError.value = e.message;
  } finally {
    taskBusy = false;
  }
}
async function openTask(task) {
  groupId.value = task.group_id;
  page.value = "workspace";
  await loadWorkspaces();
  workspace.value = workspaces.value.find(
    (w) => w.id === task.workspace_id,
  ) || { id: task.workspace_id, name: "调查工作区", group_id: task.group_id };
  jumpConversation.value = task.conversation_id;
  taskPanel.value = false;
}
async function allowNotifications() {
  if (!("Notification" in window) || !window.isSecureContext)
    return notify("系统通知需要 HTTPS 或 localhost 浏览器环境");
  const permission = await Notification.requestPermission();
  notify(
    permission === "granted"
      ? "已开启调查完成通知"
      : "可在浏览器网站设置中允许通知",
  );
}
watch(groupId, loadWorkspaces);
watch(
  () => session.token,
  (value) => {
    if (!value) ready.value = false;
  },
);
onMounted(async () => {
  if (session.token) await boot();
  taskTimer = setInterval(refreshTasks, 5000);
});
onUnmounted(() => {
  clearInterval(taskTimer);
  clearTimeout(toastTimer);
});
</script>
<template>
  <main v-if="!ready" class="login-shell">
    <section class="login-story">
      <div class="brand">
        <img src="/logo.png" alt="清眸" /><span
          >清眸<small>PUREYES</small></span
        >
      </div>
      <div class="story-copy">
        <p class="eyebrow">多视频调查工作台</p>
        <h1>让每一条线索<br />回到原画面。</h1>
        <p>
          整理录像、核查目标、串联证据。<br />从一个问题开始，沿着线索继续调查。
        </p>
      </div>
      <div class="evidence-motif">
        <span>视频片段</span><i></i><span>工具核验</span><i></i
        ><span>证据结论</span>
      </div>
    </section>
    <section class="login-form">
      <p class="eyebrow">欢迎回来</p>
      <h2>登录清眸</h2>
      <p>使用团队分配的工号与密码</p>
      <form @submit.prevent="login">
        <label
          >工号<input
            v-model="credentials.emp_id"
            autocomplete="username"
            required /></label
        ><label
          >密码<input
            v-model="credentials.password"
            type="password"
            autocomplete="current-password"
            required
        /></label>
        <details>
          <summary>服务器连接</summary>
          <label
            >服务器地址<input
              v-model="credentials.server"
              placeholder="留空使用网站代理"
              type="text"
          /></label>
          <p class="muted">
            开发环境默认连接 116.62.178.139。正式网站可配置同源代理。
          </p>
        </details>
        <p v-if="error" role="alert" class="error">{{ error }}</p>
        <button class="primary" :disabled="busy">
          {{ busy ? "正在登录…" : "登录" }}<Icon name="chevron" />
        </button>
      </form>
    </section>
  </main>
  <div v-else class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <img src="/logo.png" alt="清眸" /><span
          >清眸<small>PUREYES</small></span
        >
      </div>
      <label class="group-picker"
        >当前小组<select v-model="groupId">
          <option v-if="!groups.length" value="">尚未加入小组</option>
          <option v-for="g in groups" :key="g.id" :value="g.id">
            {{ g.name }}
          </option>
        </select></label
      >
      <nav>
        <button
          v-for="item in nav"
          :key="item.id"
          :class="{ active: page === item.id }"
          @click="page = item.id"
        >
          <Icon :name="item.icon" />{{ item.label }}</button
        ><button
          v-if="['admin', 'super_admin'].includes(session.user?.role)"
          :class="{ active: page === 'admin' }"
          @click="page = 'admin'"
        >
          <Icon name="lock" />用户管理
        </button>
      </nav>
      <a
        class="docs-link"
        href="http://116.62.178.139/"
        target="_blank"
        rel="noopener"
        >使用文档 ↗</a
      >
      <div class="account">
        <img
          v-if="session.user.avatar"
          :src="mediaUrl(session.user.avatar)"
          alt="头像"
        />
        <div v-else class="avatar">{{ session.user.name?.slice(0, 1) }}</div>
        <div>
          <strong>{{ session.user.name }}</strong
          ><small>{{ session.user.emp_id }}</small>
        </div>
        <button class="icon-button" aria-label="退出登录" @click="logout">
          <Icon name="logout" />
        </button>
      </div>
    </aside>
    <div class="main-shell">
      <header class="topbar">
        <span
          >{{ selectedGroup?.name || "清眸" }}
          <span class="muted"
            >/ {{ nav.find((n) => n.id === page)?.label || "用户管理" }}</span
          ></span
        ><button @click="taskPanel = !taskPanel">
          <Icon name="agent" />调查任务
          <span class="count">{{
            tasks.filter((t) => t.status === "processing").length
          }}</span>
        </button>
      </header>
      <section v-if="taskPanel" class="task-panel">
        <header>
          <h2>调查任务</h2>
          <button @click="allowNotifications">开启系统通知</button
          ><button aria-label="刷新任务" @click="refreshTasks">
            <Icon name="refresh" />
          </button>
        </header>
        <p v-if="taskError" class="error">{{ taskError }}</p>
        <div
          v-for="t in tasks"
          :key="t.task_id"
          class="task-row"
          @click="openTask(t)"
          @keydown.enter="openTask(t)"
          tabindex="0"
          role="button"
        >
          <Icon name="agent" />
          <div>
            <strong>{{ t.title }}</strong>
            <p>
              {{ t.stage }} · {{ t.steps }} 步 ·
              {{ duration(t.elapsed_seconds) }}
            </p>
          </div>
          <span :class="['badge', t.status]">{{ statusLabel(t.status) }}</span>
        </div>
        <p v-if="!tasks.length" class="empty">暂无调查任务</p>
        <p class="muted">
          网页打开期间同步进度；关闭网页后，服务端调查仍继续。
        </p>
      </section>
      <div class="page-content">
        <p v-if="error" class="error" role="alert">
          {{ error }} <button @click="loadWorkspaces">重试</button>
        </p>
        <template v-if="page === 'workspace'"
          ><Workspace
            v-if="workspace"
            :key="workspace.id"
            :workspace="workspace"
            :jump-conversation="jumpConversation"
            @back="
              workspace = null;
              jumpConversation = '';
            "
            @notify="notify"
          />
          <template v-else
            ><header class="page-heading">
              <div>
                <p class="eyebrow">共享证据 · 连续调查</p>
                <h1>调查工作区</h1>
                <p>把相关录像与线索放在一起，让团队沿着证据继续追问。</p>
              </div>
              <button
                class="primary"
                :disabled="!groupId"
                @click="newWorkspace"
              >
                <Icon name="plus" />新建工作区
              </button>
            </header>
            <div class="workspace-grid">
              <button
                v-for="w in workspaces"
                :key="w.id"
                class="workspace-card"
                @click="workspace = w"
              >
                <div class="card-mark">
                  <Icon name="workspace" /><Icon name="chevron" />
                </div>
                <h2>{{ w.name }}</h2>
                <p>{{ w.qa_count || 0 }} 轮调查</p>
                <footer>
                  {{ dateTime(w.created_at) }}<span>进入工作区 →</span>
                </footer>
              </button>
            </div>
            <div v-if="!workspaces.length" class="empty">
              <Icon name="workspace" />
              <h2>为调查建立一个工作区</h2>
              <p>
                {{
                  groupId
                    ? "上传视频或截取监控录像，开始整理证据。"
                    : "先创建小组或在我的消息中接受邀请。"
                }}
              </p>
            </div></template
          >
        </template>
        <Monitors
          v-else-if="page === 'monitor'"
          :key="groupId"
          :group="selectedGroup"
          @notify="notify"
        />
        <People
          v-else-if="['group', 'messages', 'admin'].includes(page)"
          :key="page + groupId"
          :mode="page"
          :group="selectedGroup"
          @notify="notify"
          @groups-changed="refreshGroups"
        />
        <Settings
          v-else
          :group="selectedGroup"
          @notify="notify"
          @logout="logout"
        />
      </div>
    </div>
  </div>
  <div v-if="toast" class="toast" role="status">{{ toast }}</div>
</template>
