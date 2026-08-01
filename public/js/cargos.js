let listaCargosGlobal = [];
let cargoEmEdicaoId = null;

// Executa ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    carregarListaCBOs();
    carregarListaCargos();
});

// 1. CARREGA A TABELA OFICIAL DE CBOs NO SELECT/DATALIST
async function carregarListaCBOs() {
    const dataList = document.getElementById('listaCBO');
    if (!dataList) return;

    try {
        let resposta = await fetch('/api/cbo');
        if (!resposta.ok) resposta = await fetch('/api/rh/cbo');

        if (resposta.ok) {
            const cbos = await resposta.json();
            dataList.innerHTML = '';
            
            cbos.forEach(cbo => {
                const option = document.createElement('option');
                const codigo = cbo.codigo || cbo.cbo;
                const nome = cbo.nome || cbo.descricao;
                option.value = `${codigo} - ${nome}`;
                dataList.appendChild(option);
            });
        }
    } catch (erro) {
        console.error("Erro ao carregar lista oficial de CBOs:", erro);
    }
}

// 2. BUSCA OS CARGOS CADASTRADOS E MONTA A TABELA ABAIXO
async function carregarListaCargos() {
    const tbody = document.getElementById('tabelaCargosBody');
    if (!tbody) return;

    try {
        let resposta = await fetch('/api/cargos');
        if (!resposta.ok) resposta = await fetch('/api/rh/cargos');

        if (resposta.ok) {
            const cargos = await resposta.json();
            listaCargosGlobal = cargos;
            tbody.innerHTML = '';

            if (cargos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum cargo cadastrado.</td></tr>';
                return;
            }

            cargos.forEach(cargo => {
                const entrada = cargo.hora_entrada ? cargo.hora_entrada.substring(0, 5) : '--:--';
                const saida = cargo.hora_saida ? cargo.hora_saida.substring(0, 5) : '--:--';

                tbody.innerHTML += `
                    <tr>
                        <td><strong>${cargo.nome_interno || cargo.nome}</strong></td>
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

// 3. PREENCHE O FORMULÁRIO QUANDO CLICA EM EDITAR
function editarCargo(id) {
    const cargo = listaCargosGlobal.find(c => c.id === id);
    if (!cargo) return;

    cargoEmEdicaoId = id;

    const formatarHora = (hora) => hora ? hora.substring(0, 5) : '';

    document.getElementById('nomeCargo').value = cargo.nome_interno || cargo.nome || '';
    document.getElementById('cboCargo').value = cargo.cbo || '';
    document.getElementById('horaEntrada').value = formatarHora(cargo.hora_entrada);
    document.getElementById('horaSaidaAlmoco').value = formatarHora(cargo.hora_saida_almoco);
    document.getElementById('horaRetornoAlmoco').value = formatarHora(cargo.hora_retorno_almoco);
    document.getElementById('horaSaida').value = formatarHora(cargo.hora_saida);
    document.getElementById('cargaHoraria').value = cargo.carga_horaria || '';

    // Altera o botão para modo de edição
    const btnSalvar = document.getElementById('btnSalvar');
    btnSalvar.innerHTML = '✏️ Atualizar Cargo';
    btnSalvar.style.backgroundColor = '#fbbf24';
    btnSalvar.style.color = '#0b0f19';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 4. SALVA (POST) OU ATUALIZA (PUT) O CARGO
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

    const url = cargoEmEdicaoId ? `/api/cargos/${cargoEmEdicaoId}` : '/api/cargos';
    const method = cargoEmEdicaoId ? 'PUT' : 'POST';

    try {
        const resposta = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (resposta.ok) {
            alert(cargoEmEdicaoId ? "Cargo atualizado com sucesso!" : "Cargo cadastrado com sucesso!");
            
            // Reseta formulário e botão
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

// 5. EXCLUI O CARGO
async function deletarCargo(id) {
    if (!confirm("Tem certeza que deseja excluir este cargo?")) return;

    try {
        const resposta = await fetch(`/api/cargos/${id}`, { method: 'DELETE' });
        const dados = await resposta.json();

        if (!resposta.ok) {
            alert(`⚠️ Atenção:\n\n${dados.erro || dados.mensagem}`);
            return;
        }

        alert("🗑️ Cargo excluído com sucesso!");
        carregarListaCargos();
    } catch (erro) {
        console.error("Erro ao deletar cargo:", erro);
        alert("Falha de comunicação com o servidor.");
    }
}