const express = require("express");
const router = express.Router();
const pool = require("../database");

// ==========================================================
// 1. ROTA PARA PREENCHER O DROPDOWN DE FUNCIONÁRIOS
// ==========================================================
router.get("/funcionarios", async (req, res) => {
    try {
        // SELECT * garante que não vai dar erro de "coluna não existe"
        const result = await pool.query(`
            SELECT * FROM funcionarios 
            ORDER BY nome ASC
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error("Erro ao buscar funcionários para o dropdown:", error);
        res.status(500).json({ erro: "Erro ao carregar a lista de funcionários." });
    }
});

// ==========================================================
// 2. ROTA PARA GERAR O HOLERITE (DADOS)
// ==========================================================
router.get("/gerar/:mes/:ano/:funcionarioId", async (req, res) => {
    const { mes, ano, funcionarioId } = req.params;

    try {
        // 1. Busca os dados da empresa
        const empresaResult = await pool.query("SELECT * FROM configuracoes WHERE id = 1");
        const nomeEmpresa = empresaResult.rows.length > 0 ? empresaResult.rows[0].nome_empresa : "Sua Empresa";

        // 2. Busca os funcionários usando SELECT *
        let queryFunc = `SELECT * FROM funcionarios`;
        let paramsFunc = [];

        if (funcionarioId !== "todos") {
            queryFunc += ` WHERE id = $1`;
            paramsFunc.push(funcionarioId);
        }
        
        queryFunc += ` ORDER BY nome ASC`;

        const funcResult = await pool.query(queryFunc, paramsFunc);
        const funcionarios = funcResult.rows;

        if (funcionarios.length === 0) {
            return res.status(404).json({ erro: "Nenhum funcionário encontrado para a emissão." });
        }

        // 3. Constrói os holerites com verificações seguras (Fallbacks)
        const holeritesGerados = funcionarios.map(f => {
            
            // Tenta achar o salário nas colunas mais comuns. Se não achar, fica 0.
            const salarioBase = parseFloat(f.salario_base || f.salario || f.valor_salario) || 0;
            
            // Simulação de cálculo de INSS (8%)
            const descontoINSS = salarioBase > 0 ? (salarioBase * 0.08) : 0; 
            
            const totalProventos = salarioBase;
            const totalDescontos = descontoINSS;
            const salarioLiquido = totalProventos - totalDescontos;

            return {
                empresa: nomeEmpresa,
                competencia: `${String(mes).padStart(2, '0')}/${ano}`,
                funcionario: {
                    id: f.id,
                    nome: f.nome,
                    cpf: f.cpf || "000.000.000-00",
                    cargo: f.cargo || f.nome_cargo || "Não informado",
                    // Se não tiver data de admissão no banco, coloca a data de hoje para não quebrar
                    admissao: f.data_admissao || f.admissao || new Date(), 
                    salario_base: salarioBase
                },
                itens: [
                    { cod: "001", descricao: "Salário Base", referencia: "30 dias", provento: salarioBase, desconto: null },
                    { cod: "101", descricao: "Contribuição INSS", referencia: "8.00%", provento: null, desconto: descontoINSS }
                ],
                totais: {
                    proventos: totalProventos,
                    descontos: totalDescontos,
                    liquido: salarioLiquido
                }
            };
        });

        res.json({ 
            sucesso: true, 
            quantidade: holeritesGerados.length,
            holerites: holeritesGerados 
        });

    } catch (error) {
        console.error("Erro ao gerar holerites:", error);
        res.status(500).json({ erro: "Erro interno ao processar os holerites." });
    }
});

module.exports = router;