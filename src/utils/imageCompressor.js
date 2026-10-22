export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.76) {
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
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      const base64 = canvas.toDataURL('image/jpeg', quality)
      canvas.toBlob((blob) => {
        if (!blob) return resolve({ file, base64, originalSize: file.size, compressedSize: file.size })
        const safeName = (file.name || 'defect.jpg').replace(/\.[^/.]+$/, '') + '.jpg'
        const compressedFile = new File([blob], safeName, { type: 'image/jpeg', lastModified: Date.now() })
        resolve({ file: compressedFile, base64, originalSize: file.size, compressedSize: compressedFile.size })
      }, 'image/jpeg', quality)
    }
    img.onerror = (e) => { URL.revokeObjectURL(objectUrl); reject(e) }
    img.src = objectUrl
  })
}

export function compressBase64Image(dataUrl, maxDim = 540, quality = 0.62) {
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
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}
