// Notification sound utility that handles browser autoplay restrictions
// Sound will only play after user has interacted with the page

let audioContext: AudioContext | null = null
let isAudioEnabled = false

// Initialize audio context on first user interaction
function initAudio() {
  if (audioContext) return

  try {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    isAudioEnabled = true

    // Remove listeners once initialized
    document.removeEventListener('click', initAudio)
    document.removeEventListener('keydown', initAudio)
    document.removeEventListener('touchstart', initAudio)
  } catch {
    console.warn('Web Audio API not supported')
  }
}

// Set up listeners to enable audio on first interaction
if (typeof window !== 'undefined') {
  document.addEventListener('click', initAudio, { once: true })
  document.addEventListener('keydown', initAudio, { once: true })
  document.addEventListener('touchstart', initAudio, { once: true })
}

// Play a pleasant notification melody
export function playNotificationSound() {
  if (!isAudioEnabled || !audioContext) {
    console.log('Audio not enabled yet - user interaction required')
    return
  }

  // Resume audio context if suspended (browser policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }

  try {
    // Create a pleasant three-tone melody
    const notes = [
      { freq: 523.25, start: 0, duration: 0.12 },      // C5
      { freq: 659.25, start: 0.12, duration: 0.12 },   // E5
      { freq: 783.99, start: 0.24, duration: 0.2 },    // G5
    ]

    const now = audioContext.currentTime

    notes.forEach(({ freq, start, duration }) => {
      const oscillator = audioContext!.createOscillator()
      const gainNode = audioContext!.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext!.destination)

      oscillator.frequency.value = freq
      oscillator.type = 'sine'

      // Smooth envelope for pleasant sound
      gainNode.gain.setValueAtTime(0, now + start)
      gainNode.gain.linearRampToValueAtTime(0.25, now + start + 0.015)
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + start + duration)

      oscillator.start(now + start)
      oscillator.stop(now + start + duration + 0.05)
    })
  } catch (err) {
    console.error('Failed to play notification sound:', err)
  }
}

// Check if audio is ready
export function isAudioReady(): boolean {
  return isAudioEnabled
}

// Manually enable audio (call on a user action)
export function enableAudio() {
  initAudio()
}
