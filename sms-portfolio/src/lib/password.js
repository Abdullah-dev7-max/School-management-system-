const ITERATIONS = 310_000
const KEY_LENGTH = 256

function toBase64(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return window.btoa(binary)
}

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12) {
    throw new Error('Password must be at least 12 characters.')
  }

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    material,
    KEY_LENGTH
  )

  return { passwordSalt: toBase64(salt), passwordHash: toBase64(new Uint8Array(bits)) }
}
