// =====================================
// PONTOCOM RH - FUNCIONÁRIOS
// =====================================

// ============================================================
// CONFIGURAÇÃO DA API (AUTOMÁTICA)
// ============================================================
let API_URL = "";

if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    API_URL = "http://localhost:3000";
} else {
    API_URL = "https://pontocom-backend.onrender.com";
}
let listaCargosCache = []; // Guarda os cargos em memória para consultar a carga horária

// Função principal de inicialização
async function inicializarTelaFuncionarios() {
    await carregarCargosSelect();
    await carregarFuncionarios();
    configurarEventosCargo();
}

// 1. CARREGAR CARGOS NO SELECT
async function carregarCargosSelect() {
    const selectCargo = document.getElementById("cargo_id");
    if (!selectCargo) return;

    try {
        let resposta = await fetch(`${API_URL}/api/cargos`);
        if (!resposta.ok) resposta = await fetch(`${API_URL}/api/rh/cargos`); 
        if (!resposta.ok) throw new Error("Erro ao buscar cargos");

        const cargos = await resposta.json();
        listaCargosCache = Array.isArray(cargos) ? cargos : [];
        
        selectCargo.innerHTML = '<option value="">Selecione o cargo</option>';

        listaCargosCache.forEach(c => {
            const nomeCargo = c.nome || c.nome_interno || c.cargo_nome || c.cargo || 'Cargo sem nome';
            selectCargo.innerHTML += `<option value="${c.id}">${nomeCargo}</option>`;
        });
    } catch (erro) {
        console.error("Erro ao carregar cargos:", erro);
        selectCargo.innerHTML = '<option value="">Erro ao carregar cargos</option>';
    }
}

// Atualiza a carga horária automaticamente ao selecionar o cargo no dropdown
function configurarEventosCargo() {
    const selectCargo = document.getElementById("cargo_id");
    if (!selectCargo) return;

    // Remove ouvintes antigos criando um novo clone para evitar duplicidade no SPA
    const novoSelect = selectCargo.cloneNode(true);
    selectCargo.parentNode.replaceChild(novoSelect, selectCargo);

    novoSelect.addEventListener("change", (e) => {
        const cargoIdSelecionado = parseInt(e.target.value, 10);
        const cargoEncontrado = listaCargosCache.find(c => c.id === cargoIdSelecionado);

        const inputCarga = document.getElementById("carga_horaria_mensal");
        if (inputCarga) {
            if (cargoEncontrado && cargoEncontrado.carga_horaria) {
                inputCarga.value = cargoEncontrado.carga_horaria;
            } else {
                inputCarga.value = 220; // Padrão
            }
        }
    });
}

// 2. CARREGAR LISTA DE FUNCIONÁRIOS
async function carregarFuncionarios() {
    const tabela = document.getElementById("listaFuncionarios");
    if (!tabela) return;

    try {
        let resposta = await fetch(`${API_URL}/api/funcionarios`);
        if (!resposta.ok) resposta = await fetch(`${API_URL}/api/rh/funcionarios`);
        if (!resposta.ok) throw new Error("Erro ao buscar funcionários");

        const funcionarios = await resposta.json();
        tabela.innerHTML = "";

        if (!Array.isArray(funcionarios) || funcionarios.length === 0) {
            tabela.innerHTML = `<tr><td colspan="7" style="text-align: center;">Nenhum funcionário encontrado.</td></tr>`;
            return;
        }

        funcionarios.forEach(f => {
            const salarioVal = parseFloat(f.salario_base || f.salario || 0);
            const salarioFormatado = salarioVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            tabela.innerHTML += `
                <tr>
                    <td><strong>${f.nome || '--'}</strong></td>
                    <td>${f.cpf || '--'}</td>
                    <td>${f.pis_pasep || f.pis || '--'}</td>
                    <td>${f.cargo_nome || 'Sem Cargo'}</td>
                    <td>${salarioFormatado}</td>
                    <td>
                        <span class="status ${f.ativo === false ? 'status-inativo' : 'status-ativo'}">
                            ${f.ativo === false ? 'INATIVO' : 'ATIVO'}
                        </span>
                    </td>
                    <td>
                        <button onclick='preencherEdicao(${JSON.stringify(f).replace(/'/g, "&#39;")})' style="cursor:pointer; background:none; border:none; color:#38bdf8; font-weight:bold;">✏️ Editar</button>
                    </td>
                </tr>
            `;
        });
    } catch (erro) {
        console.error("Erro ao carregar lista:", erro);
        tabela.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #f43f5e;">Erro de conexão com o banco.</td></tr>`;
    }
}

