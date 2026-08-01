const express = require('express');
const router = express.Router();

// Puxa a conexão com o banco de dados (usando o arquivo database.js da raiz)
const db = require('../database'); 

// Rota para receber o CPF e fazer o login do colaborador
router.post('/', async (req, res) => {
    const { cpf } = req.body;

    // Verifica se enviou o CPF
    if (!cpf) {
        return res.status(400).json({ erro: 'CPF é obrigatório para acessar.' });
    }

    try {
        // Vai no banco de dados, na tabela funcionarios, procurar o CPF digitado
        const query = 'SELECT id, nome, cpf FROM funcionarios WHERE cpf = $1';
        const values = [cpf];
        
        const result = await db.query(query, values);

        // Se não encontrar nenhuma linha no banco, o CPF não existe
        if (result.rows.length === 0) {
            return res.status(404).json({ erro: 'CPF não encontrado no sistema.' });
        }

        // Pega as informações do funcionário encontrado
        const funcionario = result.rows[0];

        // Retorna sucesso para o frontend (login.html)
        return res.status(200).json({
            mensagem: 'Acesso liberado',
            funcionario: {
                id: funcionario.id,
                nome: funcionario.nome
            }
        });

    } catch (error) {
        console.error('Erro na rota de login:', error);
        return res.status(500).json({ erro: 'Erro interno no banco de dados.' });
    }
});

module.exports = router;