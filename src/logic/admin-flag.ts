/** Remembered admin/testing menu. The URL flag wins over the stored value. */
export const ADMIN_KEY = 'motion-buddy-admin-v1'

/** `?admin=1` turns the menu on, `?admin=0` turns it off, anything else keeps storage. */
export function adminFromSearch(search: string, storedOn: boolean): { on: boolean; persist: boolean } {
  const flag = new URLSearchParams(search).get('admin')
  if (flag === '1') return { on: true, persist: true }
  if (flag === '0') return { on: false, persist: true }
  return { on: storedOn, persist: false }
}

export function adminFromStorage(raw: string | null): boolean {
  return raw === '1'
}

export function adminToStorage(on: boolean): string {
  return on ? '1' : '0'
}
