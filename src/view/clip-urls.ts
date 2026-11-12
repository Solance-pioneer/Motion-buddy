const loaders = import.meta.glob(
  ['../assets/scene-clips-batch1-v1/*.mp4', '../assets/scene-clips-batch2-v1/*.mp4'],
  {
    query: '?url',
    import: 'default',
  },
) as Record<string, () => Promise<string>>

/** Load one film when it is about to play. The main bundle does not embed the set. */
export function loadClipUrl(file: string): Promise<string> {
  const key = Object.keys(loaders).find((path) => path.endsWith(`/${file}`))
  const load = key ? loaders[key] : undefined
  if (!load) return Promise.reject(new Error(`Missing clip ${file}`))
  return load()
}
