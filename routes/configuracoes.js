const express = require('express');
const router = express.Router();
const pool = require('../database'); // Ajuste se o seu arquivo de banco for diferente

// ==========================================
// GET: LER AS CONFIGURAÇÕES
// ==========================================
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM configuracoes WHERE id = 1');
        res.json(result.rows[0] || {});
    } catch (error) {
        console.error("❌ Erro ao buscar configurações:", error);
        res.status(500).json({ erro: 'Erro interno ao buscar as parametrizações.' });
    }
});

// ==========================================
// POST: SALVAR AS CONFIGURAÇÕES (RH)
// ==========================================
router.post('/', async (req, res) => {
    try {
        const p = req.body;
        
        const query = `
            INSERT INTO configuracoes (
                id, nome_empresa, responsavel_financeiro, whatsapp_financeiro, 
                latitude, longitude, raio_tolerancia_metros, intervalo_minimo_minutos, 
                tolerancia_atraso_minutos, porcentagem_max_vale, limite_atrasos_beneficio, 
                vale_dia_inicio, vale_dia_fim, cor_primaria, cor_secundaria, cor_destaque, senha_gestor, atualizado_em
            ) VALUES (
                1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                nome_empresa = EXCLUDED.nome_empresa,
                responsavel_financeiro = EXCLUDED.responsavel_financeiro,
                whatsapp_financeiro = EXCLUDED.whatsapp_financeiro,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                raio_tolerancia_metros = EXCLUDED.raio_tolerancia_metros,
                intervalo_minimo_minutos = EXCLUDED.intervalo_minimo_minutos,
                tolerancia_atraso_minutos = EXCLUDED.tolerancia_atraso_minutos,
                porcentagem_max_vale = EXCLUDED.porcentagem_max_vale,
                limite_atrasos_beneficio = EXCLUDED.limite_atrasos_beneficio,
                vale_dia_inicio = EXCLUDED.vale_dia_inicio,
                vale_dia_fim = EXCLUDED.vale_dia_fim,
                cor_primaria = EXCLUDED.cor_primaria,
                cor_secundaria = EXCLUDED.cor_secundaria,
                cor_destaque = EXCLUDED.cor_destaque,
                senha_gestor = COALESCE(NULLIF(EXCLUDED.senha_gestor, ''), configuracoes.senha_gestor),
                atualizado_em = NOW();
        `;
        
        const values = [
            p.nome_empresa, p.responsavel_financeiro, p.whatsapp_financeiro,
            p.latitude, p.longitude, p.raio_tolerancia_metros, p.intervalo_minimo_minutos,
            p.tolerancia_atraso_minutos, p.porcentagem_max_vale, p.limite_atrasos_beneficio,
            p.vale_dia_inicio, p.vale_dia_fim, p.cor_primaria, p.cor_secundaria, p.cor_destaque, p.senha_gestor
        ];

        await pool.query(query, values);

        res.json({ 
            sucesso: true, 
            mensagem: 'Configurações atualizadas com sucesso!'
        });
        
    } catch (error) {
        console.error("❌ Erro ao salvar configurações:", error);
        res.status(500).json({ erro: 'Erro ao salvar as configurações no banco de dados.' });
    }
});

module.exports = router;