import { useState, useEffect } from 'react'
import { fetchPhoto } from '../../lib/photos'

export default function AircraftPhoto({ hex }) {
  const [photo, setPhoto] = useState(undefined) // undefined=loading, null=empty, object=loaded

  useEffect(() => {
    if (!hex) { setPhoto(null); return }
    setPhoto(undefined)
    let cancelled = false
    fetchPhoto(hex).then(result => {
      if (!cancelled) setPhoto(result)
    })
    return () => { cancelled = true }
  }, [hex])

  if (photo === undefined) {
    return <div className="photo-slot photo-slot--loading" />
  }
  if (photo === null) {
    return <div className="photo-slot photo-slot--empty" />
  }
  return (
    <figure className="aircraft-photo">
      <img src={photo.src} alt={`Aircraft ${hex}`} />
      <figcaption>
        <a href={photo.link} target="_blank" rel="noopener noreferrer">
          © {photo.photographer} · Planespotters.net
        </a>
      </figcaption>
    </figure>
  )
}
