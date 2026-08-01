const express = require('express');
const router = express.Router();
const pool = require('../db'); 

// =========================================================================
// ROTA 0: Buscar os pontos do dia atual (Usado pelo App PWA do Funcionário)
// GET /api/ponto/hoje?funcionarioId=1
// =========================================================================
router.get('/hoje', async (req, res) => {
    const funcionarioId = req.query.funcionarioId || req.query.funcionario_id;

    if (!funcionarioId) {
        return res.status(400).json({ erro: "ID do funcionário é obrigatório." });
    }

    try {
        const query = `
            SELECT id, 
                   tipo_registro, 
                   hora_entrada,
                   data_hora,
                   COALESCE(
                       hora_entrada::text, 
                       CASE 
                           WHEN data_hora IS NOT NULL THEN SUBSTRING(data_hora::text FROM 12 FOR 5)
                           ELSE '00:00'
                       END
                   ) AS hora_formatada
            FROM registros_ponto 
            WHERE funcionario_id = $1 
              AND (
                data_registro::text LIKE CURRENT_DATE::text || '%'
                OR data_hora::text LIKE CURRENT_DATE::text || '%'
              )
            ORDER BY id ASC;
        `;
        
        const resultado = await pool.query(query, [funcionarioId]);
        
        const marcacoes = resultado.rows.map(row => ({
            id: row.id,
            tipo: row.tipo_registro || 'Ponto',
            hora: row.hora_formatada ? row.hora_formatada.substring(0, 5) : 'Registrado'
        }));

        return res.status(200).json({
            sucesso: true,
            marcacoes: marcacoes
        });
    } catch (erro) {
        console.error("Erro detalhado no PostgreSQL ao buscar pontos de hoje:", erro);
        return res.status(500).json({ erro: "Erro interno no banco ao buscar marcações de hoje" });
    }
});

// =========================================================================
// ROTA DEV: Resetar todos os pontos do dia do funcionário (Ambiente de Testes)
// DELETE /api/ponto/reset-hoje?funcionarioId=1
// =========================================================================
router.delete('/reset-hoje', async (req, res) => {
    const funcionarioId = req.query.funcionarioId || req.query.funcionario_id;

    if (!funcionarioId) {
        return res.status(400).json({ erro: "ID do funcionário é obrigatório." });
    }

    try {
        const query = `
            DELETE FROM registros_ponto 
            WHERE funcionario_id = $1 
              AND (
                data_registro::text LIKE CURRENT_DATE::text || '%'
                OR data_hora::text LIKE CURRENT_DATE::text || '%'
              );
        `;
        
        await pool.query(query, [funcionarioId]);

        return res.status(200).json({
            sucesso: true,
            mensagem: "Registros do dia resetados com sucesso!"
        });
    } catch (erro) {
        console.error("Erro ao resetar pontos de hoje:", erro);
        return res.status(500).json({ erro: "Erro ao resetar batidas do dia." });
    }
});

// =========================================================================
// 1. Buscar o espelho de ponto de um funcionário por mês/ano (RH)
// =========================================================================
router.get('/:funcionario_id/:mes/:ano', async (req, res) => {
    const { funcionario_id, mes, ano } = req.params;
    
    try {
        const query = `
            SELECT * FROM registros_ponto 
            WHERE funcionario_id = $1 
              AND EXTRACT(MONTH FROM data_registro) = $2 
              AND EXTRACT(YEAR FROM data_registro) = $3
            ORDER BY data_registro ASC, data_hora ASC;
        `;
        const valores = [funcionario_id, mes, ano];
        const resultado = await pool.query(query, valores);
        
        res.json(resultado.rows);
    } catch (erro) {
        console.error("Erro ao buscar registros de ponto:", erro);
        res.status(500).json({ erro: "Erro ao buscar registros de ponto" });
    }
});

