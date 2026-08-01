// Importe a sua conexão com o banco de dados aqui
// Ajuste o caminho "../config/db" se o seu arquivo de conexão tiver outro nome ou local
const pool = require("../database"); 

const carregarDashboard = async (req, res) => {
    try {
        // ==============================
        // TOTAL FUNCIONÁRIOS
        // ==============================
        const funcionarios = await pool.query(`
            SELECT COUNT(*) 
            FROM funcionarios
            WHERE ativo = true
        `);

        // ==============================
        // TOTAL CARGOS
        // ==============================
        const cargos = await pool.query(`
            SELECT COUNT(*)
            FROM cargos
        `);

        // ==============================
        // BATIDAS HOJE
        // ==============================
        const batidas = await pool.query(`
            SELECT COUNT(*)
            FROM registros_ponto
            WHERE data_registro = CURRENT_DATE
        `);

        // ==============================
        // FECHAMENTOS
        // ==============================
        const fechamentos = await pool.query(`
            SELECT COUNT(*)
            FROM fechamentos_ponto
        `);

        // ==============================
        // ÚLTIMAS BATIDAS
        // ==============================
        const ultimasBatidas = await pool.query(`
            SELECT f.nome, r.tipo_registro, r.hora_entrada, r.status_validacao
            FROM registros_ponto r
            INNER JOIN funcionarios f ON f.id = r.funcionario_id
            ORDER BY r.id DESC LIMIT 10
        `);

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
                WHERE r.funcionario_id = f.id AND r.data_registro = CURRENT_DATE
            )
            ORDER BY f.nome
        `);

        res.json({
            funcionarios: Number(funcionarios.rows[0].count),
            cargos: Number(cargos.rows[0].count),
            batidasHoje: Number(batidas.rows[0].count),
            fechamentos: Number(fechamentos.rows[0].count),
            ultimasBatidas: ultimasBatidas.rows,
            semBatidaHoje: semBatida.rows
        });

    } catch(error) {
        console.error("Erro dashboard:", error);
        res.status(500).json({ erro: "Erro ao carregar dashboard" });
    }
};

module.exports = {
    carregarDashboard
};