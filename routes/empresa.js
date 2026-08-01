const express = require('express');
const router = express.Router();
const pool = require('../db'); // Ajuste o caminho para o seu arquivo de conexão db.js se necessário

// 1. Rota para listar a(s) empresa(s) cadastradas
router.get('/', async (req, res) => {
    try {
        const query = 'SELECT * FROM empresa ORDER BY id DESC';
        const resultado = await pool.query(query);
        res.json(resultado.rows);
    } catch (erro) {
        console.error("Erro ao buscar empresa:", erro);
        res.status(500).json({ erro: "Erro interno ao buscar dados da empresa" });
    }
});

// 2. Rota para cadastrar uma nova empresa
router.post('/', async (req, res) => {
    const { 
        razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal, 
        cnae, fpas, terceiros, rat, cep, endereco, numero, bairro, cidade, estado, 
        telefone, celular, email, site, responsavel, cargo_responsavel, cpf_responsavel, 
        banco, agencia, conta, dia_pagamento, fechamento_padrao, mensagem_holerite, logo 
    } = req.body;

    try {
        const query = `
            INSERT INTO empresa (
                razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal, 
                cnae, fpas, terceiros, rat, cep, endereco, numero, bairro, cidade, estado, 
                telefone, celular, email, site, responsavel, cargo_responsavel, cpf_responsavel, 
                banco, agencia, conta, dia_pagamento, fechamento_padrao, mensagem_holerite, logo
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
                $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
            )
            RETURNING *;
        `;
        
        const valores = [
            razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal, 
            cnae, fpas, terceiros, rat || null, cep, endereco, numero, bairro, cidade, estado, 
            telefone, celular, email, site, responsavel, cargo_responsavel, cpf_responsavel, 
            banco, agencia, conta, dia_pagamento || null, fechamento_padrao || null, mensagem_holerite, logo
        ];

        const novaEmpresa = await pool.query(query, valores);
        res.status(201).json(novaEmpresa.rows[0]);
    } catch (erro) {
        console.error("Erro ao salvar empresa no banco:", erro);
        res.status(500).json({ erro: "Erro interno ao salvar empresa" });
    }
});

// 3. Rota para editar os dados da empresa (Update)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal, 
        cnae, fpas, terceiros, rat, cep, endereco, numero, bairro, cidade, estado, 
        telefone, celular, email, site, responsavel, cargo_responsavel, cpf_responsavel, 
        banco, agencia, conta, dia_pagamento, fechamento_padrao, mensagem_holerite, logo 
    } = req.body;

    try {
        const query = `
            UPDATE empresa SET 
                razao_social = $1, nome_fantasia = $2, cnpj = $3, inscricao_estadual = $4, inscricao_municipal = $5, 
                cnae = $6, fpas = $7, terceiros = $8, rat = $9, cep = $10, endereco = $11, numero = $12, bairro = $13, 
                cidade = $14, estado = $15, telefone = $16, celular = $17, email = $18, site = $19, responsavel = $20, 
                cargo_responsavel = $21, cpf_responsavel = $22, banco = $23, agencia = $24, conta = $25, dia_pagamento = $26, 
                fechamento_padrao = $27, mensagem_holerite = $28, logo = $29
            WHERE id = $30
            RETURNING *;
        `;
        
        const valores = [
            razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal, 
            cnae, fpas, terceiros, rat || null, cep, endereco, numero, bairro, cidade, estado, 
            telefone, celular, email, site, responsavel, cargo_responsavel, cpf_responsavel, 
            banco, agencia, conta, dia_pagamento || null, fechamento_padrao || null, mensagem_holerite, logo, id
        ];

        const resultado = await pool.query(query, valores);
        if (resultado.rows.length === 0) return res.status(404).json({ erro: "Empresa não encontrada." });
        
        res.json(resultado.rows[0]);
    } catch (erro) {
        console.error("Erro ao atualizar empresa:", erro);
        res.status(500).json({ erro: "Erro interno ao atualizar empresa" });
    }
});

// 4. Rota para excluir a empresa (Delete)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const query = 'DELETE FROM empresa WHERE id = $1 RETURNING *';
        const resultado = await pool.query(query, [id]);
        
        if (resultado.rows.length === 0) return res.status(404).json({ erro: "Empresa não encontrada." });
        res.json({ mensagem: "Empresa excluída com sucesso." });
    } catch (erro) {
        console.error("Erro ao excluir empresa:", erro);
        res.status(500).json({ erro: "Erro interno ao excluir empresa" });
    }
});

module.exports = router;