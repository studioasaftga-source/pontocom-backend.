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
// CONVERTER SALÁRIO
// =====================================

function converterSalario(valor){

    if(valor === undefined || valor === ""){
        return null;
    }


    let salario = Number(
        String(valor)
        .replace(/\./g,"")
        .replace(",",".")
    );


    if(isNaN(salario)){
        return null;
    }


    return salario;

}



// =====================================
// LISTAR FUNCIONÁRIOS ATIVOS
// =====================================

async function listarFuncionarios(req,res){

    try{


        const resultado = await pool.query(`


            SELECT

                f.*,

                c.nome AS cargo_nome,

                c.hora_entrada,

                c.hora_saida,

                c.tolerancia_entrada,

                c.carga_horaria


            FROM funcionarios f


            LEFT JOIN cargos c

            ON f.cargo_id = c.id


            WHERE f.ativo=true


            ORDER BY f.nome


        `);



        res.json(resultado.rows);



    }catch(err){


        console.error("Erro listar funcionarios:",err);


        res.status(500).json({

            erro:err.message

        });


    }

}



// =====================================
// CADASTRAR FUNCIONÁRIO
// =====================================

async function cadastrarFuncionario(req,res){

    try{


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
            email

        } = req.body;



        const resultado = await pool.query(`


            INSERT INTO funcionarios

            (

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

                ativo

            )


            VALUES

            (

                $1,$2,$3,$4,$5,$6,$7,
                $8,$9,$10,$11,$12,$13,
                true

            )


            RETURNING *



        `,[


            vazio(nome),
            vazio(cpf),
            vazio(rg),
            numeroOuNull(cargo_id),
            vazio(departamento),
            vazio(pis),

            converterSalario(salario),

            vazio(banco),
            vazio(agencia),
            vazio(conta),

            vazio(pix),
            vazio(telefone),
            vazio(email)


        ]);



        res.json({

            sucesso:true,

            funcionario:resultado.rows[0]

        });



    }catch(err){


        console.error("Erro cadastrar funcionário:",err);


        res.status(500).json({

            sucesso:false,

            erro:err.message

        });


    }

}



// =====================================
// EDITAR FUNCIONÁRIO
// =====================================

async function editarFuncionario(req,res){

    try{


        const id=req.params.id;



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
            email

        } = req.body;



        const resultado = await pool.query(`


            UPDATE funcionarios SET


                nome=$1,

                cpf=$2,

                rg=$3,

                cargo_id=$4,

                departamento=$5,

                pis_pasep=$6,

                salario_base=$7,

                banco=$8,

                banco_agencia=$9,

                conta_bancaria=$10,

                pix=$11,

                telefone=$12,

                email=$13


            WHERE id=$14


            RETURNING *



        `,[


            vazio(nome),
            vazio(cpf),
            vazio(rg),

            numeroOuNull(cargo_id),

            vazio(departamento),

            vazio(pis),

            converterSalario(salario),

            vazio(banco),

            vazio(agencia),

            vazio(conta),

            vazio(pix),

            vazio(telefone),

            vazio(email),

            id


        ]);



        res.json({

            sucesso:true,

            funcionario:resultado.rows[0]

        });



    }catch(err){


        console.error("Erro editar funcionário:",err);


        res.status(500).json({

            sucesso:false,

            erro:err.message

        });


    }

}



// =====================================
// TODOS FUNCIONÁRIOS
// HISTÓRICO
// =====================================

async function listarTodosFuncionarios(req,res){

    try{


        const resultado = await pool.query(`


            SELECT

                f.*,

                c.nome AS cargo_nome


            FROM funcionarios f


            LEFT JOIN cargos c

            ON f.cargo_id=c.id


            ORDER BY f.nome


        `);



        res.json(resultado.rows);



    }catch(err){


        console.error("Erro histórico funcionários:",err);


        res.status(500).json({

            erro:err.message

        });


    }

}



// =====================================
// INATIVAR FUNCIONÁRIO
// =====================================

async function inativarFuncionario(req,res){

    try{


        const resultado = await pool.query(`


            UPDATE funcionarios

            SET

                ativo=false,

                data_demissao=CURRENT_DATE


            WHERE id=$1


            RETURNING *



        `,[req.params.id]);



        res.json({

            sucesso:true,

            funcionario:resultado.rows[0]

        });



    }catch(err){


        console.error("Erro inativar funcionário:",err);


        res.status(500).json({

            sucesso:false,

            erro:err.message

        });


    }

}



// =====================================
// EXCLUIR FUNCIONÁRIO
// =====================================

async function excluirFuncionario(req,res){

    try{


        await pool.query(`


            DELETE FROM funcionarios

            WHERE id=$1



        `,[req.params.id]);



        res.json({

            sucesso:true

        });



    }catch(err){


        console.error("Erro excluir funcionário:",err);


        res.status(500).json({

            sucesso:false,

            erro:err.message

        });


    }

}



// =====================================

module.exports = {

    listarFuncionarios,

    cadastrarFuncionario,

    editarFuncionario,

    listarTodosFuncionarios,

    inativarFuncionario,

    excluirFuncionario

};