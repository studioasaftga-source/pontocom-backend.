const express = require('express');
const router = express.Router();
const pool = require('../db'); // Verifique se o caminho do seu arquivo de banco é este mesmo

// ==========================================
// ROTA GET: Busca TODAS as configurações (GPS + Cores + Financeiro)
// ==========================================
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                nome_empresa, 
                responsavel_financeiro,
                whatsapp_financeiro,
                latitude, 
                longitude, 
                raio_tolerancia_metros, 
                intervalo_minimo_minutos,
                cor_primaria, 
                cor_secundaria, 
                cor_destaque 
            FROM configuracoes_empresa 
            LIMIT 1
        `;
        
        const { rows } = await pool.query(query);
        
        // Retorna os dados ou um objeto vazio se não houver nada
        res.json(rows[0] || {});
        
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        res.status(500).json({ erro: 'Erro interno ao buscar as configurações do sistema.' });
    }
});

// ==========================================
// ROTA POST: Salva TODAS as configurações
// ==========================================
router.post('/', async (req, res) => {
    // Desestrutura tudo o que veio do form-config do frontend
    const { 
        nome_empresa, 
        responsavel_financeiro,
        whatsapp_financeiro,
        latitude, 
        longitude, 
        raio_tolerancia_metros, 
        intervalo_minimo_minutos,
        cor_primaria, 
        cor_secundaria, 
        cor_destaque 
    } = req.body;

    try {
        // 1. Tenta atualizar os campos existentes
        const updateQuery = `
            UPDATE configuracoes_empresa 
            SET 
                nome_empresa = $1,
                responsavel_financeiro = $2,
                whatsapp_financeiro = $3,
                latitude = $4,
                longitude = $5,
                raio_tolerancia_metros = $6,
                intervalo_minimo_minutos = $7,
                cor_primaria = $8, 
                cor_secundaria = $9, 
                cor_destaque = $10
            RETURNING *
        `;
        
        const updateResult = await pool.query(updateQuery, [
            nome_empresa, 
            responsavel_financeiro || null,
            whatsapp_financeiro || null,
            latitude, 
            longitude, 
            raio_tolerancia_metros, 
            intervalo_minimo_minutos,
            cor_primaria, 
            cor_secundaria, 
            cor_destaque
        ]);

        // 2. Se a tabela estava vazia (0 linhas afetadas), insere o primeiro registro
        if (updateResult.rowCount === 0) {
            const insertQuery = `
                INSERT INTO configuracoes_empresa (
                    nome_empresa, responsavel_financeiro, whatsapp_financeiro, 
                    latitude, longitude, raio_tolerancia_metros, 
                    intervalo_minimo_minutos, cor_primaria, cor_secundaria, cor_destaque
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `;
            await pool.query(insertQuery, [
                nome_empresa, 
                responsavel_financeiro || null,
                whatsapp_financeiro || null,
                latitude, 
                longitude, 
                raio_tolerancia_metros, 
                intervalo_minimo_minutos,
                cor_primaria, 
                cor_secundaria, 
                cor_destaque
            ]);
        }
        
        res.json({ sucesso: true, mensagem: 'Configurações gerais atualizadas com sucesso!' });
        
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        res.status(500).json({ sucesso: false, erro: 'Erro ao salvar as configurações no banco.' });
    }
});

module.exports = router;