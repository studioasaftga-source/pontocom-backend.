// ==========================================
// FUNÇÕES DA TELA DE CONTROLE DE PONTO
// ==========================================

async function inicializarTelaPonto() {
    try {
        const resposta = await fetch('/api/funcionarios');
        const funcionarios = await resposta.json();
        
        const select = document.getElementById('selectFuncionario');
        
        if (funcionarios && funcionarios.length > 0) {
            funcionarios.forEach(func => {
                const option = document.createElement('option');
                option.value = func.id;
                option.textContent = `${func.nome} (CPF: ${func.cpf || 'N/A'})`;
                select.appendChild(option);
            });
        }
        
        const hoje = new Date();
        const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
        document.getElementById('inputMesAno').value = mesAtual;
        
        const botaoBuscar = document.getElementById('btnBuscarPonto');
        if (botaoBuscar) {
            botaoBuscar.addEventListener('click', buscarEspelhoPonto);
        }
    } catch (erro) {
        console.error("Erro ao carregar tela de ponto:", erro);
    }
}

async function buscarEspelhoPonto() {
    const funcionarioId = document.getElementById('selectFuncionario').value;
    const mesAno = document.getElementById('inputMesAno').value; 
    const tbody = document.getElementById('corpoTabelaPonto');

    if (!funcionarioId || !mesAno) {
        alert("Por favor, selecione um funcionário e um mês/ano.");
        return;
    }

    const [ano, mes] = mesAno.split('-');
    tbody.innerHTML = '<tr><td colspan="6">Carregando dados...</td></tr>';

    try {
        const resposta = await fetch(`/api/ponto/${funcionarioId}/${mes}/${ano}`);
        const registros = await resposta.json();

        if (registros.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding: 20px; text-align:center;">Nenhum registro encontrado para este mês.</td></tr>';
            return;
        }

        const pontosPorDia = agruparPorDia(registros);
        tbody.innerHTML = ''; 

        Object.keys(pontosPorDia).forEach(data => {
            const batidas = pontosPorDia[data];
            const dataFormatada = data.split('-').reverse().join('/');

            // Pega as horas ou deixa vazio
            const b1 = batidas[0] ? extrairHora(batidas[0].data_hora) : '';
            const b2 = batidas[1] ? extrairHora(batidas[1].data_hora) : '';
            const b3 = batidas[2] ? extrairHora(batidas[2].data_hora) : '';
            const b4 = batidas[3] ? extrairHora(batidas[3].data_hora) : '';

            tbody.innerHTML += `
                <tr>
                    <td style="padding: 10px;"><strong>${dataFormatada}</strong></td>
                    <td>${b1 || '-'}</td>
                    <td>${b2 || '-'}</td>
                    <td>${b3 || '-'}</td>
                    <td>${b4 || '-'}</td>
                    <td>
                        <button onclick="abrirModalAjuste('${data}', '${b1}', '${b2}', '${b3}', '${b4}')" class="btn-ajustar">Ajustar</button>
                    </td>
                </tr>
            `;
        });

    } catch (erro) {
        console.error("Erro ao buscar espelho:", erro);
        tbody.innerHTML = '<tr><td colspan="6" style="color: red; padding: 20px;">Erro ao buscar registros.</td></tr>';
    }
}

function agruparPorDia(registros) {
    return registros.reduce((grupo, registro) => {
        let dataBruta = registro.data_registro || registro.data_hora;
        let data = dataBruta.split('T')[0]; 
        
        if (!grupo[data]) grupo[data] = [];
        grupo[data].push(registro);
        return grupo;
    }, {});
}

