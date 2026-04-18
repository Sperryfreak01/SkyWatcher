import { useState, useEffect } from 'react'
import { fetchPhoto } from '../../lib/photos'

/**
 * Fetches and displays a Planespotters.net thumbnail for the given aircraft hex.
 *
 * States:
 *   loading  — initial fetch in progress → `photo-slot photo-slot--loading`
 *   loaded   — photo available          → `aircraft-photo` figure with img + figcaption
 *   empty    — no photo / error         → `photo-slot photo-slot--empty`
 *
 * @param {{ hex: string|null }} props
 * @returns {JSX.Element}
 */
export default function AircraftPhoto({ hex }) {
  const [photo, setPhoto] = useState(undefined) // undefined = loading, null = empty, object = loaded

  useEffect(() => {
    if (!hex) {
      setPhoto(null)
      return
    }

    let cancelled = false

    // Reset to loading state whenever hex changes.
    setPhoto(undefined)

    fetchPhoto(hex).then((result) => {
      if (!cancelled) {
        setPhoto(result ?? null)
      }
    })

    return () => {
      cancelled = true
    }
  }, [hex])

  // Loading state
  if (photo === undefined) {
    return <div className="photo-slot photo-slot--loading" aria-hidden="true" />
  }

  // Empty / no-photo state
  if (photo === null) {
    return <div className="photo-slot photo-slot--empty" aria-label="No aircraft photo available" />
  }

  // Loaded state
  return (
    <figure className="aircraft-photo">
      <img
        src={photo.src}
        alt={`Photo of ${hex.toUpperCase()} by ${photo.photographer}`}
        loading="lazy"
      />
      <figcaption>
        {photo.photographer && photo.link ? (
          <>
            Photo by{' '}
            <a href={photo.link} target="_blank" rel="noopener noreferrer">
              {photo.photographer}
            </a>
            {' '}· planespotters.net
          </>
        ) : (
          'Photo · planespotters.net'
        )}
      </figcaption>
    </figure>
  )
}
