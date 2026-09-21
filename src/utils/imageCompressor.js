/**
 * Utility nén ảnh client-side bằng HTML5 Canvas
 * Tự động tối ưu dung lượng ảnh trước khi upload lên Firebase Storage
 * hoặc lưu trữ dạng fallback mà không vượt quá giới hạn 1MB của Firestore.
 */

/**
 * @param {File} file File ảnh gốc
 * @param {number} maxWidth Chiều rộng tối đa (mặc định 1080px)
 * @param {number} maxHeight Chiều cao tối đa (mặc định 1080px)
 * @param {number} quality Mức chất lượng nén JPEG (0.1 - 1.0, mặc định 0.72)
 * @returns {Promise<{ file: File, base64: string, originalSize: number, compressedSize: number }>}
 */
export function compressImage(file, maxWidth = 1080, maxHeight = 1080, quality = 0.72) {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      return resolve({
        file,
        base64: '',
        originalSize: file?.size || 0,
        compressedSize: file?.size || 0,
      })
    }

    const originalSize = file.size
    const reader = new FileReader()

    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img

        // Tính tỉ lệ thu nhỏ nếu kích thước vượt quá giới hạn
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          } else {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        
        // Vẽ ảnh chất lượng cao
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        const mimeType = 'image/jpeg'
        const compressedBase64 = canvas.toDataURL(mimeType, quality)

        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < originalSize) {
              const newFileName = file.name.replace(/\.[^.]+$/, '.jpg')
              const compressedFile = new File([blob], newFileName, {
                type: mimeType,
                lastModified: Date.now(),
              })
              resolve({
                file: compressedFile,
                base64: compressedBase64,
                originalSize,
                compressedSize: blob.size,
              })
            } else {
              resolve({
                file,
                base64: compressedBase64,
                originalSize,
                compressedSize: originalSize,
              })
            }
          },
          mimeType,
          quality
        )
      }

      img.onerror = () => {
        resolve({
          file,
          base64: event.target?.result || '',
          originalSize,
          compressedSize: originalSize,
        })
      }

      img.src = event.target.result
    }

    reader.onerror = () => {
      resolve({
        file,
        base64: '',
        originalSize,
        compressedSize: originalSize,
      })
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Định dạng dung lượng byte thành chuỗi thân thiện (B, KB, MB)
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

