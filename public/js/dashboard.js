// ===================================
// PONTOCOM RH - DASHBOARD JS
// ===================================

const API_URL = "https://pontocom-backend.onrender.com";

async function carregarDashboard(){

    try{

        // ================================
        // RESUMO GERAL
        // ================================

        const resposta = await fetch(`${API_URL}/api/rh/dashboard`);

        const dados = await resposta.json();


        document.getElementById("totalFuncionarios").innerText =
            dados.funcionarios || 0;


        document.getElementById("totalCargos").innerText =
            dados.cargos || 0;


        document.getElementById("totalBatidas").innerText =
            dados.batidasHoje || 0;


        document.getElementById("totalFechamentos").innerText =
            dados.fechamentos || 0;



        // ================================
        // ÚLTIMAS BATIDAS
        // ================================

        const tabelaBatidas =
            document.getElementById("tabelaBatidas");


        tabelaBatidas.innerHTML="";


        if(dados.ultimasBatidas && dados.ultimasBatidas.length){


            dados.ultimasBatidas.forEach(b=>{


                tabelaBatidas.innerHTML += `

                <tr>

                    <td>${b.nome || ""}</td>

                    <td>${b.tipo_registro || ""}</td>

                    <td>${b.hora_entrada || ""}</td>

                    <td>
                        ${b.status_validacao || "OK"}
                    </td>

                </tr>

                `;


            });


        }else{


            tabelaBatidas.innerHTML = `

            <tr>

                <td colspan="4">
                    Nenhuma batida encontrada
                </td>

            </tr>

            `;

        }




        // ================================
        // SEM BATIDA HOJE
        // ================================


        const tabelaSemBatida =
            document.getElementById("tabelaSemBatida");


        tabelaSemBatida.innerHTML="";


        if(dados.semBatidaHoje && dados.semBatidaHoje.length){


            dados.semBatidaHoje.forEach(f=>{


                tabelaSemBatida.innerHTML += `

                <tr>

                    <td>${f.nome}</td>

                    <td>${f.cargo}</td>

                </tr>

                `;


            });


        }else{


            tabelaSemBatida.innerHTML=`

            <tr>

                <td colspan="2">
                    Todos registraram ponto hoje
                </td>

            </tr>

            `;

        }



    }
    catch(erro){

        console.error(
            "Erro ao carregar dashboard:",
            erro
        );

    }


}



// inicia

carregarDashboard();