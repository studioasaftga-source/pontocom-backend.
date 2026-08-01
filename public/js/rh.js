var fechamentoAtualId = null;

// 1. Iniciar ou Consultar Competência Existente
async function iniciarCompetencia() {
    const mes = document.getElementById("selectMes").value;
    const ano = document.getElementById("selectAno").value;

    try {
        // Tenta criar a competência
        const res = await fetch("/api/rh/fechamento", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mes: Number(mes), ano: Number(ano) })
        });

        const dados = await res.json();
        
        if (dados.sucesso) {
            fechamentoAtualId = dados.fechamento_id;
            alert("Competência iniciada com sucesso!");
            await carregarDadosFechamento(fechamentoAtualId);
        } else {
            // Se já foi criada (retornou erro de duplicidade), busca a lista existente
            console.log("Competência já existe, buscando registros...");
            await buscarECarregarCompetenciaExistente(mes, ano);
        }
    } catch (erro) {
        console.error("Erro ao iniciar competência:", erro);
        alert("Erro de conexão ao tentar abrir a competência.");
    }
}

// 2. Busca a competência no banco quando ela já foi criada previamente
async function buscarECarregarCompetenciaExistente(mes, ano) {
    try {
        // Busca os dados da competência pelo mês/ano
        const res = await fetch(`/api/rh/fechamentos?mes=${mes}&ano=${ano}`);
        const dados = await res.json();

        if (dados.sucesso && dados.fechamento) {
            fechamentoAtualId = dados.fechamento.id;
            await carregarDadosFechamento(fechamentoAtualId);
        } else {
            // Se o endpoint direto não existir, busca os dados da competência cadastrada
            alert("Esta competência já existe no banco. Processando exibição dos dados...");
            // Exibe o botão de calcular
            const btnCalcular = document.getElementById("btnCalcular");
            if(btnCalcular) btnCalcular.style.display = "inline-block";
        }
    } catch (erro) {
        console.error("Erro ao buscar competência existente:", erro);
    }
}

// 3. Processar Cálculos das Horas
async function recalcularPonto() {
    if (!fechamentoAtualId) return alert("Selecione uma competência ativa primeiro.");

    try {
        const res = await fetch(`/api/rh/calcular-fechamento/${fechamentoAtualId}`, {
            method: "POST"
        });

        const dados = await res.json();
        if (dados.sucesso) {
            alert("Cálculos processados com sucesso!");
            await carregarDadosFechamento(fechamentoAtualId);
        } else {
            alert("Erro ao calcular: " + dados.erro);
        }
    } catch (erro) {
        console.error("Erro no cálculo:", erro);
        alert("Erro de conexão ao processar cálculos.");
    }
}

// 4. Renderizar Tabela na Tela
async function carregarDadosFechamento(id) {
    try {
        const res = await fetch(`/api/rh/fechamento/${id}`);
        const dados = await res.json();

        if (dados.sucesso) {
            fechamentoAtualId = dados.fechamento.id;
            
            // Exibe o botão verde de calcular
            const btnCalcular = document.getElementById("btnCalcular");
            if(btnCalcular) btnCalcular.style.display = "inline-block";

            const tbody = document.getElementById("tabelaFechamento");
            if(!tbody) return;
            
            tbody.innerHTML = "";

            if (!dados.funcionarios || dados.funcionarios.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align: center;">Nenhum funcionário encontrado para esta competência.</td></tr>`;
                return;
            }

            dados.funcionarios.forEach(f => {
                const statusBadge = f.aprovado 
                    ? `<span style="color: green; font-weight: bold;">✔ APROVADO</span>`
                    : `<span style="color: orange; font-weight: bold;">⏳ PENDENTE</span>`;

                const btnAprovar = f.aprovado 
                    ? `<button disabled style="opacity: 0.5; padding: 5px 10px;">Aprovado</button>`
                    : `<button onclick="aprovarFuncionario(${f.funcionario_id})" style="background-color: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Aprovar</button>`;

                tbody.innerHTML += `
                    <tr>
                        <td><strong>${f.nome}</strong></td>
                        <td>${f.horas_previstas || '00:00'} hs</td>
                        <td>${f.horas_trabalhadas || '00:00'} hs</td>
                        <td style="color: green;">+${f.horas_extras || '00:00'} hs</td>
                        <td style="color: red;">-${f.atrasos || '00:00'} hs</td>
                        <td>${f.faltas || 0} d</td>
                        <td>${statusBadge}</td>
                        <td>${btnAprovar}</td>
                    </tr>
                `;
            });
        }
    } catch (erro) {
        console.error("Erro ao carregar tabela:", erro);
    }
}

// 5. Aprovação individual
async function aprovarFuncionario(funcionarioId) {
    if (!fechamentoAtualId) return;

    try {
        const res = await fetch(`/api/rh/fechamento/${fechamentoAtualId}/aprovar/${funcionarioId}`, {
            method: "PUT"
        });
        const dados = await res.json();
        if (dados.sucesso) {
            carregarDadosFechamento(fechamentoAtualId);
        } else {
            alert(dados.erro || "Erro ao aprovar.");
        }
    } catch (erro) {
        console.error("Erro ao aprovar funcionário:", erro);
    }
}