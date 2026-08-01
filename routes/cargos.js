const express = require('express');
const router = express.Router();
const pool = require('../db'); // Ajuste o caminho para o seu arquivo de conexão, se necessário

// Função auxiliar para "traduzir" o código do CBO para o ID numérico
async function obterIdCbo(valorCbo, pool) {
    // Se o valor já for um número e não contiver traço (ex: já é o ID), retorna ele mesmo
    if (!isNaN(valorCbo) && !String(valorCbo).includes('-')) {
        return parseInt(valorCbo, 10);
    }
    
    // Se for um texto como "4142-15", busca o ID interno desse código no banco
    const result = await pool.query('SELECT id FROM cbo WHERE codigo = $1 LIMIT 1', [valorCbo]);
    
    if (result.rows.length > 0) {
        return result.rows[0].id; // Retorna o ID numérico (integer)
    }
    
    throw new Error("CBO não encontrado");
}

// 1. Rota para listar os cargos cadastrados
router.get('/', async (req, res) => {
    try {
        // Fazemos um JOIN com a tabela cbo para pegar o código em texto
        const query = `
            SELECT 
                c.*, 
                cbo.codigo AS cbo 
            FROM cargos c
            LEFT JOIN cbo ON c.cbo_id = cbo.id
            ORDER BY c.id DESC
        `;
        const resultado = await pool.query(query);
        res.json(resultado.rows);
    } catch (erro) {
        console.error("Erro ao buscar cargos:", erro);
        res.status(500).json({ erro: "Erro interno ao buscar cargos" });
    }
});

// 2. Rota para listar os códigos CBO (Adicionado o 'id' no SELECT por precaução)
router.get('/cbo', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT id, codigo, nome, descricao FROM cbo WHERE ativo = true ORDER BY codigo ASC');
        res.json(resultado.rows);
    } catch (erro) {
        console.error("Erro ao buscar CBOs:", erro);
        res.status(500).json({ erro: "Erro interno ao buscar CBOs" });
    }
});

// 3. Rota para salvar um novo cargo
router.post('/', async (req, res) => {
    const { 
        nome_interno, 
        cbo, // Aqui chega "4142-15"
        hora_entrada, 
        hora_saida_almoco, 
        hora_retorno_almoco, 
        hora_saida, 
        carga_horaria 
    } = req.body;

    try {
        // TRADUÇÃO DO CBO: Transforma "4142-15" no ID inteiro que o banco exige
        let cboIdCorreto;
        try {
            cboIdCorreto = await obterIdCbo(cbo, pool);
        } catch (erroCbo) {
            return res.status(400).json({ erro: "Código CBO inválido ou não encontrado no banco de dados." });
        }

        const query = `
            INSERT INTO cargos (
                nome, 
                cbo_id, 
                hora_entrada, 
                saida_almoco, 
                retorno_almoco, 
                hora_saida, 
                carga_horaria
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        
        const valores = [
            nome_interno, 
            cboIdCorreto, // Salvando o número inteiro!
            hora_entrada, 
            hora_saida_almoco, 
            hora_retorno_almoco, 
            hora_saida, 
            carga_horaria
        ];

        const novoCargo = await pool.query(query, valores);
        res.status(201).json(novoCargo.rows[0]);

    } catch (erro) {
        console.error("Erro ao salvar cargo no banco:", erro);
        res.status(500).json({ erro: "Erro interno ao salvar cargo" });
    }
});

// 4. Rota para deletar um cargo verificando vínculos
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const checkVinculo = await pool.query('SELECT nome FROM funcionarios WHERE cargo_id = $1 LIMIT 1', [id]);
        
        if (checkVinculo.rows.length > 0) {
            const nomeFuncionario = checkVinculo.rows[0].nome;
            return res.status(400).json({ 
                erro: `Este cargo não pode ser excluído pois está vinculado ao funcionário(a): ${nomeFuncionario}. Remova o vínculo do funcionário primeiro.` 
            });
        }

        await pool.query('DELETE FROM cargos WHERE id = $1', [id]);
        res.json({ mensagem: "Cargo excluído com sucesso!" });

    } catch (erro) {
        console.error("Erro ao excluir cargo:", erro);
        res.status(500).json({ erro: "Erro interno ao excluir cargo" });
    }
});

// 5. Rota para atualizar (editar) um cargo
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        nome_interno, cbo, hora_entrada, hora_saida_almoco, hora_retorno_almoco, hora_saida, carga_horaria 
    } = req.body;
    
    try {
        // TRADUÇÃO DO CBO PARA A EDIÇÃO TAMBÉM
        let cboIdCorreto;
        try {
            cboIdCorreto = await obterIdCbo(cbo, pool);
        } catch (erroCbo) {
            return res.status(400).json({ erro: "Código CBO inválido ou não encontrado no banco de dados." });
        }

        const query = `
            UPDATE cargos 
            SET nome = $1, 
                cbo_id = $2, 
                hora_entrada = $3, 
                saida_almoco = $4, 
                retorno_almoco = $5, 
                hora_saida = $6, 
                carga_horaria = $7
            WHERE id = $8 RETURNING *;
        `;
        const valores = [nome_interno, cboIdCorreto, hora_entrada, hora_saida_almoco, hora_retorno_almoco, hora_saida, carga_horaria, id];
        
        const resultado = await pool.query(query, valores);
        
        if (resultado.rows.length === 0) {
            return res.status(404).json({ erro: "Cargo não encontrado" });
        }
        res.json(resultado.rows[0]);
    } catch (erro) {
        console.error("Erro ao atualizar cargo:", erro);
        res.status(500).json({ erro: "Erro interno ao atualizar cargo" });
    }
});

module.exports = router;