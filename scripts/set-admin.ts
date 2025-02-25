import { pool } from '../src/lib/db'

async function setUserAsAdmin(email: string) {
  try {
    const { rows } = await pool.query(
      'UPDATE users SET role = $1 WHERE email = $2 RETURNING id, email, role',
      ['admin', email]
    )

    if (rows.length === 0) {
      console.error('Usuário não encontrado:', email)
      return
    }

    console.log('Usuário atualizado com sucesso:', rows[0])
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
  } finally {
    await pool.end()
  }
}

// Pegar o email do usuário dos argumentos da linha de comando
const email = process.argv[2]

if (!email) {
  console.error('Por favor, forneça o email do usuário como argumento.')
  console.error('Exemplo: npm run set-admin user@example.com')
  process.exit(1)
}

setUserAsAdmin(email)
