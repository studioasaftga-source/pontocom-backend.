require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    // Isso faz o código ler a linha DATABASE_URL do seu arquivo .env
    connectionString: process.env.DATABASE_URL,
    // ⚠️ Obrigatório para conectar em banco de dados na nuvem
    ssl: {
        rejectUnauthorized: false
    }
});

pool.connect((err, client, release) => {
    if (err) {
        return console.error('Erro ao conectar ao PostgreSQL:', err.stack);
    }
    console.log('✅ Conectado ao PostgreSQL (Supabase) com sucesso!');
    release();
});

module.exports = pool;