const express = require("express");
const router = express.Router();
const pool = require("../database");

function horaParaMinutos(hora) {
    if (!hora) return 0;
    const partes = String(hora).substring(0, 8).split(":");
    if (partes.length < 2) return 0;
    return (Number(partes[0] || 0) * 60 + Number(partes[1] || 0));
}

function minutosParaHoras(totalMinutos) {
    const valor = Number(totalMinutos) || 0;
    if (valor <= 0) return "00:00";
    const horas = Math.floor(valor / 60);
    const minutos = valor % 60;
    return String(horas).padStart(2, "0") + ":" + String(minutos).padStart(2, "0");
}

function normalizar(valor) {
    if (valor === null || valor === undefined) return "";
    return String(valor).trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function obterHora(registro) {
    if (registro.hora_entrada) return String(registro.hora_entrada);
    if (registro.hora_saida) return String(registro.hora_saida);
    if (registro.data_hora) {
        const data = new Date(registro.data_hora);
        if (!isNaN(data.getTime())) {
            return String(data.getHours()).padStart(2, "0") + ":" +
                   String(data.getMinutes()).padStart(2, "0") + ":" +
                   String(data.getSeconds()).padStart(2, "0");
        }
    }
    return null;
}

function identificarTipo(registro) {
    const tipo = normalizar(registro.tipo);
    const tipoRegistro = normalizar(registro.tipo_registro);
    const valor = tipoRegistro || tipo;

    if (valor === "ENTRADA") return "ENTRADA";
    if (valor === "SAIDA_ALMOCO" || valor === "SAIDA ALMOCO") return "SAIDA_ALMOCO";
    if (valor === "RETORNO_ALMOCO" || valor === "RETORNO ALMOCO") return "RETORNO_ALMOCO";
    if (valor === "SAIDA") return "SAIDA";
    return null;
}

// =====================================
// ROTA PARA LISTAR FUNCIONÁRIOS (DEVE FICAR NO TOPO)
// GET /api/rh/fechamento/funcionarios-lista
// =====================================
router.get("/funcionarios-lista", async (req, res) => {
    try {
        const resultado = await pool.query(`SELECT id, nome FROM funcionarios WHERE ativo = true ORDER BY nome ASC`);
        return res.json({ sucesso: true, funcionarios: resultado.rows });
    } catch (e) {
        console.error("Erro ao listar funcionários para holerite:", e);
        return res.status(500).json({ sucesso: false, erro: e.message });
    }
});

// =====================================
// ROTA DO LOTE DE HOLERITES (GERAL OU POR FUNCIONÁRIO)
// GET /api/rh/fechamento/holerites-lote/:fechamentoId?funcionarioId=X
// =====================================
router.get("/holerites-lote/:fechamentoId", async (req, res) => {
    try {
        const { fechamentoId } = req.params;
        const funcionarioFiltro = req.query.funcionarioId;
        
        const compRes = await pool.query(`SELECT * FROM fechamentos_ponto WHERE id = $1`, [fechamentoId]);
        if (compRes.rows.length === 0) return res.status(404).json({ sucesso: false, erro: "Competência não encontrada" });
        const competencia = compRes.rows[0];

        let empresaNome = "Empresa Empregadora LTDA";
        let empresaCnpj = "00.000.000/0001-00";
        try {
            const resEmpresa = await pool.query(`SELECT razao_social, nome_fantasia, cnpj FROM empresa ORDER BY id DESC LIMIT 1`);
            if (resEmpresa.rows.length > 0) {
                const emp = resEmpresa.rows[0];
                empresaNome = emp.razao_social || emp.nome_fantasia || empresaNome;
                empresaCnpj = emp.cnpj || empresaCnpj;
            }
        } catch (errEmp) {}

        let funcQuery = `
            SELECT 
                f.id AS funcionario_id,
                f.nome, 
                f.cpf, 
                f.salario_base,
                f.data_admissao,
                c.nome AS cargo_nome,
                ff.horas_trabalhadas, 
                ff.horas_extras, 
                ff.atrasos, 
                ff.faltas
            FROM fechamento_funcionarios ff
            JOIN funcionarios f ON f.id = ff.funcionario_id
            LEFT JOIN cargos c ON c.id = f.cargo_id
            WHERE ff.fechamento_id = $1
        `;
        
        const queryParams = [fechamentoId];
        if (funcionarioFiltro && funcionarioFiltro !== "todos") {
            funcQuery += ` AND f.id = $2`;
            queryParams.push(funcionarioFiltro);
        }
        funcQuery += ` ORDER BY f.nome`;

        const funcResult = await pool.query(funcQuery, queryParams);
        const listaHolerites = [];

        for (const dados of funcResult.rows) {
            let totalVales = 0;
            try {
                const resVales = await pool.query(
                    `SELECT SUM(valor) as total FROM vales WHERE funcionario_id = $1 AND status = 'APROVADO' AND data_solicitacao >= $2 AND data_solicitacao <= $3`,
                    [dados.funcionario_id, competencia.data_inicio, competencia.data_fim]
                );
                totalVales = Number(resVales.rows[0]?.total) || 0;
            } catch (errVales) {}

            const salarioBase = Number(dados.salario_base) || 0;
            const valorHora = salarioBase / 220;

            const minutosTrab = Number(dados.horas_trabalhadas) || 0;
            const salarioBrutoBase = valorHora * (minutosTrab / 60);

            const minutosExtras = Number(dados.horas_extras) || 0;
            const valorHorasExtras = (minutosExtras / 60) * valorHora * 1.5;

            const minutosAtrasos = Number(dados.atrasos) || 0;
            const valorDescontoAtrasos = (minutosAtrasos / 60) * valorHora;

            const salarioBrutoTotal = salarioBrutoBase + valorHorasExtras;
            const inss = salarioBrutoTotal * 0.09; 
            const fgtsMes = salarioBrutoTotal * 0.08; 
            const totalDescontos = inss + totalVales + valorDescontoAtrasos;
            const salarioLiquido = salarioBrutoTotal - totalDescontos;

            let dataAdmissaoFormatada = "Não informada";
            if (dados.data_admissao) {
                const d = new Date(dados.data_admissao);
                if (!isNaN(d.getTime())) {
                    dataAdmissaoFormatada = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
                }
            }

            listaHolerites.push({
                empresaNome,
                empresaCnpj,
                competencia: `${String(competencia.mes).padStart(2, '0')}/${competencia.ano}`,
                nome: dados.nome,
                cpf: dados.cpf || 'Não informado',
                cargo: dados.cargo_nome || 'Colaborador',
                admissao: dataAdmissaoFormatada,
                salarioBase: salarioBase.toFixed(2),
                salarioBruto: salarioBrutoTotal.toFixed(2),
                horasExtrasRef: minutosParaHoras(minutosExtras),
                valorHorasExtras: valorHorasExtras.toFixed(2),
                atrasosRef: minutosParaHoras(minutosAtrasos),
                valorDescontoAtrasos: valorDescontoAtrasos.toFixed(2),
                descontos: { 
                    inss: inss.toFixed(2), 
                    vales: totalVales.toFixed(2),
                    atrasosFaltas: valorDescontoAtrasos.toFixed(2)
                },
                informativos: {
                    baseFgts: salarioBrutoTotal.toFixed(2),
                    fgtsMes: fgtsMes.toFixed(2)
                },
                salarioLiquido: salarioLiquido.toFixed(2)
            });
        }

        return res.json({ sucesso: true, holerites: listaHolerites });
    } catch (e) {
        console.error("ERRO NO LOTE DE HOLERITES:", e);
        return res.status(500).json({ sucesso: false, erro: e.message });
    }
});

// =====================================
// CONSULTAR COMPETENCIA
// GET /api/rh/fechamento?mes=8&ano=2026
// =====================================
router.get("/", async (req, res) => {
    try {
        const mes = Number(req.query.mes);
        const ano = Number(req.query.ano);
        if (!mes || !ano) return res.status(400).json({ sucesso: false, erro: "Informe o mes e o ano." });

        const resultado = await pool.query(
            `SELECT id, mes, ano, data_inicio, data_fim, status, criado_em FROM fechamentos_ponto WHERE mes = $1 AND ano = $2 LIMIT 1`,
            [mes, ano]
        );

        if (resultado.rows.length === 0) return res.status(404).json({ sucesso: false, erro: "Competencia nao encontrada." });
        return res.json({ sucesso: true, fechamento: resultado.rows[0] });
    } catch (erro) {
        console.error("Erro ao consultar competencia:", erro);
        return res.status(500).json({ sucesso: false, erro: erro.message });
    }
});

// =====================================
// CONSULTAR ESPELHO / STATUS NO PAINEL RH
// GET /api/rh/fechamento/:id
// =====================================
router.get("/:id", async (req, res) => {
    try {
        const fechamentoId = Number(req.params.id);
        if (!fechamentoId) return res.status(400).json({ sucesso: false, erro: "ID invalido." });

        const fechamento = await pool.query(`SELECT id, mes, ano, data_inicio, data_fim, status, criado_em FROM fechamentos_ponto WHERE id = $1`, [fechamentoId]);
        if (fechamento.rows.length === 0) return res.status(404).json({ sucesso: false, erro: "Competencia nao encontrada." });

        const funcionarios = await pool.query(`
            SELECT f.id AS funcionario_id, f.nome, ff.horas_previstas, ff.horas_trabalhadas, ff.horas_extras, ff.atrasos, ff.faltas, ff.status_aprovacao, ff.aprovado, ff.data_aprovacao, ff.aprovado_em, ff.observacoes, ff.aprovado_pelo_funcionario, ff.data_aprovacao_funcionario, ff.liberado_para_assinatura
            FROM fechamento_funcionarios ff INNER JOIN funcionarios f ON f.id = ff.funcionario_id WHERE ff.fechamento_id = $1 ORDER BY f.nome
        `, [fechamentoId]);

        const resultado = funcionarios.rows.map(funcionario => ({
            ...funcionario,
            horas_previstas: minutosParaHoras(funcionario.horas_previstas),
            horas_trabalhadas: minutosParaHoras(funcionario.horas_trabalhadas),
            horas_extras: minutosParaHoras(funcionario.horas_extras),
            atrasos: minutosParaHoras(funcionario.atrasos)
        }));

        return res.json({ sucesso: true, fechamento: fechamento.rows[0], funcionarios: resultado });
    } catch (erro) {
        console.error("Erro ao consultar espelho:", erro);
        return res.status(500).json({ sucesso: false, erro: erro.message });
    }
});

// =====================================
// ABRIR COMPETENCIA
// POST /api/rh/fechamento
// =====================================
router.post("/", async (req, res) => {
    const client = await pool.connect();
    try {
        const mes = Number(req.body.mes);
        const ano = Number(req.body.ano);
        if (!mes || !ano) return res.status(400).json({ sucesso: false, erro: "Informe o mes e o ano." });

        const existente = await client.query(
            `SELECT id, mes, ano, data_inicio, data_fim, status, criado_em FROM fechamentos_ponto WHERE mes = $1 AND ano = $2 LIMIT 1`,
            [mes, ano]
        );

        if (existente.rows.length > 0) {
            return res.json({ sucesso: true, ja_existia: true, fechamento_id: existente.rows[0].id, fechamento: existente.rows[0] });
        }

        await client.query("BEGIN");
        const primeiroDia = ano + "-" + String(mes).padStart(2, "0") + "-01";
        const ultimoDiaObjeto = new Date(ano, mes, 0);
        const ultimoDia = ano + "-" + String(mes).padStart(2, "0") + "-" + String(ultimoDiaObjeto.getDate()).padStart(2, "0");

        const fechamento = await client.query(
            `INSERT INTO fechamentos_ponto (mes, ano, data_inicio, data_fim, status) VALUES ($1, $2, $3, $4, 'AGUARDANDO_APROVACAO') RETURNING id, mes, ano, data_inicio, data_fim, status, criado_em`,
            [mes, ano, primeiroDia, ultimoDia]
        );

        const fechamentoId = fechamento.rows[0].id;
        const funcionarios = await client.query(`SELECT id FROM funcionarios WHERE ativo = true ORDER BY nome`);

        for (const funcionario of funcionarios.rows) {
            await client.query(
                `INSERT INTO fechamento_funcionarios (fechamento_id, funcionario_id, status_aprovacao, aprovado) VALUES ($1, $2, 'PENDENTE', false)`,
                [fechamentoId, funcionario.id]
            );
        }

        await client.query("COMMIT");
        return res.status(201).json({ sucesso: true, fechamento_id: fechamentoId, fechamento: fechamento.rows[0] });
    } catch (erro) {
        await client.query("ROLLBACK");
        console.error("Erro ao abrir competencia:", erro);
        return res.status(500).json({ sucesso: false, erro: erro.message });
    } finally { client.release(); }
});

// =====================================
// CALCULAR FECHAMENTO
// POST /api/rh/fechamento/:id/calcular
// =====================================
router.post("/:id/calcular", async (req, res) => {
    const client = await pool.connect();
    try {
        const fechamentoId = Number(req.params.id);
        if (!fechamentoId) return res.status(400).json({ sucesso: false, erro: "ID invalido." });

        await client.query("BEGIN");
        const fechamento = await client.query(`SELECT id, mes, ano, data_inicio, data_fim, status FROM fechamentos_ponto WHERE id = $1`, [fechamentoId]);
        if (fechamento.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ sucesso: false, erro: "Competencia nao encontrada." });
        }

        const competencia = fechamento.rows[0];
        const funcionarios = await client.query(`
            SELECT f.id, f.nome, f.salario_base, f.carga_horaria_mensal, f.cargo_id, c.hora_entrada, c.saida_almoco, c.retorno_almoco, c.hora_saida, c.tolerancia_entrada, c.tolerancia_saida, c.carga_horaria
            FROM funcionarios f LEFT JOIN cargos c ON c.id = f.cargo_id WHERE f.ativo = true ORDER BY f.nome
        `);

        for (const funcionario of funcionarios.rows) {
            const registros = await client.query(`
                SELECT id, funcionario_id, data_registro, data_hora, hora_entrada, hora_saida, tipo_registro, tipo, status_validacao
                FROM registros_ponto WHERE funcionario_id = $1 AND data_registro >= $2 AND data_registro <= $3 AND LOWER(TRIM(status_validacao)) = 'aprovado'
                ORDER BY data_registro, data_hora, id
            `, [funcionario.id, competencia.data_inicio, competencia.data_fim]);

            const dias = {};
            for (const registro of registros.rows) {
                const data = String(registro.data_registro).substring(0, 10);
                const hora = obterHora(registro);
                const tipo = identificarTipo(registro);
                if (!hora || !tipo) continue;

                if (!dias[data]) dias[data] = { entrada: null, saidaAlmoco: null, retornoAlmoco: null, saida: null };
                if (tipo === "ENTRADA" && !dias[data].entrada) dias[data].entrada = hora;
                if (tipo === "SAIDA_ALMOCO" && !dias[data].saidaAlmoco) dias[data].saidaAlmoco = hora;
                if (tipo === "RETORNO_ALMOCO" && !dias[data].retornoAlmoco) dias[data].retornoAlmoco = hora;
                if (tipo === "SAIDA" && !dias[data].saida) dias[data].saida = hora;
            }

            let totalTrabalhado = 0, totalPrevisto = 0, totalExtra = 0, totalAtrasos = 0, totalFaltas = 0;
            const entradaPadrao = horaParaMinutos(funcionario.hora_entrada || "08:00:00");
            const saidaPadrao = horaParaMinutos(funcionario.hora_saida || "18:00:00");
            const saidaAlmocoPadrao = horaParaMinutos(funcionario.saida_almoco || "12:00:00");
            const retornoAlmocoPadrao = horaParaMinutos(funcionario.retorno_almoco || "13:00:00");

            const intervalo = Math.max(0, retornoAlmocoPadrao - saidaAlmocoPadrao);
            const previstoDia = Math.max(0, saidaPadrao - entradaPadrao - intervalo);

            for (const data of Object.keys(dias)) {
                const dia = dias[data];
                totalPrevisto += previstoDia;
                if (!dia.entrada) { totalFaltas++; continue; }

                const entrada = horaParaMinutos(dia.entrada);
                const saidaAlmoco = horaParaMinutos(dia.saidaAlmoco);
                const retorno = horaParaMinutos(dia.retornoAlmoco);
                const saida = horaParaMinutos(dia.saida);
                const tolerancia = Number(funcionario.tolerancia_entrada) || 0;

                if (entrada > entradaPadrao + tolerancia) totalAtrasos += entrada - entradaPadrao - tolerancia;

                if (dia.entrada && dia.saida) {
                    let trabalhado = 0;
                    if (dia.saidaAlmoco && dia.retornoAlmoco) {
                        const manha = Math.max(0, saidaAlmoco - entrada);
                        const tarde = Math.max(0, saida - retorno);
                        trabalhado = manha + tarde;
                    } else {
                        trabalhado = Math.max(0, saida - entrada - intervalo);
                    }
                    totalTrabalhado += trabalhado;
                    if (trabalhado > previstoDia) totalExtra += trabalhado - previstoDia;
                }
            }

            await client.query(`
                UPDATE fechamento_funcionarios SET
                    horas_previstas = $1, horas_trabalhadas = $2, horas_extras = $3,
                    atrasos = $4, faltas = $5, status_aprovacao = 'PENDENTE',
                    aprovado = false, liberado_para_assinatura = false,
                    aprovado_pelo_funcionario = false, data_aprovacao = NULL,
                    data_aprovacao_funcionario = NULL
                WHERE fechamento_id = $6 AND funcionario_id = $7
            `, [totalPrevisto, totalTrabalhado, totalExtra, totalAtrasos, totalFaltas, fechamentoId, funcionario.id]);
        }

        await client.query("COMMIT");
        return res.json({ sucesso: true, mensagem: "Fechamento calculado com sucesso." });
    } catch (erro) {
        await client.query("ROLLBACK");
        console.error("Erro ao calcular fechamento:", erro);
        return res.status(500).json({ sucesso: false, erro: erro.message });
    } finally { client.release(); }
});

