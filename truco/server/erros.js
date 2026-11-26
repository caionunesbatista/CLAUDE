/** Erro que pode ser mostrado ao usuário (mensagem em português, sem detalhes internos). */
export class ErroUsuario extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem)
    this.status = status
  }
}

/** Embrulha um handler do Express: qualquer erro vira resposta JSON adequada. */
export function rota(fn) {
  return (req, res, next) => {
    try {
      const r = fn(req, res)
      if (r && typeof r.then === 'function') r.catch(next)
    } catch (erro) {
      next(erro)
    }
  }
}

export function tratarErros(erro, req, res, _next) {
  if (erro instanceof ErroUsuario || erro?.name === 'ErroJogo') {
    return res.status(erro.status || 400).json({ erro: erro.message })
  }
  if (erro?.type === 'entity.parse.failed') return res.status(400).json({ erro: 'Requisição inválida.' })
  if (erro?.type === 'entity.too.large') return res.status(413).json({ erro: 'Requisição grande demais.' })
  console.error('[erro]', erro)
  res.status(500).json({ erro: 'Erro interno. Tente novamente em instantes.' })
}