// 3. SALVAR / ATUALIZAR FUNCIONÁRIO
async function salvarFuncionario() {
    try {
        const id = document.getElementById("funcionario_id").value;
        const nome = document.getElementById("nome").value.trim();
        const cpf = document.getElementById("cpf").value.trim();

        if (!nome || !cpf) {
            alert("Preencha pelo menos o Nome e o CPF!");
            return;
        }

        let rawSalario = document.getElementById("salario_base").value || "0";
        let cargoIdRaw = document.getElementById("cargo_id").value;
        const cargoFinaID = parseInt(cargoIdRaw, 10) || null;

        const dados = {
            nome: nome,
            cpf: cpf,
            rg: document.getElementById("rg").value,
            cargo_id: cargoFinaID,
            pis: document.getElementById("pis").value,
            salario: rawSalario, 
            banco: document.getElementById("banco").value,
            conta: document.getElementById("conta_bancaria").value, 
            pix: document.getElementById("chave_pix").value, 
            telefone: document.getElementById("telefone").value,
            email: document.getElementById("email").value,
            departamento: "", 
            agencia: "",
            data_nascimento: document.getElementById("data_nascimento").value || null,
            ctps: document.getElementById("ctps").value,
            dependentes: document.getElementById("dependentes").value || 0,
            tipo_contrato: document.getElementById("tipo_contrato").value,
            data_admissao: document.getElementById("data_admissao").value || null,
            carga_horaria_mensal: document.getElementById("carga_horaria_mensal").value || 220,
            optante_vt: document.getElementById("optante_vt").value,
            adicional_tipo: document.getElementById("adicional_tipo").value
        };

        let url = id ? `${API_URL}/api/funcionarios/${id}` : `${API_URL}/api/funcionarios`;
        let metodo = id ? "PUT" : "POST";

        let resposta = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });

        if (resposta.status === 404) {
            url = id ? `${API_URL}/api/rh/funcionarios/${id}` : `${API_URL}/api/rh/funcionarios`;
            resposta = await fetch(url, {
                method: metodo,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dados)
            });
        }

        if (!resposta.ok) {
            const errData = await resposta.json().catch(() => ({}));
            throw new Error(errData.erro || errData.mensagem || "Falha ao processar no servidor");
        }

        alert(id ? "Funcionário atualizado com sucesso!" : "Funcionário cadastrado com sucesso!");
        limparFormulario();
        carregarFuncionarios();
        
    } catch (erro) {
        console.error("Erro no código:", erro);
        alert("Atenção, ocorreu um erro: " + erro.message);
    }
}

// 4. PREENCHER EDIÇÃO NA TELA
function preencherEdicao(f) {
    document.getElementById("funcionario_id").value = f.id || "";
    document.getElementById("nome").value = f.nome || "";
    document.getElementById("cpf").value = f.cpf || "";
    document.getElementById("rg").value = f.rg || "";
    document.getElementById("pis").value = f.pis_pasep || f.pis || "";
    
    const selectCargo = document.getElementById("cargo_id");
    if (selectCargo) {
        selectCargo.value = f.cargo_id || "";
        selectCargo.dispatchEvent(new Event('change'));
    }

    let salarioParaTela = f.salario_base || f.salario || "";
    if (salarioParaTela) {
        salarioParaTela = parseFloat(salarioParaTela).toFixed(2).replace('.', ',');
    }
    document.getElementById("salario_base").value = salarioParaTela;
    
    document.getElementById("banco").value = f.banco || "";
    document.getElementById("conta_bancaria").value = f.conta_bancaria || f.conta || "";
    document.getElementById("chave_pix").value = f.pix || f.chave_pix || "";
    document.getElementById("telefone").value = f.telefone || "";
    document.getElementById("email").value = f.email || "";
    
    document.getElementById("data_nascimento").value = f.data_nascimento ? f.data_nascimento.split('T')[0] : "";
    document.getElementById("ctps").value = f.ctps || "";
    document.getElementById("dependentes").value = f.dependentes || 0;
    document.getElementById("tipo_contrato").value = f.tipo_contrato || "CLT";
    document.getElementById("data_admissao").value = f.data_admissao ? f.data_admissao.split('T')[0] : "";
    
    if (f.carga_horaria_mensal) {
        document.getElementById("carga_horaria_mensal").value = f.carga_horaria_mensal;
    }
    
    document.getElementById("optante_vt").value = f.optante_vt || "SIM";
    document.getElementById("adicional_tipo").value = f.adicional_tipo || "NENHUM";

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 5. LIMPAR FORMULÁRIO
function limparFormulario() {
    document.getElementById("funcionario_id").value = "";
    const inputs = document.querySelectorAll('.conteudo input, .conteudo select');
    inputs.forEach(i => {
        if (i.id === 'carga_horaria_mensal') i.value = 220;
        else if (i.id === 'dependentes') i.value = 0;
        else if (i.id === 'status') i.value = 'ATIVO';
        else if (i.id === 'optante_vt') i.value = 'SIM';
        else if (i.id === 'tipo_contrato') i.value = 'CLT';
        else if (i.id === 'adicional_tipo') i.value = 'NENHUM';
        else if (i.id !== 'buscaFuncionario') i.value = '';
    });
}

// 6. FILTRO DE BUSCA
function filtrarFuncionarios() {
    const termo = document.getElementById("buscaFuncionario").value.toLowerCase();
    const linhas = document.querySelectorAll("#listaFuncionarios tr");
    linhas.forEach(linha => {
        const texto = linha.innerText.toLowerCase();
        linha.style.display = texto.includes(termo) ? "" : "none";
    });
}

// =====================================
// AUTO-INICIALIZADOR INTELIGENTE (SPA FIX)
// =====================================
(function checarEMontar() {
    if (document.getElementById("listaFuncionarios")) {
        inicializarTelaFuncionarios();
    } else {
        setTimeout(checarEMontar, 200); // Tenta a cada 200ms até encontrar os elementos na tela
    }
})();