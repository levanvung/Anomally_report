/**
 * imageTouchPan.js
 * Enables smooth touch-to-pan, pinch-to-zoom, and double-tap gestures
 * on mobile devices for Ant Design Vue's <a-image> preview viewer.
 */

let isInitialized = false;

export function setupImageTouchPan() {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  let isTouchPanning = false;
  let lastTapTime = 0;
  let initialPinchDist = 0;
  let lastPinchDist = 0;
  let activePreviewImg = null;

  function createMouseEvent(type, touch) {
    const clientX = touch ? touch.clientX : 0;
    const clientY = touch ? touch.clientY : 0;
    const screenX = touch ? touch.screenX : 0;
    const screenY = touch ? touch.screenY : 0;
    const pageX = clientX + window.scrollX;
    const pageY = clientY + window.scrollY;

    const evt = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      detail: 1,
      button: 0,
      buttons: type === 'mouseup' ? 0 : 1,
      clientX,
      clientY,
      screenX,
      screenY,
    });

    try {
      Object.defineProperty(evt, 'pageX', { value: pageX, writable: false });
      Object.defineProperty(evt, 'pageY', { value: pageY, writable: false });
    } catch (_) {}

    return evt;
  }

  function injectMobileGuide(wrap) {
    if (!wrap || wrap.querySelector('.ant-preview-mobile-guide')) return;

    const guide = document.createElement('div');
    guide.className = 'ant-preview-mobile-guide';
    guide.innerHTML = `
      <span class="guide-icon">🔍</span>
      <span class="guide-text">Chạm 2 lần để phóng to • Vuốt 1 ngón để chọn vùng xem</span>
    `;
    wrap.appendChild(guide);

    // Auto-hide after 3.5 seconds
    setTimeout(() => {
      guide.classList.add('fade-out');
      setTimeout(() => guide.remove(), 400);
    }, 3500);
  }

  // Monitor DOM for preview opening
  const observer = new MutationObserver(() => {
    const wrap = document.querySelector('.ant-image-preview-wrap');
    if (wrap && window.innerWidth <= 768) {
      injectMobileGuide(wrap);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener(
    'touchstart',
    (e) => {
      const wrap = e.target.closest('.ant-image-preview-wrap') || e.target.closest('.ant-image-preview');
      if (!wrap) return;

      // Do not intercept interactions on toolbar buttons or switchers
      if (
        e.target.closest('.ant-image-preview-operations') ||
        e.target.closest('.ant-image-preview-switch-left') ||
        e.target.closest('.ant-image-preview-switch-right')
      ) {
        return;
      }

      const img = wrap.querySelector('.ant-image-preview-img');
      if (!img) return;
      activePreviewImg = img;

      // Case 1: Pinch-to-zoom (2 touches)
      if (e.touches.length === 2) {
        if (isTouchPanning) {
          isTouchPanning = false;
          window.dispatchEvent(createMouseEvent('mouseup', null));
        }
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        initialPinchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        lastPinchDist = initialPinchDist;
        return;
      }

      // Case 2: Single-touch drag / double-tap (1 touch)
      if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTapTime < 300) {
          // Double-tap detected: trigger double click to zoom or reset
          img.dispatchEvent(
            new MouseEvent('dblclick', {
              bubbles: true,
              cancelable: true,
              view: window,
            })
          );
          lastTapTime = 0;
          return;
        }
        lastTapTime = now;

        // Start single-touch panning
        isTouchPanning = true;
        const downEvt = createMouseEvent('mousedown', e.touches[0]);
        img.dispatchEvent(downEvt);
      }
    },
    { passive: false }
  );

  window.addEventListener(
    'touchmove',
    (e) => {
      if (!activePreviewImg) return;
      const wrap = document.querySelector('.ant-image-preview-wrap') || document.querySelector('.ant-image-preview');
      if (!wrap) {
        activePreviewImg = null;
        isTouchPanning = false;
        return;
      }

      // Toolbar interactions ignored
      if (e.target.closest('.ant-image-preview-operations')) return;

      // Pinch zoom handling
      if (e.touches.length === 2 && initialPinchDist > 0) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const delta = currentDist - lastPinchDist;

        if (Math.abs(delta) > 8) {
          const zoomIn = delta > 0;
          const wheelEvt = new WheelEvent('wheel', {
            bubbles: true,
            cancelable: true,
            view: window,
            deltaY: zoomIn ? -120 : 120,
            clientX: (t1.clientX + t2.clientX) / 2,
            clientY: (t1.clientY + t2.clientY) / 2,
          });
          window.dispatchEvent(wheelEvt);
          lastPinchDist = currentDist;
        }
        return;
      }

      // Single touch pan handling
      if (isTouchPanning && e.touches.length === 1) {
        e.preventDefault(); // Prevent default mobile scrolling / pull-to-refresh
        const moveEvt = createMouseEvent('mousemove', e.touches[0]);
        window.dispatchEvent(moveEvt);
      }
    },
    { passive: false }
  );

  function endTouch() {
    if (isTouchPanning) {
      isTouchPanning = false;
      const upEvt = createMouseEvent('mouseup', null);
      window.dispatchEvent(upEvt);
    }
    initialPinchDist = 0;
    lastPinchDist = 0;
  }

  window.addEventListener('touchend', endTouch, { passive: true });
  window.addEventListener('touchcancel', endTouch, { passive: true });
}
