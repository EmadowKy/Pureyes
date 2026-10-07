# 网页部署

网页使用现有 pureyes-harmony 后端。不要启动本仓库的历史后端，也不要迁移或覆盖服务器的数据库与录像目录。

## 反向代理

构建后将 `frontend/dist` 复制到独立目录，例如 `/var/www/pureyes-web`。配置单独域名，保留现有文档站点和直播目录。

```nginx
server {
    listen 80;
    server_name pureyes.example.com;
    root /var/www/pureyes-web;
    index index.html;
    client_max_body_size 2g;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        proxy_buffering off;
        proxy_request_buffering off;
    }

    location /demo-assets/ {
        alias /var/www/docs/demo-assets/;
    }
}
```

当前服务器后端监听 `5000`，`8000` 是现有 Nginx 对外代理端口。其他部署环境按实际监听端口配置。为域名配置 TLS 后开启 HTTPS；浏览器通知和剪贴板 API 依赖安全上下文。上传上限还受后端与代理配置约束。

## 媒体与会话

- 浏览器用 `Authorization: Bearer` 调用业务 API。令牌存于当前标签页的 sessionStorage，刷新后可继续登录。
- 媒体请求使用后端生成的限时签名，不向视频 URL 拼接 JWT。
- 现有演示账号头像通过 `/demo-assets/avatars/` 提供，静态目录与 API 分别配置，避免头像请求被网页首页接管。
- 签名失效后播放器通过 `/api/video/access` 续期。该接口继续检查小组权限。
- HLS 使用浏览器原生能力或 hls.js，录像按原比例显示。
- 不要在反向代理缓存登录、模型配置或已鉴权业务响应。

## 上线检查

登录后检查小组与工作区；播放一段已有片段并确认浏览器实际解码成功；检查实时监控和过去一分钟回放；开启一条独立测试调查，验证进度简报、工具链和完成状态；在第二个账号中检查同组记录与越权拒绝。
