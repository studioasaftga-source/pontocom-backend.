const pool = require("../database");


// =====================================================
// FECHAR COMPETÊNCIA
// =====================================================

async function fecharCompetencia(req, res) {

    const client = await pool.connect();


    try {

        const {
            mes,
            ano
        } = req.body;



        if (!mes || !ano) {

            return res.status(400).json({

                sucesso:false,

                erro:"Informe o mês e o ano."

            });

        }



        const existe = await client.query(`

            SELECT id

            FROM fechamentos_ponto

            WHERE mes=$1

            AND ano=$2

        `,[
            mes,
            ano
        ]);



        if(existe.rows.length > 0){

            return res.status(400).json({

                sucesso:false,

                erro:"Esta competência já foi fechada."

            });

        }



        await client.query("BEGIN");



        const primeiroDia =
        `${ano}-${String(mes).padStart(2,"0")}-01`;



        const ultimoDia =
        new Date(ano,mes,0)
        .toISOString()
        .substring(0,10);



        const fechamento = await client.query(`

            INSERT INTO fechamentos_ponto

            (

                mes,

                ano,

                data_inicio,

                data_fim,

                status

            )

            VALUES

            (

                $1,

                $2,

                $3,

                $4,

                'AGUARDANDO_APROVACAO'

            )

            RETURNING id;


        `,
        [
            mes,
            ano,
            primeiroDia,
            ultimoDia
        ]);



        const fechamentoId =
        fechamento.rows[0].id;



        const funcionarios = await client.query(`

            SELECT id

            FROM funcionarios

            WHERE ativo=true

            ORDER BY nome


        `);



        for(const funcionario of funcionarios.rows){


            await client.query(`

                INSERT INTO fechamento_funcionarios

                (

                    fechamento_id,

                    funcionario_id,

                    status_aprovacao,

                    aprovado

                )


                VALUES

                (

                    $1,

                    $2,

                    'PENDENTE',

                    false

                )


            `,
            [
                fechamentoId,

                funcionario.id
            ]);


        }



        await client.query("COMMIT");



        res.json({

            sucesso:true,

            mensagem:"Fechamento criado com sucesso.",

            id:fechamentoId

        });



    }catch(err){


        await client.query("ROLLBACK");


        console.error(
            "Erro fechar competência:",
            err
        );


        res.status(500).json({

            sucesso:false,

            erro:err.message

        });


    }finally{


        client.release();

    }

}
// =====================================================
// CALCULAR FECHAMENTO
// =====================================================

