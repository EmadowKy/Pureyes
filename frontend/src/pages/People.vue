<script setup>
import { onMounted, reactive, ref } from "vue";
import { api, session, mediaUrl } from "../lib/api";
import { statusLabel } from "../lib/format";
import Icon from "../components/Icon.vue";
import Modal from "../components/Modal.vue";
const props = defineProps({ mode: String, group: Object }),
  emit = defineEmits(["notify", "groups-changed"]);
const rows = ref([]),
  sent = ref([]),
  query = ref(""),
  candidates = ref([]),
  error = ref(""),
  edit = ref(null),
  info = ref(null),
  groupName = ref(""),
  createGroup = ref(false);
const form = reactive({
  emp_id: "",
  name: "",
  phone: "",
  avatar: "",
  password: "",
});
async function load() {
  try {
    error.value = "";
    if (props.mode === "messages") {
      rows.value = await api("/groups/invites");
      const groups = await api("/groups/");
      sent.value = [];
      for (const g of groups.filter((x) => x.is_creator))
        sent.value.push(...(await api(`/groups/${g.id}/invites`)));
    } else if (props.mode === "admin")
      rows.value = await api(
        `/users/?keyword=${encodeURIComponent(query.value)}`,
      );
    else if (props.group)
      rows.value = await api(
        `/groups/${props.group.id}/members?include_pending=1`,
      );
  } catch (e) {
    error.value = e.message;
  }
}
async function search() {
  try {
    candidates.value = await api(
      `/users/search?keyword=${encodeURIComponent(query.value)}`,
    );
  } catch (e) {
    error.value = e.message;
  }
}
async function invite(user) {
  try {
    await api(`/groups/${props.group.id}/invite`, {
      method: "POST",
      body: { emp_id: user.emp_id },
    });
    candidates.value = [];
    query.value = "";
    await load();
    emit("notify", "邀请已发送");
  } catch (e) {
    emit("notify", e.message);
  }
}
async function respond(invite, action) {
  try {
    await api(`/groups/${invite.group_id}/respond`, {
      method: "POST",
      body: { action },
    });
    await load();
    emit("groups-changed");
    emit("notify", action === "accept" ? "已加入小组" : "已拒绝邀请");
  } catch (e) {
    emit("notify", e.message);
  }
}
async function removeMember(user, group = props.group) {
  if (!confirm(`移除 ${user.name || user.emp_id}？`)) return;
  try {
    await api(
      `/groups/${group.id || group.group_id}/members/${encodeURIComponent(user.emp_id)}`,
      { method: "DELETE" },
    );
    await load();
    emit("groups-changed");
  } catch (e) {
    emit("notify", e.message);
  }
}
async function saveGroup() {
  try {
    await api(`/groups/${createGroup.value ? "" : props.group.id}`, {
      method: createGroup.value ? "POST" : "PUT",
      body: { name: groupName.value },
    });
    edit.value = null;
    await load();
    emit("groups-changed");
    emit("notify", "小组已保存");
  } catch (e) {
    emit("notify", e.message);
  }
}
async function leave() {
  if (!confirm("退出此小组后将无法访问其视频和调查，确认退出？")) return;
  try {
    await api(`/groups/${props.group.id}/leave`, { method: "POST" });
    emit("groups-changed");
  } catch (e) {
    emit("notify", e.message);
  }
}
function newUser() {
  Object.assign(form, {
    emp_id: "",
    name: "",
    phone: "",
    avatar: "",
    password: "",
  });
  edit.value = { type: "user" };
}
async function saveUser() {
  try {
    await api("/users/", { method: "POST", body: form });
    edit.value = null;
    await load();
    emit("notify", "用户已创建");
  } catch (e) {
    emit("notify", e.message);
  }
}
async function adminAction(user, action) {
  let method = "PUT",
    body = {};
  if (action === "status") body = { is_active: !user.is_active };
  if (action === "role")
    body = { role: user.role === "admin" ? "user" : "admin" };
  if (action === "password") {
    const password = prompt("新密码（至少 6 位）");
    if (!password) return;
    body = { password };
  }
  if (action === "delete") {
    if (!confirm(`删除用户 ${user.emp_id}？其所有权将移交当前管理员。`)) return;
    method = "DELETE";
  }
  try {
    await api(
      `/users/${encodeURIComponent(user.emp_id)}${action === "delete" ? "" : "/" + action}`,
      { method, body },
    );
    await load();
    emit("notify", "用户已更新");
  } catch (e) {
    emit("notify", e.message);
  }
}
async function editUser(user) {
  const name = prompt("姓名", user.name);
  if (name === null) return;
  try {
    await api(`/users/${encodeURIComponent(user.emp_id)}`, {
      method: "PUT",
      body: { name },
    });
    await load();
  } catch (e) {
    emit("notify", e.message);
  }
}
onMounted(load);
</script>
<template>
  <header class="page-heading">
    <div>
      <p class="eyebrow">团队协作</p>
      <h1>
        {{
          mode === "admin"
            ? "用户管理"
            : mode === "messages"
              ? "我的消息"
              : group?.name || "小组成员"
        }}
      </h1>
      <p>
        {{
          mode === "messages"
            ? "处理小组邀请，查看待确认成员。"
            : "管理团队与成员的访问权限。"
        }}
      </p>
    </div>
    <div class="row">
      <button v-if="mode === 'admin'" class="primary" @click="newUser">
        创建用户</button
      ><button
        v-else-if="mode === 'group'"
        @click="
          createGroup = true;
          groupName = '';
          edit = { type: 'group' };
        "
      >
        新建小组</button
      ><button
        v-if="mode === 'group' && group?.is_creator"
        @click="
          createGroup = false;
          groupName = group.name;
          edit = { type: 'group' };
        "
      >
        修改组名</button
      ><button
        v-if="mode === 'group' && group && !group.is_creator"
        class="danger"
        @click="leave"
      >
        退出小组
      </button>
    </div>
  </header>
  <p v-if="error" class="error" role="alert">
    {{ error }} <button @click="load">重试</button>
  </p>
  <template v-if="mode === 'messages'"
    ><section class="panel">
      <h2>收到的邀请</h2>
      <div v-for="r in rows" :key="r.id" class="task-row">
        <Icon name="group" />
        <div>
          <strong>{{ r.group_name }}</strong>
          <p>组长 {{ r.creator_id }} 邀请你加入</p>
        </div>
        <button class="primary" @click="respond(r, 'accept')">接受</button
        ><button @click="respond(r, 'reject')">拒绝</button>
      </div>
      <p v-if="!rows.length" class="empty">没有待处理邀请</p>
    </section>
    <section class="panel">
      <h2>发出的邀请</h2>
      <div v-for="r in sent" :key="r.id" class="task-row">
        <div>
          <strong>{{ r.name || r.emp_id }}</strong>
          <p>{{ r.group_name }} · 待确认</p>
        </div>
        <button @click="removeMember(r, { id: r.group_id })">撤回邀请</button>
      </div>
      <p v-if="!sent.length" class="empty">没有待确认的邀请</p>
    </section></template
  >
  <template v-else
    ><section class="panel">
      <form class="row" @submit.prevent="mode === 'admin' ? load() : search()">
        <input
          v-model="query"
          placeholder="搜索工号、姓名或手机号"
          aria-label="搜索用户"
        /><button><Icon name="search" />搜索</button>
      </form>
      <div v-for="u in candidates" :key="u.emp_id" class="task-row">
        <div>
          <strong>{{ u.name }}</strong>
          <p>{{ u.emp_id }} · {{ u.phone || "未填写手机号" }}</p>
        </div>
        <button
          v-if="group?.is_creator"
          :disabled="u.emp_id === session.user.emp_id"
          @click="invite(u)"
        >
          邀请加入
        </button>
      </div>
    </section>
    <section class="panel table-scroll">
      <table>
        <thead>
          <tr>
            <th>成员</th>
            <th>工号</th>
            <th>手机号</th>
            <th>身份</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in rows" :key="u.emp_id">
            <td>
              <button class="icon-button" @click="info = u">
                <img
                  v-if="u.avatar"
                  :src="mediaUrl(u.avatar)"
                  alt="头像"
                  width="32"
                  height="32"
                />{{ u.name }}
              </button>
            </td>
            <td>{{ u.emp_id }}</td>
            <td>{{ u.phone || "—" }}</td>
            <td>
              {{
                u.is_creator
                  ? "组长"
                  : u.role === "super_admin"
                    ? "超级管理员"
                    : u.role === "admin"
                      ? "管理员"
                      : "成员"
              }}
            </td>
            <td>
              <span :class="['badge', u.status]">{{
                mode === "admin"
                  ? u.is_active
                    ? "启用"
                    : "停用"
                  : u.status === "pending"
                    ? "待确认"
                    : statusLabel(u.status)
              }}</span>
            </td>
            <td>
              <div class="row">
                <template
                  v-if="
                    mode === 'admin' &&
                    u.emp_id !== session.user.emp_id &&
                    u.role !== 'super_admin'
                  "
                  ><button @click="editUser(u)">编辑</button
                  ><button @click="adminAction(u, 'status')">
                    {{ u.is_active ? "停用" : "启用" }}</button
                  ><button
                    v-if="session.user.role === 'super_admin'"
                    @click="adminAction(u, 'role')"
                  >
                    {{ u.role === "admin" ? "设为成员" : "设为管理员" }}</button
                  ><button @click="adminAction(u, 'password')">重置密码</button
                  ><button class="danger" @click="adminAction(u, 'delete')">
                    删除
                  </button></template
                ><button
                  v-else-if="
                    mode === 'group' && group?.is_creator && !u.is_creator
                  "
                  class="danger"
                  @click="removeMember(u)"
                >
                  {{ u.status === "pending" ? "撤回邀请" : "移除" }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!rows.length" class="empty">暂无成员</p>
    </section></template
  >
  <Modal
    v-if="edit?.type === 'group'"
    :title="createGroup ? '新建小组' : '修改组名'"
    @close="edit = null"
    ><form @submit.prevent="saveGroup">
      <label
        >小组名称<input v-model="groupName" required maxlength="128" /></label
      ><button class="primary">保存小组</button>
    </form></Modal
  ><Modal v-if="edit?.type === 'user'" title="创建用户" @close="edit = null"
    ><form @submit.prevent="saveUser">
      <label>工号<input v-model="form.emp_id" required /></label
      ><label>姓名<input v-model="form.name" required /></label
      ><label>手机号<input v-model="form.phone" /></label
      ><label
        >初始密码<input
          v-model="form.password"
          type="password"
          minlength="6"
          autocomplete="new-password"
          required /></label
      ><button class="primary">创建用户</button>
    </form></Modal
  ><Modal v-if="info" title="成员资料" @close="info = null"
    ><h2>{{ info.name }}</h2>
    <p>工号：{{ info.emp_id }}</p>
    <p>手机号：{{ info.phone || "未填写" }}</p></Modal
  >
</template>
