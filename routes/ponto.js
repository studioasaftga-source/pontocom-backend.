const express = require('express');
const router = express.Router();
const pool = require('../db'); // Corrigido para '../db' se for o seu padrão, ou volte para '../database' se necessário

// ==========================================
// FUSO OFICIAL DO SISTEMA
// ==========================================
const TIMEZONE = 'America/Cuiaba';

// ==========================================
// FUNÇÃO MATEMÁTICA: CALCULAR DISTÂNCIA EM METROS (HAVERSINE)
// ==========================================
function calcularDistancia(lat1, lon1, lat2, lon2) {
    if (lat1 === undefined || lat1 === null || lon1 === undefined || lon1 === null || lat2 === undefined || lat2 === null || lon2 === undefined || lon2 === null) {
        return null;
    }
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// ==========================================
// UTILITÁRIOS
// ==========================================
function vazio(valor) {
    return valor === undefined || valor === "" ? null : valor;
}

// ==========================================
// FORMATA DATA/HORA SEM DEPENDER DO SERVIDOR
// ==========================================
function formatarHora(dataISO) {
    if (!dataISO) return "--:--";
    const data = new Date(dataISO);
    if (isNaN(data.getTime())) return "--:--";
    return new Intl.DateTimeFormat('pt-BR', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false }).format(data);
}

