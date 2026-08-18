var API_URL = ""; 

if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    API_URL = "http://localhost:3000";
} else {
    API_URL = "https://pontocom-backend.onrender.com";
}

window.anexosPonto = {};

function alternarAba(abaId) {
    document.getElementById('abaSolicitacoes').style.display = 'none';
    document.getElementById('abaFechamento').style.display = 'none';

    const botoes = document.querySelectorAll('.btn-aba');
    botoes.forEach(btn => btn.style.background = '#e9ecef');

    document.getElementById(abaId).style.display = 'block';
    event.currentTarget.style.background = '#0056b3';
    event.currentTarget.style.color = '#ffffff';
}

async function carregarSolicitacoesPendentes() {
    const tbody = document.getElementById('listaSolicitacoesPendentes');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Carregando solicitações...</td></tr>';

    try {
        const resposta = await fetch(`${API_URL}/api/controle-ponto/solicitacoes/pendentes`);
        const solicitacoes = await resposta.json();

        if (solicitacoes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #64748b; font-weight: 500;">Nenhuma solicitação pendente no momento. 🎉</td></tr>';
            return;
        }

        window.anexosPonto = {};

        tbody.innerHTML = solicitacoes.map(sol => {
            const horaSolicitada = sol.hora_entrada || sol.hora_saida_almoco || sol.hora_volta_almoco || sol.hora_saida || '--:--';
            
            let tipoBatida = 'Registro';
            let motivoReal = sol.justificativa;
            
            if (sol.justificativa && sol.justificativa.includes(']')) {
                const partes = sol.justificativa.split(']');
                tipoBatida = partes[0].replace('[', ''); 
                motivoReal = partes.length > 1 ? partes[1].trim() : '';
            }

            let detalhesVisual = '';
            if (sol.tipo_solicitacao === 'AJUSTE') {
                const horarioOriginal = sol.horario_original || 'Sem registro';
                
                detalhesVisual = `
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; padding: 12px; border-radius: 6px; width: 100%;">
                        <div style="margin-bottom: 10px;">
                            <span style="font-size: 11px; background: #dbeafe; color: #1e3a8a; padding: 3px 6px; border-radius: 4px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">⏰ Ajuste de ${tipoBatida}</span>
                        </div>

                        <div style="display: flex; justify-content: space-between; background: white; padding: 8px; border-radius: 4px; border: 1px dashed #cbd5e1; margin-bottom: 10px;">
                            <div style="text-align: center; flex: 1; border-right: 1px solid #e2e8f0;">
                                <span style="font-size: 11px; color: #64748b; font-weight: 700; display: block; text-transform: uppercase;">Batidas do Dia</span>
                                <strong style="color: #475569; font-size: 14px;">${horarioOriginal}</strong>
                            </div>
                            <div style="text-align: center; flex: 1;">
                                <span style="font-size: 11px; color: #64748b; font-weight: 700; display: block; text-transform: uppercase;">Horário Solicitado</span>
                                <strong style="color: #3b82f6; font-size: 14px;">${horaSolicitada}</strong>
                            </div>
                        </div>

                        <div style="background: #f1f5f9; padding: 8px; border-radius: 4px; border-left: 3px solid #94a3b8;">
                            <span style="font-size: 11px; color: #64748b; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 4px;">💬 Justificativa:</span>
                            <span style="font-size: 13px; color: #0f172a; font-style: italic;">"${motivoReal}"</span>
                        </div>
                    </div>
                `;
            } else {
                detalhesVisual = `
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #a855f7; padding: 12px; border-radius: 6px; width: 100%;">
                        <span style="font-size: 11px; background: #f3e8ff; color: #6b21a8; padding: 3px 6px; border-radius: 4px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">📄 Atestado Médico</span><br>
                        <div style="margin-top: 10px; background: #f1f5f9; padding: 8px; border-radius: 4px; border-left: 3px solid #cbd5e1;">
                            <span style="font-size: 11px; color: #64748b; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 4px;">💬 Observação:</span>
                            <span style="font-size: 13px; color: #0f172a; font-style: italic;">"${sol.justificativa || 'Sem observações'}"</span>
                        </div>
                    </div>
                `;
            }

            if (sol.anexo_url) { window.anexosPonto[sol.id] = sol.anexo_url; }

            return `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: 0.2s;">
                <td style="padding: 16px; vertical-align: top;">
                    <strong style="color: #1e293b; font-size: 15px;">${sol.funcionario_nome}</strong><br>
                    <small style="color: #64748b; font-size: 12px;">CPF: ${sol.cpf}</small>
                </td>
                <td style="padding: 16px; vertical-align: top; font-weight: 600; color: #334155;">
                    ${formatarData(sol.data_registro)}
                </td>
                <td style="padding: 16px; vertical-align: top; width: 45%;">
                    ${detalhesVisual}
                </td>
                <td style="padding: 16px; vertical-align: top; text-align: center;">
                    ${sol.anexo_url ? `<button onclick="visualizarAnexo(${sol.id})" style="color: #2563eb; font-weight: bold; background: #eff6ff; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: 0.2s;">📎 Ver Anexo</button>` : '<span style="color: #94a3b8; font-size: 13px;">Sem anexo</span>'}
                </td>
                <td style="padding: 16px; vertical-align: top;">
                    <div style="display: flex; gap: 8px;">
                        <button onclick="responderSolicitacao(${sol.id}, 'Aprovado')" style="background: #10b981; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px;">✓ Aprovar</button>
                        <button onclick="responderSolicitacao(${sol.id}, 'Recusado')" style="background: #ef4444; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px;">✕ Recusar</button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');

    } catch (erro) {
        console.error("Erro ao carregar solicitações:", erro);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #ef4444; padding: 15px;">Erro ao carregar solicitações.</td></tr>';
    }
}

function visualizarAnexo(id) {
    const base64 = window.anexosPonto[id];
    if (!base64) { alert("Erro ao carregar anexo."); return; }
    const novaAba = window.open();
    novaAba.document.write(`<html><head><title>Anexo</title><style>body{margin:0;background:#0b0f19;display:flex;justify-content:center;align-items:center;height:100vh;}img{max-width:95%;max-height:95%;border-radius:8px;}</style></head><body><img src="${base64}"></body></html>`);
    novaAba.document.close();
}

async function responderSolicitacao(id, status) {
    let respostaRH = "";
    if (status === 'Recusado') { respostaRH = prompt("Informe o motivo da recusa (opcional):"); }

    try {
        const resposta = await fetch(`${API_URL}/api/controle-ponto/solicitacoes/responder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ solicitacao_id: id, status: status, resposta_rh: respostaRH })
        });
        const resultado = await resposta.json();
        if (resposta.ok) {
            alert(`✅ ${resultado.mensagem}`);
            carregarSolicitacoesPendentes(); 
        } else { alert(`❌ Erro: ${resultado.erro}`); }
    } catch (erro) { alert("Erro de conexão ao processar resposta."); }
}

async function carregarFuncionariosSelect() {
    const select = document.getElementById('selectFuncionarioFechamento');
    if (!select) return;
    try {
        const resposta = await fetch(`${API_URL}/api/funcionarios`);
        const funcionarios = await resposta.json();
        select.innerHTML = '<option value="">Selecione o Funcionário...</option>' + funcionarios.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
    } catch (erro) {}
}

function formatarData(dataIso) {
    if (!dataIso) return '-';
    const data = new Date(dataIso);
    return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

setTimeout(() => {
    carregarSolicitacoesPendentes();
    carregarFuncionariosSelect();
}, 200);