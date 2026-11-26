// Sobe o servidor (porta 3000) e o site com recarga automática (porta 5173) ao mesmo tempo.
import { spawn } from 'node:child_process'

const processos = [
  spawn('npm', ['run', 'dev:servidor'], { stdio: 'inherit', shell: process.platform === 'win32' }),
  spawn('npm', ['run', 'dev:site'], { stdio: 'inherit', shell: process.platform === 'win32' }),
]

const encerrar = () => {
  for (const p of processos) p.kill('SIGTERM')
  process.exit(0)
}
process.on('SIGINT', encerrar)
process.on('SIGTERM', encerrar)
for (const p of processos) p.on('exit', (codigo) => codigo && encerrar())

console.log('\n  Abra http://localhost:5173 no navegador.\n')
