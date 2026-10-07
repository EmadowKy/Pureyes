# 网页与鸿蒙功能对应

| 功能                 | 网页入口           | 后端接口                                                  |
| -------------------- | ------------------ | --------------------------------------------------------- |
| 登录与令牌刷新       | 登录页             | `/auth/login`、`/auth/refresh`、`/users/me`               |
| 小组与邀请           | 小组成员、我的消息 | `/groups`、`/users/search`                                |
| 实时与历史监控       | 监控与回放         | `/monitors`、`/history`、`/playback`                      |
| 工作区与片段         | 调查工作区 → 片段  | `/workspaces`、`/segments`                                |
| 本地上传与截取       | 截取新片段         | `/upload-video`、`/video-sources`                         |
| 完整特征提取         | 片段详情           | `/preprocess`、`/features`                                |
| 人脸记录与分组管理   | 人脸               | `/faces`、`/records`、`/merge`、`/move`                   |
| 多轮调查与引用范围   | 调查问答           | `/qa`、`/agent/conversations`、`/messages`                |
| 简报、工具链与计时   | 调查详情           | 持久化 `process_entries`、`tool_calls`、`elapsed_seconds` |
| 停止、失败重试       | 调查详情           | `/qa/:id/stop`、提交下一轮                                |
| 改名与删除会话       | 会话更多菜单       | `/agent/conversations/:id`                                |
| 多任务状态与通知     | 顶部调查任务       | `/agent/tasks`、浏览器 Notification API                   |
| 分享结论             | 已完成轮次         | Web Share API 或剪贴板                                    |
| 模型配置             | 账号与模型         | `/model-configs`                                          |
| 个人资料、头像、密码 | 账号与模型         | `/users/me`                                               |
| 鸿蒙窗口隐私设置     | 账号安全           | `/auth/screen-capture`，密码验证                          |
| 用户管理             | 管理员导航入口     | `/users`、`/role`、`/status`、`/password`                 |

浏览器和鸿蒙的系统能力不同：Core Vision Kit 归类由手机完成；Form Kit 卡片对应网页任务中心；持续后台任务和窗口截屏保护不属于浏览器能力。网页按服务端权限显示可执行的操作，接口再次校验权限。
