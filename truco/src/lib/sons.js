// Efeitos sonoros sintetizados com Web Audio (sem arquivos de áudio) + vibração no celular.
let contexto = null
let mudo = false
try {
  mudo = localStorage.getItem('som') === 'mudo'
} catch {
  // armazenamento indisponível: som ligado
}

export function estaMudo() {
  return mudo
}

export function alternarSom() {
  mudo = !mudo
  try {
    localStorage.setItem('som', mudo ? 'mudo' : 'ligado')
  } catch {
    // ignora
  }
  return mudo
}

function ctx() {
  if (mudo) return null
  try {
    if (!contexto) contexto = new (window.AudioContext || window.webkitAudioContext)()
    if (contexto.state === 'suspended') contexto.resume()
    return contexto
  } catch {
    return null
  }
}

function tom(freq, inicio, duracao, { tipo = 'sine', volume = 0.15, deslize = null } = {}) {
  const c = ctx()
  if (!c) return
  const t = c.currentTime + inicio
  const osc = c.createOscillator()
  const ganho = c.createGain()
  osc.type = tipo
  osc.frequency.setValueAtTime(freq, t)
  if (deslize) osc.frequency.exponentialRampToValueAtTime(deslize, t + duracao)
  ganho.gain.setValueAtTime(0.0001, t)
  ganho.gain.exponentialRampToValueAtTime(volume, t + 0.012)
  ganho.gain.exponentialRampToValueAtTime(0.0001, t + duracao)
  osc.connect(ganho).connect(c.destination)
  osc.start(t)
  osc.stop(t + duracao + 0.02)
}

function ruido(inicio, duracao, { volume = 0.25, filtro = 1800 } = {}) {
  const c = ctx()
  if (!c) return
  const t = c.currentTime + inicio
  const tamanho = Math.floor(c.sampleRate * duracao)
  const buffer = c.createBuffer(1, tamanho, c.sampleRate)
  const dados = buffer.getChannelData(0)
  for (let i = 0; i < tamanho; i++) dados[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / tamanho, 3)
  const fonte = c.createBufferSource()
  fonte.buffer = buffer
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = filtro
  bp.Q.value = 0.8
  const ganho = c.createGain()
  ganho.gain.value = volume
  fonte.connect(bp).connect(ganho).connect(c.destination)
  fonte.start(t)
}

export const sons = {
  /** Carta batendo na mesa. */
  carta() {
    ruido(0, 0.09, { volume: 0.5, filtro: 2200 })
    tom(180, 0, 0.06, { tipo: 'triangle', volume: 0.08 })
  },
  /** Cartas sendo distribuídas. */
  distribuir() {
    for (let i = 0; i < 3; i++) ruido(i * 0.09, 0.06, { volume: 0.3, filtro: 3200 })
  },
  /** TRUCO! */
  truco() {
    tom(392, 0, 0.14, { tipo: 'square', volume: 0.07 })
    tom(523, 0.12, 0.22, { tipo: 'square', volume: 0.08 })
    ruido(0, 0.12, { volume: 0.18, filtro: 900 })
  },
  aceitou() {
    tom(523, 0, 0.1, { volume: 0.12 })
    tom(784, 0.09, 0.16, { volume: 0.12 })
  },
  correu() {
    tom(440, 0, 0.16, { tipo: 'triangle', volume: 0.12, deslize: 220 })
  },
  /** É a sua vez. */
  vez() {
    tom(880, 0, 0.12, { volume: 0.09 })
    tom(1320, 0.08, 0.16, { volume: 0.07 })
  },
  ponto() {
    tom(660, 0, 0.1, { volume: 0.1 })
    tom(990, 0.08, 0.12, { volume: 0.08 })
  },
  vitoria() {
    ;[523, 659, 784, 1047].forEach((f, i) => tom(f, i * 0.1, 0.25, { tipo: 'triangle', volume: 0.12 }))
  },
  derrota() {
    ;[392, 330, 262].forEach((f, i) => tom(f, i * 0.14, 0.3, { tipo: 'triangle', volume: 0.1 }))
  },
  reacao() {
    tom(1200, 0, 0.06, { volume: 0.05 })
  },
}

export function vibrar(ms = 60) {
  if (mudo) return
  // O navegador só permite vibrar depois que a pessoa tocou na página.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return
  try {
    navigator.vibrate?.(ms)
  } catch {
    // sem vibração
  }
}
