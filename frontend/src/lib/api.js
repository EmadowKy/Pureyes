import { reactive } from "vue";
export const session = reactive({
  token: sessionStorage.getItem("pureyes.token") || "",
  refresh: sessionStorage.getItem("pureyes.refresh") || "",
  user: null,
  server:
    localStorage.getItem("pureyes.server") ||
    import.meta.env.VITE_API_BASE ||
    "",
});
let refreshing,
  authEpoch = 0;
export function saveTokens(data) {
  session.token = data.access_token;
  if (data.refresh_token) session.refresh = data.refresh_token;
  sessionStorage.setItem("pureyes.token", session.token);
  sessionStorage.setItem("pureyes.refresh", session.refresh);
  if (data.user) session.user = data.user;
}
export function clearSession() {
  authEpoch++;
  session.token = "";
  session.refresh = "";
  session.user = null;
  sessionStorage.removeItem("pureyes.token");
  sessionStorage.removeItem("pureyes.refresh");
}
export function setServer(value) {
  const raw = value.trim().replace(/\/+$/, "");
  if (raw && !/^https?:\/\//i.test(raw))
    throw new Error("服务器地址需以 http:// 或 https:// 开头");
  if (raw) {
    const url = new URL(raw);
    if (url.username || url.password || url.search || url.hash)
      throw new Error("地址不能含凭据或查询参数");
  }
  if (session.server !== raw) clearSession();
  session.server = raw;
  localStorage.setItem("pureyes.server", raw);
}
export const endpoint = (path) => `${session.server}${path}`;
export async function api(
  path,
  { method = "GET", body, signal, auth = true, retry = true } = {},
) {
  const epoch = authEpoch;
  const headers = { Accept: "application/json" };
  if (auth && session.token) headers.Authorization = `Bearer ${session.token}`;
  if (body !== undefined && !(body instanceof FormData))
    headers["Content-Type"] = "application/json";
  let response;
  try {
    response = await fetch(endpoint(`/api${path}`), {
      method,
      headers,
      body:
        body instanceof FormData
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("无法连接服务器，请检查服务器地址、网络和 HTTPS 配置");
  }
  if (auth && epoch !== authEpoch)
    throw new DOMException("登录状态已改变", "AbortError");
  if (response.status === 401 && auth && retry && session.refresh) {
    if (!refreshing)
      refreshing = fetch(endpoint("/api/auth/refresh"), {
        method: "POST",
        headers: { Authorization: `Bearer ${session.refresh}` },
      })
        .then(async (r) => {
          const data = await r.json();
          if (epoch !== authEpoch)
            throw new DOMException("登录状态已改变", "AbortError");
          if (!r.ok || data.code !== 0) throw new Error("登录已过期");
          saveTokens(data.data);
        })
        .catch((error) => {
          if (epoch === authEpoch) clearSession();
          throw error;
        })
        .finally(() => {
          refreshing = undefined;
        });
    await refreshing;
    return api(path, { method, body, signal, auth, retry: false });
  }
  const data = await response.json().catch(() => null);
  if (auth && epoch !== authEpoch)
    throw new DOMException("登录状态已改变", "AbortError");
  if (!response.ok || !data || data.code !== 0) {
    if (response.status === 401 && auth) clearSession();
    const error = new Error(data?.message || `请求失败（${response.status}）`);
    error.status = response.status;
    throw error;
  }
  return data.data;
}
export function mediaUrl(value) {
  if (!value) return "";
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value))
    return value;
  const url = new URL(value, session.server || location.origin);
  if (!["http:", "https:"].includes(url.protocol)) return "";
  if (session.server === "" && url.origin === "http://116.62.178.139")
    return url.pathname + url.search;
  return url.href;
}
export async function renewMedia(value) {
  const url = new URL(value, session.server || location.origin);
  if (!url.pathname.startsWith("/api/video/"))
    throw new Error("该媒体地址无法续期");
  const data = await api(
    `/video/access?path=${encodeURIComponent(decodeURIComponent(url.pathname.slice(11)))}`,
  );
  return mediaUrl(data.media_url);
}
export async function uploadVideo(workspace, file, onProgress, signal) {
  if (!/\.(mp4|avi|mov|mkv|webm)$/i.test(file.name))
    throw new Error("请选择支持的视频格式");
  if (file.size > 2 * 1024 ** 3) throw new Error("视频不能超过 2 GB");
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest(),
      abort = () => xhr.abort(),
      cleanup = () => signal?.removeEventListener("abort", abort);
    if (signal?.aborted)
      return reject(new DOMException("上传已取消", "AbortError"));
    signal?.addEventListener("abort", abort, { once: true });
    xhr.open("POST", endpoint(`/api/workspaces/${workspace}/upload-video`));
    xhr.setRequestHeader("Authorization", `Bearer ${session.token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      cleanup();
      try {
        const result = JSON.parse(xhr.responseText);
        if (xhr.status >= 400 || result.code !== 0)
          throw new Error(result.message || "上传失败");
        resolve(result.data);
      } catch (error) {
        reject(error);
      }
    };
    xhr.onerror = () => {
      cleanup();
      reject(new Error("上传连接中断，请重试"));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new DOMException("上传已取消", "AbortError"));
    };
    const body = new FormData();
    body.append("file", file);
    xhr.send(body);
  });
}
