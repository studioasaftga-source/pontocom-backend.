const express = require('express');
const router = express.Router();
const pool = require('../database');
const multer = require('multer');
const path = require('path');

// ============================================================
// CONFIGURAÇÃO DO UPLOAD DE FOTO
// ============================================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `foto-${req.params.id}-${Date.now()}${ext}`);
    }
});

const upload = multer({ storage });


// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function vazio(valor) {
    return valor === undefined || valor === "" ? null : valor;
}

function numeroOuNull(valor) {
    if (valor === undefined || valor === "" || valor === null) {
        return null;
    }

    const numero = Number(valor);

    return isNaN(numero) ? null : numero;
}


// ============================================================
// 1. LISTAR FUNCIONÁRIOS ATIVOS
// GET /api/funcionarios
// ============================================================

router.get('/', async (req, res) => {
    try {

        const query = `
            SELECT
                f.*,
                COALESCE(c.nome, 'Sem Cargo') AS cargo_nome,
                c.hora_entrada,
                c.hora_saida,
                c.tolerancia_entrada,
                c.carga_horaria
            FROM funcionarios f
            LEFT JOIN cargos c
                ON f.cargo_id = c.id
            WHERE f.ativo IS NOT FALSE
            ORDER BY f.nome ASC
        `;

        const resultado = await pool.query(query);

        res.json(resultado.rows);

    } catch (err) {

        console.error("Erro ao listar funcionários:", err);

        res.status(500).json({
            erro: err.message
        });
    }
});


// ============================================================
// 2. TODOS OS FUNCIONÁRIOS
// GET /api/funcionarios/todos
// ============================================================

router.get('/todos', async (req, res) => {
    try {

        const resultado = await pool.query(`
            SELECT
                f.*,
                COALESCE(c.nome, 'Sem Cargo') AS cargo_nome
            FROM funcionarios f
            LEFT JOIN cargos c
                ON f.cargo_id = c.id
            ORDER BY f.nome ASC
        `);

        res.json(resultado.rows);

    } catch (err) {

        console.error("Erro histórico funcionários:", err);

        res.status(500).json({
            erro: err.message
        });
    }
});


// ============================================================
// 3. PERFIL DO FUNCIONÁRIO
// GET /api/funcionarios/perfil/:id
// ============================================================

router.get('/perfil/:id', async (req, res) => {
    try {

        const { id } = req.params;

        const resultado = await pool.query(`
            SELECT
                f.id,
                f.nome,
                f.cpf,
                f.telefone,
                f.email,
                f.salario_base,
                f.data_admissao,
                f.pix,
                f.foto_url,
                f.departamento,
                f.cargo_id,
                f.ativo,
                COALESCE(c.nome, 'Sem Cargo') AS cargo,
                COALESCE(c.nome, 'Sem Cargo') AS cargo_nome
            FROM funcionarios f
            LEFT JOIN cargos c
                ON f.cargo_id = c.id
            WHERE f.id = $1
            LIMIT 1
        `, [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: "Funcionário não encontrado."
            });
        }

        res.json(resultado.rows[0]);

    } catch (erro) {

        console.error("Erro ao buscar perfil:", erro);

        res.status(500).json({
            erro: "Erro interno no servidor.",
            detalhe: erro.message
        });
    }
});


// ============================================================
// 4. UPLOAD / ALTERAR FOTO DE PERFIL
// POST /api/funcionarios/perfil/:id/foto
// ============================================================

router.post('/perfil/:id/foto', upload.single('foto'), async (req, res) => {

    const { id } = req.params;

    if (!req.file) {
        return res.status(400).json({
            erro: "Nenhuma imagem enviada."
        });
    }

    const fotoUrl = `/uploads/${req.file.filename}`;

    try {

        await pool.query(
            `UPDATE funcionarios SET foto_url = $1 WHERE id = $2`,
            [fotoUrl, id]
        );

        res.json({
            sucesso: true,
            foto_url: fotoUrl
        });

    } catch (erro) {

        console.error("Erro ao salvar foto no banco:", erro);

        res.status(500).json({
            erro: "Erro interno ao salvar foto de perfil."
        });
    }
});


