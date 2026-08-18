const pool = require("../database"); 

const carregarDashboard = async (req, res) => {
    try {
        const funcionarios = await pool.query(`
            SELECT COUNT(*) 
            FROM funcionarios
            WHERE ativo = true
        `);

        const cargos = await pool.query(`
            SELECT COUNT(*)
            FROM cargos
        `);

        const batidas = await pool.query(`
            SELECT COUNT(*)
            FROM registros_ponto
            WHERE DATE(data_hora AT TIME ZONE 'America/Cuiaba') = CURRENT_DATE
        `);

        const fechamentos = await pool.query(`
            SELECT COUNT(*)
            FROM fechamentos_ponto
        `);

        // ==============================
        // RESUMO DIÁRIO DE HOJE (Funcionário por Funcionário)
        // ==============================
        const funcionariosRes = await pool.query(`
            SELECT f.id, f.nome
            FROM funcionarios f
            WHERE f.ativo = true
            ORDER BY f.nome
        `);

        const batidasHojeRes = await pool.query(`
            SELECT funcionario_id, tipo, data_hora
            FROM registros_ponto
            WHERE DATE(data_hora AT TIME ZONE 'America/Cuiaba') = CURRENT_DATE
            ORDER BY data_hora ASC
        `);

        const batidasPorFuncionario = {};
        batidasHojeRes.rows.forEach(b => {
            if (!batidasPorFuncionario[b.funcionario_id]) {
                batidasPorFuncionario[b.funcionario_id] = [];
            }
            const horaFmt = new Intl.DateTimeFormat('pt-BR', { 
                timeZone: 'America/Cuiaba', 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: false 
            }).format(new Date(b.data_hora));

            batidasPorFuncionario[b.funcionario_id].push({
                tipo: b.tipo,
                hora: horaFmt
            });
        });

        const resumoHoje = funcionariosRes.rows.map(f => {
            const batidasList = batidasPorFuncionario[f.id] || [];
            return {
                id: f.id,
                nome: f.nome,
                b1: batidasList.find(b => b.tipo === 'ENTRADA')?.hora || '--:--',
                b2: batidasList.find(b => b.tipo === 'SAIDA_ALMOCO')?.hora || '--:--',
                b3: batidasList.find(b => b.tipo === 'RETORNO_ALMOCO')?.hora || '--:--',
                b4: batidasList.find(b => b.tipo === 'SAIDA')?.hora || '--:--'
            };
        });

        // ==============================
        // FUNCIONÁRIOS SEM BATIDA HOJE
        // ==============================
        const semBatida = await pool.query(`
            SELECT f.id, f.nome, c.nome AS cargo
            FROM funcionarios f
            LEFT JOIN cargos c ON c.id = f.cargo_id
            WHERE f.ativo = true
            AND NOT EXISTS(
                SELECT 1 FROM registros_ponto r
                WHERE r.funcionario_id = f.id AND DATE(r.data_hora AT TIME ZONE 'America/Cuiaba') = CURRENT_DATE
            )
            ORDER BY f.nome
        `);

        // ==============================
        // PONTUAIS E ATRASADOS DE HOJE
        // ==============================
        const pontualidadeHoje = await pool.query(`
            SELECT 
                f.id,
                f.nome,
                MIN(r.data_hora) as primeira_entrada
            FROM registros_ponto r
            JOIN funcionarios f ON r.funcionario_id = f.id
            WHERE r.tipo = 'ENTRADA' 
            AND DATE(r.data_hora AT TIME ZONE 'America/Cuiaba') = CURRENT_DATE
            GROUP BY f.id, f.nome
        `);

        const pontuaisHoje = [];
        const atrasadosHoje = [];

        pontualidadeHoje.rows.forEach(p => {
            const horaEntradaStr = new Intl.DateTimeFormat('pt-BR', {
                timeZone: 'America/Cuiaba',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(new Date(p.primeira_entrada));

            if (horaEntradaStr <= '07:35:00') {
                pontuaisHoje.push({ nome: p.nome, hora: horaEntradaStr });
            } else {
                atrasadosHoje.push({ nome: p.nome, hora: horaEntradaStr });
            }
        });

        // ==============================
        // ALERTA DE RISCO MENSAL (VALE)
        // ==============================
        const alertaMes = await pool.query(`
            SELECT 
                f.nome,
                COUNT(r.id) as total_atrasos
            FROM registros_ponto r
            JOIN funcionarios f ON r.funcionario_id = f.id
            WHERE r.tipo = 'ENTRADA' 
            AND DATE_TRUNC('month', r.data_hora AT TIME ZONE 'America/Cuiaba') = DATE_TRUNC('month', CURRENT_DATE)
            AND TO_CHAR(r.data_hora AT TIME ZONE 'America/Cuiaba', 'HH24:MI:SS') > '07:35:00'
            GROUP BY f.id, f.nome
            ORDER BY total_atrasos DESC
            LIMIT 5
        `);

        res.json({
            funcionarios: Number(funcionarios.rows[0].count),
            cargos: Number(cargos.rows[0].count),
            batidasHoje: Number(batidas.rows[0].count),
            fechamentos: Number(fechamentos.rows[0].count),
            resumoHoje: resumoHoje,
            semBatidaHoje: semBatida.rows,
            pontuaisHoje: pontuaisHoje,
            atrasadosHoje: atrasadosHoje,
            alertaRisco: alertaMes.rows
        });

    } catch(error) {
        console.error("Erro dashboard:", error);
        res.status(500).json({ erro: "Erro ao carregar dashboard" });
    }
};

module.exports = {
    carregarDashboard
};