// =====================================
// LIBERAR ESPELHO
// PUT /api/rh/fechamento/:id/liberar/:funcionarioId
// =====================================
router.put("/:id/liberar/:funcionarioId", async (req, res) => {
    try {
        const fechamentoId = Number(req.params.id);
        const funcionarioId = Number(req.params.funcionarioId);
        await pool.query(`UPDATE fechamento_funcionarios SET liberado_para_assinatura = true WHERE fechamento_id = $1 AND funcionario_id = $2`, [fechamentoId, funcionarioId]);
        return res.json({ sucesso: true, mensagem: "Liberado com sucesso!" });
    } catch (erro) {
        return res.status(500).json({ sucesso: false, erro: erro.message });
    }
});

// =====================================
// APROVAÇÃO FINAL DO RH
// PUT /api/rh/fechamento/:id/aprovar/:funcionarioId
// =====================================
router.put("/:id/aprovar/:funcionarioId", async (req, res) => {
    try {
        const fechamentoId = Number(req.params.id);
        const funcionarioId = Number(req.params.funcionarioId);

        const resultado = await pool.query(`
            UPDATE fechamento_funcionarios SET status_aprovacao = 'APROVADO', aprovado = true, data_aprovacao = CURRENT_TIMESTAMP, aprovado_em = CURRENT_TIMESTAMP
            WHERE fechamento_id = $1 AND funcionario_id = $2 RETURNING id
        `, [fechamentoId, funcionarioId]);

        if (resultado.rows.length === 0) return res.status(404).json({ sucesso: false, erro: "Funcionario nao encontrado." });
        return res.json({ sucesso: true, mensagem: "Funcionario aprovado." });
    } catch (erro) {
        console.error("Erro ao aprovar funcionario:", erro);
        return res.status(500).json({ sucesso: false, erro: erro.message });
    }
});

module.exports = router;