import { useRef, useState, useEffect } from 'react'

export function useMonotonicRotation(heading) {
  const displayRotRef = useRef(-heading)
  const prevHeadingRef = useRef(heading)
  const [displayRot, setDisplayRot] = useState(-heading)

  useEffect(() => {
    const delta = ((heading - prevHeadingRef.current + 540) % 360) - 180
    displayRotRef.current -= delta
    prevHeadingRef.current = heading
    setDisplayRot(displayRotRef.current)
  }, [heading])

  return displayRot
}
