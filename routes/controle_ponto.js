const express = require('express');
const router = express.Router();
const pool = require('../db'); // Conexão com o PostgreSQL

// ==========================================
// 1. ROTAS DO PWA (APLICATIVO DO FUNCIONÁRIO)
// ==========================================

// Receber uma nova solicitação/ajuste/atestado do aplicativo
router.post('/solicitacoes', async (req, res) => {
    // Agora o backend recebe o anexo_url (que será a foto em Base64)
    const { funcionario_id, tipo_solicitacao, data_registro, horario_exato, justificativa, anexo_url } = req.body;

    try {
        let hora_entrada = null, hora_saida_almoco = null, hora_volta_almoco = null, hora_saida = null;
        
        // Só define horários exatos se for um AJUSTE
        if (tipo_solicitacao === 'AJUSTE' && justificativa) {
            if (justificativa.includes('[ENTRADA]')) hora_entrada = horario_exato;
            else if (justificativa.includes('[SAIDA_ALMOCO]')) hora_saida_almoco = horario_exato;
            else if (justificativa.includes('[RETORNO_ALMOCO]')) hora_volta_almoco = horario_exato;
            else if (justificativa.includes('[SAIDA]')) hora_saida = horario_exato;
        }

        const query = `
            INSERT INTO solicitacoes_ponto (
                funcionario_id, tipo_solicitacao, data_registro, 
                hora_entrada, hora_saida_almoco, hora_volta_almoco, hora_saida, 
                justificativa, status, anexo_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pendente', $9)
            RETURNING *;
        `;
        
        const valores = [
            funcionario_id, tipo_solicitacao, data_registro, 
            hora_entrada, hora_saida_almoco, hora_volta_almoco, hora_saida, 
            justificativa, anexo_url || null
        ];

        const resultado = await pool.query(query, valores);
        res.status(201).json({ mensagem: "Solicitação enviada com sucesso", dados: resultado.rows[0] });
    } catch (erro) {
        console.error("Erro ao inserir solicitação:", erro);
        res.status(500).json({ erro: "Erro interno ao salvar no banco de dados." });
    }
});

// Buscar o histórico de pedidos para a aba "Pedidos" do PWA
router.get('/solicitacoes/funcionario/:id', async (req, res) => {
    try {
        const query = "SELECT * FROM solicitacoes_ponto WHERE funcionario_id = $1 ORDER BY criado_em DESC";
        const resultado = await pool.query(query, [req.params.id]);
        res.json(resultado.rows);
    } catch (erro) {
        console.error("Erro ao buscar histórico:", erro);
        res.status(500).json({ erro: "Erro ao buscar histórico." });
    }
});

// ==========================================
// 2. GESTÃO DE SOLICITAÇÕES E ATESTADOS (RH)
// ==========================================

// Listar todas as solicitações pendentes para o RH analisar
router.get('/solicitacoes/pendentes', async (req, res) => {
    try {
        const query = `
            SELECT 
                s.*, 
                f.nome AS funcionario_nome, 
                f.cpf
            FROM solicitacoes_ponto s
            JOIN funcionarios f ON f.id = s.funcionario_id
            WHERE s.status = 'Pendente'
            ORDER BY s.criado_em DESC;
        `;
        const resultado = await pool.query(query);
        const solicitacoes = resultado.rows;

        // CRUZA OS DADOS: Busca o horário original que o funcionário bateu para comparação
        for (let sol of solicitacoes) {
            if (sol.tipo_solicitacao === 'AJUSTE') {
                let tipoBatida = '';
                if (sol.justificativa && sol.justificativa.includes(']')) {
                    const tipo = sol.justificativa.split(']')[0].replace('[', '');
                    if (tipo === 'ENTRADA') tipoBatida = 'Entrada';
                    else if (tipo === 'SAIDA_ALMOCO') tipoBatida = 'Saída Almoço';
                    else if (tipo === 'RETORNO_ALMOCO') tipoBatida = 'Volta Almoço';
                    else if (tipo === 'SAIDA') tipoBatida = 'Saída';
                }

                if (tipoBatida) {
                    const queryPonto = `
                        SELECT data_hora FROM registros_ponto
                        WHERE funcionario_id = $1 AND data_registro = $2 AND tipo_registro = $3
                        LIMIT 1
                    `;
                    const resPonto = await pool.query(queryPonto, [sol.funcionario_id, sol.data_registro, tipoBatida]);

                    if (resPonto.rows.length > 0) {
                        const dataObj = new Date(resPonto.rows[0].data_hora);
                        sol.horario_original = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
                    } else {
                        sol.horario_original = 'Sem registro prévio (Esquecimento)';
                    }
                } else {
                    sol.horario_original = 'Não identificado';
                }
            }
        }

        res.json(solicitacoes);
    } catch (erro) {
        console.error("Erro ao buscar solicitações pendentes:", erro);
        res.status(500).json({ erro: "Erro interno ao buscar solicitações." });
    }
});

