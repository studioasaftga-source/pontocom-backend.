// =====================================
// PONTOCOM RH - CARGOS
// =====================================

const API_URL = "https://pontocom-backend.onrender.com"; // Adicionado link oficial
let listaCargosGlobal = [];
let cargoEmEdicaoId = null;

// =====================================
// INICIALIZAÇÃO DA TELA
// =====================================
function inicializarTelaCargos() {
    carregarListaCargos();
}

// 1. BUSCA OS CARGOS CADASTRADOS E MONTA A TABELA ABAIXO
async function carregarListaCargos() {
    const tbody = document.getElementById('tabelaCargosBody');
    if (!tbody) return;

    try {
        // Usando a API_URL
        const resposta = await fetch(`${API_URL}/api/cargos`);

        if (resposta.ok) {
            const cargos = await resposta.json();
            listaCargosGlobal = Array.isArray(cargos) ? cargos : [];
            tbody.innerHTML = '';

            if (listaCargosGlobal.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum cargo cadastrado.</td></tr>';
                return;
            }

            listaCargosGlobal.forEach(cargo => {
                const entrada = cargo.hora_entrada ? cargo.hora_entrada.substring(0, 5) : '--:--';
                const saida = cargo.hora_saida ? cargo.hora_saida.substring(0, 5) : '--:--';

                tbody.innerHTML += `
                    <tr>
                        <td><strong>${cargo.nome || cargo.nome_interno}</strong></td>
                        <td>${cargo.cbo || 'Sem CBO'}</td>
                        <td>${cargo.carga_horaria ? cargo.carga_horaria + 'h/mês' : '--'}</td>
                        <td><small>${entrada} às ${saida}</small></td>
                        <td>
                            <button class="btn-acao btn-editar" onclick="editarCargo(${cargo.id})">✏️ Editar</button>
                            <button class="btn-acao btn-excluir" onclick="deletarCargo(${cargo.id})">🗑️ Excluir</button>
                        </td>
                    </tr>
                `;
            });
        }
    } catch (erro) {
        console.error("Erro ao carregar lista de cargos:", erro);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: #f43f5e;">Erro ao carregar os dados.</td></tr>';
    }
}

// 2. PREENCHE O FORMULÁRIO QUANDO CLICA EM EDITAR
function editarCargo(id) {
    const cargo = listaCargosGlobal.find(c => c.id === id);
    if (!cargo) return;

    cargoEmEdicaoId = id;

    const formatarHora = (hora) => hora ? hora.substring(0, 5) : '';

    document.getElementById('nomeCargo').value = cargo.nome || cargo.nome_interno || '';
    document.getElementById('cboCargo').value = cargo.cbo || '';
    document.getElementById('horaEntrada').value = formatarHora(cargo.hora_entrada);
    document.getElementById('horaSaidaAlmoco').value = formatarHora(cargo.saida_almoco || cargo.hora_saida_almoco);
    document.getElementById('horaRetornoAlmoco').value = formatarHora(cargo.retorno_almoco || cargo.hora_retorno_almoco);
    document.getElementById('horaSaida').value = formatarHora(cargo.hora_saida);
    document.getElementById('cargaHoraria').value = cargo.carga_horaria || '';

    const btnSalvar = document.getElementById('btnSalvar');
    btnSalvar.innerHTML = '✏️ Atualizar Cargo';
    btnSalvar.style.backgroundColor = '#fbbf24';
    btnSalvar.style.color = '#0b0f19';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 3. SALVA (POST) OU ATUALIZA (PUT) O CARGO
async function salvarCargo(event) {
    event.preventDefault();

    const payload = {
        nome_interno: document.getElementById('nomeCargo').value,
        cbo: document.getElementById('cboCargo').value,
        hora_entrada: document.getElementById('horaEntrada').value,
        hora_saida_almoco: document.getElementById('horaSaidaAlmoco').value,
        hora_retorno_almoco: document.getElementById('horaRetornoAlmoco').value,
        hora_saida: document.getElementById('horaSaida').value,
        carga_horaria: document.getElementById('cargaHoraria').value
    };

    // Usando API_URL
    const url = cargoEmEdicaoId ? `${API_URL}/api/cargos/${cargoEmEdicaoId}` : `${API_URL}/api/cargos`;
    const method = cargoEmEdicaoId ? 'PUT' : 'POST';

    try {
        const resposta = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (resposta.ok) {
            alert(cargoEmEdicaoId ? "Cargo atualizado com sucesso!" : "Cargo cadastrado com sucesso!");
            
            document.getElementById('formCargo').reset();
            cargoEmEdicaoId = null;
            
            const btnSalvar = document.getElementById('btnSalvar');
            btnSalvar.innerHTML = '💾 Salvar Cargo';
            btnSalvar.style.backgroundColor = '#38bdf8';
            btnSalvar.style.color = '#0b0f19';

            carregarListaCargos();
        } else {
            const err = await resposta.json().catch(() => ({}));
            alert("Erro ao salvar: " + (err.erro || err.mensagem || "Falha no servidor"));
        }
    } catch (erro) {
        console.error("Erro ao salvar cargo:", erro);
        alert("Falha de comunicação com o servidor.");
    }
}

// 4. EXCLUI O CARGO
async function deletarCargo(id) {
    if (!confirm("Tem certeza que deseja excluir este cargo?")) return;

    try {
        // Usando API_URL
        const resposta = await fetch(`${API_URL}/api/cargos/${id}`, { method: 'DELETE' });

        if (!resposta.ok) {
            const dados = await resposta.json().catch(() => ({}));
            alert(`⚠️ Atenção:\n\n${dados.erro || dados.mensagem || "Erro ao excluir cargo."}`);
            return;
        }

        alert("🗑️ Cargo excluído com sucesso!");
        carregarListaCargos();
    } catch (erro) {
        console.error("Erro ao deletar cargo:", erro);
        alert("Falha de comunicação com o servidor.");
    }
}