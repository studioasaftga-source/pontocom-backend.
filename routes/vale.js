const express = require('express');
const router = express.Router();
const pool = require('../database');

function vazio(valor) {
    return valor === undefined || valor === "" ? null : valor;
}

// ======================================================
// 0. GET e POST RAIZ (/api/vale) - Garante compatibilidade com o PWA
// ======================================================
router.get('/', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM vales ORDER BY data_solicitacao DESC');
        res.json(resultado.rows);
    } catch (erro) {
        console.error("Erro ao listar vales:", erro);
        res.status(500).json({ erro: "Erro ao buscar vales." });
    }
});

router.post('/', async (req, res) => {
    const { funcionario_id, valor, observacao, justificativa } = req.body;
    const motivoFinal = observacao || justificativa || '';

    if (!funcionario_id || !valor || parseFloat(valor) <= 0) {
        return res.status(400).json({ erro: "Informe o funcionário e um valor válido." });
    }

    try {
        const agora = new Date();
        const mesAtual = agora.getMonth() + 1;
        const anoAtual = agora.getFullYear();

        const queryInsert = `
            INSERT INTO vales (
                funcionario_id,
                valor,
                justificativa,
                status,
                data_solicitacao,
                competencia_mes,
                competencia_ano
            )
            VALUES ($1, $2, $3, 'Pendente', NOW(), $4, $5)
            RETURNING *;
        `;

        const insercao = await pool.query(queryInsert, [
            funcionario_id,
            parseFloat(valor),
            vazio(motivoFinal),
            mesAtual,
            anoAtual
        ]);

        res.status(201).json({
            sucesso: true,
            mensagem: "Vale solicitado com sucesso!",
            registro: insercao.rows[0]
        });
    } catch (erro) {
        console.error("Erro ao solicitar vale:", erro);
        res.status(500).json({ erro: "Erro ao salvar vale: " + erro.message });
    }
});

// ======================================================
// 1. GET /api/vale/pendentes
// Busca os vales pendentes + dados do funcionário
// incluindo PIX e telefone
// ======================================================
router.get('/pendentes', async (req, res) => {
    try {
        const query = `
            SELECT 
                v.id,
                v.funcionario_id,
                COALESCE(f.nome, 'Colaborador Sem Nome') AS colaborador,
                COALESCE(f.nome, 'Colaborador Sem Nome') AS nome,
                COALESCE(f.nome, 'Colaborador Sem Nome') AS funcionario_nome,
                v.valor,
                COALESCE(v.justificativa, '') AS motivo,
                v.status,
                v.data_solicitacao,
                COALESCE(f.pix, '') AS pix,
                COALESCE(f.pix, '') AS chave_pix,
                COALESCE(f.telefone, '') AS telefone,
                COALESCE(f.telefone, '') AS celular
            FROM vales v
            LEFT JOIN funcionarios f ON f.id = v.funcionario_id
            WHERE UPPER(v.status) = 'PENDENTE'
            ORDER BY v.data_solicitacao DESC;
        `;

        const resultado = await pool.query(query);
        res.json(resultado.rows);

    } catch (erro) {
        console.error("Erro ao buscar vales pendentes:", erro);
        res.status(500).json({
            erro: "Erro ao buscar vales pendentes: " + erro.message
        });
    }
});


// ======================================================
// 2. POST /api/vale/responder / PUT /api/vale/responder
// Aprova ou recusa o vale.
// ======================================================
async function responderValeHandler(req, res) {
    const { id, vale_id, status } = req.body;
    const idFinal = id || vale_id;

    if (!idFinal || !status) {
        return res.status(400).json({
            erro: "ID do vale e novo status são obrigatórios."
        });
    }

    try {
        const query = `
            UPDATE vales
            SET 
                status = $1,
                data_resposta = NOW()
            WHERE id = $2
            RETURNING *;
        `;

        const resultado = await pool.query(query, [status, idFinal]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: "Vale não encontrado para atualização."
            });
        }

        const valeAtualizado = resultado.rows[0];

        const funcionarioResult = await pool.query(
            `SELECT id, nome, pix, telefone FROM funcionarios WHERE id = $1`,
            [valeAtualizado.funcionario_id]
        );

        let funcionario = funcionarioResult.rows.length > 0 ? funcionarioResult.rows[0] : null;
        const pix = funcionario?.pix || '';
        const telefone = funcionario?.telefone || '';

        res.json({
            sucesso: true,
            mensagem: `Vale ${status} com sucesso!`,
            vale: {
                ...valeAtualizado,
                colaborador: funcionario?.nome || 'Colaborador Sem Nome',
                nome: funcionario?.nome || 'Colaborador Sem Nome',
                funcionario_nome: funcionario?.nome || 'Colaborador Sem Nome',
                pix: pix,
                chave_pix: pix,
                telefone: telefone,
                celular: telefone
            },
            funcionario: funcionario ? {
                id: funcionario.id,
                nome: funcionario.nome,
                pix: pix,
                chave_pix: pix,
                telefone: telefone,
                celular: telefone
            } : null
        });

    } catch (erro) {
        console.error("Erro ao responder vale:", erro);
        res.status(500).json({
            erro: "Erro ao responder vale: " + erro.message
        });
    }
}

