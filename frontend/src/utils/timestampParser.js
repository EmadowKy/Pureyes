/**
 * 时间戳解析工具
 * 用于解析模型输出中的视频时间点格式 [video: "1", time:"01:23"]
 */

/**
 * 解析答案文本中的视频时间戳
 * 格式: [video: "1", time:"01:23"]
 * @param {string} text - 原始答案文本
 * @returns {Array} 包含文本段落和时间戳信息的数组
 */
export function parseTimestamps(text) {
  if (!text) return []
  
  // 正则表达式匹配 [video: "数字", time:"时间戳"]
  // 支持引号前后的空格变化
  const regex = /\[video:\s*"(\d+)"\s*,\s*time:\s*"([^"]+)"\]/g
  
  const parts = []
  let lastIndex = 0
  let match
  
  while ((match = regex.exec(text)) !== null) {
    // 添加时间戳前的文本
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      })
    }
    
    // 添加时间戳信息
    parts.push({
      type: 'timestamp',
      videoNumber: parseInt(match[1]),
      time: match[2],
      fullMatch: match[0]
    })
    
    lastIndex = regex.lastIndex
  }
  
  // 添加剩余的文本
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    })
  }
  
  return parts.length > 0 ? parts : [{ type: 'text', content: text }]
}

/**
 * 转换时间戳为 (视频N)MM:SS 格式
 * @param {number} videoNumber - 视频号
 * @param {string} timeStr - 时间戳字符串 (HH:MM:SS 或 MM:SS)
 * @returns {string} 格式化后的文本
 */
export function formatTimestampText(videoNumber, timeStr) {
  // 确保时间戳格式为 HH:MM:SS 或 MM:SS
  const parts = timeStr.split(':').map(Number)
  let displayTime = timeStr
  
  // 如果输入是 HH:MM:SS，只保留后两部分
  if (parts.length === 3) {
    displayTime = `${String(parts[1]).padStart(2, '0')}:${String(parts[2]).padStart(2, '0')}`
  }
  
  return `(视频${videoNumber})${displayTime}`
}

/**
 * 将时间戳字符串转换为秒数
 * @param {string} timeStr - 时间戳字符串 (HH:MM:SS 或 MM:SS)
 * @returns {number} 秒数
 */
export function timeToSeconds(timeStr) {
  const parts = timeStr.split(':').map(Number)
  
  if (parts.length === 2) {
    // MM:SS 格式
    return parts[0] * 60 + parts[1]
  } else if (parts.length === 3) {
    // HH:MM:SS 格式
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  
  return 0
}

/**
 * 从解析结果生成 HTML，支持点击时间戳按钮（用于问答详情）
 * @param {Array} parts - parseTimestamps 返回的解析数组
 * @param {Function} onTimestampClick - 时间戳被点击时的回调函数
 * @returns {string} HTML 字符串
 */
export function generateClickableHTML(parts, onTimestampClick) {
  return parts.map((part, index) => {
    if (part.type === 'text') {
      return `<span>${part.content}</span>`
    } else if (part.type === 'timestamp') {
      const displayText = formatTimestampText(part.videoNumber, part.time)
      const dataId = `ts-${index}`
      return `<button class="timestamp-link" data-timestamp-id="${dataId}" data-video="${part.videoNumber}" data-time="${part.time}">${displayText}</button>`
    }
    return ''
  }).join('')
}

/**
 * 从解析结果生成纯文本（用于悬浮窗口提示）
 * @param {Array} parts - parseTimestamps 返回的解析数组
 * @returns {string} 纯文本
 */
export function generatePlainText(parts) {
  return parts.map((part) => {
    if (part.type === 'text') {
      return part.content
    } else if (part.type === 'timestamp') {
      return formatTimestampText(part.videoNumber, part.time)
    }
    return ''
  }).join('')
}

/**
 * 为文本添加时间戳链接信息，用于后续事件处理
 * 返回的对象包含 HTML 和时间戳数据的映射
 * @param {Array} parts - parseTimestamps 返回的解析数组
 * @returns {Object} { html: string, timestamps: Map }
 */
export function generateHTMLWithMetadata(parts) {
  const timestamps = new Map()
  let timestampIndex = 0
  
  const html = parts.map((part, idx) => {
    if (part.type === 'text') {
      return `<span>${part.content}</span>`
    } else if (part.type === 'timestamp') {
      const displayText = formatTimestampText(part.videoNumber, part.time)
      const id = `ts-${timestampIndex}`
      timestamps.set(id, {
        videoNumber: part.videoNumber,
        time: part.time,
        seconds: timeToSeconds(part.time)
      })
      timestampIndex++
      return `<a class="timestamp-link" data-timestamp-id="${id}" href="javascript:void(0)">${displayText}</a>`
    }
    return ''
  }).join('')
  
  return { html, timestamps }
}
