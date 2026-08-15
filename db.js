require('dotenv').config();
const dns = require('dns');

// ⚠️ Obriga a usar IPv4 antes de tentar conectar
dns.setDefaultResultOrder('ipv4first');

const { Pool } = require('pg');

// Avisa no painel se você esquecer de criar o arquivo .env
if (!process.env.DATABASE_URL) {
    console.error("❌ ERRO GRAVE: Arquivo .env não encontrado ou DATABASE_URL vazia!");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    family: 4, // <--- A MÁGICA DO RENDER AQUI: Trava no IPv4
    ssl: {
        rejectUnauthorized: false // <--- Exigência do Supabase
    }
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('========================================');
        console.error('❌ ERRO AO CONECTAR AO POSTGRESQL');
        console.error('========================================');
        return console.error(err.message);
    }
    console.log('✅ Conectado ao PostgreSQL (Supabase) com sucesso!');
    release();
});

module.exports = pool;