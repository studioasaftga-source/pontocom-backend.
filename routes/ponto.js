const express = require('express');
const router = express.Router();

const pool = require('../database');

function vazio(valor) {

    return valor === undefined || valor === ""
        ? null
        : valor;

}

function formatarHora(dataISO) {

    if (!dataISO) return "--:--";

    const d = new Date(dataISO);

    return d.toLocaleTimeString('pt-BR', {

        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'

    });
}
// ==========================================
// GET /api/ponto
// CONSULTA GERAL - PAINEL RH
// ==========================================

router.get("/", async (req,res)=>{

    const funcionarioId =
        req.query.funcionarioId ||
        req.query.funcionario_id;


    try {

        let query = `

            SELECT

                p.*,

                f.nome AS funcionario_nome


            FROM registros_ponto p


            LEFT JOIN funcionarios f

                ON f.id = p.funcionario_id



            WHERE DATE(
                p.data_hora AT TIME ZONE 'UTC'
                AT TIME ZONE 'America/Sao_Paulo'
            )
            =
            CURRENT_DATE


        `;


        let params = [];


        if(funcionarioId){


            query += `
                AND p.funcionario_id = $1
            `;


            params.push(funcionarioId);

        }


        query += `

            ORDER BY p.data_hora DESC;

        `;


        const resultado =
            await pool.query(query,params);


        res.json(resultado.rows);


    }catch(erro){


        console.error(
            "Erro consulta geral:",
            erro
        );


        res.status(500).json({

            erro: erro.message

        });


    }

});



// ==========================================
// MOTOR DE JORNADA
// GET /api/ponto/hoje
// ==========================================

async function buscarHojeHandler(req,res){


    const idFinal =

        req.params.funcionario_id ||

        req.query.funcionarioId ||

        req.query.funcionario_id;



    if(!idFinal){


        return res.status(400).json({

            erro:
            "Informe o ID do funcionário."

        });


    }



    try {


        const query = `


            SELECT *

            FROM registros_ponto


            WHERE funcionario_id = $1


            ORDER BY data_hora ASC;



        `;



        const resultado =
            await pool.query(
                query,
                [idFinal]
            );



        const todos =
            resultado.rows;



        const hoje =
            todos.filter(r=>{


                const data =
                    new Date(r.data_hora);



                const agora =
                    new Date();



                return (

                    data.getDate()
                    ===
                    agora.getDate()


                    &&


                    data.getMonth()
                    ===
                    agora.getMonth()


                    &&


                    data.getFullYear()
                    ===
                    agora.getFullYear()


                );


            });


        let motor = {


            entrada:null,

            saida_almoco:null,

            retorno_almoco:null,

            saida:null,


            quantidade_batidas:
                hoje.length,


            horas_trabalhadas:
                "00:00",


            horas_restantes:
                "08:00",


            proxima:
                "ENTRADA"


        };



        // =====================================
        // DISTRIBUI AS BATIDAS NO MOTOR
        // =====================================


        hoje.forEach((registro,index)=>{


            const hora =
                formatarHora(
                    registro.data_hora
                );



            switch(index){



                case 0:

                    motor.entrada = hora;

                    motor.proxima =
                        "SAIDA_ALMOCO";

                    break;



                case 1:

                    motor.saida_almoco = hora;

                    motor.proxima =
                        "RETORNO_ALMOCO";

                    break;



                case 2:

                    motor.retorno_almoco = hora;

                    motor.proxima =
                        "SAIDA";

                    break;



                case 3:

                    motor.saida = hora;

                    motor.proxima =
                        "ENCERRADO";

                    break;



            }



        });






        // =====================================
        // CALCULO SIMPLES DE HORAS TRABALHADAS
        // =====================================


        if(
            motor.entrada &&
            motor.saida
        ){


            const inicio =
                hoje[0].data_hora;



            const fim =
                hoje[3].data_hora;



            const minutos =
                Math.floor(
                    (
                        new Date(fim)
                        -
                        new Date(inicio)
                    )
                    /
                    60000
                );



            const h =
                Math.floor(
                    minutos / 60
                );



            const m =
                minutos % 60;



            motor.horas_trabalhadas =

                `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;



            motor.horas_restantes =
                "00:00";



        }



        else if(
            motor.entrada
        ){



            const inicio =
                new Date(
                    hoje[0].data_hora
                );



            const agora =
                new Date();



            const minutos =
                Math.floor(
                    (
                        agora - inicio
                    )
                    /
                    60000
                );



            const h =
                Math.floor(
                    minutos / 60
                );



            const m =
                minutos % 60;



            motor.horas_trabalhadas =

                `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;



            const restante =
                480 - minutos;



            if(restante > 0){


                motor.horas_restantes =

                    `${String(
                        Math.floor(restante / 60)
                    ).padStart(2,'0')}:${String(
                        restante % 60
                    ).padStart(2,'0')}`;


            }else{


                motor.horas_restantes =
                    "00:00";


            }


        }




        res.json(motor);



    }catch(erro){


        console.error(
            "Erro motor jornada:",
            erro
        );



        res.status(500).json({

            erro:
                erro.message

        });


    }


}



router.get(
    "/hoje",
    buscarHojeHandler
);



