// 测试时间戳解析器功能
import { 
  parseTimestamps, 
  formatTimestampText, 
  timeToSeconds, 
  generateHTMLWithMetadata, 
  generatePlainText 
} from './utils/timestampParser.js'

// 测试用例1：基本时间戳格式
const testText1 = 'About the first scene, at [video: "1",time:"00:15"] the character appears. Then later at [video: "2",time:"01:23"] something happens.'

console.log('=== Test 1: Basic timestamp parsing ===')
console.log('Input:', testText1)
const parts1 = parseTimestamps(testText1)
console.log('Parsed parts:', parts1)
parts1.forEach((part, idx) => {
  if (part.type === 'timestamp') {
    console.log(`  Timestamp ${idx}: Video ${part.videoNumber}, Time: ${part.time}`)
    console.log(`    Display Text: ${formatTimestampText(part.videoNumber, part.time)}`)
    console.log(`    Seconds: ${timeToSeconds(part.time)}`)
  }
})

// 测试用例2：HTML元数据生成
console.log('\n=== Test 2: HTML with metadata generation ===')
const { html, timestamps } = generateHTMLWithMetadata(parts1)
console.log('Generated HTML:', html)
console.log('Timestamps map size:', timestamps.size)

// 测试用例3：纯文本生成
console.log('\n=== Test 3: Plain text generation ===')
const plainText = generatePlainText(parts1)
console.log('Plain text:', plainText)

// 测试用例4：各种时间格式
console.log('\n=== Test 4: Different time formats ===')
const timeFormats = ['01:23', '00:05', '12:34:56', '1:23']
timeFormats.forEach(time => {
  console.log(`  ${time} -> ${formatTimestampText(1, time)} (${timeToSeconds(time)}s)`)
})

// 测试用例5：HTML标签中的正则替换
console.log('\n=== Test 5: Regex replacement in markdown HTML ===')
const markdown = 'At [video: "1",time:"02:30"] this happens. See also [video: "3",time:"00:45"]'
const htmlWithMarkdown = markdown.replace(/\[video:\s*"(\d+)",\s*time:\s*"([^"]+)"\]/g, 
  (match, videoNum, timeStr) => {
    const displayText = formatTimestampText(parseInt(videoNum), timeStr)
    return `<a class="timestamp-link" data-video="${videoNum}" data-time="${timeStr}">${displayText}</a>`
  }
)
console.log('Original:', markdown)
console.log('With links:', htmlWithMarkdown)

console.log('\n✅ All tests completed')
