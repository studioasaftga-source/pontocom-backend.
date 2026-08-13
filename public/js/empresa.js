// =====================================
// PONTOCOM RH - EMPRESA
// =====================================

let empresaId = null;
let listaDeEmpresas = []; // Guarda as empresas carregadas para facilitar a edição

// =====================================
// INICIALIZAÇÃO DA TELA
// =====================================
function inicializarTelaEmpresa() {
    // 1. Carrega as empresas e preenche a tabela
    listarEmpresas();

    // 2. Conecta o botão de Salvar ao Formulário
    const form = document.getElementById("formEmpresa");
    if (form) {
        form.onsubmit = salvarEmpresa;
    }

    // 3. Conecta a busca de CEP
    const cepInput = document.getElementById("cep");
    if (cepInput) {
        cepInput.onblur = buscarCEP;
    }

    // 4. Aplica as Máscaras
    aplicarMascaras();
}

// =====================================
// LISTAR EMPRESAS NA TABELA
// =====================================
async function listarEmpresas() {
    try {
        const resposta = await fetch("/api/rh/empresa");
        if (!resposta.ok) throw new Error("Erro ao buscar empresas");
        
        const dados = await resposta.json();
        
        // Garante que é uma lista (array), mesmo se a API retornar um objeto único
        listaDeEmpresas = Array.isArray(dados) ? dados : (dados ? [dados] : []);
        
        const tbody = document.getElementById("corpoTabelaEmpresas");
        if (!tbody) return;
        
        tbody.innerHTML = ""; // Limpa a tabela antes de preencher
        
        if (listaDeEmpresas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">Nenhuma empresa cadastrada.</td></tr>`;
            return;
        }

        // Cria uma linha na tabela para cada empresa do banco
        listaDeEmpresas.forEach((emp, index) => {
            const tr = document.createElement("tr");
            const local = emp.cidade ? `${emp.cidade}/${emp.estado || ''}` : '--';
            
            tr.innerHTML = `
                <td>${emp.razao_social || emp.nome_fantasia || 'Sem Nome'}</td>
                <td>${emp.cnpj || '--'}</td>
                <td>${local}</td>
                <td>${emp.telefone || emp.celular || '--'}</td>
                <td style="text-align: center;">
                    <button type="button" class="btn-acao btn-editar" onclick="editarEmpresa(${index})">Editar</button>
                    <button type="button" class="btn-acao btn-excluir" onclick="excluirEmpresa('${emp.id}')">Excluir</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (erro) {
        console.error(erro);
    }
}

// =====================================
// EDITAR EMPRESA (Joga os dados pro Form)
// =====================================
function editarEmpresa(index) {
    const empresa = listaDeEmpresas[index];
    if (!empresa) return;

    empresaId = empresa.id;

    // Preenche os campos do formulário
    for (const campo in empresa) {
        const elemento = document.getElementById(campo);
        if (elemento) {
            elemento.value = empresa[campo] ?? "";
        }
    }

    // Rola a tela para o topo suavemente
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Altera o texto do botão para indicar que é uma atualização
    const btnSalvar = document.getElementById("btnSalvarText");
    if (btnSalvar) btnSalvar.innerText = "Atualizar Empresa";
}

// =====================================
// EXCLUIR EMPRESA
// =====================================
async function excluirEmpresa(id) {
    if (!confirm("Tem certeza que deseja excluir esta empresa?")) return;

    try {
        const resposta = await fetch(`/api/rh/empresa/${id}`, {
            method: "DELETE"
        });

        if (!resposta.ok) throw new Error();

        alert("Empresa excluída com sucesso.");
        listarEmpresas(); // Atualiza a tabela na hora
    } catch (erro) {
        console.error(erro);
        alert("Erro ao excluir empresa.");
    }
}

// =====================================
// SALVAR OU ATUALIZAR
// =====================================
async function salvarEmpresa(e) {
    e.preventDefault(); // Impede o formulário de atualizar a página
    
    const dados = {};
    document.querySelectorAll("#formEmpresa input, #formEmpresa textarea").forEach(campo => {
        if (campo.type !== "file" && campo.id) {
            dados[campo.id] = campo.value;
        }
    });
    
    try {
        const resposta = await fetch(
            empresaId ? `/api/rh/empresa/${empresaId}` : "/api/rh/empresa",
            {
                method: empresaId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dados)
            }
        );
        
        if (!resposta.ok) throw new Error();
        
        alert(empresaId ? "Empresa atualizada com sucesso!" : "Empresa salva com sucesso no Supabase!");
        
        limparFormularioEmpresa(); // Limpa o formulário após salvar
        listarEmpresas(); // Atualiza a tabela de imediato
        
    } catch (erro) {
        console.error(erro);
        alert("Erro ao salvar empresa.");
    }
}

// =====================================
// BUSCAR CEP
// =====================================
async function buscarCEP() {
    const cep = document.getElementById("cep").value.replace(/\D/g, "");
    if (cep.length !== 8) return;
    
    try {
        const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const endereco = await resposta.json();
        
        if (endereco.erro) return;
        
        document.getElementById("endereco").value = endereco.logradouro || "";
        document.getElementById("bairro").value = endereco.bairro || "";
        document.getElementById("cidade").value = endereco.localidade || "";
        document.getElementById("estado").value = endereco.uf || "";
    } catch (erro) {
        console.error(erro);
    }
}

// =====================================
// APLICAR MÁSCARAS
// =====================================
function aplicarMascaras() {
    const cnpj = document.getElementById("cnpj");
    if (cnpj) {
        cnpj.oninput = function () {
            let v = this.value.replace(/\D/g, "");
            v = v.replace(/^(\d{2})(\d)/, "$1.$2");
            v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
            v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
            v = v.replace(/(\d{4})(\d)/, "$1-$2");
            this.value = v;
        };
    }

    const cpf = document.getElementById("cpf_responsavel");
    if (cpf) {
        cpf.oninput = function () {
            let v = this.value.replace(/\D/g, "");
            v = v.replace(/(\d{3})(\d)/, "$1.$2");
            v = v.replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3");
            v = v.replace(/\.(\d{3})(\d)/, ".$1-$2");
            this.value = v;
        };
    }

    ["telefone", "celular"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.oninput = function () {
                let v = this.value.replace(/\D/g, "");
                v = v.replace(/^(\d{2})(\d)/, "($1) $2");
                v = v.replace(/(\d)(\d{4})$/, "$1-$2");
                this.value = v;
            };
        }
    });
}

// =====================================
// LIMPAR FORMULÁRIO
// =====================================
function limparFormularioEmpresa() {
    empresaId = null;
    const form = document.getElementById("formEmpresa");
    if (form) form.reset();

    // Devolve o texto padrão para o botão de salvar
    const btnSalvar = document.getElementById("btnSalvarText");
    if (btnSalvar) btnSalvar.innerText = "Salvar Empresa";
}