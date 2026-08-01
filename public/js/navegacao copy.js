// =====================================
// PONTOCOM RH
// NAVEGAÇÃO INTERNA DO DASHBOARD
// =====================================


async function carregarPagina(pagina){


    const area = document.getElementById("paginaInterna");


    if(!area){

        console.error(
            "Elemento paginaInterna não encontrado"
        );

        return;

    }



    try{


        const resposta = await fetch(
            `pages/${pagina}.html`
        );



        if(!resposta.ok){

            throw new Error(
                "Página não encontrada"
            );

        }



        const html = await resposta.text();



        area.innerHTML = html;



        // executa scripts da página carregada

        const scripts =
        area.querySelectorAll("script");



        scripts.forEach(script=>{


            const novoScript =
            document.createElement("script");



            if(script.src){


                novoScript.src =
                script.src;


            }else{


                novoScript.textContent =
                script.textContent;


            }



            document.body.appendChild(
                novoScript
            );


        });



    }
    catch(erro){


        console.error(
            "Erro ao carregar página:",
            erro
        );


        area.innerHTML = `

        <div class="card">

            <h2>
            Erro ao carregar módulo
            </h2>

            <p>
            ${erro.message}
            </p>

        </div>

        `;


    }


}



// =====================================
// CLIQUE NO MENU
// =====================================


document.addEventListener(
"DOMContentLoaded",
()=>{


const links =
document.querySelectorAll(
".menu a"
);



links.forEach(link=>{


    link.addEventListener(
    "click",
    function(e){



        const destino =
        this.getAttribute("href");



        // ignora links ainda não criados

        if(
            destino === "#" ||
            destino === null
        ){

            return;

        }



        // dashboard continua normal

        if(
            destino === "index.html"
        ){

            return;

        }



        e.preventDefault();



        const pagina =
        destino.replace(
            ".html",
            ""
        );



        carregarPagina(
            pagina
        );



        // marca menu ativo

        links.forEach(l=>
            l.classList.remove(
                "ativo"
            )
        );


        this.classList.add(
            "ativo"
        );



    });


});


});