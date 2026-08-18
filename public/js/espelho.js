// ============================================================
// CONFIGURAÇÃO DA API 
// ============================================================
var API_URL = "";
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    API_URL = "http://localhost:3000";
} else {
    API_URL = "https://pontocom-backend.onrender.com";
}

// ============================================================
// 1. CARREGAR FUNCIONÁRIOS NO SELECT
// ============================================================
async function carregarFuncionariosEspelho() {
    const select = document.getElementById('selectFuncionario'); 
    if (!select) return;

    try {
        const resposta = await fetch(`${API_URL}/api/funcionarios`);
        const dados = await resposta.json();
        
        let funcionarios = Array.isArray(dados) ? dados : (dados.funcionarios || []);

        select.innerHTML = '<option value="">Selecione um funcionário...</option>';
        funcionarios.forEach(f => {
            select.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
        });
    } catch (erro) {
        console.error("Erro ao carregar funcionários:", erro);
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

// ============================================================
// 2. BUSCAR E DESENHAR O ESPELHO DO MÊS
// ============================================================
async function buscarEspelhoMensal() {
    const funcionarioId = document.getElementById('selectFuncionario').value;
    const mesAno = document.getElementById('inputMesAno').value; // Ex: 2026-08
    const tbody = document.getElementById('corpoTabelaPonto'); 

    if (!funcionarioId || !mesAno) {
        return alert("Por favor, selecione o funcionário e o Mês/Ano.");
    }

    if (!tbody) {
        return alert("Erro interno: Tabela não encontrada no HTML.");
    }

    const [ano, mes] = mesAno.split('-');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">Buscando batidas do mês... ⏳</td></tr>';

    try {
        const resposta = await fetch(`${API_URL}/api/ponto/${funcionarioId}/${mes}/${ano}`);
        const registros = await resposta.json();

        if (registros.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#64748b;">Nenhum ponto registrado para este mês.</td></tr>';
            return;
        }

        // --- AGRUPAR BATIDAS POR DIA ---
        const diasAgrupados = {};

        registros.forEach(reg => {
            const dataObj = new Date(reg.data_registro);
            const dataFormatada = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Cuiaba', day: '2-digit', month: '2-digit', year: 'numeric' }).format(dataObj);
            const horaFormatada = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Cuiaba', hour: '2-digit', minute: '2-digit', hour12: false }).format(dataObj);

            if (!diasAgrupados[dataFormatada]) {
                diasAgrupados[dataFormatada] = [];
            }
            diasAgrupados[dataFormatada].push({ hora: horaFormatada, tipo: reg.tipo });
        });

        // --- DESENHAR NA TABELA ---
        tbody.innerHTML = "";
        
        Object.keys(diasAgrupados).sort().forEach(data => {
            const batidasDoDia = diasAgrupados[data];

            let b1 = batidasDoDia.find(b => b.tipo === 'ENTRADA')?.hora || '--:--';
            let b2 = batidasDoDia.find(b => b.tipo === 'SAIDA_ALMOCO')?.hora || '--:--';
            let b3 = batidasDoDia.find(b => b.tipo === 'RETORNO_ALMOCO')?.hora || '--:--';
            let b4 = batidasDoDia.find(b => b.tipo === 'SAIDA')?.hora || '--:--';

            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #e2e8f0; text-align: center;">
                    <td style="padding: 12px; font-weight: bold; color: #334155;">${data}</td>
                    <td style="padding: 12px; color: #0f172a;">${b1}</td>
                    <td style="padding: 12px; color: #0f172a;">${b2}</td>
                    <td style="padding: 12px; color: #0f172a;">${b3}</td>
                    <td style="padding: 12px; color: #0f172a;">${b4}</td>
                    <td style="padding: 12px;">
                        <button onclick="abrirEdicaoRH('${funcionarioId}', '${data}', '${b1}', '${b2}', '${b3}', '${b4}')" class="btn-ajustar">
                            ✏️ Editar
                        </button>
                    </td>
                </tr>
            `;
        });

    } catch (erro) {
        console.error("Erro ao buscar espelho:", erro);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:red;">Erro ao buscar dados do servidor.</td></tr>';
    }
}

// ============================================================
// 3. AÇÃO DO RH: JANELA DE EDIÇÃO MANUAL (O MODO DEUS)
// ============================================================
function abrirEdicaoRH(funcionarioId, dataPonto, b1, b2, b3, b4) {
    // 1. Remove modal antigo se existir
    const modalAntigo = document.getElementById('modalAjusteRH');
    if (modalAntigo) modalAntigo.remove();

    // 2. Limpa os "--:--" para vazio no input type="time"
    const limpaHora = (h) => h === '--:--' ? '' : h;

    // 3. Cria o HTML da Janelinha flutuante
    const modalHTML = `
        <div id="modalAjusteRH" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 9999;">
            <div style="background: white; padding: 25px; border-radius: 8px; width: 350px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                <h3 style="margin-top: 0; color: #1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">✏️ Ajuste: ${dataPonto}</h3>
                
                <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <label style="font-weight: bold; color: #475569; font-size: 14px;">1. Entrada:</label>
                        <input type="time" id="editB1" value="${limpaHora(b1)}" style="padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px;">
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <label style="font-weight: bold; color: #475569; font-size: 14px;">2. Saída Almoço:</label>
                        <input type="time" id="editB2" value="${limpaHora(b2)}" style="padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px;">
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <label style="font-weight: bold; color: #475569; font-size: 14px;">3. Volta Almoço:</label>
                        <input type="time" id="editB3" value="${limpaHora(b3)}" style="padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px;">
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <label style="font-weight: bold; color: #475569; font-size: 14px;">4. Saída Final:</label>
                        <input type="time" id="editB4" value="${limpaHora(b4)}" style="padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px;">
                    </div>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 25px; justify-content: flex-end;">
                    <button onclick="document.getElementById('modalAjusteRH').remove()" style="padding: 8px 15px; border: none; background: #e2e8f0; color: #475569; border-radius: 4px; cursor: pointer; font-weight: bold;">Cancelar</button>
                    <button onclick="salvarEdicaoRH('${funcionarioId}', '${dataPonto}')" style="padding: 8px 15px; border: none; background: #10b981; color: white; border-radius: 4px; cursor: pointer; font-weight: bold;">💾 Salvar Ajuste</button>
                </div>
            </div>
        </div>
    `;

    // 4. Injeta a janelinha na tela
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ============================================================
// 4. AÇÃO DO RH: SALVAR NO BANCO
// ============================================================
async function salvarEdicaoRH(funcionarioId, dataPonto) {
    const b1 = document.getElementById('editB1').value;
    const b2 = document.getElementById('editB2').value;
    const b3 = document.getElementById('editB3').value;
    const b4 = document.getElementById('editB4').value;

    try {
        const resposta = await fetch(`${API_URL}/api/controle-ponto/ajuste-manual`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                funcionario_id: funcionarioId,
                data: dataPonto,
                batidas: { b1, b2, b3, b4 }
            })
        });

        const resultado = await resposta.json();

        if (resposta.ok) {
            alert(`✅ ${resultado.mensagem}`);
            document.getElementById('modalAjusteRH').remove();
            buscarEspelhoMensal(); // Recarrega a tabela para mostrar as horas novas
        } else {
            alert(`❌ Erro: ${resultado.erro}`);
        }
    } catch (erro) {
        console.error("Erro ao salvar:", erro);
        alert("Erro de conexão ao salvar ajuste.");
    }
}

// ============================================================
// PARTIDA DO MOTOR (EXECUÇÃO AUTOMÁTICA)
// ============================================================
setTimeout(() => {
    // 1. Carrega os funcionários no Select
    carregarFuncionariosEspelho();
    
    // 2. Plugando o Botão de Buscar à nossa função principal
    const btnBuscar = document.getElementById("btnBuscarPonto");
    if (btnBuscar) {
        btnBuscar.addEventListener("click", buscarEspelhoMensal);
    }
}, 200);