// =========================================================================
// 2. Ajuste completo de ponto do dia (Uso do Modal do RH)
// =========================================================================
router.post('/ajustar', async (req, res) => {
    const { funcionario_id, data_registro, b1, b2, b3, b4 } = req.body;

    if (!funcionario_id || !data_registro) {
        return res.status(400).json({ erro: "Funcionário e data são obrigatórios." });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const deleteQuery = `
            DELETE FROM registros_ponto 
            WHERE funcionario_id = $1 AND data_registro = $2
        `;
        await client.query(deleteQuery, [funcionario_id, data_registro]);

        const insertQuery = `
            INSERT INTO registros_ponto (
                funcionario_id, data_registro, data_hora, tipo_registro, 
                origem, status_validacao, observacao
            ) VALUES ($1, $2, $3, $4, 'Ajuste RH', 'Aprovado', 'Ajuste manual via espelho de ponto')
        `;

        const formatarDataHora = (hora) => `${data_registro} ${hora}:00`;

        if (b1) await client.query(insertQuery, [funcionario_id, data_registro, formatarDataHora(b1), 'Entrada']);
        if (b2) await client.query(insertQuery, [funcionario_id, data_registro, formatarDataHora(b2), 'Saída Almoço']);
        if (b3) await client.query(insertQuery, [funcionario_id, data_registro, formatarDataHora(b3), 'Volta Almoço']);
        if (b4) await client.query(insertQuery, [funcionario_id, data_registro, formatarDataHora(b4), 'Saída']);

        await client.query('COMMIT');
        res.status(200).json({ mensagem: "Ajuste de ponto salvo com sucesso!" });

    } catch (erro) {
        await client.query('ROLLBACK');
        console.error("Erro ao salvar ajuste de ponto:", erro);
        res.status(500).json({ erro: "Erro interno ao salvar o ajuste de ponto" });
    } finally {
        client.release();
    }
});

// =========================================================================
// 3. Inserção pontual de ponto (App PWA ou registro único)
// =========================================================================
router.post('/', async (req, res) => {
    const funcionario_id = req.body.funcionario_id || req.body.funcionarioId;
    const { 
        data_hora, dataHora, coordenadas, status_validacao, 
        hora_entrada, hora_saida, data_registro, tipo_registro, 
        origem, observacao 
    } = req.body;

    const timestampAtual = data_hora || dataHora || new Date().toISOString();
    const dataHoje = data_registro || new Date().toISOString().split('T')[0];

    try {
        const query = `
            INSERT INTO registros_ponto (
                funcionario_id, data_hora, coordenadas, status_validacao, 
                hora_entrada, hora_saida, data_registro, tipo_registro, 
                origem, observacao
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *;
        `;
        
        const valores = [
            funcionario_id, 
            timestampAtual, 
            coordenadas || null, 
            status_validacao || 'Aprovado',
            hora_entrada || null, 
            hora_saida || null, 
            dataHoje, 
            tipo_registro || 'Ponto',
            origem || 'App PWA', 
            observacao || null
        ];

        const novoRegistro = await pool.query(query, valores);
        res.status(201).json({
            sucesso: true,
            mensagem: "Ponto registrado com sucesso!",
            registro: novoRegistro.rows[0]
        });
    } catch (erro) {
        console.error("Erro ao registrar ponto:", erro);
        res.status(500).json({ erro: "Erro interno ao registrar ponto" });
    }
});

// =========================================================================
// 4. Atualizar/Corrigir um registro individual de ponto
// =========================================================================
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { data_hora, tipo_registro, observacao, status_validacao } = req.body;

    try {
        const query = `
            UPDATE registros_ponto SET 
                data_hora = COALESCE($1, data_hora),
                tipo_registro = COALESCE($2, tipo_registro),
                observacao = COALESCE($3, observacao),
                status_validacao = COALESCE($4, status_validacao),
                origem = 'Editado_RH'
            WHERE id = $5
            RETURNING *;
        `;
        
        const valores = [data_hora, tipo_registro, observacao, status_validacao, id];
        const resultado = await pool.query(query, valores);
        
        if (resultado.rows.length === 0) return res.status(404).json({ erro: "Registro não encontrado." });
        res.json(resultado.rows[0]);
    } catch (erro) {
        console.error("Erro ao atualizar registro:", erro);
        res.status(500).json({ erro: "Erro interno ao atualizar registro" });
    }
});

// =========================================================================
// 5. Excluir um registro de ponto
// =========================================================================
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const query = 'DELETE FROM registros_ponto WHERE id = $1 RETURNING *';
        const resultado = await pool.query(query, [id]);
        
        if (resultado.rows.length === 0) return res.status(404).json({ erro: "Registro não encontrado." });
        res.json({ mensagem: "Registro excluído com sucesso." });
    } catch (erro) {
        console.error("Erro ao excluir registro:", erro);
        res.status(500).json({ erro: "Erro interno ao excluir registro" });
    }
});

module.exports = router;