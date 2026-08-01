const pool = require("../database");

// ======================================
// BUSCAR EMPRESA
// ======================================

async function buscarEmpresa(req, res) {

    try {

        const resultado = await pool.query(`
            SELECT *
            FROM empresa
            ORDER BY id
            LIMIT 1
        `);

        if (resultado.rows.length === 0) {
            return res.json(null);
        }

        res.json(resultado.rows[0]);

    } catch (erro) {

        console.error("Erro ao buscar empresa:", erro);

        res.status(500).json({
            erro: "Erro ao buscar empresa."
        });

    }

}


// ======================================
// SALVAR EMPRESA
// ======================================

async function salvarEmpresa(req, res) {

    try {

        const {

            razao_social,
            nome_fantasia,
            cnpj,
            inscricao_estadual,
            inscricao_municipal,
            cnae,
            fpas,
            terceiros,
            rat,

            cep,
            endereco,
            numero,
            bairro,
            cidade,
            estado,

            telefone,
            celular,
            email,
            site,

            responsavel,
            cargo_responsavel,
            cpf_responsavel,

            banco,
            agencia,
            conta,

            dia_pagamento,
            fechamento_padrao,
            mensagem_holerite,
            logo

        } = req.body;


        const existe = await pool.query(`
            SELECT id
            FROM empresa
            LIMIT 1
        `);


        // ==========================
        // ATUALIZA
        // ==========================

        if (existe.rows.length > 0) {

            const id = existe.rows[0].id;

            const resultado = await pool.query(

                `
                UPDATE empresa
                SET

                    razao_social=$1,
                    nome_fantasia=$2,
                    cnpj=$3,
                    inscricao_estadual=$4,
                    inscricao_municipal=$5,
                    cnae=$6,
                    fpas=$7,
                    terceiros=$8,
                    rat=$9,

                    cep=$10,
                    endereco=$11,
                    numero=$12,
                    bairro=$13,
                    cidade=$14,
                    estado=$15,

                    telefone=$16,
                    celular=$17,
                    email=$18,
                    site=$19,

                    responsavel=$20,
                    cargo_responsavel=$21,
                    cpf_responsavel=$22,

                    banco=$23,
                    agencia=$24,
                    conta=$25,

                    dia_pagamento=$26,
                    fechamento_padrao=$27,
                    mensagem_holerite=$28,
                    logo=$29

                WHERE id=$30

                RETURNING *

                `,

                [

                    razao_social,
                    nome_fantasia,
                    cnpj,
                    inscricao_estadual,
                    inscricao_municipal,
                    cnae,
                    fpas,
                    terceiros,
                    rat,

                    cep,
                    endereco,
                    numero,
                    bairro,
                    cidade,
                    estado,

                    telefone,
                    celular,
                    email,
                    site,

                    responsavel,
                    cargo_responsavel,
                    cpf_responsavel,

                    banco,
                    agencia,
                    conta,

                    dia_pagamento,
                    fechamento_padrao,
                    mensagem_holerite,
                    logo,

                    id

                ]

            );

            return res.json(resultado.rows[0]);

        }


        // ==========================
        // INSERIR
        // ==========================

        const resultado = await pool.query(

            `
            INSERT INTO empresa (

                razao_social,
                nome_fantasia,
                cnpj,
                inscricao_estadual,
                inscricao_municipal,
                cnae,
                fpas,
                terceiros,
                rat,

                cep,
                endereco,
                numero,
                bairro,
                cidade,
                estado,

                telefone,
                celular,
                email,
                site,

                responsavel,
                cargo_responsavel,
                cpf_responsavel,

                banco,
                agencia,
                conta,

                dia_pagamento,
                fechamento_padrao,
                mensagem_holerite,
                logo

            )

            VALUES (

                $1,$2,$3,$4,$5,$6,$7,$8,$9,
                $10,$11,$12,$13,$14,$15,
                $16,$17,$18,$19,
                $20,$21,$22,
                $23,$24,$25,
                $26,$27,$28,$29

            )

            RETURNING *

            `,

            [

                razao_social,
                nome_fantasia,
                cnpj,
                inscricao_estadual,
                inscricao_municipal,
                cnae,
                fpas,
                terceiros,
                rat,

                cep,
                endereco,
                numero,
                bairro,
                cidade,
                estado,

                telefone,
                celular,
                email,
                site,

                responsavel,
                cargo_responsavel,
                cpf_responsavel,

                banco,
                agencia,
                conta,

                dia_pagamento,
                fechamento_padrao,
                mensagem_holerite,
                logo

            ]

        );

        res.status(201).json(resultado.rows[0]);

    } catch (erro) {

        console.error("Erro ao salvar empresa:", erro);

        res.status(500).json({
            erro: "Erro ao salvar empresa."
        });

    }

}


// ======================================
// ATUALIZAR EMPRESA
// ======================================

async function atualizarEmpresa(req, res) {

    return salvarEmpresa(req, res);

}


// ======================================

module.exports = {

    buscarEmpresa,
    salvarEmpresa,
    atualizarEmpresa

};