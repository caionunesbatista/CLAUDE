// Uso: npm run admin -- <apelido>          → torna a conta administradora
//      npm run admin -- <apelido> --remover → tira o acesso de administrador
import { abrirBanco, db, fecharBanco } from '../db.js'

const [apelido, opcao] = process.argv.slice(2)
if (!apelido) {
  console.log('Uso: npm run admin -- <apelido> [--remover]')
  process.exit(1)
}
abrirBanco()
const u = db().prepare('SELECT id, apelido FROM usuarios WHERE apelido = ?').get(apelido)
if (!u) {
  console.log(`Nenhuma conta com o apelido "${apelido}". Cadastre-se no site primeiro.`)
  fecharBanco()
  process.exit(1)
}
const remover = opcao === '--remover'
db().prepare('UPDATE usuarios SET admin = ? WHERE id = ?').run(remover ? 0 : 1, u.id)
console.log(remover ? `"${u.apelido}" não é mais administrador.` : `"${u.apelido}" agora é administrador. Acesse /admin no site.`)
fecharBanco()