async function calcularFechamento(req,res){

    const client = await pool.connect();


    try{


        const fechamentoId = req.params.id;


        await client.query("BEGIN");



        const fechamento = await client.query(`

            SELECT *

            FROM fechamentos_ponto

            WHERE id=$1


        `,
        [
            fechamentoId
        ]);



        if(fechamento.rows.length===0){


            await client.query("ROLLBACK");


            return res.status(404).json({

                sucesso:false,

                erro:"Fechamento não encontrado."

            });

        }



        const competencia =
        fechamento.rows[0];



        const funcionarios = await client.query(`

            SELECT


                f.id,

                f.nome,

                f.salario_base,


                c.carga_horaria,

                c.hora_entrada,

                c.saida_almoco,

                c.retorno_almoco,

                c.hora_saida


            FROM funcionarios f


            INNER JOIN cargos c

            ON c.id=f.cargo_id


            WHERE f.ativo=true


            ORDER BY f.nome


        `);



        let resultadoFuncionarios=[];



        for(const funcionario of funcionarios.rows){



            const registros = await client.query(`


                SELECT


                    data_registro,

                    hora_entrada,

                    tipo_registro


                FROM registros_ponto


                WHERE funcionario_id=$1


                AND data_registro BETWEEN $2 AND $3


                AND status_validacao='APROVADO'


                ORDER BY data_registro,hora_entrada


            `,
            [

                funcionario.id,

                competencia.data_inicio,

                competencia.data_fim

            ]);



            let dias={};



            registros.rows.forEach(registro=>{


                const data =
                registro.data_registro
                .toISOString()
                .substring(0,10);



                if(!dias[data]){


                    dias[data]={

                        entrada:null,

                        saidaAlmoco:null,

                        retorno:null,

                        saida:null

                    };

                }



                switch(registro.tipo_registro){


                    case "ENTRADA":

                        dias[data].entrada =
                        registro.hora_entrada;

                    break;



                    case "SAIDA_ALMOCO":

                        dias[data].saidaAlmoco =
                        registro.hora_entrada;

                    break;



                    case "RETORNO_ALMOCO":

                        dias[data].retorno =
                        registro.hora_entrada;

                    break;



                    case "SAIDA":

                        dias[data].saida =
                        registro.hora_entrada;

                    break;


                }



            });



            resultadoFuncionarios.push({

                funcionario,

                dias

            });



        }



        let resumoFuncionarios=[];



        for(const item of resultadoFuncionarios){



            let totalTrabalhado=0;

            let totalPrevisto=0;

            let totalExtra=0;

            let totalAtrasos=0;

            let totalFaltas=0;



            for(const data in item.dias){



                const dia=item.dias[data];



                const entrada =
                horaParaMinutos(dia.entrada);



                const saidaAlmoco =
                horaParaMinutos(dia.saidaAlmoco);



                const retorno =
                horaParaMinutos(dia.retorno);



                const saida =
                horaParaMinutos(dia.saida);



                const jornadaEntrada =
                horaParaMinutos(
                    item.funcionario.hora_entrada
                );



                const jornadaSaida =
                horaParaMinutos(
                    item.funcionario.hora_saida
                );



                const previsto =
                jornadaSaida -
                jornadaEntrada -
                60;



                totalPrevisto += previsto;



                if(entrada===null){


                    totalFaltas++;

                    continue;

                }



                if(

                    entrada!==null &&

                    saidaAlmoco!==null &&

                    retorno!==null &&

                    saida!==null

                ){


                    const manha =
                    saidaAlmoco -
                    entrada;



                    const tarde =
                    saida -
                    retorno;



                    const trabalhado =
                    manha+tarde;



                    totalTrabalhado += trabalhado;



                    if(trabalhado > previsto){

                        totalExtra +=
                        trabalhado-previsto;

                    }


                }



                if(entrada > jornadaEntrada){


                    totalAtrasos +=
                    entrada-jornadaEntrada;


                }



            }



            resumoFuncionarios.push({


                funcionario_id:
                item.funcionario.id,


                nome:
                item.funcionario.nome,


                horas_previstas:
                totalPrevisto,


                horas_trabalhadas:
                totalTrabalhado,


                horas_extras:
                totalExtra,


                atrasos:
                totalAtrasos,


                faltas:
                totalFaltas



            });



        }



        for(const resumo of resumoFuncionarios){



            await client.query(`


                UPDATE fechamento_funcionarios


                SET


                    horas_previstas=$1,

                    horas_trabalhadas=$2,

                    horas_extras=$3,

                    atrasos=$4,

                    faltas=$5,


                    status_aprovacao='PENDENTE'


                WHERE fechamento_id=$6

                AND funcionario_id=$7



            `,
            [

                resumo.horas_previstas,

                resumo.horas_trabalhadas,

                resumo.horas_extras,

                resumo.atrasos,

                resumo.faltas,

                fechamentoId,

                resumo.funcionario_id


            ]);

        }



        await client.query("COMMIT");



        res.json({

            sucesso:true,

            mensagem:
            "Cálculo do fechamento realizado.",


            funcionarios:
            resumoFuncionarios.length


        });



    }catch(err){


        await client.query("ROLLBACK");


        console.error(
            "Erro calcular fechamento:",
            err
        );


        res.status(500).json({

            sucesso:false,

            erro:err.message

        });



    }finally{


        client.release();

    }


}
// =====================================================
// CONSULTAR FECHAMENTO COMPLETO
// =====================================================

async function consultarFechamento(req,res){

    try{


        const id=req.params.id;



        const fechamento = await pool.query(`


            SELECT *


            FROM fechamentos_ponto


            WHERE id=$1



        `,
        [
            id
        ]);



        if(fechamento.rows.length===0){


            return res.status(404).json({

                sucesso:false,

                erro:"Fechamento não encontrado."

            });

        }



        const funcionarios = await pool.query(`


            SELECT


                ff.funcionario_id,


                f.nome,


                ff.horas_previstas,


                ff.horas_trabalhadas,


                ff.horas_extras,


                ff.atrasos,


                ff.faltas,


                ff.status_aprovacao,


                ff.aprovado



            FROM fechamento_funcionarios ff



            INNER JOIN funcionarios f


            ON f.id=ff.funcionario_id



            WHERE ff.fechamento_id=$1



            ORDER BY f.nome



        `,
        [
            id
        ]);




        res.json({


            sucesso:true,


            fechamento:
            fechamento.rows[0],



            funcionarios:
            funcionarios.rows



        });



    }catch(err){


        console.error(
            "Erro consultar fechamento:",
            err
        );


        res.status(500).json({

            sucesso:false,

            erro:err.message

        });


    }

}






// =====================================================
// APROVAR FUNCIONÁRIO
// =====================================================

