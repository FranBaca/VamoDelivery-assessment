// These cues live only in the recording browser. DOM overlays are captured in
// Playwright video, whereas the operating system's mouse cursor is not.
export async function installRecordingPointer(context) {
  await context.addInitScript(() => {
    function install() {
      const layer = document.createElement('div')
      layer.setAttribute('aria-hidden', 'true')
      layer.setAttribute('data-demo-pointer', '')
      layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647'
      layer.innerHTML = `<style>
        [data-demo-pointer] * { box-sizing:border-box; pointer-events:none!important }
        [data-demo-pointer] .demo-cursor { position:absolute;left:20px;top:20px;width:28px;height:36px;filter:drop-shadow(0 2px 2px #0008) }
        [data-demo-pointer] .demo-target { position:absolute;border:3px solid #ef8a12;border-radius:6px;box-shadow:0 0 0 2px #fff,0 0 0 6px #ef8a1233;display:none }
        [data-demo-pointer] .demo-ring { position:absolute;width:60px;height:60px;border:4px solid #ef8a12;border-radius:50%;background:#ffd84d38;box-shadow:0 0 0 5px #fff9;display:none }
        [data-demo-pointer] .demo-action { position:absolute;padding:5px 9px;border:2px solid white;border-radius:5px;background:#8b4206;color:#fff;font:700 13px/1.4 Arial,sans-serif;box-shadow:0 2px 8px #0004;white-space:nowrap;display:none }
      </style>
      <div class="demo-target"></div><div class="demo-ring"></div>
      <div class="demo-action"></div>
      <svg class="demo-cursor" viewBox="0 0 28 36"><path d="M2 2 L3 28 L10 22 L16 33 L22 30 L16 20 L26 19 Z" fill="#ffdb4d" stroke="#172c25" stroke-width="2" stroke-linejoin="round"/><path d="M5 7 L6 22" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`
      document.body.append(layer)
      const cursor = layer.querySelector('.demo-cursor')
      const target = layer.querySelector('.demo-target')
      const ring = layer.querySelector('.demo-ring')
      const action = layer.querySelector('.demo-action')
      document.addEventListener(
        'mousemove',
        (event) => {
          cursor.style.left = `${event.clientX}px`
          cursor.style.top = `${event.clientY}px`
        },
        { passive: true },
      )
      window.__demoRecordingPointer = {
        point(bounds, label) {
          const x = bounds.x + bounds.width / 2
          const y = bounds.y + bounds.height / 2
          Object.assign(target.style, {
            display: 'block',
            left: `${bounds.x - 3}px`,
            top: `${bounds.y - 3}px`,
            width: `${bounds.width + 6}px`,
            height: `${bounds.height + 6}px`,
          })
          Object.assign(ring.style, { display: 'block', left: `${x - 30}px`, top: `${y - 30}px` })
          action.textContent = label
          Object.assign(action.style, {
            display: 'block',
            left: `${Math.max(8, Math.min(x + 28, innerWidth - 260))}px`,
            top: `${Math.min(y + 35, innerHeight - 40)}px`,
          })
        },
        clear() {
          target.style.display = ring.style.display = action.style.display = 'none'
        },
      }
    }
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', install, { once: true })
    else install()
  })
}

export async function pointTo(page, locator, label) {
  const bounds = await locator.boundingBox()
  if (!bounds) throw new Error(`Cannot show recording pointer: ${label}`)
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, { steps: 16 })
  await page.evaluate(({ bounds, label }) => window.__demoRecordingPointer.point(bounds, label), {
    bounds,
    label,
  })
}

export async function clearPointerTarget(page) {
  await page.evaluate(() => window.__demoRecordingPointer?.clear())
}
