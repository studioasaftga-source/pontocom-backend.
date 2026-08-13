const express = require('express');
const router = express.Router();
// Ajuste para ../db ou ../database dependendo de como está o seu
const pool = require('../database'); 

// A ROTA AGORA É APENAS '/', pois no server.js já tem o '/api/rh/cbo'
router.get('/', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT id, codigo, descricao FROM cbo WHERE ativo = true ORDER BY descricao ASC');
        res.json(resultado.rows);
    } catch (erro) {
        console.error("Erro ao buscar CBOs:", erro);
        res.status(500).json({ erro: "Erro interno ao buscar CBOs" });
    }
});

module.exports = router;