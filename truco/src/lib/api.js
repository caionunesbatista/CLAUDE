// Chamadas à API do servidor. Sempre JSON; erros viram exceções com a mensagem do servidor.
export class ErroApi extends Error {
  constructor(mensagem, status) {
    super(mensagem)
    this.status = status
  }
}

async function chamar(metodo, caminho, corpo) {
  let resposta
  try {
    resposta = await fetch(`/api${caminho}`, {
      method: metodo,
      credentials: 'same-origin',
      headers: corpo !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    })
  } catch {
    throw new ErroApi('Sem conexão com o servidor. Verifique sua internet.', 0)
  }
  let dados = null
  try {
    dados = await resposta.json()
  } catch {
    // resposta sem corpo JSON
  }
  if (!resposta.ok) throw new ErroApi(dados?.erro || 'Algo deu errado. Tente de novo.', resposta.status)
  return dados
}

export const api = {
  get: (c) => chamar('GET', c),
  post: (c, corpo = {}) => chamar('POST', c, corpo),
  put: (c, corpo = {}) => chamar('PUT', c, corpo),
}
