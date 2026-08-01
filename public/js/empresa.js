// =====================================
// PONTOCOM RH
// EMPRESA
// =====================================

let empresaId = null;


// =====================================
// INICIALIZAÇÃO
// =====================================

document.addEventListener("DOMContentLoaded", () => {

    carregarEmpresa();

    document
        .getElementById("formEmpresa")
        .addEventListener("submit", salvarEmpresa);

    document
        .getElementById("cep")
        .addEventListener("blur", buscarCEP);

});


// =====================================
// CARREGAR EMPRESA
// =====================================

async function carregarEmpresa() {

    try {

        const resposta = await fetch("/api/rh/empresa");

        if (!resposta.ok)
            throw new Error();

        const empresa = await resposta.json();

        if (!empresa)
            return;

        empresaId = empresa.id;

        for (const campo in empresa) {

            const elemento = document.getElementById(campo);

            if (elemento) {

                elemento.value = empresa[campo] ?? "";

            }

        }

    }

    catch (erro) {

        console.error(erro);

        alert("Erro ao carregar empresa.");

    }

}


// =====================================
// SALVAR
// =====================================

async function salvarEmpresa(e) {

    e.preventDefault();

    const dados = {};

    document
        .querySelectorAll("input, textarea")
        .forEach(campo => {

            if (campo.type !== "file") {

                dados[campo.id] = campo.value;

            }

        });

    try {

        const resposta = await fetch(

            empresaId

                ? `/api/rh/empresa/${empresaId}`

                : "/api/rh/empresa",

            {

                method: empresaId ? "PUT" : "POST",

                headers: {

                    "Content-Type":"application/json"

                },

                body: JSON.stringify(dados)

            }

        );

        if (!resposta.ok)
            throw new Error();

        const empresa = await resposta.json();

        empresaId = empresa.id;

        alert("Empresa salva com sucesso.");

    }

    catch (erro) {

        console.error(erro);

        alert("Erro ao salvar empresa.");

    }

}


// =====================================
// BUSCAR CEP
// =====================================

async function buscarCEP() {

    const cep = document
        .getElementById("cep")
        .value
        .replace(/\D/g,"");

    if (cep.length !== 8)
        return;

    try {

        const resposta =
            await fetch(`https://viacep.com.br/ws/${cep}/json/`);

        const endereco = await resposta.json();

        if (endereco.erro)
            return;

        document.getElementById("endereco").value =
            endereco.logradouro || "";

        document.getElementById("bairro").value =
            endereco.bairro || "";

        document.getElementById("cidade").value =
            endereco.localidade || "";

        document.getElementById("estado").value =
            endereco.uf || "";

    }

    catch (erro) {

        console.error(erro);

    }

}


// =====================================
// MÁSCARA CNPJ
// =====================================

document
.getElementById("cnpj")
.addEventListener("input", function(){

    let v=this.value.replace(/\D/g,"");

    v=v.replace(/^(\d{2})(\d)/,"$1.$2");
    v=v.replace(/^(\d{2})\.(\d{3})(\d)/,"$1.$2.$3");
    v=v.replace(/\.(\d{3})(\d)/,".$1/$2");
    v=v.replace(/(\d{4})(\d)/,"$1-$2");

    this.value=v;

});


// =====================================
// MÁSCARA CPF
// =====================================

document
.getElementById("cpf_responsavel")
.addEventListener("input",function(){

    let v=this.value.replace(/\D/g,"");

    v=v.replace(/(\d{3})(\d)/,"$1.$2");
    v=v.replace(/(\d{3})\.(\d{3})(\d)/,"$1.$2.$3");
    v=v.replace(/\.(\d{3})(\d)/,".$1-$2");

    this.value=v;

});


// =====================================
// MÁSCARA TELEFONE
// =====================================

["telefone","celular"].forEach(id=>{

    document
    .getElementById(id)
    .addEventListener("input",function(){

        let v=this.value.replace(/\D/g,"");

        v=v.replace(/^(\d{2})(\d)/,"($1) $2");

        v=v.replace(/(\d)(\d{4})$/,"$1-$2");

        this.value=v;

    });

});