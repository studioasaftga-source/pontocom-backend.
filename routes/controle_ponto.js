const express = require('express');
const router = express.Router();
const pool = require('../db'); // Conexão com o PostgreSQL

// ==========================================
// 1. ROTAS DO PWA (APLICATIVO DO FUNCIONÁRIO)
// ==========================================

// Receber uma nova solicitação/ajuste/atestado do aplicativo
router.post('/solicitacoes', async (req, res) => {
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
            SELECT s.*, f.nome AS funcionario_nome, f.cpf
            FROM solicitacoes_ponto s
            JOIN funcionarios f ON f.id = s.funcionario_id
            WHERE s.status = 'Pendente' ORDER BY s.criado_em DESC;
        `;
        const resultado = await pool.query(query);
        const solicitacoes = resultado.rows;

        for (let sol of solicitacoes) {
            if (sol.tipo_solicitacao === 'AJUSTE') {
                let tipoBatida = '';
                if (sol.justificativa && sol.justificativa.includes(']')) {
                    const tipo = sol.justificativa.split(']')[0].replace('[', ''); 
                    if (['ENTRADA', 'SAIDA_ALMOCO', 'RETORNO_ALMOCO', 'SAIDA'].includes(tipo)) tipoBatida = tipo;
                }

                if (tipoBatida) {
                    // Busca TODAS as batidas do dia para exibir no painel!
                    const queryPonto = `
                        SELECT data_hora FROM registros_ponto
                        WHERE funcionario_id = $1 AND DATE(data_hora AT TIME ZONE 'UTC' AT TIME ZONE 'INTERVAL ''-4:00''') = DATE($2) 
                        ORDER BY data_hora ASC
                    `;
                    const resPonto = await pool.query(queryPonto, [sol.funcionario_id, sol.data_registro]);

                    if (resPonto.rows.length > 0) {
                        const listaHoras = resPonto.rows.map(row => {
                            const d = new Date(row.data_hora);
                            let h = d.getUTCHours() - 4; if (h < 0) h += 24;
                            return `${String(h).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
                        });
                        sol.horario_original = listaHoras.join(' | ');
                    } else {
                        sol.horario_original = 'Sem registros neste dia';
                    }
                } else {
                    sol.horario_original = 'Não identificado';
                }
            }
        }
        res.json(solicitacoes);
    } catch (erro) {
        console.error("Erro ao buscar solicitações:", erro);
        res.status(500).json({ erro: "Erro interno." });
    }
});

