const API_URL = "https://pontocom-backend.onrender.com";
let limiteMaximoValePermitido = 0;

// 1. Carregar Limites e Histórico de Vales do Funcionário
async function carregarDadosValeColaborador() {
    const funcionarioId = localStorage.getItem("funcionario_id") || 1; 

    try {
        const res = await fetch(`${API_URL}/api/vale/meus-vales/${funcionarioId}`);
        const dados = await res.json();

        if (dados.sucesso) {
            limiteMaximoValePermitido = parseFloat(dados.limite_maximo);
            
            document.getElementById("valeLimiteMaximo").innerText = limiteMaximoValePermitido.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
            document.getElementById("valePercentual").innerText = dados.percentual_permitido;

            const containerHistorico = document.getElementById("listaHistoricoVales");
            containerHistorico.innerHTML = "";

            if (!dados.historico || dados.historico.length === 0) {
                containerHistorico.innerHTML = `<div style="text-align: center; color: #888; font-size: 13px; padding: 10px;">Nenhuma solicitação de vale encontrada.</div>`;
                return;
            }

            dados.historico.forEach(vale => {
                let badgeStatus = "";
                switch (vale.status) {
                    case "PENDENTE_RH":
                        badgeStatus = `<span style="background: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">🟡 Pendente RH</span>`;
                        break;
                    case "APROVADO_RH":
                        badgeStatus = `<span style="background: #cce5ff; color: #004085; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">🔵 Aprovado RH (Em Pagamento)</span>`;
                        break;
                    case "PAGO_FINANCEIRO":
                        badgeStatus = `<span style="background: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">🟢 Pago via Financeiro</span>`;
                        break;
                    case "RECUSADO":
                        badgeStatus = `<span style="background: #f8d7da; color: #721c24; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">🔴 Recusado</span>`;
                        break;
                }

                const dataFormatada = new Date(vale.data_solicitacao).toLocaleDateString("pt-BR");
                const valorFormatado = parseFloat(vale.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

                containerHistorico.innerHTML += `
                    <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <strong style="font-size: 16px; color: #2c3e50;">R$ ${valorFormatado}</strong>
                            ${badgeStatus}
                        </div>
                        <div style="font-size: 12px; color: #6c757d; display: flex; justify-content: space-between;">
                            <span>Data: ${dataFormatada}</span>
                            <span>Ref: ${String(vale.competencia_mes).padStart(2, '0')}/${vale.competencia_ano}</span>
                        </div>
                        ${vale.motivo ? `<div style="font-size: 12px; color: #495057; font-style: italic;">"${vale.motivo}"</div>` : ''}
                        ${vale.motivo_recusa ? `<div style="font-size: 12px; color: #dc3545; font-weight: bold;">Motivo recusa: ${vale.motivo_recusa}</div>` : ''}
                    </div>
                `;
            });
        } else {
            alert(dados.erro || "Erro ao carregar limites de vale.");
        }
    } catch (erro) {
        console.error("Erro ao buscar dados do vale:", erro);
    }
}

// 2. Submeter Novo Pedido de Vale
async function enviarSolicitacaoVale() {
    const funcionarioId = localStorage.getItem("funcionario_id") || 1;
    const valorInput = document.getElementById("inputValorVale").value;
    const motivoInput = document.getElementById("inputMotivoVale").value;

    const valor = parseFloat(valorInput);

    if (!valor || valor <= 0) {
        return alert("Por favor, digite um valor válido para o vale.");
    }

    if (valor > limiteMaximoValePermitido) {
        return alert(`O valor de R$ ${valor.toFixed(2)} ultrapassa o seu limite máximo permitido de R$ ${limiteMaximoValePermitido.toFixed(2)}.`);
    }

    try {
        // CORRIGIDO AQUI ABAIXO:
        const res = await fetch(`${API_URL}/api/vale/solicitar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                funcionario_id: funcionarioId,
                valor: valor,
                motivo: motivoInput
            })
        });

        const dados = await res.json();

        if (dados.sucesso) {
            alert("Solicitação enviada com sucesso! Aguarde a aprovação do RH.");
            document.getElementById("inputValorVale").value = "";
            document.getElementById("inputMotivoVale").value = "";
            carregarDadosValeColaborador(); 
        } else {
            alert(dados.erro || "Erro ao solicitar vale.");
        }
    } catch (erro) {
        console.error("Erro ao enviar solicitação:", erro);
        alert("Erro de conexão ao enviar solicitação.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    carregarDadosValeColaborador();
});