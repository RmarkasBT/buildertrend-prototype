import { useEffect, useState } from 'react'
import { IconImage, IconX, IconPhotoGrid } from './icons'

// There are no real job-site images in this repo, so each photo renders as a
// deterministic tinted tile keyed off its `tone`. The surrounding behaviour —
// the 5-up grid, the "+N" overflow tile, "View all (N)", and the lightbox
// with arrow-key paging — is what the live Daily Log card and detail page do.
const TONES = {
  stone: 'from-gray-30 to-gray-50',
  slate: 'from-gray-40 to-gray-70',
  sand: 'from-brand-amber/70 to-gray-40',
  clay: 'from-brand-coral/50 to-gray-50',
  moss: 'from-success-fg/40 to-gray-60',
}

function Tile({ photo, className = '', onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={photo.caption}
      className={`group relative flex h-full w-full items-end overflow-hidden rounded-sm bg-gradient-to-br ${
        TONES[photo.tone] ?? TONES.stone
      } ${className}`}
    >
      <IconImage className="absolute top-1/2 left-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-white/60" />
      <span className="relative w-full truncate bg-black/35 px-1.5 py-1 text-left text-[10px] text-white opacity-0 transition group-hover:opacity-100">
        {photo.caption}
      </span>
    </button>
  )
}

export function ViewAllPhotosButton({ count, onClick }) {
  if (!count) return null
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-sm border border-gray-20 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-80 hover:bg-gray-5"
    >
      <IconPhotoGrid className="h-3.5 w-3.5" />
      View all ({count})
    </button>
  )
}

// A left-aligned row of fixed-size square thumbnails, as the live card and
// detail page render them — not a stretch-to-fit grid, so a log with two
// photos shows two normal-sized thumbnails rather than two half-width ones.
// `max` caps how many are drawn; the last becomes a "+N" overflow tile.
export function PhotoGrid({ photos, max = 5, size = 'h-44 w-44', onOpen }) {
  if (!photos?.length) return null
  const visible = photos.slice(0, max)
  // The overflow tile sits *on top of* the last visible thumbnail, so that
  // photo is hidden too — count it. With 8 photos in 5 slots the badge reads
  // "+4" (photos 5-8), not "+3".
  const overflow = photos.length > max ? photos.length - (max - 1) : 0

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {visible.map((photo, index) => {
        const isOverflowTile = overflow > 0 && index === visible.length - 1
        return (
          <div key={photo.id} className={`relative shrink-0 ${size}`}>
            <Tile photo={photo} onClick={() => onOpen?.(index)} />
            {isOverflowTile && (
              <button
                type="button"
                onClick={() => onOpen?.(index)}
                className="absolute inset-0 flex items-center justify-center rounded-sm bg-gray-90/65 text-lg font-semibold text-white"
              >
                +{overflow}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function PhotoLightbox({ photos, startIndex = 0, onClose }) {
  const [index, setIndex] = useState(startIndex)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % photos.length)
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + photos.length) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photos.length, onClose])

  if (!photos?.length) return null
  const photo = photos[index]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-100/90" onClick={onClose}>
      <div className="flex items-center justify-between px-5 py-3 text-white">
        <span className="text-sm">
          {index + 1} of {photos.length}
        </span>
        <button onClick={onClose} aria-label="Close" className="rounded-sm p-1 hover:bg-white/10">
          <IconX className="h-5 w-5" />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center gap-4 px-6 pb-8" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
          className="rounded-full bg-white/10 px-3 py-2 text-xl text-white hover:bg-white/20"
          aria-label="Previous photo"
        >
          ‹
        </button>
        <div
          className={`flex aspect-[4/3] w-full max-w-3xl flex-col justify-end rounded-md bg-gradient-to-br ${
            TONES[photo.tone] ?? TONES.stone
          }`}
        >
          <div className="rounded-b-md bg-black/40 px-4 py-2 text-sm text-white">{photo.caption}</div>
        </div>
        <button
          onClick={() => setIndex((i) => (i + 1) % photos.length)}
          className="rounded-full bg-white/10 px-3 py-2 text-xl text-white hover:bg-white/20"
          aria-label="Next photo"
        >
          ›
        </button>
      </div>
    </div>
  )
}
