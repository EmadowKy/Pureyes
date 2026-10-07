# 清眸 Pureyes · 网页调查工作台

面向安防监控的团队视频调查前端，使用 Vue 3。与 [pureyes-harmony](https://github.com/EmadowKy/pureyes-harmony) 共享后端、账号、小组、录像、片段索引、人脸分组和多轮调查记录。

## 功能

- 小组：创建、改名、通讯录、用户搜索、邀请、接受与拒绝、撤回、移除和退出。
- 监控：实时 HLS、历史录像时间轴、连续可用区间、天／时／分／秒精度、时间定位、无录像黑屏、设备管理。
- 工作区：共享片段、本地上传、监控录像截取、起止范围、备注、完整预处理、进度与速率、特征重建和删除。
- 人脸：分组封面、片段与时间筛选、出现记录、跳转原视频、移动记录、单独成组与合并。
- 调查 Agent：多个片段、连续追问、模型选择、实时公开简报与工具链、中文参数、证据定位、Markdown 结论、用时、停止、重试、标题编辑、删除和分享。
- 账号：个人资料、头像、密码、个人与小组的多个模型 API 配置、系统用户管理。
- 任务中心：多任务进度、完成提醒和浏览器系统通知。

鸿蒙端侧人脸比对由支持 Core Vision Kit 的手机执行，网页展示待归类状态和已有结果。窗口隐私开关可修改同一账号的鸿蒙端设置；浏览器不提供系统截屏拦截能力。浏览器通知需 HTTPS 或 localhost，网页关闭后前端停止同步，后端调查仍继续。

## 本地启动

Node.js 22.12+ 或 24。

```sh
cd frontend
npm ci
npm run dev
```

打开 `http://127.0.0.1:3000`。开发服务器默认代理 `/api` 到 `http://116.62.178.139`。登录页的服务器地址留空时使用此代理；填写完整地址时直接连接该 API 服务。账号由团队管理员创建。

可复制 `frontend/.env.example` 为 `.env.local`，配置 `PUREYES_PROXY_TARGET`。不要把密码、API Key 或访问令牌写入仓库。

## 构建与测试

```sh
cd frontend
npm run build
npm test
npm run test:e2e
```

浏览器测试默认使用本机 Chrome 的无头模式。构建结果在 `frontend/dist`，依赖和构建结果不纳入版本控制。测试使用本地模拟 API 检查页面与交互；真实服务验收单独运行，不应以模拟测试代替媒体解码和远端调查验收。

真实验收使用环境变量 `PUREYES_TEST_EMP_ID`、`PUREYES_TEST_PASSWORD`。仅检查已有数据可运行 `npm run test:remote -- --grep "real server"`；完整流程还需设置 `PUREYES_TEST_VIDEO` 为一段至少四秒的可播放本地视频，再运行 `npm run test:remote`。完整流程会在 test1 下创建独立验收工作区，上传、截取两个片段并执行预处理和两轮调查，会占用服务器算力和模型调用额度；已有 test 工作区不修改。

## 部署

将 `frontend/dist` 发布到独立站点，并用反向代理将同域 `/api/` 转发到现有 pureyes-harmony 后端。生产环境使用 HTTPS，同源代理可避免混合内容和跨域问题。部署示例见 [部署说明](docs/web-deployment.md)。

本仓库的 `backend/` 是早期版本，保留用于历史参考；网页工作台不使用它。后端开发、模型和数据库维护以 pureyes-harmony 为准。
