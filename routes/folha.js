const express = require("express");
const router = express.Router();
const pool = require("../database");

// Busca o fechamento do funcionário (Espelho de Ponto)
router.get("/:funcionarioId/:mes/:ano", async (req, res) => {
    try {
        const { funcionarioId, mes, ano } = req.params;
        const query = `
            SELECT ff.*, fp.mes, fp.ano 
            FROM fechamento_funcionarios ff
            JOIN fechamentos_ponto fp ON ff.fechamento_id = fp.id
            WHERE ff.funcionario_id = $1 AND fp.mes = $2 AND fp.ano = $3
        `;
        const result = await pool.query(query, [funcionarioId, mes, ano]);
        
        if (result.rows.length === 0) return res.status(404).json({ sucesso: false });
        res.json({ sucesso: true, dados: result.rows[0] });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

// Funcionário assina a folha
router.put("/aprovar/:id", async (req, res) => {
    try {
        const query = `
            UPDATE fechamento_funcionarios 
            SET aprovado_pelo_funcionario = true, data_aprovacao_funcionario = NOW()
            WHERE id = $1
        `;
        await pool.query(query, [req.params.id]);
        res.json({ sucesso: true });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;