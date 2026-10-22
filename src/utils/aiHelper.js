export const DEFECT_PRESETS = [
  {
    label: '[DIP/AI] Linh kiện chưa cắm kịch xuống mạch (Not fully seated)',
    text: '- Component is not fully seated / inserted.\n\n- 元件未插到底。\n\n- Linh kiện chưa cắm kịch.',
  },
  {
    label: '[DIP] Linh kiện chưa được cắm xuống bảng mạch (Not inserted)',
    text: '- Component is not inserted into the circuit board.\n\n- 元件未插入电路板。\n\n- Linh kiện chưa được cắm xuống bảng mạch.',
  },
  {
    label: '[DIP] Linh kiện lắp ngược chiều / ngược cực tính (Reverse orientation)',
    text: '- Component is installed in reverse orientation / polarity.\n\n- 元件方向反向或极性反向。\n\n- Linh kiện bị lắp ngược chiều hoặc ngược cực tính.',
  },
  {
    label: '[DIP/AI] Bảng mạch bị thiếu linh kiện (Missing component)',
    text: '- Circuit board is missing components.\n\n- 电路板缺件。\n\n- Bảng mạch bị thiếu linh kiện.',
  },
  {
    label: '[DIP/AI] Cắm nhầm / sai linh kiện (Wrong component inserted)',
    text: '- Operator inserted the wrong component.\n\n- 作业员插错元件。\n\n- Nhân sự cắm sai linh kiện.',
  },
  {
    label: '[DIP/AI] Linh kiện bị kênh, không nằm sát bo mạch (Lifted / Tilted)',
    text: '- Component is lifted and not seated flush on the PCB.\n\n- 元件浮高。\n\n- Linh kiện bị kênh, không nằm sát bo mạch.',
  },
  {
    label: '[DIP/AI] Chân linh kiện bị cong / nhấc chân (Lead bent / lifted)',
    text: '- Component lead is bent / lifted.\n\n- 元件引脚弯曲/翘起。\n\n- Chân linh kiện bị cong / nhấc chân.',
  },
  {
    label: '[DIP/SMT] Linh kiện bị thiếu thiếc (Insufficient solder)',
    text: '- Component has insufficient solder.\n\n- 元件少锡 / 焊锡不足。\n\n- Linh kiện bị thiếu thiếc.',
  },
  {
    label: '[DIP/SMT] Chân linh kiện bị dính thiếc / bắc cầu (Solder bridged)',
    text: '- Solder bridged across component leads.\n\n- 引脚连锡。\n\n- Thiếc bị dính chân linh kiện.',
  },
  {
    label: '[AVR/MP] Nhân viên quên bắn vít cố định (Forgot to drive screw)',
    text: '- Operator forgot to drive the screw.\n\n- 作业员漏打螺丝。\n\n- Nhân viên quên bắt vít cố định.',
  },
  {
    label: '[AVR/MP] Bắn vít chưa kịch / ốc bị kênh (Floating screw)',
    text: '- Operator did not drive the screw fully seated, causing a floating screw.\n\n- 作业员螺丝未打到底，螺丝浮锁。\n\n- Nhân viên bắn vít chưa kịch, ốc vít bị kênh nhô cao.',
  },
  {
    label: '[AVR/MP] Giắc cắm chưa cắm kịch (Connector not fully seated)',
    text: '- Connector is not fully seated into the socket.\n\n- 连接器未插到底。\n\n- Giắc cắm chưa được cắm kịch vào khe cắm.',
  },
]

const KEY_STORAGE = 'sentinel_gemini_api_key'

export function getGeminiKey() {
  return localStorage.getItem(KEY_STORAGE) || import.meta.env.VITE_GEMINI_API_KEY || ''
}

export function setGeminiKey(val) {
  if (val && val.trim()) localStorage.setItem(KEY_STORAGE, val.trim())
  else localStorage.removeItem(KEY_STORAGE)
}

