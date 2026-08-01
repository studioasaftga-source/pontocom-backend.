document.addEventListener('DOMContentLoaded', () => {
    carregarValesPendentes();
});

// Função para buscar os vales do banco de dados e montar a tabela do RH
async function carregarValesPendentes() {
    // Procura o corpo da tabela no seu HTML (ajuste o ID se no seu HTML estiver diferente)
    const container = document.getElementById('lista-vales-rh') || document.querySelector('tbody');
    if (!container) return;

    container.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Carregando vales pendentes...</td></tr>';

    try {
        const resposta = await fetch('/api/vale/pendentes');
        const vales = await resposta.json();

        if (vales.length === 0) {
            container.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">🎉 Nenhuma solicitação de vale pendente no momento.</td></tr>';
            return;
        }

        container.innerHTML = vales.map(vale => `
            <tr>
                <td style="padding: 12px; font-weight: bold;">${vale.funcionario_nome}</td>
                <td style="padding: 12px; color: #10b981; font-weight: bold;">
                    ${Number(vale.valor).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                </td>
                <td style="padding: 12px;">
                    ${new Date(vale.data_solicitacao).toLocaleDateString('pt-BR')}
                </td>
                <td style="padding: 12px;">
                    <button onclick="responderVale(${vale.id}, 'Aprovado')" style="background: #10b981; color: white; padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; margin-right: 8px;">
                        ✓ Aprovar
                    </button>
                    <button onclick="responderVale(${vale.id}, 'Recusado')" style="background: #f43f5e; color: white; padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                        ✕ Recusar
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (erro) {
        console.error("Erro ao carregar vales:", erro);
        container.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Erro ao buscar dados.</td></tr>';
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
        const resposta = await fetch('/api/vale/responder', {
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
            alert(`❌ Erro: ${erroData.erro}`);
        }
    } catch (erro) {
        alert("Erro de conexão ao processar a resposta do vale.");
    }
}