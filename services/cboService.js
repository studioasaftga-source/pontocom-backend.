const pool = require("../database");


// =====================================
// LISTAR CBO
// =====================================

async function listarCbo(req, res) {

    try {

        const resultado = await pool.query(`

            SELECT

                id,
                codigo,
                descricao

            FROM cbo

            WHERE ativo = true

            ORDER BY descricao

        `);


        res.json(resultado.rows);


    } catch (err) {


        console.error("Erro CBO:", err);


        res.status(500).json({

            erro: err.message

        });


    }

}


module.exports = {

    listarCbo

};