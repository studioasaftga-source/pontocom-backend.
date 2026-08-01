const express = require('express');
const router = express.Router();
const pool = require('../database');

// Rota de Login do App (PWA) - Apenas CPF
router.post('/login', async (req, res) => {
    try {
        const { cpf } = req.body;

        if (!cpf) {
            return res.status(400).json({ sucesso: false, erro: "Informe o CPF para acessar." });
        }

        // Limpa a formatação (tira pontos e traços)
        const cpfLimpo = cpf.replace(/\D/g, '');

        // Busca apenas pelo CPF e se o funcionário está ativo
        const result = await pool.query(`
            SELECT id, nome, cargo_id 
            FROM funcionarios 
            WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = $1 
            AND ativo = true
        `, [cpfLimpo]);

        if (result.rows.length === 0) {
            return res.status(401).json({ sucesso: false, erro: "CPF não encontrado ou funcionário inativo." });
        }

        const funcionario = result.rows[0];

        res.json({
            sucesso: true,
            mensagem: "Login realizado com sucesso!",
            funcionario: {
                id: funcionario.id,
                nome: funcionario.nome
            }
        });

    } catch (err) {
        console.error("Erro no login:", err);
        res.status(500).json({ sucesso: false, erro: "Erro interno no servidor." });
    }
});

module.exports = router;