function offlineSmartTranslate(viText) {
  const cleanVi = viText.replace(/^-\s*/, '').trim()
  const lower = cleanVi.toLowerCase()
  const locMatch = cleanVi.match(/\b([RCUJLQD]\d{1,5}[A-Z]?)\b/i)
  const loc = locMatch ? locMatch[1].toUpperCase() : ''
  const locEn = loc ? ` at location ${loc}` : ''
  const locZh = loc ? `${loc}位置` : ''

  if (lower.includes('chưa cắm kịch') || lower.includes('cắm chưa kịch'))
    return `- Component${locEn} is not fully seated / inserted.\n\n- ${locZh}元件未插到底。\n\n- ${cleanVi}`
  if (lower.includes('kênh') || lower.includes('nhô cao'))
    return `- Component${locEn} is lifted and not seated flush on the PCB.\n\n- ${locZh}元件浮高。\n\n- ${cleanVi}`
  if (lower.includes('ngược cực') || lower.includes('ngược chiều'))
    return `- Component${locEn} is installed in reverse orientation / polarity.\n\n- ${locZh}元件方向或极性装反。\n\n- ${cleanVi}`
  if (lower.includes('thiếu linh kiện') || lower.includes('bỏ sót'))
    return `- Circuit board is missing component${locEn}.\n\n- ${locZh}电路板缺件。\n\n- ${cleanVi}`
  if (lower.includes('sai linh kiện') || lower.includes('nhầm linh kiện'))
    return `- Wrong component inserted${locEn}.\n\n- ${locZh}插错元件。\n\n- ${cleanVi}`
  if (lower.includes('dính thiếc') || lower.includes('bắc cầu') || lower.includes('ngắn mạch'))
    return `- Solder bridged across component leads${locEn}.\n\n- ${locZh}引脚连锡短路。\n\n- ${cleanVi}`
  if (lower.includes('thiếu thiếc') || lower.includes('ít thiếc'))
    return `- Component${locEn} has insufficient solder.\n\n- ${locZh}元件少锡 / 焊锡不足。\n\n- ${cleanVi}`
  if (lower.includes('nhấc chân') || lower.includes('cong chân') || lower.includes('chân cong'))
    return `- Component lead${locEn} is lifted / bent.\n\n- ${locZh}元件引脚翘起/弯曲。\n\n- ${cleanVi}`
  if (lower.includes('quên bắt vít') || lower.includes('quên bắn vít') || lower.includes('thiếu vít'))
    return `- Operator forgot to drive the screw${locEn}.\n\n- ${locZh}作业员漏打螺丝。\n\n- ${cleanVi}`
  if (lower.includes('vít chưa kịch') || lower.includes('ốc lỏng'))
    return `- Screw${locEn} is not fully tightened (floating screw).\n\n- ${locZh}螺丝未打到底，螺丝浮锁。\n\n- ${cleanVi}`
  if (lower.includes('trầy xước') || lower.includes('xước'))
    return `- Product surface${locEn} is scratched.\n\n- ${locZh}表面划伤。\n\n- ${cleanVi}`
  return null
}

export async function translateViToTrilingual(rawViText, context = {}) {
  const input = (rawViText || '').trim()
  if (!input) throw new Error('Vui lòng gõ mô tả lỗi bằng tiếng Việt trước!')

  const apiKey = getGeminiKey()
  if (!apiKey) {
    const offline = offlineSmartTranslate(input)
    if (offline) return offline
    throw new Error('Hãy nhập Gemini API Key (nút 🔑 AI Key trên thanh công cụ) để dịch câu tự do sang 3 ngôn ngữ!')
  }

  const presetExamples = DEFECT_PRESETS.map((p) => p.text).join('\n---\n')
  const prompt = `Bạn là Kỹ sư Quản lý Chất lượng IPQC nhà máy điện tử (Công đoạn: ${context.process || 'DIP/SMT'}, Model: ${context.model || ''}).
Người dùng nhập mô tả lỗi bằng tiếng Việt: "${input}"
Hãy dịch sang tiếng Anh và tiếng Trung giản thể, trả về JSON đúng 3 gạch đầu dòng (Anh - Trung - Việt):
{
  "defectDesc": "- [Tiếng Anh]\\n\\n- [Tiếng Trung giản thể]\\n\\n- [Tiếng Việt]"
}
Tham khảo thuật ngữ nhà máy:
${presetExamples}`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    }),
  })

  if (!res.ok) {
    const offline = offlineSmartTranslate(input)
    if (offline) return offline
    throw new Error(`Lỗi gọi Gemini API (${res.status})`)
  }
  const data = await res.json()
  const parsed = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || '{}')
  return parsed.defectDesc || input
}