// ============================================================
// 5. BUSCAR FUNCIONÁRIO PELO ID
// GET /api/funcionarios/:id
//
// Essa é a rota usada pelo perfil.html
// ============================================================

router.get('/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const resultado = await pool.query(`
            SELECT
                f.id,
                f.nome,
                f.cpf,
                f.rg,
                f.pis_pasep,
                f.telefone,
                f.email,
                f.salario_base,
                f.data_admissao,
                f.pix,
                f.banco,
                f.banco_agencia,
                f.conta_bancaria,
                f.departamento,
                f.data_nascimento,
                f.ctps,
                f.dependentes,
                f.tipo_contrato,
                f.carga_horaria_mensal,
                f.optante_vt,
                f.adicional_tipo,
                f.foto_url,
                f.ativo,
                f.cargo_id,
                COALESCE(c.nome, 'Sem Cargo') AS cargo_nome
            FROM funcionarios f
            LEFT JOIN cargos c
                ON f.cargo_id = c.id
            WHERE f.id = $1
            LIMIT 1
        `, [id]);

        if (resultado.rows.length === 0) {

            return res.status(404).json({
                sucesso: false,
                erro: "Funcionário não encontrado."
            });
        }

        res.json({
            sucesso: true,
            funcionario: resultado.rows[0]
        });

    } catch (erro) {

        console.error("Erro ao buscar funcionário pelo ID:", erro);

        res.status(500).json({
            sucesso: false,
            erro: "Erro interno ao buscar funcionário.",
            detalhe: erro.message
        });
    }
});


// ============================================================
// 6. CADASTRAR FUNCIONÁRIO
// POST /api/funcionarios
// ============================================================

router.post('/', async (req, res) => {

    try {

        const {
            nome,
            cpf,
            rg,
            cargo_id,
            departamento,
            pis,
            salario,
            banco,
            agencia,
            conta,
            pix,
            telefone,
            email,
            data_nascimento,
            ctps,
            dependentes,
            tipo_contrato,
            data_admissao,
            carga_horaria_mensal,
            optante_vt,
            adicional_tipo
        } = req.body;


        let salarioBase = null;

        if (salario !== undefined && salario !== "") {

            salarioBase = Number(
                String(salario)
                    .replace(/\./g, "")
                    .replace(",", ".")
            );

            if (isNaN(salarioBase)) {
                salarioBase = null;
            }
        }


        const resultado = await pool.query(`
            INSERT INTO funcionarios (
                nome,
                cpf,
                rg,
                cargo_id,
                departamento,
                pis_pasep,
                salario_base,
                banco,
                banco_agencia,
                conta_bancaria,
                pix,
                telefone,
                email,
                ativo,
                data_nascimento,
                ctps,
                dependentes,
                tipo_contrato,
                data_admissao,
                carga_horaria_mensal,
                optante_vt,
                adicional_tipo
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11,
                $12,
                $13,
                true,
                $14,
                $15,
                $16,
                $17,
                $18,
                $19,
                $20,
                $21
            )
            RETURNING *;
        `, [
            vazio(nome),
            vazio(cpf),
            vazio(rg),
            numeroOuNull(cargo_id),
            vazio(departamento),
            vazio(pis),
            salarioBase,
            vazio(banco),
            vazio(agencia),
            vazio(conta),
            vazio(pix),
            vazio(telefone),
            vazio(email),
            vazio(data_nascimento),
            vazio(ctps),
            numeroOuNull(dependentes),
            vazio(tipo_contrato),
            vazio(data_admissao),
            numeroOuNull(carga_horaria_mensal),
            vazio(optante_vt),
            vazio(adicional_tipo)
        ]);

        res.json({
            sucesso: true,
            funcionario: resultado.rows[0]
        });

    } catch (err) {

        console.error("Erro cadastrar funcionário:", err);

        res.status(500).json({
            sucesso: false,
            erro: err.message
        });
    }
});


// ============================================================
// 7. EDITAR FUNCIONÁRIO
// PUT /api/funcionarios/:id
// ============================================================

router.put('/:id', async (req, res) => {

    try {

        const id = req.params.id;

        const {
            nome,
            cpf,
            rg,
            cargo_id,
            departamento,
            pis,
            salario,
            banco,
            agencia,
            conta,
            pix,
            telefone,
            email,
            data_nascimento,
            ctps,
            dependentes,
            tipo_contrato,
            data_admissao,
            carga_horaria_mensal,
            optante_vt,
            adicional_tipo
        } = req.body;


        let salarioBase = null;

        if (salario !== undefined && salario !== "") {

            salarioBase = Number(
                String(salario)
                    .replace(/\./g, "")
                    .replace(",", ".")
            );

            if (isNaN(salarioBase)) {
                salarioBase = null;
            }
        }


        const resultado = await pool.query(`
            UPDATE funcionarios
            SET
                nome = $1,
                cpf = $2,
                rg = $3,
                cargo_id = $4,
                departamento = $5,
                pis_pasep = $6,
                salario_base = $7,
                banco = $8,
                banco_agencia = $9,
                conta_bancaria = $10,
                pix = $11,
                telefone = $12,
                email = $13,
                data_nascimento = $14,
                ctps = $15,
                dependentes = $16,
                tipo_contrato = $17,
                data_admissao = $18,
                carga_horaria_mensal = $19,
                optante_vt = $20,
                adicional_tipo = $21
            WHERE id = $22
            RETURNING *;
        `, [
            vazio(nome),
            vazio(cpf),
            vazio(rg),
            numeroOuNull(cargo_id),
            vazio(departamento),
            vazio(pis),
            salarioBase,
            vazio(banco),
            vazio(agencia),
            vazio(conta),
            vazio(pix),
            vazio(telefone),
            vazio(email),
            vazio(data_nascimento),
            vazio(ctps),
            numeroOuNull(dependentes),
            vazio(tipo_contrato),
            vazio(data_admissao),
            numeroOuNull(carga_horaria_mensal),
            vazio(optante_vt),
            vazio(adicional_tipo),
            id
        ]);

        res.json({
            sucesso: true,
            funcionario: resultado.rows[0]
        });

    } catch (err) {

        console.error("Erro editar funcionário:", err);

        res.status(500).json({
            sucesso: false,
            erro: err.message
        });
    }
});


// ============================================================
// 8. INATIVAR FUNCIONÁRIO
// PUT /api/funcionarios/:id/inativar
// ============================================================

router.put('/:id/inativar', async (req, res) => {

    try {

        const resultado = await pool.query(`
            UPDATE funcionarios
            SET
                ativo = false,
                data_demissao = CURRENT_DATE
            WHERE id = $1
            RETURNING *;
        `, [req.params.id]);

        res.json({
            sucesso: true,
            funcionario: resultado.rows[0]
        });

    } catch (err) {

        console.error("Erro inativar funcionário:", err);

        res.status(500).json({
            sucesso: false,
            erro: err.message
        });
    }
});


// ============================================================
// 9. EXCLUIR FUNCIONÁRIO
// DELETE /api/funcionarios/:id
// ============================================================

router.delete('/:id', async (req, res) => {

    try {

        await pool.query(
            `DELETE FROM funcionarios WHERE id = $1`,
            [req.params.id]
        );

        res.json({
            sucesso: true
        });

    } catch (err) {

        console.error("Erro excluir funcionário:", err);

        res.status(500).json({
            sucesso: false,
            erro: err.message
        });
    }
});


module.exports = router;