function extrairHora(dataHoraString) {
    if (!dataHoraString) return '';
    const dataObj = new Date(dataHoraString);
    const horas = String(dataObj.getHours()).padStart(2, '0');
    const minutos = String(dataObj.getMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
}

// ==========================================
// FUNÇÕES DO MODAL MODERNO DE AJUSTE
// ==========================================

function abrirModalAjuste(data, b1, b2, b3, b4) {
    const dataFormatada = data.split('-').reverse().join('/');

    const modalHtml = `
        <div id="modalAjusteOverlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(5px); display: flex; justify-content: center; align-items: center; z-index: 9999; opacity: 0; transition: opacity 0.3s ease;">
            
            <div style="background: #ffffff; width: 450px; border-radius: 12px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); padding: 25px; transform: translateY(-20px); transition: transform 0.3s ease;" id="modalAjusteBox">
                
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 20px;">
                    <h2 style="margin: 0; font-size: 18px; color: #333;">Ajuste de Ponto - ${dataFormatada}</h2>
                    <button onclick="fecharModalAjuste()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #888;">&times;</button>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                    <div>
                        <label style="display: block; font-size: 13px; color: #555; margin-bottom: 5px; font-weight: bold;">Entrada</label>
                        <input type="time" id="editB1" value="${b1}" onkeydown="mudarComEnter(event, 'editB2')" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 8px; font-size: 14px;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 13px; color: #555; margin-bottom: 5px; font-weight: bold;">Saída Almoço</label>
                        <input type="time" id="editB2" value="${b2}" onkeydown="mudarComEnter(event, 'editB3')" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 8px; font-size: 14px;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 13px; color: #555; margin-bottom: 5px; font-weight: bold;">Volta Almoço</label>
                        <input type="time" id="editB3" value="${b3}" onkeydown="mudarComEnter(event, 'editB4')" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 8px; font-size: 14px;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 13px; color: #555; margin-bottom: 5px; font-weight: bold;">Saída</label>
                        <input type="time" id="editB4" value="${b4}" onkeydown="mudarComEnter(event, 'btnSalvarAjuste')" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 8px; font-size: 14px;">
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button onclick="fecharModalAjuste()" style="padding: 10px 18px; border: none; border-radius: 6px; background: #f1f1f1; color: #333; cursor: pointer; font-weight: bold;">Cancelar</button>
                    <button id="btnSalvarAjuste" onclick="salvarEdicaoPonto('${data}')" style="padding: 10px 18px; border: none; border-radius: 6px; background: #0056b3; color: #fff; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px rgba(0,86,179,0.3);">Salvar Ajuste</button>
                </div>

            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Efeito de entrada suave + Foco no primeiro campo
    setTimeout(() => {
        document.getElementById('modalAjusteOverlay').style.opacity = '1';
        document.getElementById('modalAjusteBox').style.transform = 'translateY(0)';
        const inputB1 = document.getElementById('editB1');
        if (inputB1) inputB1.focus();
    }, 10);
}

function mudarComEnter(event, proximoId) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Impede o envio acidental de formulários padrão
        const proximoElemento = document.getElementById(proximoId);
        if (proximoElemento) {
            proximoElemento.focus();
            if (proximoElemento.tagName === 'BUTTON') {
                proximoElemento.click(); // Se for o botão salvar, ele clica automaticamente
            }
        }
    }
}

function fecharModalAjuste() {
    const overlay = document.getElementById('modalAjusteOverlay');
    if (overlay) {
        overlay.style.opacity = '0';
        document.getElementById('modalAjusteBox').style.transform = 'translateY(-20px)';
        setTimeout(() => overlay.remove(), 300);
    }
}

async function salvarEdicaoPonto(data) {
    const funcionarioId = document.getElementById('selectFuncionario').value;
    
    const batidasEditadas = {
        data_registro: data,
        funcionario_id: funcionarioId,
        b1: document.getElementById('editB1').value,
        b2: document.getElementById('editB2').value,
        b3: document.getElementById('editB3').value,
        b4: document.getElementById('editB4').value
    };

    const btnSalvar = document.getElementById('btnSalvarAjuste') || event.target;
    btnSalvar.innerText = "Salvando...";
    btnSalvar.disabled = true;

    try {
        const resposta = await fetch('/api/ponto/ajustar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(batidasEditadas)
        });

        if (resposta.ok) {
            alert("Ajuste de ponto salvo com sucesso!");
            fecharModalAjuste();
            buscarEspelhoPonto();
        } else {
            const erroMsg = await resposta.text();
            alert("Erro ao salvar no banco: " + erroMsg);
        }
    } catch (erro) {
        console.error("Erro na comunicação com o servidor:", erro);
        alert("Erro de conexão ao tentar salvar o ajuste.");
    } finally {
        if (btnSalvar) {
            btnSalvar.innerText = "Salvar Ajuste";
            btnSalvar.disabled = false;
        }
    }
}