// Responder solicitação (Aprovar ou Recusar)
router.post('/solicitacoes/responder', async (req, res) => {
    const { solicitacao_id, status, resposta_rh } = req.body; 

    if (!solicitacao_id || !['Aprovado', 'Recusado'].includes(status)) {
        return res.status(400).json({ erro: "Dados inválidos." });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const updateSolicitacao = `UPDATE solicitacoes_ponto SET status = $1, resposta_rh = $2, atualizado_em = NOW() WHERE id = $3 RETURNING *;`;
        const resSolicitacao = await client.query(updateSolicitacao, [status, resposta_rh || null, solicitacao_id]);

        if (resSolicitacao.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ erro: "Solicitação não encontrada." });
        }

        const sol = resSolicitacao.rows[0];

        if (status === 'Aprovado') {
            const dataRegStr = new Date(sol.data_registro).toISOString().split('T')[0];
            
            const formatarDataHoraUTC = (horaStr) => {
                // A TESOURA ✂️: Corta os segundos extras (ex: 11:40:00 vira 11:40) para não dar erro 500!
                const horaLimpa = horaStr.substring(0, 5); 
                return new Date(`${dataRegStr}T${horaLimpa}:00-04:00`).toISOString();
            };

            async function processarAjuste(horaNova, tipoBatida) {
                if (!horaNova) return;

                // 1. Verifica se já tem 4 batidas (se tiver, é substituição e apaga a velha)
                const countQuery = await client.query(`
                    SELECT id FROM registros_ponto 
                    WHERE funcionario_id = $1 AND DATE(data_hora AT TIME ZONE 'UTC' AT TIME ZONE 'INTERVAL ''-4:00''') = DATE($2)
                `, [sol.funcionario_id, dataRegStr]);

                if (countQuery.rows.length >= 4) {
                    await client.query(`DELETE FROM registros_ponto WHERE funcionario_id = $1 AND DATE(data_hora AT TIME ZONE 'UTC' AT TIME ZONE 'INTERVAL ''-4:00''') = DATE($2) AND tipo = $3`, [sol.funcionario_id, dataRegStr, tipoBatida]);
                }

                // 2. Insere a batida nova com o fuso blindado
                const insertQuery = `INSERT INTO registros_ponto (funcionario_id, data_hora, tipo, origem, status_validacao, observacao) VALUES ($1, $2, $3, 'Ajuste RH', 'Aprovado', $4)`;
                await client.query(insertQuery, [sol.funcionario_id, formatarDataHoraUTC(horaNova), tipoBatida, sol.justificativa]);

                // 3. MOTOR DE AUTO-CURA (Pega todas as batidas e organiza as nomenclaturas)
                const buscaBatidas = await client.query(`
                    SELECT id FROM registros_ponto WHERE funcionario_id = $1 AND DATE(data_hora AT TIME ZONE 'UTC' AT TIME ZONE 'INTERVAL ''-4:00''') = DATE($2) ORDER BY data_hora ASC
                `, [sol.funcionario_id, dataRegStr]);

                const tiposCorretos = ['ENTRADA', 'SAIDA_ALMOCO', 'RETORNO_ALMOCO', 'SAIDA'];
                for (let i = 0; i < buscaBatidas.rows.length; i++) {
                    if (i < 4) {
                        await client.query(`UPDATE registros_ponto SET tipo = $1 WHERE id = $2`, [tiposCorretos[i], buscaBatidas.rows[i].id]);
                    }
                }
            }

            await processarAjuste(sol.hora_entrada, 'ENTRADA');
            await processarAjuste(sol.hora_saida_almoco, 'SAIDA_ALMOCO');
            await processarAjuste(sol.hora_volta_almoco, 'RETORNO_ALMOCO');
            await processarAjuste(sol.hora_saida, 'SAIDA');
        }

        await client.query('COMMIT');
        res.json({ mensagem: `Solicitação ${status.toLowerCase()} com sucesso!` });

    } catch (erro) {
        await client.query('ROLLBACK');
        console.error("Erro ao responder:", erro);
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
// ==========================================
// 5. AJUSTE MANUAL DIRETO PELO RH (MODO DEUS)
// ==========================================
router.post('/ajuste-manual', async (req, res) => {
    const { funcionario_id, data, batidas } = req.body; 

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Converte a data DD/MM/YYYY para YYYY-MM-DD
        const partesData = data.split('/');
        const dataIsoStr = `${partesData[2]}-${partesData[1]}-${partesData[0]}`;

        // 1. Apaga TUDO que tiver daquele funcionário naquele dia (Limpa a bagunça)
        await client.query(`
            DELETE FROM registros_ponto 
            WHERE funcionario_id = $1 
            AND DATE(data_hora AT TIME ZONE 'America/Cuiaba') = $2
        `, [funcionario_id, dataIsoStr]);

        // 2. Função para inserir a batida limpinha no fuso de Cuiabá
        const inserir = async (hora, tipo) => {
            if (!hora || hora === '--:--' || hora === '') return;
            
            const dataHoraBd = new Date(`${dataIsoStr}T${hora}:00-04:00`).toISOString();
            
            await client.query(`
                INSERT INTO registros_ponto (funcionario_id, data_hora, tipo, origem, status_validacao, observacao) 
                VALUES ($1, $2, $3, 'RH Manual', 'Aprovado', 'Ajuste manual realizado pelo RH')
            `, [funcionario_id, dataHoraBd, tipo]);
        };

        // 3. Insere só o que o RH preencheu na janelinha
        await inserir(batidas.b1, 'ENTRADA');
        await inserir(batidas.b2, 'SAIDA_ALMOCO');
        await inserir(batidas.b3, 'RETORNO_ALMOCO');
        await inserir(batidas.b4, 'SAIDA');

        await client.query('COMMIT');
        res.json({ sucesso: true, mensagem: "Batidas do dia atualizadas com sucesso!" });

    } catch (erro) {
        await client.query('ROLLBACK');
        console.error("Erro no ajuste manual do RH:", erro);
        res.status(500).json({ erro: "Erro ao salvar o ajuste manual." });
    } finally {
        client.release();
    }
});
module.exports = router;