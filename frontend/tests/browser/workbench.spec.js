import { test, expect } from "@playwright/test";

async function setup(page, avatar = "") {
  const state = { submitted: [], renamed: [], progress: false, requests: [] };
  const user = {
    emp_id: "tester",
    name: "网页验收",
    role: "super_admin",
    is_active: true,
    screen_capture_allowed: false,
    avatar,
  };
  const segments = [1, 2].map((id) => ({
    id,
    video_name: `录像 ${id}`,
    remark: `线索 ${id}`,
    duration: 90,
    status: "completed",
    progress: 100,
    resolution: "1080P",
    sample_fps: 1,
    thumbnail_url: "/logo.png",
    media_url: `/api/video/storage/slices/${id}.mp4?media_token=test`,
  }));
  const conversation = {
    id: "case1",
    title: "车辆去向核查",
    segment_ids: [1, 2],
    turn_count: 1,
    latest_status: "completed",
    can_manage: true,
  };
  const messages = () => [
    {
      id: "turn1",
      creator_id: "tester",
      turn_index: 1,
      question: "车辆去了哪里？",
      answer:
        '## 关键证据\n车辆经过门口。[video:"2", time:"00:04"]\n<script>window.xss=true</script>\nFRAME_OBSERVATION internal',
      status: state.progress ? "processing" : "completed",
      created_at: new Date().toISOString(),
      elapsed_seconds: 24,
      model_config_label: "视觉模型",
      tool_calls: [
        {
          name: "read_frames",
          status: "completed",
          params: {
            frames: [
              { video_id: 1, time: "00:02" },
              { video_id: 2, time: "00:04" },
            ],
          },
          summary: "已核验两个镜头",
          evidence: [{ segment_id: 2, timestamp_sec: 4, label: "门口画面" }],
        },
      ],
      process_entries: [
        { kind: "commentary", text: "先核对门口的车辆，再对照另一镜头。" },
        { kind: "tool", tool_index: 0 },
      ],
    },
  ];
  await page.route("**/api/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname,
      method = request.method();
    state.requests.push({ path, method, body: request.postData() });
    let data = [];
    if (path === "/api/auth/login")
      data = { access_token: "test", refresh_token: "refresh", user };
    else if (path === "/api/users/me") data = user;
    else if (path === "/api/groups/")
      data = [{ id: 1, name: "test1", is_creator: true, creator_id: "tester" }];
    else if (path === "/api/workspaces/1")
      data = [{ id: 1, name: "test", qa_count: 1 }];
    else if (path.endsWith("/segments")) data = segments;
    else if (path === "/api/workspaces/face-backend") data = { mode: "server" };
    else if (path.endsWith("/model-configs") || path === "/api/model-configs")
      data = [
        {
          id: 1,
          name: "视觉模型",
          model: "qwen",
          scope: "group",
          can_edit: true,
          api_key_configured: true,
          base_url: "https://example.com/v1",
        },
      ];
    else if (path.endsWith("/agent/conversations")) data = [conversation];
    else if (path.endsWith("/messages"))
      data = { conversation, messages: messages() };
    else if (path.endsWith("/agent/tasks"))
      data = { tasks: [], active_count: 0 };
    else if (path === "/api/workspaces/1/qa" && method === "POST") {
      state.submitted.push(request.postDataJSON());
      data = { task_id: "turn1", conversation_id: "case1" };
      state.progress = true;
    } else if (
      path === "/api/workspaces/agent/conversations/case1" &&
      method === "PUT"
    ) {
      state.renamed.push(request.postDataJSON());
      conversation.title = request.postDataJSON().title;
      data = conversation;
    } else if (path.endsWith("/video-sources"))
      data = [
        {
          id: "upload_1",
          name: "上传录像",
          source_type: "upload",
          duration: 90,
          filepath: "storage/uploads/1/a.mp4",
          raw_filename: "a.mp4",
        },
      ];
    else if (path === "/api/workspaces/1/faces")
      data = [
        { id: 1, name: "人脸 #1", avatar_url: "/logo.png", record_count: 1 },
        { id: 2, name: "人脸 #2", avatar_url: "/logo.png", record_count: 1 },
      ];
    else if (path.endsWith("/records"))
      data = [
        {
          id: 4,
          video_name: "录像 1",
          segment_id: 1,
          start_time_offset: 2,
          end_time_offset: 4,
          time_range_str: "00:02 - 00:04",
          crop_url: "/logo.png",
          segment_media_url: segments[0].media_url,
        },
      ];
    else if (path === "/api/monitors/1")
      data = [
        {
          id: 1,
          name: "门口监控",
          status: "online",
          can_manage: true,
          live_url: "/api/video/live/1/index.m3u8?media_token=test",
        },
      ];
    else if (path.endsWith("/history")) {
      const anchor = +new Date(url.searchParams.get("anchor"));
      const step = {
        day: 86400000,
        hour: 3600000,
        minute: 60000,
        second: 1000,
      }[url.searchParams.get("granularity")];
      data = {
        window_start: new Date(anchor - step * 6).toISOString(),
        window_end: new Date(anchor + step * 6).toISOString(),
        available_ranges: [
          {
            start_time: new Date(anchor - step * 4).toISOString(),
            end_time: new Date(anchor - step * 2).toISOString(),
          },
        ],
      };
    } else if (path.endsWith("/playback"))
      return route.fulfill({
        status: 404,
        json: { code: 4044, message: "recording not found" },
      });
    else if (path.endsWith("/members"))
      data = [
        {
          emp_id: "tester",
          name: "网页验收",
          role: "user",
          status: "accepted",
          is_creator: true,
        },
        { emp_id: "member", name: "组员", role: "user", status: "pending" },
      ];
    else if (path === "/api/groups/invites")
      data = [
        { id: 3, group_id: 2, group_name: "现场团队", creator_id: "leader" },
      ];
    else if (path === "/api/users/")
      data = [
        user,
        { emp_id: "member", name: "组员", role: "user", is_active: true },
      ];
    else if (path === "/api/users/search")
      data = [{ emp_id: "candidate", name: "候选成员", is_active: true }];
    else if (path === "/api/auth/screen-capture")
      return route.fulfill({
        status: 403,
        json: { code: 1304, message: "当前账号密码不正确，设置未修改" },
      });
    else if (path.startsWith("/api/video/"))
      return route.fulfill({ status: 404, body: "" });
    await route.fulfill({ json: { code: 0, data } });
  });
  await page.goto("/");
  await page.getByLabel("工号", { exact: true }).fill("tester");
  await page.getByLabel("密码", { exact: true }).fill("testpass");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "调查工作区", exact: true }),
  ).toBeVisible();
  return state;
}
async function workspace(page) {
  await page.getByRole("button", { name: /test.*进入工作区/ }).click();
}