router.post('/responder', responderValeHandler);
router.put('/responder', responderValeHandler);


// ======================================================
// 3. GET /api/vale/meus-vales/:funcionario_id
// ======================================================
router.get('/meus-vales/:funcionario_id', async (req, res) => {
    const { funcionario_id } = req.params;

    if (!funcionario_id) {
        return res.status(400).json({
            erro: "ID do funcionário é obrigatório."
        });
    }

    try {
        const funcRes = await pool.query(
            `SELECT id, nome, salario_base, pix, telefone FROM funcionarios WHERE id = $1`,
            [funcionario_id]
        );

        if (funcRes.rows.length === 0) {
            return res.status(404).json({
                erro: "Funcionário não encontrado."
            });
        }

        const funcionario = funcRes.rows[0];
        const salarioBase = parseFloat(funcionario.salario_base || 0);

        const valesRes = await pool.query(
            `SELECT * FROM vales WHERE funcionario_id = $1 ORDER BY data_solicitacao DESC`,
            [funcionario_id]
        );

        res.json({
            sucesso: true,
            funcionario: {
                id: funcionario.id,
                nome: funcionario.nome,
                pix: funcionario.pix || '',
                chave_pix: funcionario.pix || '',
                telefone: funcionario.telefone || '',
                celular: funcionario.telefone || ''
            },
            salario_base: salarioBase,
            percentual_limite: 40,
            limite_maximo: salarioBase * 0.40,
            historico: valesRes.rows,
            vales: valesRes.rows
        });

    } catch (erro) {
        console.error("Erro ao buscar meus vales:", erro);
        res.status(500).json({
            erro: "Erro no servidor: " + erro.message
        });
    }
});


// ======================================================
// 4. GET /api/vale/total/:funcionario_id
// ======================================================
router.get('/total/:funcionario_id', async (req, res) => {
    const { funcionario_id } = req.params;

    try {
        const query = `
            SELECT 
                COALESCE(SUM(valor), 0) AS total
            FROM vales
            WHERE funcionario_id = $1
              AND UPPER(status) != 'RECUSADO'
              AND EXTRACT(MONTH FROM data_solicitacao AT TIME ZONE 'America/Sao_Paulo') = EXTRACT(MONTH FROM CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo')
              AND EXTRACT(YEAR FROM data_solicitacao AT TIME ZONE 'America/Sao_Paulo') = EXTRACT(YEAR FROM CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo');
        `;

        const resultado = await pool.query(query, [funcionario_id]);

        res.json({
            sucesso: true,
            total: parseFloat(resultado.rows[0].total)
        });

    } catch (erro) {
        console.error("Erro ao calcular total de vales:", erro);
        res.status(500).json({
            erro: "Erro ao calcular total de vales."
        });
    }
});


// ======================================================
// 5. POST /api/vale/solicitar
// ======================================================
router.post('/solicitar', async (req, res) => {
    const { funcionario_id, valor, observacao, justificativa } = req.body;
    const motivoFinal = observacao || justificativa || '';

    if (!funcionario_id || !valor || parseFloat(valor) <= 0) {
        return res.status(400).json({
            erro: "Informe o funcionário e um valor válido."
        });
    }

    try {
        const agora = new Date();
        const mesAtual = agora.getMonth() + 1;
        const anoAtual = agora.getFullYear();

        const queryInsert = `
            INSERT INTO vales (
                funcionario_id,
                valor,
                justificativa,
                status,
                data_solicitacao,
                competencia_mes,
                competencia_ano
            )
            VALUES ($1, $2, $3, 'Pendente', NOW(), $4, $5)
            RETURNING *;
        `;

        const insercao = await pool.query(queryInsert, [
            funcionario_id,
            parseFloat(valor),
            vazio(motivoFinal),
            mesAtual,
            anoAtual
        ]);

        res.status(201).json({
            sucesso: true,
            mensagem: "Vale solicitado com sucesso!",
            registro: insercao.rows[0]
        });

    } catch (erro) {
        console.error("Erro ao solicitar vale:", erro);
        res.status(500).json({
            erro: "Erro ao salvar vale: " + erro.message
        });
    }
});

module.exports = router;