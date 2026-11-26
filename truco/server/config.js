import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const config = {
  raiz,
  porta: Number(process.env.PORT) || 3000,
  // Pasta onde fica o banco de dados (precisa ser um disco persistente em produção).
  pastaDados: process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(raiz, 'data'),
  // Arquivo do banco; ':memory:' é usado nos testes.
  arquivoBanco: process.env.DB_FILE || null,
  // Cookie com flag Secure: '1' força ligado, '0' força desligado; sem valor, liga sozinho quando o acesso é HTTPS.
  cookieSeguro: process.env.COOKIE_SECURE === '1' ? true : process.env.COOKIE_SECURE === '0' ? false : null,
  // Origem pública do site, para conferir requisições (ex.: https://zaparena.com.br). Opcional.
  origemPublica: process.env.PUBLIC_ORIGIN || null,
  diasSessao: 30,
  // Atrasos (ms) — reduzidos nos testes automatizados.
  atrasoEntreMaos: Number(process.env.ATRASO_MAOS ?? 2600),
  atrasoBotMin: Number(process.env.ATRASO_BOT_MIN ?? 700),
  atrasoBotMax: Number(process.env.ATRASO_BOT_MAX ?? 1500),
}
