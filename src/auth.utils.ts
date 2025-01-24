export function calculateExpiresAt(expiry: string) {
  const expiresInSeconds = expirationToSeconds(expiry)
  const now = Math.floor(Date.now() / 1000) // Get current Unix timestamp in seconds
  const expiresAt = now + expiresInSeconds
  return expiresAt * 1000
}

export function expirationToSeconds(expiry: string) {
  let seconds = 0
  const timeRegex = /^(\d+)([d|h|m|s])$/
  const matches = expiry.match(timeRegex)
  if (matches && matches.length === 3) {
    const value = parseInt(matches[1], 10)
    const unit = matches[2]
    switch (unit) {
      case 'd':
        seconds = value * 24 * 60 * 60
        break
      case 'h':
        seconds = value * 60 * 60
        break
      case 'm':
        seconds = value * 60
        break
      case 's':
        seconds = value
        break
      default:
        seconds = 0
    }
  } else {
    throw new Error('Invalid expiration time')
  }
  return seconds
}