async function aprovarFuncionario(req,res){


    try{


        const {

            id,

            funcionarioId

        } = req.params;



        await pool.query(`


            UPDATE fechamento_funcionarios


            SET


                status_aprovacao='APROVADO',


                aprovado=true,


                aprovado_em=CURRENT_TIMESTAMP



            WHERE fechamento_id=$1


            AND funcionario_id=$2



        `,
        [

            id,

            funcionarioId

        ]);




        res.json({


            sucesso:true,


            mensagem:
            "Funcionário aprovado."



        });



    }catch(err){


        console.error(
            "Erro aprovar funcionário:",
            err
        );


        res.status(500).json({

            sucesso:false,

            erro:err.message

        });


    }


}






// =====================================================
// FINALIZAR FECHAMENTO COMPLETO
// =====================================================

async function finalizarFechamento(req,res){


    const client = await pool.connect();



    try{


        const id=req.params.id;



        await client.query("BEGIN");




        await client.query(`


            UPDATE fechamento_funcionarios


            SET


                status_aprovacao='APROVADO',


                aprovado=true,


                aprovado_em=CURRENT_TIMESTAMP



            WHERE fechamento_id=$1



        `,
        [
            id
        ]);





        await client.query(`


            UPDATE fechamentos_ponto


            SET


                status='APROVADO'



            WHERE id=$1



        `,
        [
            id
        ]);





        await client.query("COMMIT");




        res.json({


            sucesso:true,


            mensagem:
            "Fechamento finalizado com sucesso."



        });



    }catch(err){


        await client.query("ROLLBACK");



        console.error(
            "Erro finalizar fechamento:",
            err
        );


        res.status(500).json({

            sucesso:false,

            erro:err.message

        });



    }finally{


        client.release();

    }


}
// =====================================================
// CONSULTAR FECHAMENTO COMPLETO
// =====================================================

async function consultarFechamento(req,res){

    try{


        const id=req.params.id;



        const fechamento = await pool.query(`


            SELECT *


            FROM fechamentos_ponto


            WHERE id=$1



        `,
        [
            id
        ]);



        if(fechamento.rows.length===0){


            return res.status(404).json({

                sucesso:false,

                erro:"Fechamento não encontrado."

            });

        }



        const funcionarios = await pool.query(`


            SELECT


                ff.funcionario_id,


                f.nome,


                ff.horas_previstas,


                ff.horas_trabalhadas,


                ff.horas_extras,


                ff.atrasos,


                ff.faltas,


                ff.status_aprovacao,


                ff.aprovado



            FROM fechamento_funcionarios ff



            INNER JOIN funcionarios f


            ON f.id=ff.funcionario_id



            WHERE ff.fechamento_id=$1



            ORDER BY f.nome



        `,
        [
            id
        ]);




        res.json({


            sucesso:true,


            fechamento:
            fechamento.rows[0],



            funcionarios:
            funcionarios.rows



        });



    }catch(err){


        console.error(
            "Erro consultar fechamento:",
            err
        );


        res.status(500).json({

            sucesso:false,

            erro:err.message

        });


    }

}






// =====================================================
// APROVAR FUNCIONÁRIO
// =====================================================

async function aprovarFuncionario(req,res){


    try{


        const {

            id,

            funcionarioId

        } = req.params;



        await pool.query(`


            UPDATE fechamento_funcionarios


            SET


                status_aprovacao='APROVADO',


                aprovado=true,


                aprovado_em=CURRENT_TIMESTAMP



            WHERE fechamento_id=$1


            AND funcionario_id=$2



        `,
        [

            id,

            funcionarioId

        ]);




        res.json({


            sucesso:true,


            mensagem:
            "Funcionário aprovado."



        });



    }catch(err){


        console.error(
            "Erro aprovar funcionário:",
            err
        );


        res.status(500).json({

            sucesso:false,

            erro:err.message

        });


    }


}






// =====================================================
// FINALIZAR FECHAMENTO COMPLETO
// =====================================================

async function finalizarFechamento(req,res){


    const client = await pool.connect();



    try{


        const id=req.params.id;



        await client.query("BEGIN");




        await client.query(`


            UPDATE fechamento_funcionarios


            SET


                status_aprovacao='APROVADO',


                aprovado=true,


                aprovado_em=CURRENT_TIMESTAMP



            WHERE fechamento_id=$1



        `,
        [
            id
        ]);





        await client.query(`


            UPDATE fechamentos_ponto


            SET


                status='APROVADO'



            WHERE id=$1



        `,
        [
            id
        ]);





        await client.query("COMMIT");




        res.json({


            sucesso:true,


            mensagem:
            "Fechamento finalizado com sucesso."



        });



    }catch(err){


        await client.query("ROLLBACK");



        console.error(
            "Erro finalizar fechamento:",
            err
        );


        res.status(500).json({

            sucesso:false,

            erro:err.message

        });



    }finally{


        client.release();

    }


}
module.exports = {

    fecharCompetencia,

    calcularFechamento,

    consultarFechamento,

    aprovarFuncionario,

    finalizarFechamento

};