// Responder solicitação (Aprovar ou Recusar)
router.post('/solicitacoes/responder', async (req, res) => {
    const { solicitacao_id, status, resposta_rh } = req.body; 

    if (!solicitacao_id || !['Aprovado', 'Recusado'].includes(status)) {
        return res.status(400).json({ erro: "Dados inválidos para resposta." });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Atualiza o status da solicitação
        const updateSolicitacao = `
            UPDATE solicitacoes_ponto 
            SET status = $1, resposta_rh = $2, atualizado_em = NOW()
            WHERE id = $3
            RETURNING *;
        `;
        const resSolicitacao = await client.query(updateSolicitacao, [status, resposta_rh || null, solicitacao_id]);

        if (resSolicitacao.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ erro: "Solicitação não encontrada." });
        }

        const sol = resSolicitacao.rows[0];

        // 2. Se aprovado, insere/substitui os horários na tabela registros_ponto
        if (status === 'Aprovado') {
            if (sol.hora_entrada || sol.hora_saida || sol.hora_saida_almoco || sol.hora_volta_almoco) {
                // Formatação segura de data
                const dataRegStr = new Date(sol.data_registro).toISOString().split('T')[0];
                const formatarDataHora = (hora) => `${dataRegStr} ${hora}`;

                const insertQuery = `
                    INSERT INTO registros_ponto 
                    (funcionario_id, data_registro, data_hora, tipo_registro, origem, status_validacao, observacao) 
                    VALUES ($1, $2, $3, $4, 'Ajuste Aprovado RH', 'Aprovado', $5)
                `;

                if (sol.hora_entrada) {
                    await client.query('DELETE FROM registros_ponto WHERE funcionario_id = $1 AND data_registro = $2 AND tipo_registro = $3', [sol.funcionario_id, sol.data_registro, 'Entrada']);
                    await client.query(insertQuery, [sol.funcionario_id, sol.data_registro, formatarDataHora(sol.hora_entrada), 'Entrada', sol.justificativa]);
                }
                if (sol.hora_saida_almoco) {
                    await client.query('DELETE FROM registros_ponto WHERE funcionario_id = $1 AND data_registro = $2 AND tipo_registro = $3', [sol.funcionario_id, sol.data_registro, 'Saída Almoço']);
                    await client.query(insertQuery, [sol.funcionario_id, sol.data_registro, formatarDataHora(sol.hora_saida_almoco), 'Saída Almoço', sol.justificativa]);
                }
                if (sol.hora_volta_almoco) {
                    await client.query('DELETE FROM registros_ponto WHERE funcionario_id = $1 AND data_registro = $2 AND tipo_registro = $3', [sol.funcionario_id, sol.data_registro, 'Volta Almoço']);
                    await client.query(insertQuery, [sol.funcionario_id, sol.data_registro, formatarDataHora(sol.hora_volta_almoco), 'Volta Almoço', sol.justificativa]);
                }
                if (sol.hora_saida) {
                    await client.query('DELETE FROM registros_ponto WHERE funcionario_id = $1 AND data_registro = $2 AND tipo_registro = $3', [sol.funcionario_id, sol.data_registro, 'Saída']);
                    await client.query(insertQuery, [sol.funcionario_id, sol.data_registro, formatarDataHora(sol.hora_saida), 'Saída', sol.justificativa]);
                }
            }
        }

        await client.query('COMMIT');
        res.json({ mensagem: `Solicitação ${status.toLowerCase()} com sucesso!` });

    } catch (erro) {
        await client.query('ROLLBACK');
        console.error("Erro ao responder solicitação:", erro);
        res.status(500).json({ erro: "Erro ao processar resposta da solicitação." });
    } finally {
        client.release();
    }
});

// ==========================================
// 3. FECHAMENTO MENSAL E ESPELHO DE PONTO
// ==========================================

router.post('/fechamento/liberar', async (req, res) => {
    const { funcionario_id, mes, ano, total_horas_trabalhadas, total_horas_extras, total_atrasos_faltas, valor_dsr } = req.body;

    try {
        const query = `
            INSERT INTO fechamento_mensal (
                funcionario_id, mes, ano, 
                total_horas_trabalhadas, total_horas_extras, total_atrasos_faltas, 
                valor_dsr, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Enviado_Funcionario')
            ON CONFLICT (funcionario_id, mes, ano) 
            DO UPDATE SET 
                total_horas_trabalhadas = EXCLUDED.total_horas_trabalhadas,
                total_horas_extras = EXCLUDED.total_horas_extras,
                total_atrasos_faltas = EXCLUDED.total_atrasos_faltas,
                valor_dsr = EXCLUDED.valor_dsr,
                status = 'Enviado_Funcionario'
            RETURNING *;
        `;

        const valores = [
            funcionario_id, mes, ano, 
            total_horas_trabalhadas || '0 hours', 
            total_horas_extras || '0 hours', 
            total_atrasos_faltas || '0 hours', 
            valor_dsr || 0.00
        ];

        const resultado = await pool.query(query, valores);
        res.json({ mensagem: "Espelho de ponto liberado para visualização do funcionário!", dados: resultado.rows[0] });

    } catch (erro) {
        console.error("Erro ao liberar fechamento:", erro);
        res.status(500).json({ erro: "Erro ao liberar fechamento mensal." });
    }
});

// ==========================================
// 4. EMISSÃO DE COMUNICADOS / NOTIFICAÇÕES
// ==========================================

router.post('/notificacoes/criar', async (req, res) => {
    const { titulo, mensagem, tipo, para_todos } = req.body;

    if (!titulo || !mensagem) {
        return res.status(400).json({ erro: "Título e mensagem são obrigatórios." });
    }

    try {
        const query = `
            INSERT INTO notificacoes_rh (titulo, mensagem, tipo, para_todos)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const valores = [titulo, mensagem, tipo || 'Informativo', para_todos !== undefined ? para_todos : true];
        const novaNotificacao = await pool.query(query, valores);

        res.status(201).json({ mensagem: "Notificação enviada com sucesso!", notificacao: novaNotificacao.rows[0] });
    } catch (erro) {
        console.error("Erro ao criar notificação:", erro);
        res.status(500).json({ erro: "Erro ao enviar notificação." });
    }
});

module.exports = router;