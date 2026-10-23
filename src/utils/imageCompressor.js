export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function compressImage(file, maxWidth = 1440, maxHeight = 1440, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) return reject(new Error('File không hợp lệ'))
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let w = img.width, h = img.height
      if (w > maxWidth || h > maxHeight) {
        const r = Math.min(maxWidth / w, maxHeight / h)
        w = Math.round(w * r)
        h = Math.round(h * r)
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, w, h)

      // Ưu tiên xuất WebP để giữ chi tiết chân linh kiện sắc nét mà dung lượng vẫn nhẹ
      let base64 = canvas.toDataURL('image/webp', quality)
      let outMime = 'image/webp'
      let outExt = '.webp'
      if (!base64.startsWith('data:image/webp')) {
        base64 = canvas.toDataURL('image/jpeg', quality)
        outMime = 'image/jpeg'
        outExt = '.jpg'
      }

      canvas.toBlob((blob) => {
        if (!blob) return resolve({ file, base64, originalSize: file.size, compressedSize: file.size })
        const safeName = (file.name || 'defect').replace(/\.[^/.]+$/, '') + outExt
        const compressedFile = new File([blob], safeName, { type: outMime, lastModified: Date.now() })
        resolve({ file: compressedFile, base64, originalSize: file.size, compressedSize: compressedFile.size })
      }, outMime, quality)
    }
    img.onerror = (e) => { URL.revokeObjectURL(objectUrl); reject(e) }
    img.src = objectUrl
  })
}

export function compressBase64Image(dataUrl, maxDim = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) return resolve(dataUrl || '')
    const img = new Image()
    img.onload = () => {
      let w = img.width, h = img.height
      if (w > maxDim || h > maxDim) {
        const r = Math.min(maxDim / w, maxDim / h)
        w = Math.round(w * r)
        h = Math.round(h * r)
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, w, h)

      const webpUrl = canvas.toDataURL('image/webp', quality)
      if (webpUrl.startsWith('data:image/webp')) {
        return resolve(webpUrl)
      }
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}
// Tạo ảnh thu nhỏ (Thumbnail ~180px, nặng chỉ 4KB - 6KB) để hiển thị ngoài bảng danh sách siêu tốc
export function createThumbnailBase64(dataUrl, maxDim = 180, quality = 0.68) {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) return resolve(dataUrl || '')
    const img = new Image()
    img.onload = () => {
      let w = img.width
      let h = img.height
      if (w > maxDim || h > maxDim) {
        const r = Math.min(maxDim / w, maxDim / h)
        w = Math.max(1, Math.round(w * r))
        h = Math.max(1, Math.round(h * r))
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'medium'
      ctx.drawImage(img, 0, 0, w, h)

      const webpThumb = canvas.toDataURL('image/webp', quality)
      if (webpThumb.startsWith('data:image/webp')) {
        return resolve(webpThumb)
      }
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}