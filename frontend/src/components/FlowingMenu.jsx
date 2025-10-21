'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export default function FlowingMenu({ items = [] }) {
  const containerRef = useRef(null)
  const itemRefs = useRef([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const itemsEls = itemRefs.current
    gsap.from(itemsEls, { opacity: 0, y: -8, stagger: 0.06, duration: 0.35, ease: 'power2.out' })

    const handleMove = (e) => {
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      itemsEls.forEach((el) => {
        if (!el) return
        const elRect = el.getBoundingClientRect()
        const center = elRect.left - rect.left + elRect.width / 2
        const dist = Math.abs(x - center)
        const scale = Math.max(0.95, 1.15 - dist / 300)
        const y = Math.min(10, dist / 20)
        gsap.to(el, { scale, y: -y, duration: 0.2, ease: 'power2.out' })
      })
    }

    const handleLeave = () => {
      gsap.to(itemsEls, { scale: 1, y: 0, duration: 0.3, ease: 'power2.out' })
    }

    container.addEventListener('mousemove', handleMove)
    container.addEventListener('mouseleave', handleLeave)
    return () => {
      container.removeEventListener('mousemove', handleMove)
      container.removeEventListener('mouseleave', handleLeave)
    }
  }, [])

  return (
    <div ref={containerRef} className="relative flex items-center gap-3">
      {items.map((it, idx) => (
        <a
          key={idx}
          href={it.link}
          ref={(el) => (itemRefs.current[idx] = el)}
          className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] hover:border-[var(--ring)] transition shadow-sm px-2 py-1.5"
          style={{ willChange: 'transform' }}
        >
          <img
            src={it.image}
            alt={it.text}
            className="w-10 h-10 rounded-lg object-cover"
          />
          <span className="text-sm font-semibold whitespace-nowrap">{it.text}</span>
        </a>
      ))}
    </div>
  )
}
