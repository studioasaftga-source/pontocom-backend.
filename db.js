const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',         // Seu usuário do PostgreSQL
    host: 'localhost',
    database: 'pontocom',  // Nome do seu banco de dados
    password: '240113',    // Sua senha do PostgreSQL
    port: 5432,
});

pool.connect((err, client, release) => {
    if (err) {
        return console.error('Erro ao conectar ao PostgreSQL:', err.stack);
    }
    console.log('✅ Conectado ao PostgreSQL com sucesso!');
    release();
});

module.exports = pool;