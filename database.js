require("dotenv").config();

const { Pool } = require("pg");

// =====================================================
// CONEXÃO COM POSTGRESQL / SUPABASE
// =====================================================
//
// IMPORTANTE:
// No Render, use a CONNECTION STRING do
// SUPABASE SESSION POOLER.
//
// Ela deve terminar em:
// :5432/postgres
//
// NÃO use:
// db.xxxxx.supabase.co:5432
//
// Use:
// aws-0-xxxxx.pooler.supabase.com:5432
// =====================================================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,

    ssl: {
        rejectUnauthorized: false
    },

    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

// =====================================================
// TESTE DE CONEXÃO
// =====================================================

pool.connect()
    .then((client) => {
        console.log("======================================");
        console.log("✅ CONECTADO AO POSTGRESQL / SUPABASE");
        console.log("======================================");

        client.release();
    })
    .catch((err) => {
        console.error("======================================");
        console.error("❌ ERRO AO CONECTAR AO POSTGRESQL");
        console.error("======================================");
        console.error("Mensagem:", err.message);
        console.error("Código:", err.code);
        console.error("Host:", process.env.DATABASE_URL
            ? process.env.DATABASE_URL.replace(/\/\/.*@/, "//***@")
            : "DATABASE_URL não configurada"
        );
    });

// =====================================================
// EXPORTAR POOL
// =====================================================

module.exports = pool;