import { criarServidor } from './app.js'
import { config } from './config.js'
import { fecharBanco } from './db.js'

const { servidor, desligar } = criarServidor()

servidor.listen(config.porta, () => {
  console.log(`Servidor do truco rodando em http://localhost:${config.porta}`)
})

let desligando = false
for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => {
    if (desligando) return
    desligando = true
    console.log('Desligando: devolvendo valores das partidas em andamento...')
    try {
      desligar('Servidor reiniciado')
    } finally {
      setTimeout(() => {
        fecharBanco()
        process.exit(0)
      }, 500)
    }
  })
}

process.on('uncaughtException', (erro) => {
  console.error('[erro não tratado]', erro)
})
process.on('unhandledRejection', (erro) => {
  console.error('[promessa rejeitada]', erro)
})
