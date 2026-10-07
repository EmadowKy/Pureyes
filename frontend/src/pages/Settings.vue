<script setup>
import { onMounted, reactive, ref } from "vue";
import { api, session } from "../lib/api";
import Modal from "../components/Modal.vue";
const props = defineProps({ group: Object }),
  emit = defineEmits(["notify", "logout"]);
const profile = reactive({
    name: session.user.name,
    phone: session.user.phone || "",
    avatar: session.user.avatar || "",
  }),
  configs = ref([]),
  edit = ref(null),
  error = ref(""),
  busy = ref(false),
  password = ref(""),
  capturePassword = ref(""),
  capture = ref(false),
  privacyPending = ref(false);
const form = reactive({
  name: "",
  scope: "personal",
  api_key: "",
  base_url: "",
  model: "",
  group_id: null,
});
async function load() {
  try {
    configs.value = await api(
      `/model-configs${props.group ? "?group_id=" + props.group.id : ""}`,
    );
  } catch (e) {
    error.value = e.message;
  }
}
async function saveProfile() {
  try {
    session.user = await api("/users/me", { method: "PUT", body: profile });
    emit("notify", "个人资料已保存");
  } catch (e) {
    emit("notify", e.message);
  }
}
async function avatar(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024)
    return emit("notify", "请选择不超过 2 MB 的图片");
  const image = new Image(),
    url = URL.createObjectURL(file);
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 160;
    const context = canvas.getContext("2d"),
      size = Math.min(image.width, image.height);
    context.drawImage(
      image,
      (image.width - size) / 2,
      (image.height - size) / 2,
      size,
      size,
      0,
      0,
      160,
      160,
    );
    profile.avatar = canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    emit("notify", "图片无法读取");
  } finally {
    URL.revokeObjectURL(url);
  }
}
function model(c = {}) {
  Object.assign(form, {
    name: c.name || "",
    scope: c.scope || "personal",
    api_key: "",
    base_url: c.base_url || "",
    model: c.model || "",
    group_id: c.group_id || props.group?.id,
  });
  edit.value = { type: "model", id: c.id };
}
async function saveModel() {
  busy.value = true;
  try {
    const body = { ...form };
    if (edit.value.id && !body.api_key) delete body.api_key;
    await api(`/model-configs${edit.value.id ? "/" + edit.value.id : ""}`, {
      method: edit.value.id ? "PUT" : "POST",
      body,
    });
    form.api_key = "";
    edit.value = null;
    await load();
    emit("notify", "模型配置已保存");
  } catch (e) {
    emit("notify", e.message);
  } finally {
    busy.value = false;
  }
}
async function remove(c) {
  if (!confirm(`删除模型配置“${c.name}”？`)) return;
  try {
    await api(`/model-configs/${c.id}`, { method: "DELETE" });
    await load();
  } catch (e) {
    emit("notify", e.message);
  }
}
async function changePassword() {
  try {
    await api("/users/me", {
      method: "PUT",
      body: { password: password.value },
    });
    password.value = "";
    edit.value = null;
    emit("notify", "密码已修改，请重新登录");
    emit("logout");
  } catch (e) {
    emit("notify", e.message);
  }
}
async function savePrivacy() {
  busy.value = true;
  try {
    const result = await api("/auth/screen-capture", {
      method: "PUT",
      body: { password: capturePassword.value, allowed: privacyPending.value },
    });
    session.user.screen_capture_allowed = result.allowed;
    capture.value = result.allowed;
    edit.value = null;
    capturePassword.value = "";
    emit("notify", "鸿蒙端窗口隐私设置已更新");
  } catch (e) {
    capture.value = session.user.screen_capture_allowed;
    emit("notify", e.message);
  } finally {
    busy.value = false;
  }
}
function privacyChange(e) {
  privacyPending.value = e.target.checked;
  capture.value = e.target.checked;
  capturePassword.value = "";
  edit.value = { type: "privacy" };
}
function cancelPrivacy() {
  capture.value = !!session.user.screen_capture_allowed;
  capturePassword.value = "";
  edit.value = null;
}
onMounted(() => {
  capture.value = !!session.user.screen_capture_allowed;
  load();
});
</script>
<template>
  <div class="settings-layout">
    <header class="page-heading">
      <div>
        <p class="eyebrow">个人与团队配置</p>
        <h1>账号与模型</h1>
        <p>管理个人资料、账号安全，以及调查使用的模型。</p>
      </div>
    </header>
    <section class="panel">
      <h2>个人资料</h2>
      <form @submit.prevent="saveProfile">
        <div class="row">
          <label>姓名<input v-model="profile.name" required /></label
          ><label>手机号<input v-model="profile.phone" /></label
          ><label
            >头像<input type="file" accept="image/*" @change="avatar"
          /></label>
        </div>
        <button class="primary" style="justify-self: start">保存资料</button>
      </form>
    </section>
    <section class="panel">
      <header>
        <h2>模型 API 配置</h2>
        <button class="primary" @click="model()">+ 添加配置</button>
      </header>
      <p v-if="error" class="error">{{ error }}</p>
      <div v-for="c in configs" :key="c.id" class="task-row">
        <div>
          <strong>{{ c.name }}</strong>
          <p>
            {{ c.scope === "group" ? "小组共享" : "个人" }} · {{ c.model }} ·
            {{ c.api_key_configured ? "密钥已配置" : "未配置密钥" }}
          </p>
          <small class="muted">{{ c.base_url }}</small>
        </div>
        <template v-if="c.can_edit"
          ><button @click="model(c)">编辑</button
          ><button class="danger" @click="remove(c)">删除</button></template
        >
      </div>
      <p v-if="!configs.length" class="empty">
        添加支持视觉理解和工具调用的模型，开始调查。
      </p>
    </section>
    <section class="panel">
      <h2>账号安全</h2>
      <div class="row">
        <button @click="emit('logout')">退出登录</button>
        <button @click="edit = { type: 'password' }">修改密码</button
        ><label class="row"
          ><input
            type="checkbox"
            :checked="capture"
            @change="privacyChange"
          />允许鸿蒙端截图与录屏</label
        >
      </div>
      <p class="privacy-note" style="margin-top: 18px">
        此开关修改同一账号在鸿蒙应用中的窗口隐私设置。浏览器无法阻止操作系统截图或录屏；敏感画面请在受控环境查看。
      </p>
    </section>
  </div>
  <Modal
    v-if="edit?.type === 'model'"
    :title="edit.id ? '编辑模型配置' : '添加模型配置'"
    @close="
      form.api_key = '';
      edit = null;
    "
    ><form @submit.prevent="saveModel">
      <label>名称<input v-model="form.name" required maxlength="80" /></label
      ><label
        >使用范围<select v-model="form.scope" :disabled="!!edit.id">
          <option value="personal">个人</option>
          <option v-if="group?.is_creator" value="group">
            小组共享 · {{ group.name }}
          </option>
        </select></label
      ><label
        >接口地址<input
          v-model="form.base_url"
          type="url"
          required
          placeholder="https://服务商/兼容接口/v1" /></label
      ><label>模型名称<input v-model="form.model" required /></label
      ><label
        >API 密钥<input
          v-model="form.api_key"
          type="password"
          autocomplete="off"
          :required="!edit.id"
          :placeholder="edit.id ? '留空保留原密钥' : '输入服务商密钥'" /></label
      ><button class="primary" :disabled="busy">保存配置</button>
    </form></Modal
  ><Modal
    v-if="edit?.type === 'password'"
    title="修改密码"
    @close="
      password = '';
      edit = null;
    "
    ><form @submit.prevent="changePassword">
      <label
        >新密码<input
          v-model="password"
          type="password"
          minlength="6"
          autocomplete="new-password"
          required /></label
      ><button class="primary">修改密码并重新登录</button>
    </form></Modal
  ><Modal
    v-if="edit?.type === 'privacy'"
    title="验证密码"
    @close="cancelPrivacy"
    ><form @submit.prevent="savePrivacy">
      <p>将{{ privacyPending ? "允许" : "禁止" }}该账号在鸿蒙端截图与录屏。</p>
      <label
        >当前账号密码<input
          v-model="capturePassword"
          type="password"
          autocomplete="current-password"
          required /></label
      ><button class="primary" :disabled="busy">验证并更改</button>
    </form></Modal
  >
</template>
