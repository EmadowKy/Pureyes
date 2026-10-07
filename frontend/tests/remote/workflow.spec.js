import { test, expect } from "@playwright/test";

async function requestFromPage(page, path) {
  return page.evaluate(async (path) => {
    const response = await fetch("/api" + path, {
      headers: {
        Authorization: "Bearer " + sessionStorage.getItem("pureyes.token"),
      },
    });
    if (response.status >= 500) return null;
    const body = await response.json();
    if (!response.ok || body.code !== 0)
      throw new Error(body.message || String(response.status));
    return body.data;
  }, path);
}

test("real write workflow: local video upload, full preprocessing, multi-video investigation and follow-up", async ({
  page,
}) => {
  test.setTimeout(600000);
  if (!process.env.PUREYES_TEST_VIDEO)
    throw new Error("PUREYES_TEST_VIDEO must point to a real playable video");
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByLabel("工号", { exact: true })
    .fill(process.env.PUREYES_TEST_EMP_ID);
  await page
    .getByLabel("密码", { exact: true })
    .fill(process.env.PUREYES_TEST_PASSWORD);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "调查工作区", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "当前小组" })
    .selectOption({ label: "test1" });
  const name = "网页验收-" + Date.now();
  page.once("dialog", (dialog) => dialog.accept(name));
  const workspaceResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/workspaces/") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "新建工作区", exact: true }).click();
  const workspace = (await (await workspaceResponse).json()).data;
  console.log("Dedicated acceptance workspace:", workspace.id);
  await page.getByRole("button", { name: new RegExp(name) }).click();
  let sourceId;
  const segmentIds = [];
  for (let index = 0; index < 2; index++) {
    await page
      .getByRole("button", { name: "截取新片段", exact: true })
      .first()
      .click();
    if (!index) {
      const uploadResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith("/upload-video") &&
          response.request().method() === "POST",
      );
      await page
        .getByLabel("上传本地视频")
        .setInputFiles(process.env.PUREYES_TEST_VIDEO);
      const source = (await (await uploadResponse).json()).data;
      sourceId = source.id;
      await expect(
        page.getByRole("combobox", { name: "视频源", exact: true }),
      ).toHaveValue(sourceId);
    } else
      await page
        .getByRole("combobox", { name: "视频源", exact: true })
        .selectOption(sourceId);
    await page.getByLabel("开始（秒）").fill(String(index * 2));
    await page.getByLabel("结束（秒）").fill(String(index * 2 + 2));
    await page
      .getByLabel("备注", { exact: true })
      .fill("验收镜头 " + (index + 1));
    await page.getByLabel("采样率").selectOption("1");
    await page.getByLabel("画质").selectOption("480P");
    const clipResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/segments") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "创建片段", exact: true }).click();
    const clip = (await (await clipResponse).json()).data;
    segmentIds.push(clip.id);
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect
      .poll(
        async () => {
          const segments = await requestFromPage(
            page,
            `/workspaces/${workspace.id}/segments`,
          );
          const current = segments?.find((s) => s.id === clip.id);
          if (current?.status === "failed")
            throw new Error(current.error_msg || "Preprocessing failed");
          return current?.status;
        },
        { timeout: 180000, intervals: [2000, 5000] },
      )
      .toBe("completed");
  }
  await page.getByRole("button", { name: "调查问答", exact: true }).click();
  await page
    .getByRole("button", { name: "新建调查", exact: true })
    .first()
    .click();
  await page.locator(".selection-list input").first().check();
  await page.locator(".selection-list input").nth(1).check();
  await page
    .getByLabel("调查问题")
    .fill("请对照这两个镜头，简要说明场景和可见的人物活动，引用画面的时间点。");
  const submitResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/qa") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "开始调查", exact: true }).click();
  const task = (await (await submitResponse).json()).data;
  expect(task.conversation_id).toBeTruthy();
  const readConversation = () =>
    requestFromPage(
      page,
      `/workspaces/agent/conversations/${task.conversation_id}/messages`,
    );
  await expect
    .poll(
      async () => {
        const data = await readConversation();
        const latest = data?.messages?.at(-1);
        if (latest?.status === "failed")
          throw new Error(latest.answer || "Investigation failed");
        return latest?.status;
      },
      { timeout: 180000, intervals: [2500, 5000] },
    )
    .toBe("completed");
  let data = await readConversation();
  expect([...data.conversation.segment_ids].sort((a, b) => a - b)).toEqual(
    [...segmentIds].sort((a, b) => a - b),
  );
  const originalScope = [...data.conversation.segment_ids];
  expect(data.messages[0].answer.length).toBeGreaterThan(20);
  await expect(page.locator(".answer")).toBeVisible({ timeout: 10000 });
  await page.screenshot({
    path: "test-results/screens/real-investigation.png",
    fullPage: true,
  });
  await page
    .getByLabel("调查问题")
    .fill("两个镜头足以确定是同一个人吗？请说明依据或不能确定的原因。");
  const followupResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/qa") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "发送追问", exact: true }).click();
  expect((await (await followupResponse).json()).data.conversation_id).toBe(
    task.conversation_id,
  );
  await expect
    .poll(
      async () => {
        data = await readConversation();
        const latest = data?.messages?.at(-1);
        if (latest?.status === "failed")
          throw new Error(latest.answer || "Follow-up failed");
        return data?.messages?.length === 2 && latest.status;
      },
      { timeout: 180000, intervals: [2500, 5000] },
    )
    .toBe("completed");
  expect(data.conversation.segment_ids).toEqual(originalScope);
  expect(errors).toEqual([]);
  console.log(
    "Full preprocessing and two successful investigation turns verified:",
    workspace.id,
  );
});
