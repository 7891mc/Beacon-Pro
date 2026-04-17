/**
 * 图片灯箱组件
 */
const McLightbox = (() => {
  let overlay = null
  let imgEl = null
  let images = []
  let currentIndex = 0

  function init() {
    if (overlay) return

    overlay = document.createElement('div')
    overlay.id = 'mc-lightbox'
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.92);
      display:none;align-items:center;justify-content:center;cursor:zoom-out;
    `

    imgEl = document.createElement('img')
    imgEl.style.cssText = 'max-width:90vw;max-height:90vh;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,0.5);transition:opacity 0.3s;'

    const prevBtn = createNavBtn('left', '‹', () => navigate(-1))
    const nextBtn = createNavBtn('right', '›', () => navigate(1))

    const closeBtn = document.createElement('button')
    closeBtn.textContent = '×'
    closeBtn.style.cssText = 'position:absolute;top:20px;right:24px;font-size:36px;color:#fff;background:none;border:none;cursor:pointer;z-index:1;'
    closeBtn.addEventListener('click', close)

    overlay.appendChild(imgEl)
    overlay.appendChild(prevBtn)
    overlay.appendChild(nextBtn)
    overlay.appendChild(closeBtn)
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
    document.body.appendChild(overlay)

    document.addEventListener('keydown', (e) => {
      if (overlay.style.display !== 'flex') return
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') navigate(-1)
      if (e.key === 'ArrowRight') navigate(1)
    })
  }

  function createNavBtn(side, text, handler) {
    const btn = document.createElement('button')
    btn.textContent = text
    btn.style.cssText = `position:absolute;${side}:20px;top:50%;transform:translateY(-50%);font-size:48px;color:#fff;background:rgba(255,255,255,0.1);border:none;width:52px;height:52px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s;`
    btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,255,255,0.2)' })
    btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(255,255,255,0.1)' })
    btn.addEventListener('click', (e) => { e.stopPropagation(); handler() })
    return btn
  }

  function open(imgList, index = 0) {
    init()
    images = imgList
    currentIndex = index
    showCurrent()
    overlay.style.display = 'flex'
    document.body.style.overflow = 'hidden'
  }

  function close() {
    if (overlay) {
      overlay.style.display = 'none'
      document.body.style.overflow = ''
    }
  }

  function navigate(dir) {
    currentIndex = (currentIndex + dir + images.length) % images.length
    showCurrent()
  }

  function showCurrent() {
    if (images[currentIndex]) {
      imgEl.style.opacity = '0'
      imgEl.src = images[currentIndex]
      imgEl.onload = () => { imgEl.style.opacity = '1' }
    }
  }

  return { open, close }
})()

if (typeof window !== 'undefined') {
  window.McLightbox = McLightbox
}
