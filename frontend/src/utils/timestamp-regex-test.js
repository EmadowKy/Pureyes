// 快速测试修复后的正则表达式
const testCases = [
  '在视频4中，行李箱放在房间的地板上，位于办公桌旁边。[video: "4", time:"00:00"]',
  '关于第一场景，在 [video: "1", time:"00:15"] 角色出现。然后在 [video: "2", time:"01:23"] 发生了什么。',
  '[video: "1",time:"00:15"]',  // 紧凑格式（没有空格）
  '[video: "1" , time: "00:15"]',  // 宽松格式（多个空格）
]

// 修复后的正则
const regex = /\[video:\s*"(\d+)"\s*,\s*time:\s*"([^"]+)"\]/g

console.log('=== 时间戳识别测试 ===\n')

testCases.forEach((testCase, idx) => {
  console.log(`测试 ${idx + 1}: ${testCase}`)
  const matches = [...testCase.matchAll(regex)]
  if (matches.length === 0) {
    console.log('  ❌ 未找到时间戳\n')
  } else {
    matches.forEach(match => {
      console.log(`  ✅ 找到时间戳: video="${match[1]}", time="${match[2]}"`)
    })
    console.log()
  }
})
