/**
 * 轻量通知组件
 */
const McToast = (() => {
  let container = null

  function ensureContainer() {
    if (!container) {
      container = document.createElement('div')
      container.id = 'mc-toast-container'
      container.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:10000;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none;'
      document.body.appendChild(container)
    }
  }

  function show(message, type = 'info', duration = 2500) {
    ensureContainer()

    const toast = document.createElement('div')
    toast.style.cssText = `
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
      background: #111;
      color: #fff;
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
      transform: translateY(-12px);
      transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s cubic-bezier(0.4,0,0.2,1);
      opacity: 0;
      max-width: 400px;
      pointer-events: auto;
      letter-spacing: 0.01em;
    `
    toast.textContent = message

    container.appendChild(toast)

    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)'
      toast.style.opacity = '1'
    })

    setTimeout(() => {
      toast.style.transform = 'translateY(-12px)'
      toast.style.opacity = '0'
      setTimeout(() => toast.remove(), 300)
    }, duration)
  }

  return {
    success: (msg, dur) => show(msg, 'success', dur),
    error: (msg, dur) => show(msg, 'error', dur),
    warning: (msg, dur) => show(msg, 'warning', dur),
    info: (msg, dur) => show(msg, 'info', dur),
  }
})()

if (typeof window !== 'undefined') {
  window.McToast = McToast
}