router.get(
    "/hoje/:funcionario_id",
    buscarHojeHandler
);
// ==========================================
// CONSULTA MENSAL
// ==========================================

router.get(
    "/:funcionario_id/:mes/:ano",
    async(req,res)=>{


        const {

            funcionario_id,
            mes,
            ano

        } = req.params;



        try{


            const query = `


                SELECT

                    *,

                    data_hora AS data_registro


                FROM registros_ponto


                WHERE funcionario_id = $1


                AND EXTRACT(
                    MONTH FROM data_hora
                    AT TIME ZONE 'America/Sao_Paulo'
                )
                =
                $2::numeric



                AND EXTRACT(
                    YEAR FROM data_hora
                    AT TIME ZONE 'America/Sao_Paulo'
                )
                =
                $3::numeric



                ORDER BY data_hora ASC;



            `;



            const resultado =

                await pool.query(

                    query,

                    [

                        funcionario_id,

                        mes,

                        ano

                    ]

                );



            res.json(resultado.rows);



        }catch(erro){


            console.error(

                "Erro consulta mensal:",

                erro

            );



            res.status(500).json({

                erro:

                    erro.message

            });



        }


    }
);



// ==========================================
// POST /api/ponto
// REGISTRO DE PONTO
// ==========================================

async function registrarPontoHandler(req,res){



    const {

        funcionario_id,

        funcionarioId,

        tipo,

        latitude,

        longitude,

        foto_url,

        status_validacao


    } = req.body;



    const idFinal =

        funcionario_id || funcionarioId;




    if(!idFinal){


        return res.status(400).json({

            erro:

            "ID do funcionário é obrigatório."

        });


    }



    try {



        const funcCheck =


            await pool.query(


                `
                SELECT id,nome
                FROM funcionarios
                WHERE id=$1
                `,


                [idFinal]

            );



        if(funcCheck.rows.length===0){


            return res.status(404).json({

                erro:

                "Funcionário não encontrado."

            });


        }






        const hoje =


            await pool.query(


                `

                SELECT *

                FROM registros_ponto

                WHERE funcionario_id=$1


                AND DATE(

                    data_hora

                    AT TIME ZONE 'America/Sao_Paulo'

                )

                =

                DATE(

                    NOW()

                    AT TIME ZONE 'America/Sao_Paulo'

                )


                ORDER BY data_hora ASC;



                `,


                [idFinal]

            );





        let tipoAutomatico = tipo;



        if(!tipoAutomatico){


            switch(hoje.rows.length){


                case 0:

                    tipoAutomatico =

                    "ENTRADA";

                    break;



                case 1:

                    tipoAutomatico =

                    "SAIDA_ALMOCO";

                    break;



                case 2:

                    tipoAutomatico =

                    "RETORNO_ALMOCO";

                    break;



                case 3:

                    tipoAutomatico =

                    "SAIDA";

                    break;



                default:


                    return res.status(400).json({

                        erro:

                        "Expediente já encerrado."

                    });



            }


        }
        // ==========================================
// INSERÇÃO DO REGISTRO
// ==========================================


        const query = `

            INSERT INTO registros_ponto
            (
                funcionario_id,
                data_hora,
                coordenadas,
                tipo,
                status_validacao,
                origem,
                observacao
            )

            VALUES

            (
                $1,
                NOW(),
                $2,
                $3,
                $4,
                $5,
                $6
            )

            RETURNING *;

        `;



        const coordenadas =

            latitude && longitude

            ?

            `${latitude},${longitude}`

            :

            null;




        const valores=[


            idFinal,


            coordenadas,


            tipoAutomatico,


            vazio(status_validacao)

            ||

            "PENDENTE",


            "APP",


            "Registro realizado pelo aplicativo"


        ];





        const resultado =


            await pool.query(

                query,

                valores

            );





        console.log(

            "ENTROU NO PONTO.JS NOVO"

        );



        res.status(201).json({


            sucesso:true,


            mensagem:

            "Ponto registrado com sucesso!",


            registro:

            resultado.rows[0]


        });





    }catch(erro){



        console.error(

            "Erro registrar ponto:",

            erro

        );



        res.status(500).json({

            erro:

            erro.message

        });



    }


}



router.post(

    "/",

    registrarPontoHandler

);



router.post(

    "/registrar",

    registrarPontoHandler

);



// ==========================================
// RESET DE TESTES
// ==========================================


router.delete(

    "/reset-hoje",

    async(req,res)=>{


        const idFinal =


            req.query.funcionarioId ||


            req.query.funcionario_id;




        if(!idFinal){


            return res.status(400).json({

                erro:

                "ID do funcionário não informado."

            });


        }





        try{


            await pool.query(


                `

                DELETE FROM registros_ponto


                WHERE funcionario_id=$1


                AND DATE(


                    data_hora

                    AT TIME ZONE 'America/Sao_Paulo'


                )

                =


                DATE(


                    NOW()

                    AT TIME ZONE 'America/Sao_Paulo'


                );



                `,


                [idFinal]


            );






            res.json({


                sucesso:true,


                mensagem:

                "Batidas de hoje apagadas."


            });





        }catch(erro){



            console.error(

                "Erro reset:",

                erro

            );



            res.status(500).json({


                erro:

                erro.message


            });



        }


    }

);





module.exports = router;