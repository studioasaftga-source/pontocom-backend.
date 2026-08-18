// ============================================================
// CONFIGURAÇÃO DA API (AUTOMÁTICA)
// ============================================================
var API_URL = "";

if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    API_URL = "http://localhost:3000";
} else {
    API_URL = "https://pontocom-backend.onrender.com";
}

document.addEventListener('DOMContentLoaded', () => {
    carregarValesPendentes();
});

// Função para buscar os vales do banco de dados e montar a tabela do RH
async function carregarValesPendentes() {
    // Procura o corpo da tabela no seu HTML
    const container = document.getElementById('lista-vales-rh') || document.querySelector('tbody');
    if (!container) return;

    container.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b;">Carregando solicitações...</td></tr>';

    try {
        const resposta = await fetch(`${API_URL}/api/vale/pendentes`);
        const vales = await resposta.json();

        if (!Array.isArray(vales) || vales.length === 0) {
            container.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 25px; color: #64748b;">🎉 Nenhuma solicitação de vale pendente no momento.</td></tr>';
            return;
        }

        container.innerHTML = vales.map(vale => `
            <tr>
                <td style="padding: 12px 15px; font-weight: bold; color: #0f172a;">${vale.funcionario_nome || vale.colaborador || 'Colaborador'}</td>
                <td style="padding: 12px 15px;">${vale.data_solicitacao ? new Date(vale.data_solicitacao).toLocaleDateString('pt-BR') : '--/--/----'}</td>
                <td style="padding: 12px 15px; color: #10b981; font-weight: bold;">
                    ${Number(vale.valor || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                </td>
                <td style="padding: 12px 15px; color: #64748b; font-size: 0.9rem;">${vale.motivo || vale.justificativa || '-'}</td>
                <td style="padding: 12px 15px; font-family: monospace; font-weight: bold; color: #0284c7;">${vale.pix || vale.chave_pix || 'Não cadastrado'}</td>
                <td style="padding: 12px 15px; text-align: right;">
                    <button onclick="responderVale(${vale.id}, 'Aprovado')" style="background: #10b981; color: white; padding: 6px 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; margin-right: 6px;">
                        ✓ Aprovar
                    </button>
                    <button onclick="responderVale(${vale.id}, 'Recusado')" style="background: #f43f5e; color: white; padding: 6px 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                        ✕ Recusar
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (erro) {
        console.error("Erro ao carregar vales:", erro);
        container.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #f43f5e; padding: 20px;">Erro ao buscar dados do servidor.</td></tr>';
    }
}

// Função para aprovar ou recusar (com a caixinha de motivo)
async function responderVale(valeId, status) {
    let respostaRH = "";
    
    // Se for recusado, abre a caixinha exigindo o motivo
    if (status === 'Recusado') {
        respostaRH = prompt("Informe o motivo da recusa do vale (ex: Limite comprometido, Dados inválidos, etc):");
        
        // Se o RH apertar "Cancelar" ou não digitar nada, interrompe a ação
        if (respostaRH === null || respostaRH.trim() === "") {
            alert("⚠️ Recusa cancelada. É obrigatório informar o motivo.");
            return; 
        }
    }

    try {
        const resposta = await fetch(`${API_URL}/api/vale/responder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vale_id: valeId,
                status: status,
                resposta_rh: respostaRH
            })
        });

        if (resposta.ok) {
            alert(`✅ Vale ${status.toLowerCase()} com sucesso!`);
            carregarValesPendentes(); // Recarrega a tabela automaticamente
        } else {
            const erroData = await resposta.json();
            alert(`❌ Erro: ${erroData.erro || 'Não foi possível processar'}`);
        }
    } catch (erro) {
        alert("Erro de conexão ao processar a resposta do vale.");
    }
}