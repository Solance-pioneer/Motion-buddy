export function roundCoord(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 10) / 10
}

/** Ask only after Weather moods is turned on. Coordinates are rounded before they are used. */
export function requestRoundedFix(): Promise<{ lat: number; lon: number } | null> {
  const geo = navigator.geolocation
  if (!geo) return Promise.resolve(null)
  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (pos) => resolve({ lat: roundCoord(pos.coords.latitude), lon: roundCoord(pos.coords.longitude) }),
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: 3_600_000, timeout: 8_000 },
    )
  })
}
