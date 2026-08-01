const express = require('express');
const router = express.Router();
const pool = require('../database');

// FUNÇÕES DE CONVERSÃO AUXILIARES
function horaParaMinutos(hora) {
    if (!hora) return 0;
    const partes = hora.toString().substring(0, 8).split(":");
    return Number(partes[0]) * 60 + Number(partes[1]);
}

function minutosParaHoras(minutos) {
    if (!minutos || minutos <= 0) return "00:00";
    const hrs = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// 1. Criar Competência (Mês/Ano)
router.post('/fechamento', async (req, res) => {
    const client = await pool.connect();
    try {
        const { mes, ano } = req.body;
        if (!mes || !ano) {
            return res.status(400).json({ sucesso: false, erro: "Informe o mês e o ano." });
        }

        const existe = await client.query(`SELECT id FROM fechamentos_ponto WHERE mes = $1 AND ano = $2`, [mes, ano]);
        if (existe.rows.length > 0) {
            return res.status(400).json({ sucesso: false, erro: "Esta competência já foi fechada/criada.", fechamento_id: existe.rows[0].id });
        }

        await client.query("BEGIN");
        const primeiroDia = `${ano}-${String(mes).padStart(2, "0")}-01`;
        const ultimoDia = new Date(ano, mes, 0).toISOString().substring(0, 10);

        const fechamento = await client.query(`
            INSERT INTO fechamentos_ponto (mes, ano, data_inicio, data_fim, status)
            VALUES ($1, $2, $3, $4, 'AGUARDANDO_APROVACAO') RETURNING id;
        `, [mes, ano, primeiroDia, ultimoDia]);

        const fechamentoId = fechamento.rows[0].id;
        const funcionarios = await client.query(`SELECT id FROM funcionarios WHERE ativo = true ORDER BY nome`);

        for (const funcionario of funcionarios.rows) {
            await client.query(`
                INSERT INTO fechamento_funcionarios (fechamento_id, funcionario_id, status_aprovacao, aprovado)
                VALUES ($1, $2, 'PENDENTE', false)
            `, [fechamentoId, funcionario.id]);
        }

        await client.query("COMMIT");
        res.json({ sucesso: true, fechamento_id: fechamentoId, mensagem: "Competência criada com sucesso." });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Erro ao criar competência:", err);
        res.status(500).json({ sucesso: false, erro: err.message });
    } finally {
        client.release();
    }
});

// 2. Consultar Competência por Mês e Ano
router.get('/fechamentos', async (req, res) => {
    try {
        const { mes, ano } = req.query;
        const result = await pool.query(`SELECT id, mes, ano, status FROM fechamentos_ponto WHERE mes=$1 AND ano=$2`, [mes, ano]);
        
        if (result.rows.length > 0) {
            res.json({ sucesso: true, fechamento: result.rows[0] });
        } else {
            res.status(404).json({ sucesso: false, erro: "Competência não encontrada." });
        }
    } catch (err) {
        res.status(500).json({ sucesso: false, erro: err.message });
    }
});

// 3. Calcular Fechamento
router.post('/calcular-fechamento/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const fechamentoId = req.params.id;
        await client.query("BEGIN");

        const fechamento = await client.query(`SELECT * FROM fechamentos_ponto WHERE id = $1`, [fechamentoId]);
        if (fechamento.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ sucesso: false, erro: "Fechamento não encontrado." });
        }

        const competencia = fechamento.rows[0];
        const funcionarios = await client.query(`
            SELECT f.id, f.nome, f.salario_base, c.carga_horaria, c.hora_entrada, c.saida_almoco, c.retorno_almoco, c.hora_saida
            FROM funcionarios f 
            LEFT JOIN cargos c ON c.id = f.cargo_id 
            WHERE f.ativo = true ORDER BY f.nome
        `);

        for (const funcionario of funcionarios.rows) {
            const registros = await client.query(`
                SELECT data_registro, hora_entrada, tipo_registro FROM registros_ponto
                WHERE funcionario_id=$1 AND data_registro BETWEEN $2 AND $3 AND status_validacao='APROVADO'
                ORDER BY data_registro, hora_entrada
            `, [funcionario.id, competencia.data_inicio, competencia.data_fim]);

            let dias = {};
            registros.rows.forEach((registro) => {
                const data = registro.data_registro.toISOString().substring(0, 10);
                if (!dias[data]) {
                    dias[data] = { entrada: null, saidaAlmoco: null, retorno: null, saida: null };
                }
                switch (registro.tipo_registro) {
                    case "ENTRADA": dias[data].entrada = registro.hora_entrada; break;
                    case "SAIDA_ALMOCO": dias[data].saidaAlmoco = registro.hora_entrada; break;
                    case "RETORNO_ALMOCO": dias[data].retorno = registro.hora_entrada; break;
                    case "SAIDA": dias[data].saida = registro.hora_entrada; break;
                }
            });

            let totalTrabalhado = 0, totalPrevisto = 0, totalExtra = 0, totalAtrasos = 0, totalFaltas = 0;
            
            const jornadaEntrada = horaParaMinutos(funcionario.hora_entrada || "08:00:00");
            const jornadaSaida = horaParaMinutos(funcionario.hora_saida || "18:00:00");
            const previstoDia = Math.max(0, jornadaSaida - jornadaEntrada - 60);

            for (const data in dias) {
                const dia = dias[data];
                const entrada = horaParaMinutos(dia.entrada);
                const saidaAlmoco = horaParaMinutos(dia.saidaAlmoco);
                const retorno = horaParaMinutos(dia.retorno);
                const saida = horaParaMinutos(dia.saida);

                totalPrevisto += previstoDia;

                if (!dia.entrada) {
                    totalFaltas++;
                    continue;
                }

                if (entrada && saidaAlmoco && retorno && saida) {
                    const manha = Math.max(0, saidaAlmoco - entrada);
                    const tarde = Math.max(0, saida - retorno);
                    const trabalhado = manha + tarde;
                    totalTrabalhado += trabalhado;

                    if (trabalhado > previstoDia) {
                        totalExtra += (trabalhado - previstoDia);
                    }
                }

                if (entrada > jornadaEntrada) {
                    totalAtrasos += (entrada - jornadaEntrada);
                }
            }

            await client.query(`
                UPDATE fechamento_funcionarios
                SET horas_previstas = $1, horas_trabalhadas = $2, horas_extras = $3, atrasos = $4, faltas = $5, status_aprovacao = 'PENDENTE'
                WHERE fechamento_id = $6 AND funcionario_id = $7
            `, [totalPrevisto, totalTrabalhado, totalExtra, totalAtrasos, totalFaltas, fechamentoId, funcionario.id]);
        }

        await client.query("COMMIT");
        res.json({ sucesso: true, mensagem: "Cálculos processados com sucesso." });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Erro no cálculo:", err);
        res.status(500).json({ sucesso: false, erro: err.message });
    } finally {
        client.release();
    }
});

