// Substitui o `node:crypto` no navegador: inteiro aleatório uniforme em [0, max) com gerador criptográfico.
export function randomInt(max) {
  if (!Number.isInteger(max) || max <= 0) throw new RangeError('max inválido')
  const buf = new Uint32Array(1)
  const limite = Math.floor(0x100000000 / max) * max
  let x
  do {
    crypto.getRandomValues(buf)
    x = buf[0]
  } while (x >= limite)
  return x % max
}
