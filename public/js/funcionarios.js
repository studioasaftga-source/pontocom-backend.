// 1. CARREGAR CARGOS NO SELECT
async function carregarCargosSelect() {
    const selectCargo = document.getElementById("cargo_id");
    if (!selectCargo) return;

    try {
        let resposta = await fetch("/api/cargos");
        if (!resposta.ok) resposta = await fetch("/api/rh/cargos"); 
        if (!resposta.ok) throw new Error("Erro ao buscar cargos");

        const cargos = await resposta.json();
        selectCargo.innerHTML = '<option value="">Selecione o cargo</option>';

        cargos.forEach(c => {
            selectCargo.innerHTML += `<option value="${c.id}">${c.nome || c.cargo_nome || c.cargo}</option>`;
        });
    } catch (erro) {
        console.error("Erro ao carregar cargos:", erro);
        selectCargo.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

// 2. CARREGAR LISTA DE FUNCIONÁRIOS
async function carregarFuncionarios() {
    const tabela = document.getElementById("listaFuncionarios");
    if (!tabela) return;

    try {
        let resposta = await fetch("/api/funcionarios");
        if (!resposta.ok) resposta = await fetch("/api/rh/funcionarios");
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
                    <td>${f.cargo_nome || 'Não definido'}</td>
                    <td>${salarioFormatado}</td>
                    <td>
                        <span class="status ${f.ativo === false ? 'status-inativo' : 'status-ativo'}">
                            ${f.ativo === false ? 'INATIVO' : 'ATIVO'}
                        </span>
                    </td>
                    <td>
                        <button onclick='preencherEdicao(${JSON.stringify(f).replace(/'/g, "&#39;")})' style="cursor:pointer;">✏️ Editar</button>
                    </td>
                </tr>
            `;
        });
    } catch (erro) {
        console.error("Erro ao carregar lista:", erro);
        tabela.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Erro de conexão com o banco.</td></tr>`;
    }
}

// 3. SALVAR / ATUALIZAR FUNCIONÁRIO (COM TRAVA DE SEGURANÇA)
async function salvarFuncionario() {
    // Agora TUDO está protegido. Se algo der errado, um alerta vai saltar na tela.
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
        const cargoFinaID = parseInt(cargoIdRaw) || null;

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

        let url = id ? `/api/funcionarios/${id}` : "/api/funcionarios";
        let metodo = id ? "PUT" : "POST";

        let resposta = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });

        // Rota de segurança caso o servidor use outro caminho
        if (resposta.status === 404) {
            url = id ? `/api/rh/funcionarios/${id}` : "/api/rh/funcionarios";
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
        // Se a tela falhar ou o Node recusar, vai apitar aqui:
        console.error("Erro no código:", erro);
        alert("Atenção, ocorreu um erro: " + erro.message);
    }
}

// 4. PREENCHER EDIÇÃO (ATUALIZADO)
function preencherEdicao(f) {
    document.getElementById("funcionario_id").value = f.id || "";
    document.getElementById("nome").value = f.nome || "";
    document.getElementById("cpf").value = f.cpf || "";
    document.getElementById("rg").value = f.rg || "";
    document.getElementById("pis").value = f.pis_pasep || f.pis || "";
    document.getElementById("cargo_id").value = f.cargo_id || "";
    
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
    
    // Novos campos do eSocial
    document.getElementById("data_nascimento").value = f.data_nascimento ? f.data_nascimento.split('T')[0] : "";
    document.getElementById("ctps").value = f.ctps || "";
    document.getElementById("dependentes").value = f.dependentes || 0;
    document.getElementById("tipo_contrato").value = f.tipo_contrato || "CLT";
    document.getElementById("data_admissao").value = f.data_admissao ? f.data_admissao.split('T')[0] : "";
    document.getElementById("carga_horaria_mensal").value = f.carga_horaria_mensal || 220;
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