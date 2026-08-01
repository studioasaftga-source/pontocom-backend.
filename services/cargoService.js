const pool = require("../database");


// =====================================
// FUNÇÕES AUXILIARES
// =====================================

function vazio(valor){

    if(valor === undefined || valor === null || valor === ""){
        return null;
    }

    return valor;

}


function numeroOuNull(valor){

    if(valor === undefined || valor === null || valor === ""){
        return null;
    }

    return Number(valor);

}


// =====================================
// LISTAR CARGOS
// =====================================

async function listarCargos(req,res){

    try{


        const resultado = await pool.query(`

            SELECT

                c.id,
                c.nome,
                c.codigo,
                c.cbo_id,

                cbo.codigo AS cbo,
                cbo.descricao AS cbo_descricao,

                c.departamento,
                c.descricao,

                c.hora_entrada,
                c.saida_almoco,
                c.retorno_almoco,
                c.hora_saida,

                c.tolerancia_entrada,
                c.tolerancia_saida,

                c.carga_horaria,

                c.ativo,
                c.criado_em


            FROM cargos c


            LEFT JOIN cbo

            ON cbo.id = c.cbo_id


            WHERE c.ativo = true


            ORDER BY c.nome


        `);


        res.json(resultado.rows);


    }catch(err){


        console.error("Erro listar cargos:",err);


        res.status(500).json({

            erro:err.message

        });


    }

}



// =====================================
// CADASTRAR CARGO
// =====================================

async function cadastrarCargo(req,res){

    try{


        const {

            nome,
            codigo,
            cbo_id,
            departamento,
            descricao,

            hora_entrada,
            saida_almoco,
            retorno_almoco,
            hora_saida,

            tolerancia_entrada,
            tolerancia_saida,

            carga_horaria

        } = req.body;



        const resultado = await pool.query(`


            INSERT INTO cargos
            (

                nome,
                codigo,
                cbo_id,

                departamento,
                descricao,

                hora_entrada,
                saida_almoco,
                retorno_almoco,
                hora_saida,

                tolerancia_entrada,
                tolerancia_saida,

                carga_horaria,

                ativo

            )


            VALUES

            (

                $1,$2,$3,$4,$5,
                $6,$7,$8,$9,
                $10,$11,$12,
                true

            )


            RETURNING *


        `,[


            vazio(nome),
            vazio(codigo),
            numeroOuNull(cbo_id),

            vazio(departamento),
            vazio(descricao),

            vazio(hora_entrada),
            vazio(saida_almoco),
            vazio(retorno_almoco),
            vazio(hora_saida),

            numeroOuNull(tolerancia_entrada),
            numeroOuNull(tolerancia_saida),

            numeroOuNull(carga_horaria)


        ]);



        res.json({

            sucesso:true,

            cargo:resultado.rows[0]

        });



    }catch(err){


        console.error("Erro cadastrar cargo:",err);


        res.status(500).json({

            sucesso:false,

            erro:err.message

        });


    }

}



// =====================================
// EDITAR CARGO
// =====================================

async function editarCargo(req,res){

    try{


        const id=req.params.id;


        const {

            nome,
            codigo,
            cbo_id,
            departamento,
            descricao,

            hora_entrada,
            saida_almoco,
            retorno_almoco,
            hora_saida,

            tolerancia_entrada,
            tolerancia_saida,

            carga_horaria


        } = req.body;




        const resultado = await pool.query(`


            UPDATE cargos SET


                nome=$1,
                codigo=$2,
                cbo_id=$3,

                departamento=$4,
                descricao=$5,

                hora_entrada=$6,
                saida_almoco=$7,
                retorno_almoco=$8,
                hora_saida=$9,

                tolerancia_entrada=$10,
                tolerancia_saida=$11,

                carga_horaria=$12


            WHERE id=$13


            RETURNING *


        `,[


            vazio(nome),
            vazio(codigo),
            numeroOuNull(cbo_id),

            vazio(departamento),
            vazio(descricao),

            vazio(hora_entrada),
            vazio(saida_almoco),
            vazio(retorno_almoco),
            vazio(hora_saida),

            numeroOuNull(tolerancia_entrada),
            numeroOuNull(tolerancia_saida),

            numeroOuNull(carga_horaria),

            id


        ]);



        res.json({

            sucesso:true,

            cargo:resultado.rows[0]

        });



    }catch(err){


        console.error("Erro editar cargo:",err);


        res.status(500).json({

            sucesso:false,

            erro:err.message

        });


    }

}



// =====================================
// INATIVAR CARGO
// =====================================

async function inativarCargo(req,res){

    try{


        const resultado = await pool.query(`


            UPDATE cargos

            SET ativo=false

            WHERE id=$1

            RETURNING *


        `,[req.params.id]);



        res.json({

            sucesso:true,

            cargo:resultado.rows[0]

        });



    }catch(err){


        console.error("Erro inativar cargo:",err);


        res.status(500).json({

            erro:err.message

        });


    }

}



// =====================================
// EXCLUIR CARGO
// =====================================

async function excluirCargo(req,res){

    try{


        await pool.query(`

            DELETE FROM cargos

            WHERE id=$1

        `,[req.params.id]);



        res.json({

            sucesso:true

        });



    }catch(err){


        console.error("Erro excluir cargo:",err);


        res.status(500).json({

            erro:err.message

        });


    }

}



// =====================================

module.exports={

    listarCargos,
    cadastrarCargo,
    editarCargo,
    inativarCargo,
    excluirCargo

};