// 4. Consultar Detalhes da Competência
router.get('/fechamento/:id', async (req, res) => {
    try {
        const fechamentoId = req.params.id;
        const fechamento = await pool.query(`SELECT id, mes, ano, status FROM fechamentos_ponto WHERE id=$1`, [fechamentoId]);

        if (fechamento.rows.length === 0) {
            return res.status(404).json({ sucesso: false, erro: "Fechamento não encontrado." });
        }

        const funcionarios = await pool.query(`
            SELECT f.id AS funcionario_id, f.nome, ff.horas_previstas, ff.horas_trabalhadas, ff.horas_extras, ff.atrasos, ff.faltas, ff.status_aprovacao, ff.aprovado
            FROM fechamento_funcionarios ff
            INNER JOIN funcionarios f ON f.id = ff.funcionario_id
            WHERE ff.fechamento_id=$1
            ORDER BY f.nome
        `, [fechamentoId]);

        const formatados = funcionarios.rows.map(item => ({
            ...item,
            horas_previstas: minutosParaHoras(item.horas_previstas),
            horas_trabalhadas: minutosParaHoras(item.horas_trabalhadas),
            horas_extras: minutosParaHoras(item.horas_extras),
            atrasos: minutosParaHoras(item.atrasos)
        }));

        res.json({ sucesso: true, fechamento: fechamento.rows[0], funcionarios: formatados });
    } catch (err) {
        console.error("Erro consultar fechamento:", err);
        res.status(500).json({ sucesso: false, erro: err.message });
    }
});

// 5. Aprovar Funcionário Individualmente
router.put('/fechamento/:id/aprovar/:funcionarioId', async (req, res) => {
    try {
        const { id, funcionarioId } = req.params;
        await pool.query(`
            UPDATE fechamento_funcionarios
            SET status_aprovacao='APROVADO', aprovado=true, data_aprovacao=CURRENT_TIMESTAMP
            WHERE fechamento_id=$1 AND funcionario_id=$2
        `, [id, funcionarioId]);

        res.json({ sucesso: true, mensagem: "Funcionário aprovado." });
    } catch (err) {
        console.error("Erro ao aprovar:", err);
        res.status(500).json({ sucesso: false, erro: err.message });
    }
});

module.exports = router;