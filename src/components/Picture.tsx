import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { image, type ImageName } from '../lib/images'
import s from './Picture.module.css'

type Props = {
  name: ImageName
  /** Eigenes Hochformat-Motiv für Bildschirme im Hochformat */
  portrait?: ImageName
  alt: string
  sizes?: string
  priority?: boolean
  position?: string
  className?: string
  style?: CSSProperties
}

export function Picture({ name, portrait, alt, sizes = '100vw', priority, position, className, style }: Props) {
  const i = image(name)
  const p = portrait ? image(portrait) : null
  const ref = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth) setLoaded(true)
  }, [])

  return (
    <picture className={`${s.pic} ${className ?? ''}`} style={{ backgroundImage: `url(${i.lqip})`, ...style }}>
      {p && (
        <>
          <source media="(orientation: portrait)" type="image/avif" srcSet={p.avif} sizes={sizes} />
          <source media="(orientation: portrait)" type="image/webp" srcSet={p.webp} sizes={sizes} />
          <source media="(orientation: portrait)" srcSet={p.jpg} sizes={sizes} />
        </>
      )}
      <source type="image/avif" srcSet={i.avif} sizes={sizes} />
      <source type="image/webp" srcSet={i.webp} sizes={sizes} />
      <img
        ref={ref}
        className={s.img}
        src={i.src}
        srcSet={i.jpg}
        sizes={sizes}
        alt={alt}
        width={i.width}
        height={i.height}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        data-loaded={loaded || undefined}
        onLoad={() => setLoaded(true)}
        style={position ? { objectPosition: position } : undefined}
      />
    </picture>
  )
}