function formatarData(dataISO) {
    if (!dataISO) return null;
    const data = new Date(dataISO);
    if (isNaN(data.getTime())) return null;
    return new Intl.DateTimeFormat('pt-BR', { timeZone: TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric' }).format(data);
}

// ==========================================
// GET /api/ponto
// CONSULTA GERAL - PAINEL RH
// ==========================================
router.get("/", async (req, res) => {
    const funcionarioId = req.query.funcionarioId || req.query.funcionario_id;

    try {
        let query = `
            SELECT p.*, f.nome AS funcionario_nome
            FROM registros_ponto p
            LEFT JOIN funcionarios f ON f.id = p.funcionario_id
            WHERE DATE(p.data_hora AT TIME ZONE 'America/Cuiaba') = DATE(NOW() AT TIME ZONE 'America/Cuiaba')
        `;
        const params = [];

        if (funcionarioId) {
            query += ` AND p.funcionario_id = $1`;
            params.push(funcionarioId);
        }
        query += ` ORDER BY p.data_hora DESC;`;

        const resultado = await pool.query(query, params);
        res.json(resultado.rows);
    } catch (erro) {
        console.error("Erro consulta geral:", erro);
        res.status(500).json({ erro: erro.message });
    }
});

// ==========================================
// MOTOR DE JORNADA
// GET /api/ponto/hoje
// ==========================================
async function buscarHojeHandler(req, res) {
    const idFinal = req.params.funcionario_id || req.query.funcionarioId || req.query.funcionario_id;

    if (!idFinal) {
        return res.status(400).json({ erro: "Informe o ID do funcionário." });
    }

    try {
        // BUSCA SOMENTE AS BATIDAS DE HOJE CONSIDERANDO O HORÁRIO DE CUIABÁ
        const query = `
            SELECT * FROM registros_ponto
            WHERE funcionario_id = $1
            AND DATE(data_hora AT TIME ZONE 'America/Cuiaba') = DATE(NOW() AT TIME ZONE 'America/Cuiaba')
            ORDER BY data_hora ASC;
        `;
        const resultado = await pool.query(query, [idFinal]);
        const hoje = resultado.rows;

        // MOTOR INICIAL
        let motor = {
            entrada: null, saida_almoco: null, retorno_almoco: null, saida: null,
            quantidade_batidas: hoje.length,
            horas_trabalhadas: "00:00", horas_restantes: "08:00", proxima: "ENTRADA"
        };

        // DISTRIBUI AS BATIDAS
        hoje.forEach((registro, index) => {
            const hora = formatarHora(registro.data_hora);
            switch (index) {
                case 0: motor.entrada = hora; motor.proxima = "SAIDA_ALMOCO"; break;
                case 1: motor.saida_almoco = hora; motor.proxima = "RETORNO_ALMOCO"; break;
                case 2: motor.retorno_almoco = hora; motor.proxima = "SAIDA"; break;
                case 3: motor.saida = hora; motor.proxima = "ENCERRADO"; break;
            }
        });

        // CÁLCULO DAS HORAS (Usando os milissegundos absolutos de UTC para não ter erro de matemática)
        if (motor.entrada && motor.saida) {
            const inicio = new Date(hoje[0].data_hora);
            const fim = new Date(hoje[3].data_hora);
            const minutos = Math.floor((fim - inicio) / 60000);
            
            const h = Math.floor(minutos / 60);
            const m = minutos % 60;
            motor.horas_trabalhadas = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            motor.horas_restantes = "00:00";
        } else if (motor.entrada) {
            const inicio = new Date(hoje[0].data_hora);
            const agora = new Date(); // Pega o agora exato global
            const minutos = Math.floor((agora - inicio) / 60000);

            const h = Math.floor(minutos / 60);
            const m = minutos % 60;
            motor.horas_trabalhadas = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

            const restante = 480 - minutos; // 8 horas = 480 minutos
            if (restante > 0) {
                motor.horas_restantes = `${String(Math.floor(restante / 60)).padStart(2, '0')}:${String(restante % 60).padStart(2, '0')}`;
            } else {
                motor.horas_restantes = "00:00";
            }
        }

        res.json(motor);
    } catch (erro) {
        console.error("Erro motor jornada:", erro);
        res.status(500).json({ erro: erro.message });
    }
}

router.get("/hoje", buscarHojeHandler);
router.get("/hoje/:funcionario_id", buscarHojeHandler);

// ==========================================
// CONSULTA MENSAL
// GET /api/ponto/:funcionario_id/:mes/:ano
// ==========================================
router.get("/:funcionario_id/:mes/:ano", async (req, res) => {
    const { funcionario_id, mes, ano } = req.params;

    try {
        const query = `
            SELECT *, data_hora AS data_registro
            FROM registros_ponto
            WHERE funcionario_id = $1
            AND EXTRACT(MONTH FROM data_hora AT TIME ZONE 'America/Cuiaba') = $2::numeric
            AND EXTRACT(YEAR FROM data_hora AT TIME ZONE 'America/Cuiaba') = $3::numeric
            ORDER BY data_hora ASC;
        `;
        const resultado = await pool.query(query, [funcionario_id, mes, ano]);
        res.json(resultado.rows);
    } catch (erro) {
        console.error("Erro consulta mensal:", erro);
        res.status(500).json({ erro: erro.message });
    }
});

// ==========================================
// POST /api/ponto
// REGISTRO DE PONTO (GPS + TRAVA 15 MIN + DEMO)
// ==========================================
async function registrarPontoHandler(req, res) {
    const { funcionario_id, funcionarioId, tipo, latitude, longitude, status_validacao } = req.body;
    const idFinal = funcionario_id || funcionarioId;

    if (!idFinal) return res.status(400).json({ erro: "ID do funcionário é obrigatório." });

    const MEU_ID_ADMIN = 1;
    const isModoDemo = parseInt(idFinal) === MEU_ID_ADMIN;

    try {
        // TRAVA DE GPS
        if (!isModoDemo) {
            if (!latitude || !longitude) {
                return res.status(400).json({ erro: "Localização GPS obrigatória. Por favor, ative a localização no seu celular!" });
            }

            const configBd = await pool.query(`SELECT latitude, longitude, raio_tolerancia_metros FROM configuracoes WHERE id = 1`);

            if (configBd.rows.length === 0 || !configBd.rows[0].latitude || !configBd.rows[0].longitude) {
                return res.status(500).json({ erro: "As coordenadas da empresa ainda não foram configuradas no Painel do RH." });
            }

            const latEmpresa = parseFloat(configBd.rows[0].latitude);
            const lngEmpresa = parseFloat(configBd.rows[0].longitude);
            const raioPermitido = parseFloat(configBd.rows[0].raio_tolerancia_metros) || 100;
            const distanciaMetros = calcularDistancia(latitude, longitude, latEmpresa, lngEmpresa);

            if (distanciaMetros !== null && distanciaMetros > raioPermitido) {
                return res.status(403).json({ erro: `Fora da área! Você está a ${Math.round(distanciaMetros)} metros da empresa. O máximo permitido é ${raioPermitido} metros.` });
            }
        }

        // VERIFICA FUNCIONÁRIO
        const funcCheck = await pool.query(`SELECT id, nome FROM funcionarios WHERE id = $1`, [idFinal]);
        if (funcCheck.rows.length === 0) return res.status(404).json({ erro: "Funcionário não encontrado." });

        // VERIFICA OS PONTOS DE HOJE EM CUIABÁ
        const hoje = await pool.query(`
            SELECT * FROM registros_ponto
            WHERE funcionario_id = $1
            AND DATE(data_hora AT TIME ZONE 'America/Cuiaba') = DATE(NOW() AT TIME ZONE 'America/Cuiaba')
            ORDER BY data_hora ASC;
        `, [idFinal]);

        // TRAVA DE 15 MINUTOS
        if (!isModoDemo && hoje.rows.length > 0) {
            const ultimaBatida = new Date(hoje.rows[hoje.rows.length - 1].data_hora);
            const agora = new Date();
            const diferencaMinutos = (agora - ultimaBatida) / 60000;
            const TEMPO_TRAVA_MINUTOS = 15;

            if (diferencaMinutos < TEMPO_TRAVA_MINUTOS) {
                const faltam = Math.ceil(TEMPO_TRAVA_MINUTOS - diferencaMinutos);
                return res.status(429).json({ erro: `Aguarde mais ${faltam} minuto(s) para registrar um novo ponto.` });
            }
        }

        // DEFINE O TIPO AUTOMATICAMENTE
        let tipoAutomatico = tipo;
        if (!tipoAutomatico) {
            switch (hoje.rows.length) {
                case 0: tipoAutomatico = "ENTRADA"; break;
                case 1: tipoAutomatico = "SAIDA_ALMOCO"; break;
                case 2: tipoAutomatico = "RETORNO_ALMOCO"; break;
                case 3: tipoAutomatico = "SAIDA"; break;
                default: return res.status(400).json({ erro: "Expediente já encerrado." });
            }
        }

        // INSERÇÃO DO REGISTRO
        const queryInsert = `
            INSERT INTO registros_ponto (funcionario_id, data_hora, coordenadas, tipo, status_validacao, origem, observacao)
            VALUES ($1, NOW(), $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const coordenadas = latitude && longitude ? `${latitude},${longitude}` : null;
        const valores = [idFinal, coordenadas, tipoAutomatico, vazio(status_validacao) || "APROVADO", "Registro realizado pelo aplicativo"];
        
        const resultado = await pool.query(queryInsert, valores);
        const registro = resultado.rows[0];

        res.status(201).json({
            sucesso: true,
            mensagem: "Ponto registrado com sucesso!",
            registro: registro,
            hora_cuiaba: formatarHora(registro.data_hora),
            data_cuiaba: formatarData(registro.data_hora)
        });

    } catch (erro) {
        console.error("Erro registrar ponto:", erro);
        res.status(500).json({ erro: erro.message });
    }
}

router.post("/", registrarPontoHandler);
router.post("/registrar", registrarPontoHandler);

// ==========================================
// RESET DE TESTES
// DELETE /api/ponto/reset-hoje
// ==========================================
router.delete("/reset-hoje", async (req, res) => {
    const idFinal = req.query.funcionarioId || req.query.funcionario_id;

    if (!idFinal) {
        return res.status(400).json({ erro: "ID do funcionário não informado." });
    }

    try {
        await pool.query(`
            DELETE FROM registros_ponto
            WHERE funcionario_id = $1
            AND DATE(data_hora AT TIME ZONE 'America/Cuiaba') = DATE(NOW() AT TIME ZONE 'America/Cuiaba');
        `, [idFinal]);

        res.json({ sucesso: true, mensagem: "Batidas de hoje apagadas." });
    } catch (erro) {
        console.error("Erro reset:", erro);
        res.status(500).json({ erro: erro.message });
    }
});

module.exports = router;