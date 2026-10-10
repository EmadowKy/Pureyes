# 网页部署

文档首页为 [http://116.62.178.139/](http://116.62.178.139/)，网页调查工作台位于 [http://116.62.178.139/web/](http://116.62.178.139/web/)。两者共享域名，网页使用 pureyes-harmony 后端和已有账号、小组、工作区。

## 构建与发布

在网页仓库构建子路径版本：

```sh
cd frontend
npm ci
npm run build -- --base=/web/
```

也可在构建环境设置 `VITE_APP_BASE=/web/`。服务器地址 `VITE_API_BASE` 留空，业务请求使用同域 `/api/`；应用图标、脚本和样式使用 `/web/` 前缀。

将 `frontend/dist` 发布到版本目录 `/mnt/pureyes-recordings/web-releases/<版本>/`，由 `/var/www/web` 符号链接指向当前版本。该目录只包含网页静态资源，不包含数据库、模型、录像或 API 密钥。更新时保留上一版本，通过切换链接回退。

## 文档与网页共存

将仓库的 `deploy/nginx-web.conf` 安装到 `/etc/nginx/snippets/pureyes-web.conf`，在现有文档站点的 `server` 内加入：

```nginx
root /var/www/docs;
index index.html;
include /etc/nginx/snippets/pureyes-web.conf;
```

这个配置仅接管 `/web` 与 `/web/`：缺省首页仍是文档，网页资源使用独立路径。带哈希的脚本与样式启用压缩和长期缓存，网页 HTML 每次访问重新验证；不存在的资源返回 404。

保留现有 `/api/`、`/live/`、文档页面、截图和 `/demo-assets/avatars/`。现有 API 代理继续指向 `127.0.0.1:5000`，在其 `location` 内配置视频上传：

```nginx
client_max_body_size 2g;
client_body_timeout 300s;
proxy_request_buffering off;
proxy_read_timeout 300s;
proxy_send_timeout 300s;
```

后端的 `MAX_VIDEO_UPLOAD_BYTES` 默认也是 2 GB。关闭代理请求缓冲可避免将整个上传视频暂存到系统盘。发布配置前保存原配置，执行 `nginx -t`，通过后重新加载 Nginx；发布静态网页不需要重启后端。

文档在服务器的 `/root/pureyes-harmony` 内运行 `npm run docs:build`。将 `docs/.vitepress/dist/` 发布到 `/var/www/docs`，保留正在更新的 `live/` 和演示头像目录。文档首页及导航的“网页版 Beta”入口链接到 `/web/`，使用完整页面导航进入网页应用。

## 媒体、会话与通知

- 浏览器用 `Authorization: Bearer` 调用业务 API。令牌存于当前标签页的 sessionStorage，刷新后可继续登录。
- 媒体请求使用后端生成的限时签名，不向视频 URL 拼接 JWT。
- 现有演示账号头像通过 `/demo-assets/avatars/` 提供，静态目录与 API 分别配置，避免头像请求被网页首页接管。
- 签名失效后播放器通过 `/api/video/access` 续期。该接口继续检查小组权限。
- HLS 使用浏览器原生能力或 hls.js，录像按原比例显示。
- 不要在反向代理缓存登录、模型配置或已鉴权业务响应。
- 当前公网入口为 HTTP；浏览器系统通知和剪贴板 API 需要 HTTPS 或 localhost。在 HTTP 上使用应用内任务进度和复制后的手动操作。绑定域名并配置 TLS 后可启用这些浏览器能力。

## 上线检查

先打开文档首页，点击“网页版 Beta”，确认进入 `/web/` 且图标、脚本、样式正常加载。使用已有账号登录，查看 test1 小组的 test 工作区、片段封面、人脸记录和已有调查，再实际播放一个片段、实时监控及历史录像。这个流程只读取现有内容，不创建测试调查或覆盖数据库。

自动验收使用现有账号的 `PUREYES_TEST_EMP_ID`、`PUREYES_TEST_PASSWORD`，并设置 `PUREYES_TEST_BASE_URL=http://116.62.178.139/web/`：

```sh
cd frontend
npm run test:remote -- --grep "real server"
```

指定线上地址后，测试直接访问部署站点，不启动本地开发服务器。
