require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,

    ssl: {
        rejectUnauthorized: false
    },

    max: 10,

    idleTimeoutMillis: 30000,

    connectionTimeoutMillis: 10000
});

// ========================================
// TESTE DE CONEXÃO
// ========================================

pool.connect()
    .then((client) => {
        console.log("========================================");
        console.log("✅ CONECTADO AO POSTGRESQL / SUPABASE");
        console.log("========================================");

        client.release();
    })
    .catch((err) => {
        console.error("========================================");
        console.error("❌ ERRO AO CONECTAR AO POSTGRESQL");
        console.error("========================================");
        console.error(err.message);
    });

module.exports = pool;