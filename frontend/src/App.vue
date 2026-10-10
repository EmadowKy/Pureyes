<script setup>
import UserAvatar from "./components/UserAvatar.vue";
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from "vue";
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
import Modal from "./components/Modal.vue";
import { lockPageScroll, trapFocus } from "./lib/overlay";
const brandLogo = `${import.meta.env.BASE_URL}logo.png`;
const page = ref("workspace"),
  groups = ref([]),
  groupId = ref(""),
  ready = ref(false),
  busy = ref(false),
  error = ref(""),
  toast = ref("");
const compactNav = ref(localStorage.getItem("pureyes.compact-nav") === "true"),
  mobile = ref(matchMedia("(max-width: 760px)").matches),
  navOpen = ref(false),
  navPanel = ref(null),
  navToggle = ref(null),
  workspaceSearch = ref(""),
  workspaceLoading = ref(false),
  workspaceForm = ref(false),
  workspaceName = ref(""),
  workspaceSaving = ref(false);
const visibleWorkspaces = computed(() =>
  workspaces.value.filter((w) =>
    w.name.toLowerCase().includes(workspaceSearch.value.trim().toLowerCase()),
  ),
);
const screenQuery = matchMedia("(max-width: 760px)");
let releaseNavScroll;
function updateViewport(event) {
  mobile.value = event.matches;
  navOpen.value = false;
}
function toggleNav() {
  if (mobile.value) navOpen.value = !navOpen.value;
  else {
    compactNav.value = !compactNav.value;
    localStorage.setItem("pureyes.compact-nav", String(compactNav.value));
  }
}
function navigationKey(event) {
  if (mobile.value && navOpen.value) {
    if (event.key === "Escape") {
      event.preventDefault();
      navOpen.value = false;
    }
    trapFocus(event, navPanel.value);
  } else if (event.key === "Escape" && taskPanel.value) taskPanel.value = false;
}
watch(navOpen, async (value) => {
  releaseNavScroll?.();
  releaseNavScroll = undefined;
  if (value && mobile.value) {
    releaseNavScroll = lockPageScroll();
    await nextTick();
    navPanel.value?.querySelector("button")?.focus();
  } else if (mobile.value) {
    await nextTick();
    navToggle.value?.focus({ preventScroll: true });
  }
});
watch(page, () => {
  navOpen.value = false;
  taskPanel.value = false;
});
const credentials = reactive({
  emp_id: "",
  password: "",
  server: session.server,
});
const selectedGroup = computed(() =>
  groups.value.find((g) => g.id === Number(groupId.value)),
);
const workspaces = ref([]),
  workspacePreviews = ref({}),
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
  taskBusy = false,
  workspaceLoadVersion = 0;
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
    credentials.password = "";
    busy.value = false;
  }
}
async function logout() {
  navOpen.value = false;
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
  const version = ++workspaceLoadVersion;
  workspace.value = null;
  workspaces.value = [];
  workspacePreviews.value = {};
  workspaceSearch.value = "";
  workspaceLoading.value = !!groupId.value;
  error.value = "";
  if (!groupId.value) return;
  const id = groupId.value;
  try {
    const rows = await api(`/workspaces/${id}`);
    if (id === groupId.value && version === workspaceLoadVersion) {
      workspaces.value = rows;
      let next = 0;
      const current = () =>
        session.token &&
        id === groupId.value &&
        version === workspaceLoadVersion;
      const loadCovers = async () => {
        while (current() && next < rows.length) {
          const w = rows[next++];
          try {
            const clips = await api(`/workspaces/${w.id}/segments`);
            if (current())
              workspacePreviews.value[w.id] = {
                count: clips.length,
                cover: clips.find((clip) => clip.thumbnail_url)?.thumbnail_url,
              };
          } catch {
            /* Workspace navigation remains available without a cover. */
          }
        }
      };
      // Load progressively without blocking navigation or flooding the API.
      void Promise.all(
        Array.from({ length: Math.min(3, rows.length) }, loadCovers),
      );
    }
  } catch (e) {
    if (version === workspaceLoadVersion) error.value = e.message;
  } finally {
    if (version === workspaceLoadVersion) workspaceLoading.value = false;
  }
}
async function newWorkspace() {
  workspaceName.value = "";
  workspaceForm.value = true;
}
async function saveWorkspace() {
  const name = workspaceName.value.trim();
  if (!name) return;
  workspaceSaving.value = true;
  try {
    await api(`/workspaces/${groupId.value}`, {
      method: "POST",
      body: { name },
    });
    await loadWorkspaces();
    workspaceForm.value = false;
    notify("工作区已创建");
  } catch (e) {
    notify(e.message);
  } finally {
    workspaceSaving.value = false;
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
  screenQuery.addEventListener("change", updateViewport);
  document.addEventListener("keydown", navigationKey);
  if (session.token) await boot();
  taskTimer = setInterval(refreshTasks, 5000);
});
onUnmounted(() => {
  screenQuery.removeEventListener("change", updateViewport);
  document.removeEventListener("keydown", navigationKey);
  releaseNavScroll?.();
  clearInterval(taskTimer);
  clearTimeout(toastTimer);
});
</script>
<template>
  <main v-if="!ready" class="login-shell">
    <section class="login-story">
      <div class="brand">
        <img :src="brandLogo" alt="清眸" /><span
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
  <div
    v-else
    class="app-shell"
    :class="{ 'compact-nav': compactNav && !mobile }"
  >
    <Transition name="nav-mask"
      ><div v-if="mobile && navOpen" class="nav-mask" @click="navOpen = false"
    /></Transition>
    <Transition name="navigation"
      ><aside
        v-show="!mobile || navOpen"
        ref="navPanel"
        class="sidebar"
        :class="{ 'mobile-open': mobile && navOpen }"
        :role="mobile ? 'dialog' : undefined"
        :aria-modal="mobile ? true : undefined"
        aria-label="主导航"
      >
        <button
          v-if="mobile"
          class="nav-close icon-button"
          aria-label="关闭导航"
          @click="navOpen = false"
        >
          <Icon name="close" />
        </button>
        <div class="brand">
          <img :src="brandLogo" alt="清眸" /><span
            >清眸<small>PUREYES</small></span
          >
        </div>
        <button
          v-if="compactNav && !mobile"
          class="compact-group"
          title="展开小组选择"
          aria-label="展开小组选择"
          @click="toggleNav"
        >
          {{ selectedGroup?.name?.slice(0, 2) || "小组" }}
        </button>
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
            :aria-label="item.label"
            :title="compactNav ? item.label : undefined"
            :aria-current="page === item.id ? 'page' : undefined"
            @click="
              page = item.id;
              navOpen = false;
            "
          >
            <Icon :name="item.icon" /><span class="nav-label">{{
              item.label
            }}</span></button
          ><button
            v-if="['admin', 'super_admin'].includes(session.user?.role)"
            :class="{ active: page === 'admin' }"
            aria-label="用户管理"
            :aria-current="page === 'admin' ? 'page' : undefined"
            @click="
              page = 'admin';
              navOpen = false;
            "
          >
            <Icon name="lock" /><span class="nav-label">用户管理</span>
          </button>
        </nav>
        <a
          class="docs-link"
          href="http://116.62.178.139/"
          target="_blank"
          rel="noopener"
          title="使用文档"
          >使用文档 ↗</a
        >
        <div class="account">
          <UserAvatar :src="session.user.avatar" :name="session.user.name" />
          <div>
            <strong>{{ session.user.name }}</strong
            ><small>{{ session.user.emp_id }}</small>
          </div>
          <button class="icon-button" aria-label="退出登录" @click="logout">
            <Icon name="logout" />
          </button>
        </div></aside
    ></Transition>
    <div class="main-shell" :inert="mobile && navOpen">
      <header class="topbar">
        <button
          ref="navToggle"
          class="nav-toggle icon-button"
          :aria-label="
            mobile ? '打开导航' : compactNav ? '展开导航' : '收起导航'
          "
          :aria-expanded="mobile ? navOpen : !compactNav"
          @click="toggleNav"
        >
          <Icon :name="mobile ? 'menu' : 'panel'" />
        </button>
        <span class="breadcrumb"
          ><Icon name="group" />{{ selectedGroup?.name || "清眸" }}
          <span class="muted"
            >/ {{ nav.find((n) => n.id === page)?.label || "用户管理" }}</span
          ></span
        ><button
          class="task-trigger"
          :aria-expanded="taskPanel"
          aria-controls="task-panel"
          @click="taskPanel = !taskPanel"
        >
          <Icon name="agent" />调查任务
          <span class="count">{{
            tasks.filter((t) => t.status === "processing").length
          }}</span>
        </button>
      </header>
      <Transition name="panel"
        ><section v-if="taskPanel" id="task-panel" class="task-panel">
          <header>
            <h2>调查任务</h2>
            <button @click="allowNotifications">开启系统通知</button
            ><button aria-label="刷新任务" @click="refreshTasks">
              <Icon name="refresh" /></button
            ><button
              class="icon-button"
              aria-label="关闭任务面板"
              @click="taskPanel = false"
            >
              <Icon name="close" />
            </button>
          </header>
          <p v-if="taskError" class="error">{{ taskError }}</p>
          <div
            v-for="t in tasks"
            :key="t.task_id"
            class="task-row"
            @click="openTask(t)"
            @keydown.enter="openTask(t)"
            @keydown.space.prevent="openTask(t)"
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
            <span :class="['badge', t.status]">{{
              statusLabel(t.status)
            }}</span>
          </div>
          <p v-if="!tasks.length" class="empty">暂无调查任务</p>
          <p class="muted">
            网页打开期间同步进度；关闭网页后，服务端调查仍继续。
          </p>
        </section></Transition
      >
      <Transition name="page" mode="out-in"
        ><div
          :key="
            page +
            (page === 'workspace' ? ':' + (workspace?.id || 'overview') : '')
          "
          class="page-content"
        >
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
              ><header class="page-heading overview-heading">
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
              <div class="overview-summary">
                <div>
                  <span class="summary-icon"><Icon name="workspace" /></span
                  ><span
                    ><strong>{{ workspaces.length }}</strong> 个工作区</span
                  >
                </div>
                <div>
                  <span class="summary-icon"><Icon name="agent" /></span
                  ><span
                    ><strong>{{
                      workspaces.reduce((sum, w) => sum + (w.qa_count || 0), 0)
                    }}</strong>
                    轮调查记录</span
                  >
                </div>
                <span class="summary-status"
                  ><i
                    :class="{
                      working: tasks.some(
                        (t) =>
                          t.status === 'processing' &&
                          t.group_id === Number(groupId),
                      ),
                    }"
                  />{{
                    taskError
                      ? "任务状态待刷新"
                      : tasks.some(
                            (t) =>
                              t.status === "processing" &&
                              t.group_id === Number(groupId),
                          )
                        ? "调查正在进行"
                        : "当前无运行任务"
                  }}</span
                >
              </div>
              <div class="library-toolbar overview-toolbar">
                <label class="search-field"
                  ><Icon name="search" /><input
                    v-model="workspaceSearch"
                    aria-label="搜索工作区"
                    placeholder="查找工作区…"
                    type="search"
                /></label>
                <span class="muted">{{
                  workspaceLoading
                    ? "正在加载…"
                    : `${visibleWorkspaces.length} 个工作区`
                }}</span>
              </div>
              <div
                v-if="workspaceLoading"
                class="workspace-grid skeleton-grid"
                aria-label="正在加载工作区"
                aria-busy="true"
              >
                <div v-for="n in 3" :key="n" class="skeleton-card">
                  <div />
                  <i /><i />
                </div>
              </div>
              <div v-else class="workspace-grid">
                <button
                  v-for="w in visibleWorkspaces"
                  :key="w.id"
                  class="workspace-card"
                  @click="workspace = w"
                >
                  <div
                    class="workspace-cover"
                    :class="{ 'has-cover': workspacePreviews[w.id]?.cover }"
                  >
                    <img
                      v-if="workspacePreviews[w.id]?.cover"
                      :src="mediaUrl(workspacePreviews[w.id].cover)"
                      alt="录像封面"
                      loading="lazy"
                      @error="workspacePreviews[w.id].cover = ''"
                    />
                    <div v-else class="folder-art">
                      <Icon name="workspace" />
                    </div>
                    <span class="workspace-cover-label"
                      ><Icon name="clip" />{{
                        workspacePreviews[w.id]
                          ? workspacePreviews[w.id].count + " 个片段"
                          : "共享工作区"
                      }}</span
                    >
                  </div>
                  <div class="workspace-card-content">
                    <div class="card-mark">
                      <span>视频调查</span><Icon name="chevron" />
                    </div>
                    <h2>{{ w.name }}</h2>
                    <p>{{ w.qa_count || 0 }} 轮调查</p>
                    <footer>
                      {{ dateTime(w.created_at) }}<span>进入工作区 →</span>
                    </footer>
                  </div>
                </button>
              </div>
              <div v-if="!workspaceLoading && !workspaces.length" class="empty">
                <Icon name="workspace" />
                <h2>为调查建立一个工作区</h2>
                <p>
                  {{
                    groupId
                      ? "上传视频或截取监控录像，开始整理证据。"
                      : "先创建小组或在我的消息中接受邀请。"
                  }}
                </p>
              </div>
              <div
                v-else-if="!workspaceLoading && !visibleWorkspaces.length"
                class="empty"
              >
                <Icon name="search" />
                <h2>没有匹配的工作区</h2>
                <button @click="workspaceSearch = ''">清除搜索</button>
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
          /></div
      ></Transition>
    </div>
  </div>
  <Transition name="toast"
    ><div v-if="toast" class="toast" role="status">{{ toast }}</div></Transition
  >
  <Modal v-if="workspaceForm" title="新建工作区" @close="workspaceForm = false"
    ><form @submit.prevent="saveWorkspace">
      <label
        >工作区名称<input
          v-model="workspaceName"
          required
          maxlength="128"
          placeholder="例如：店内事件核查" /></label
      ><button class="primary" :disabled="workspaceSaving">
        {{ workspaceSaving ? "正在创建…" : "创建工作区" }}
      </button>
    </form></Modal
  >
</template>
