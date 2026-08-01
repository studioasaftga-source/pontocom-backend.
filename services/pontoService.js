const pool = require("../database");


// =====================================================
// CONSULTAR PONTOS RH
// =====================================================

async function consultarPontos(req,res){

    try{

        const resultado = await pool.query(`

        SELECT

        f.nome,

        p.hora_entrada,

        p.hora_saida,

        p.status_validacao,

        p.coordenadas

        FROM funcionarios f

        LEFT JOIN registros_ponto p

        ON f.id = p.funcionario_id

        WHERE 

        p.data_registro = CURRENT_DATE

        OR p.data_registro IS NULL

        ORDER BY f.nome

        `);


        res.json(resultado.rows);


    }catch(err){

        console.error("Erro pontos:",err);

        res.status(500).json({
            erro:err.message
        });

    }

}



// =====================================================
// BUSCAR UMA BATIDA PELO ID
// =====================================================

async function buscarBatida(req,res){

    try{

        const id = req.params.id;


        const resultado = await pool.query(

        `
        SELECT *

        FROM registros_ponto

        WHERE id=$1
        `,

        [id]

        );


        if(resultado.rows.length===0){

            return res.json({

                erro:"Batida não encontrada"

            });

        }


        res.json(resultado.rows[0]);


    }catch(err){

        console.error(
            "Erro buscar batida:",
            err
        );


        res.status(500).json({

            erro:err.message

        });

    }

}



// =====================================================
// ALTERAR BATIDA MANUAL EXISTENTE
// =====================================================

async function alterarBatidaManual(req,res){

    try{

        const id = req.params.id;


        const {

            hora,

            tipo_registro,

            observacao

        } = req.body;



        const resultado = await pool.query(

        `

        UPDATE registros_ponto

        SET

        hora_entrada=$1,

        tipo_registro=$2,

        observacao=$3,

        origem='MANUAL_RH',

        status_validacao='APROVADO'


        WHERE id=$4


        RETURNING *;


        `,

        [

            hora,

            tipo_registro,

            observacao,

            id

        ]

        );



        if(resultado.rows.length===0){

            return res.json({

                sucesso:false,

                erro:"Batida não encontrada"

            });

        }



        res.json({

            sucesso:true,

            registro:resultado.rows[0]

        });



    }catch(err){


        console.error(
            "Erro alterar batida:",
            err
        );


        res.status(500).json({

            sucesso:false,

            erro:err.message

        });

    }

}



// =====================================================
// RESETAR BATIDAS
// =====================================================

async function resetarBatidas(req,res){

    try{

        const {
            funcionarioId
        } = req.params;


        await pool.query(

        `

        DELETE FROM registros_ponto

        WHERE funcionario_id=$1

        AND data_registro=CURRENT_DATE

        `,

        [
            funcionarioId
        ]

        );


        res.json({

            success:true,

            message:
            "Batidas resetadas com sucesso."

        });



    }catch(err){

        console.error(
            "Erro reset batidas:",
            err
        );


        res.status(500).json({

            error:
            "Erro ao resetar batidas."

        });

    }

}



// =====================================================
// REGISTRAR PONTO FUNCIONÁRIO
// =====================================================

async function registrarPonto(req,res){

    try{

        const {

            funcionario_id,

            coordenadas

        } = req.body;



        const consulta = await pool.query(

        `

        SELECT *

        FROM registros_ponto

        WHERE funcionario_id=$1

        AND data_registro=CURRENT_DATE

        ORDER BY id ASC

        `,

        [
            funcionario_id
        ]

        );


        const registros = consulta.rows;



        if(registros.length >= 4){

            return res.status(400).json({

                error:
                "Todos os registros de hoje já foram realizados."

            });

        }



        let tipoRegistro="";



        switch(registros.length){

            case 0:

                tipoRegistro="ENTRADA";

            break;


            case 1:

                tipoRegistro="SAIDA_ALMOCO";

            break;


            case 2:

                tipoRegistro="RETORNO_ALMOCO";

            break;


            case 3:

                tipoRegistro="SAIDA";

            break;

        }



        const resultado = await pool.query(

        `

        INSERT INTO registros_ponto

        (

        funcionario_id,

        hora_entrada,

        data_registro,

        coordenadas,

        status_validacao,

        tipo_registro

        )


        VALUES

        (

        $1,

        CURRENT_TIME,

        CURRENT_DATE,

        $2,

        'APROVADO',

        $3

        )


        RETURNING *;


        `,

        [

            funcionario_id,

            coordenadas,

            tipoRegistro

        ]

        );



        res.json({

            sucesso:true,

            registro:resultado.rows[0]

        });



    }catch(err){

        console.error(
            "Erro registrar ponto:",
            err
        );


        res.status(500).json({

            error:
            "Erro ao registrar ponto."

        });

    }

}



// =====================================================
// BUSCAR JORNADA DO DIA
// =====================================================

async function buscarJornada(req,res){

    try{

        const {

            funcionario_id

        } = req.params;



        const resultado = await pool.query(

        `

        SELECT

        id,

        funcionario_id,

        hora_entrada,

        hora_saida,

        coordenadas,

        tipo_registro,

        status_validacao,

        data_registro


        FROM registros_ponto


        WHERE funcionario_id=$1


        AND data_registro=CURRENT_DATE


        ORDER BY id ASC


        `,

        [

            funcionario_id

        ]

        );



        res.json(resultado.rows);



    }catch(err){

        console.error(
            "Erro buscar pontos:",
            err
        );


        res.status(500).json({

            erro:
            "Erro ao buscar pontos"

        });

    }

}



// =====================================================
// EXPORTAR
// =====================================================

module.exports = {


    consultarPontos,

    buscarBatida,

    alterarBatidaManual,

    resetarBatidas,

    registrarPonto,

    buscarJornada


};