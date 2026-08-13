const express = require('express');
const router = express.Router();
// Ajuste para ../db ou ../database dependendo de como está o nome do arquivo de conexão
const pool = require('../database'); 

function vazio(valor) {
    return valor === undefined || valor === "" ? null : valor;
}

function numeroOuNull(valor) {
    if (valor === undefined || valor === "" || valor === null) return null;
    const numero = Number(valor);
    return isNaN(numero) ? null : numero;
}

// Função para limpar a string do CBO digitada manualmente
function tratarCboTexto(valorCbo) {
    if (!valorCbo) return null;
    // Se o usuário colou algo como "4142-15 - Almoxarife", extrai apenas "4142-15"
    const codigoLimpo = String(valorCbo).split(' - ')[0].trim();
    return codigoLimpo || null;
}

// 1. Rota para listar os cargos cadastrados
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.id, 
                c.nome, 
                c.cbo, 
                c.hora_entrada, 
                c.saida_almoco, 
                c.retorno_almoco, 
                c.hora_saida, 
                c.carga_horaria
            FROM cargos c
            ORDER BY c.nome ASC
        `;
        const resultado = await pool.query(query);
        res.json(resultado.rows);
    } catch (erro) {
        console.error("Erro ao buscar cargos no Supabase:", erro);
        res.status(500).json({ erro: "Erro interno ao buscar cargos" });
    }
});

// 2. Rota para salvar um novo cargo
router.post('/', async (req, res) => {
    const { 
        nome_interno, 
        cbo, 
        hora_entrada, 
        hora_saida_almoco, 
        hora_retorno_almoco, 
        hora_saida, 
        carga_horaria 
    } = req.body;

    try {
        const cboTratado = tratarCboTexto(cbo);

        const query = `
            INSERT INTO cargos (
                nome, 
                cbo, 
                hora_entrada, 
                saida_almoco, 
                retorno_almoco, 
                hora_saida, 
                carga_horaria, 
                ativo
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, true)
            RETURNING *;
        `;
        
        const valores = [
            vazio(nome_interno), 
            cboTratado, 
            vazio(hora_entrada), 
            vazio(hora_saida_almoco), 
            vazio(hora_retorno_almoco), 
            vazio(hora_saida), 
            numeroOuNull(carga_horaria)
        ];

        const novoCargo = await pool.query(query, valores);
        res.status(201).json(novoCargo.rows[0]);

    } catch (erro) {
        console.error("Erro ao salvar cargo no Supabase:", erro);
        res.status(500).json({ erro: "Erro interno ao salvar cargo: " + erro.message });
    }
});

// 3. Rota para atualizar (editar) um cargo
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        nome_interno, 
        cbo, 
        hora_entrada, 
        hora_saida_almoco, 
        hora_retorno_almoco, 
        hora_saida, 
        carga_horaria 
    } = req.body;
    
    try {
        const cboTratado = tratarCboTexto(cbo);

        const query = `
            UPDATE cargos 
            SET nome = $1, 
                cbo = $2, 
                hora_entrada = $3, 
                saida_almoco = $4, 
                retorno_almoco = $5, 
                hora_saida = $6, 
                carga_horaria = $7
            WHERE id = $8 RETURNING *;
        `;
        
        const valores = [
            vazio(nome_interno), 
            cboTratado, 
            vazio(hora_entrada), 
            vazio(hora_saida_almoco), 
            vazio(hora_retorno_almoco), 
            vazio(hora_saida), 
            numeroOuNull(carga_horaria), 
            id
        ];
        
        const resultado = await pool.query(query, valores);

        if (resultado.rows.length === 0) {
            return res.status(404).json({ erro: "Cargo não encontrado" });
        }

        res.json(resultado.rows[0]);
    } catch (erro) {
        console.error("Erro ao atualizar cargo no Supabase:", erro);
        res.status(500).json({ erro: "Erro interno ao atualizar cargo: " + erro.message });
    }
});

// 4. Rota para deletar um cargo
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM cargos WHERE id = $1', [id]);
        res.json({ mensagem: "Cargo excluído com sucesso!" });
    } catch (erro) {
        console.error("Erro ao excluir cargo no Supabase:", erro);
        res.status(500).json({ erro: "Erro ao excluir cargo. Verifique se há funcionários vinculados." });
    }
});

module.exports = router;