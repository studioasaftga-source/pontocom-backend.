require('dotenv').config(); // Mantido caso o seu back-end use o .env para outras coisas (como a porta)
const { Pool } = require('pg');

const pool = new Pool({
  // URL de conexão colocada diretamente aqui:
  connectionString: "postgresql://postgres:Pqixw0i3jIvCBKUK@db.kntjzksaokqoavwjkqnm.supabase.co:5432/postgres",
  // ⚠️ SSL obrigatório mantido
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

// ✅ Teste de conexão
pool.connect()
  .then(client => {
    console.log("✅ Conectado ao PostgreSQL (Supabase) com sucesso!");
    client.release();
  })
  .catch(err => {
    console.error("❌ Erro na conexão com o PostgreSQL:");
    console.error(err);
  });

// Função para garantir que as tabelas existem
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS funcionarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100),
        data_admissao DATE,
        pis_pasep VARCHAR(20),
        salario_base NUMERIC(10,2),
        banco VARCHAR(50),
        conta_bancaria VARCHAR(20)
      );

      CREATE TABLE IF NOT EXISTS registros_ponto (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        data_registro DATE DEFAULT CURRENT_DATE,
        hora_entrada TIME,
        hora_saida TIME
      );
    `);

    console.log("✅ Estrutura do Banco de Dados verificada e pronta!");
  } catch (err) {
    console.error("❌ Erro ao inicializar tabelas:");
    console.error(err);
  }
};

module.exports = pool;