test("server-hosted avatar retains its static path and renders in profile views", async ({
  page,
}) => {
  await page.route("**/demo-assets/avatars/admin.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="32" fill="#3371cc"/></svg>',
    }),
  );
  await setup(page, "http://116.62.178.139/demo-assets/avatars/admin.svg");
  const avatar = page.locator(".account img.user-avatar");
  await expect(avatar).toHaveAttribute("src", "/demo-assets/avatars/admin.svg");
  await expect
    .poll(
      () =>
        avatar.evaluate((image) => image.complete && image.naturalWidth > 0),
      { timeout: 30000 },
    )
    .toBe(true);
  await page.getByRole("button", { name: "账号与模型", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator(".settings-layout img.user-avatar")
        .evaluate((image) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
});

test("broken avatars show the user's initial instead of a broken image", async ({
  page,
}) => {
  await page.route("**/demo-assets/avatars/missing.svg", (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
  await setup(page, "http://116.62.178.139/demo-assets/avatars/missing.svg");
  await expect(page.locator(".account .user-avatar")).toHaveText("网");
  await expect(page.locator(".account img.user-avatar")).toHaveCount(0);
});
test("workspace, face records, parameters, citations and sanitized answer", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await setup(page);
  await workspace(page);
  await expect(page.getByRole("heading", { name: "线索 1" })).toBeVisible();
  await page.screenshot({
    path: "test-results/screens/workspace.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "人脸", exact: true }).click();
  await page.getByRole("button", { name: "查看出现记录" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("00:02 - 00:04");
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", { name: "调查问答", exact: true }).click();
  await page.getByRole("button", { name: "车辆去向核查", exact: true }).click();
  await expect(page.getByRole("heading", { name: "关键证据" })).toBeVisible();
  const historyBounds = await page
    .locator(".conversation-history")
    .boundingBox();
  const composerBounds = await page.locator(".composer").boundingBox();
  expect(historyBounds.y + historyBounds.height).toBeLessThanOrEqual(
    composerBounds.y,
  );
  await expect(page.locator(".answer")).not.toContainText("FRAME_OBSERVATION");
  expect(await page.evaluate(() => window.xss)).toBeUndefined();
  await page.getByText("引用片段 · 2", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: /视频 2 · 线索 2/ }),
  ).toBeVisible();
  await page.getByText("查看调查过程 · 1 次工具调用").click();
  await expect(page.getByText("先核对门口的车辆")).toBeVisible();
  await page.locator(".tool-row summary").click();
  await expect(
    page.getByText("核验画面 2 · 视频编号", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "视频 2 · 00:04" }).click();
  await expect(page.getByRole("dialog")).toContainText("线索 2");
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page
    .getByRole("button", { name: "门口画面 · 0:04", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("线索 2");
  expect(errors).toEqual([]);
});

test("local upload is scoped to the workspace and retains full preprocessing options", async ({
  page,
}) => {
  const state = await setup(page);
  await workspace(page);
  await page.getByRole("button", { name: "截取新片段", exact: true }).click();
  await page.route("**/api/workspaces/1/upload-video", (route) =>
    route.fulfill({
      json: {
        code: 0,
        data: {
          id: "upload_test",
          source_type: "upload",
          name: "uploaded.mp4",
          raw_filename: "uploaded.mp4",
          duration: 12,
          filepath: "storage/uploads/1/uploaded.mp4",
        },
      },
    }),
  );
  await page.locator("input[type=file]").setInputFiles({
    name: "uploaded.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("browser upload transport fixture"),
  });
  await expect(page.getByLabel("结束（秒）")).toHaveValue("12");
  await page.getByRole("button", { name: "创建片段", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const created = state.requests.find(
    (x) => x.path === "/api/workspaces/1/segments" && x.method === "POST",
  );
  expect(JSON.parse(created.body)).toMatchObject({
    source_type: "upload",
    filepath: "storage/uploads/1/uploaded.mp4",
    end_offset: 12,
    enable_preprocess: true,
  });
});

test("historical playback clock advances and ends at the next recording boundary", async ({
  page,
}) => {
  const state = await setup(page);
  const requests = [];
  await page.route("**/api/monitors/1/playback?*", (route) => {
    requests.push(new URL(route.request().url()).searchParams.get("time"));
    return route.fulfill({
      json: {
        code: 0,
        data: {
          playback_url:
            "/api/video/storage/streams/1/test.mp4?media_token=test",
          seek_offset_seconds: 10,
          segment_end_time: "2026-09-29T12:01:00",
        },
      },
    });
  });
  await page.getByRole("button", { name: "监控与回放", exact: true }).click();
  await page.getByRole("button", { name: "查看画面", exact: true }).click();
  await page.getByLabel("定位时间").fill("2026-09-29T12:00:10");
  await page.getByLabel("定位时间").blur();
  await expect.poll(() => requests.length).toBe(1);
  await expect(page.getByText("回放", { exact: true })).toBeVisible();
  await page.locator("video").evaluate((v) => {
    v.currentTime = 20;
    v.dispatchEvent(new Event("timeupdate"));
  });
  await expect(page.locator(".toolbar")).toContainText("12:00:20");
  await page
    .locator("video")
    .evaluate((v) => v.dispatchEvent(new Event("ended")));
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1]).toBe("2026-09-29T12:01:00");
});

test("stop and delete actions target only the selected investigation", async ({
  page,
}) => {
  const state = await setup(page);
  await workspace(page);
  await page.getByRole("button", { name: "调查问答", exact: true }).click();
  state.progress = true;
  await page.getByRole("button", { name: "车辆去向核查", exact: true }).click();
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "停止本轮", exact: true }).click();
  expect(
    state.requests.some(
      (x) => x.path === "/api/workspaces/qa/turn1/stop" && x.method === "POST",
    ),
  ).toBe(true);
  state.progress = false;
  await expect(page.locator(".composer textarea")).toBeEnabled({
    timeout: 10000,
  });
  await page.getByText("⋯ 更多").click();
  await page.getByRole("button", { name: "删除记录", exact: true }).click();
  expect(
    state.requests.some(
      (x) =>
        x.path === "/api/workspaces/agent/conversations/case1" &&
        x.method === "DELETE",
    ),
  ).toBe(true);
  expect(
    state.requests.some(
      (x) => x.method === "DELETE" && x.path.includes("/segments"),
    ),
  ).toBe(false);
});
test("new multi-video investigation, live process and follow-up scope", async ({
  page,
}) => {
  const state = await setup(page);
  await workspace(page);
  await page.getByRole("button", { name: "调查问答", exact: true }).click();
  await page
    .getByRole("button", { name: "新建调查", exact: true })
    .first()
    .click();
  await page.locator(".selection-list input").first().check();
  await page.locator(".selection-list input").nth(1).check();
  await page.getByLabel("调查问题").fill("核查车辆去向");
  await page.getByRole("button", { name: "开始调查", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "停止本轮", exact: true }),
  ).toBeVisible();
  expect(state.submitted[0].segment_ids).toEqual([1, 2]);
  await expect(page.locator(".composer textarea")).toBeDisabled();
  await expect(page.getByText("先核对门口的车辆")).toBeVisible();
  state.progress = false;
  await expect(page.locator(".composer textarea")).toBeEnabled({
    timeout: 10000,
  });
  await page.getByLabel("调查问题").fill("后来出现在哪里？");
  await page.getByRole("button", { name: "发送追问", exact: true }).click();
  expect(state.submitted[1].conversation_id).toBe("case1");
  expect(state.submitted[1].segment_ids).toBeUndefined();
});
test("rename and clip creation form preserve preprocessing controls", async ({
  page,
}) => {
  const state = await setup(page);
  await workspace(page);
  await page.getByRole("button", { name: "截取新片段", exact: true }).click();
  await page
    .getByRole("combobox", { name: "视频源", exact: true })
    .selectOption("upload_1");
  await expect(page.getByLabel("结束（秒）")).toHaveValue("90");
  await expect(page.getByText("AI 特征提取与识别预处理")).toBeVisible();
  await page.getByLabel("采样率").selectOption("2");
  await page.getByLabel("画质").selectOption("720P");
  await page.getByRole("button", { name: "创建片段", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const created = state.requests.find(
    (x) => x.path === "/api/workspaces/1/segments" && x.method === "POST",
  );
  expect(JSON.parse(created.body)).toMatchObject({
    source_type: "upload",
    filepath: "storage/uploads/1/a.mp4",
    start_offset: 0,
    end_offset: 90,
    enable_preprocess: true,
    sample_fps: 2,
    resolution: "720P",
  });
  await page.getByRole("button", { name: "调查问答", exact: true }).click();
  await page.getByText("⋯ 更多").click();
  await page.getByRole("button", { name: "修改标题", exact: true }).click();
  await page.getByLabel("标题", { exact: true }).fill("门口车辆核查");
  await page.getByRole("button", { name: "保存标题", exact: true }).click();
  expect(state.renamed[0]).toEqual({ title: "门口车辆核查" });
});
test("monitor precision changes range and missing recording stays black", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "监控与回放", exact: true }).click();
  await page.getByRole("button", { name: "查看画面", exact: true }).click();
  await expect(page.getByLabel("录像时间轴")).toBeVisible();
  const before = await page.getByLabel("录像时间轴").getAttribute("min");
  await page.getByLabel("时间精度").selectOption("hour");
  await expect(page.getByLabel("录像时间轴")).not.toHaveAttribute(
    "min",
    before,
  );
  await page.getByLabel("定位时间").fill("2026-09-29T12:00");
  await page.getByLabel("定位时间").dispatchEvent("change");
  await expect(page.getByText("此时间没有可回放录像")).toBeVisible();
  await page.getByRole("button", { name: "回到实时", exact: true }).click();
  await expect(
    page.getByText("实时 · 跟随最新", { exact: true }),
  ).toBeVisible();
});
test("team invitations, admin controls, model editing and password-verified privacy", async ({
  page,
}) => {
  const state = await setup(page);
  await page.getByRole("button", { name: "小组成员", exact: true }).click();
  await expect(page.getByText("待确认", { exact: true })).toBeVisible();
  await page.getByLabel("搜索用户").fill("candidate");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await page.getByRole("button", { name: "邀请加入", exact: true }).click();
  expect(
    state.requests.some(
      (x) => x.path === "/api/groups/1/invite" && x.method === "POST",
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "我的消息", exact: true }).click();
  await page.getByRole("button", { name: "接受", exact: true }).click();
  expect(state.requests.some((x) => x.path === "/api/groups/2/respond")).toBe(
    true,
  );
  await page.getByRole("button", { name: "用户管理", exact: true }).click();
  await expect(page.getByRole("button", { name: "重置密码" })).toBeVisible();
  await page.getByRole("button", { name: "账号与模型", exact: true }).click();
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await expect(page.getByLabel("API 密钥")).toHaveValue("");
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByLabel("允许鸿蒙端截图与录屏").check();
  await page.getByLabel("当前账号密码").fill("wrong");
  await page.getByRole("button", { name: "验证并更改", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("当前账号密码不正确");
  await expect(page.getByLabel("允许鸿蒙端截图与录屏")).not.toBeChecked();
});
test("mobile layout keeps key actions accessible without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await workspace(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "调查问答", exact: true }).click();
  await page.getByRole("button", { name: "车辆去向核查", exact: true }).click();
  await expect(page.getByRole("heading", { name: "关键证据" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "账号与模型", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "退出登录", exact: true }).last(),
  ).toBeVisible();
});
