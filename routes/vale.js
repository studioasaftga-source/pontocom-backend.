const express = require('express');
const router = express.Router();
const pool = require('../db');

// ==========================================
// 1. SOLICITAÇÃO DE VALE (PWA)
// ==========================================
router.post('/solicitar', async (req, res) => {
    const { funcionario_id, valor, justificativa } = req.body;
    
    const dataAtual = new Date();
    const mes = dataAtual.getMonth() + 1;
    const ano = dataAtual.getFullYear();
    const dia = dataAtual.getDate();

    // Regra 1: Bloqueio de data por segurança no backend (Dias 15 a 20)
    //if (dia < 15 || dia > 20) {
    //     return res.status(403).json({ erro: "As solicitações de vale só são permitidas entre os dias 15 e 20." });
    // }

    try {
        // Busca o salário do funcionário
        const funcRes = await pool.query('SELECT salario_base FROM funcionarios WHERE id = $1', [funcionario_id]);
        if (funcRes.rows.length === 0) return res.status(404).json({ erro: "Funcionário não encontrado." });
        
        const salarioBase = parseFloat(funcRes.rows[0].salario_base || 0);
        const limiteMaximo = salarioBase * 0.40; // 40% do salário

        // Busca o total de vales já solicitados no mês (Pendente ou Aprovado)
        const valesRes = await pool.query(`
            SELECT SUM(valor) as total_gasto 
            FROM vales 
            WHERE funcionario_id = $1 AND competencia_mes = $2 AND competencia_ano = $3 AND status != 'Recusado'
        `, [funcionario_id, mes, ano]);

        const totalGasto = parseFloat(valesRes.rows[0].total_gasto || 0);
        const valorSolicitado = parseFloat(valor);

        // Regra 2: Trava dos 40%
        if ((totalGasto + valorSolicitado) > limiteMaximo) {
            return res.status(400).json({ 
                erro: "Limite excedido.", 
                limite_disponivel: limiteMaximo - totalGasto 
            });
        }

        // Insere o vale se passou nas regras
        const query = `
            INSERT INTO vales (funcionario_id, valor, data_solicitacao, competencia_mes, competencia_ano, justificativa, status)
            VALUES ($1, $2, NOW(), $3, $4, $5, 'Pendente') RETURNING *;
        `;
        const novoVale = await pool.query(query, [funcionario_id, valorSolicitado, mes, ano, justificativa]);

        res.status(201).json({ mensagem: "Vale solicitado com sucesso!", vale: novoVale.rows[0] });

    } catch (erro) {
        console.error("Erro ao solicitar vale:", erro);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// ==========================================
// 2. LISTAR VALES DO FUNCIONÁRIO (PWA)
// ==========================================
router.get('/meus-vales/:id', async (req, res) => {
    try {
        const query = "SELECT * FROM vales WHERE funcionario_id = $1 ORDER BY data_solicitacao DESC";
        const resultado = await pool.query(query, [req.params.id]);
        
        // Retorna também o salário para o PWA calcular o progresso visual
        const funcRes = await pool.query('SELECT salario_base FROM funcionarios WHERE id = $1', [req.params.id]);
        const salarioBase = parseFloat(funcRes.rows[0]?.salario_base || 0);

        res.json({ sucesso: true, historico: resultado.rows, salario_base: salarioBase });
    } catch (erro) {
        console.error("Erro ao buscar vales:", erro);
        res.status(500).json({ erro: "Erro ao buscar vales." });
    }
});

// ==========================================
// 3. RESPONDER VALE (RH)
// ==========================================
router.post('/responder', async (req, res) => {
    const { vale_id, status, resposta_rh } = req.body;

    if (!['Aprovado', 'Recusado'].includes(status)) {
        return res.status(400).json({ erro: "Status inválido." });
    }

    try {
        const query = `
            UPDATE vales 
            SET status = $1, resposta_rh = $2, data_resposta = NOW()
            WHERE id = $3 RETURNING *;
        `;
        const resultado = await pool.query(query, [status, resposta_rh || null, vale_id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({ erro: "Vale não encontrado." });
        }

        res.json({ mensagem: `Vale ${status.toLowerCase()} com sucesso!`, vale: resultado.rows[0] });
    } catch (erro) {
        console.error("Erro ao responder vale:", erro);
        res.status(500).json({ erro: "Erro ao processar resposta." });
    }
});

// ==========================================
// 4. LISTAR VALES PENDENTES (PAINEL RH)
// ==========================================
router.get('/pendentes', async (req, res) => {
    try {
        // AJUSTADO: Usando exatamente os nomes das colunas 'pix' e 'telefone' da sua tabela.
        const query = `
            SELECT 
                v.*, 
                f.nome as funcionario_nome,
                f.pix,
                f.telefone
            FROM vales v
            JOIN funcionarios f ON f.id = v.funcionario_id
            WHERE v.status = 'Pendente'
            ORDER BY v.data_solicitacao ASC;
        `;
        const resultado = await pool.query(query);
        res.json(resultado.rows);
    } catch (erro) {
        console.error("Erro ao buscar vales pendentes:", erro);
        res.status(500).json({ erro: "Erro ao buscar vales." });
    }
});

module.exports = router;