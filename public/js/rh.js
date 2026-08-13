var fechamentoAtualId = null;

// ========================================================
// INICIALIZAÇÃO AUTOMÁTICA
// ========================================================
window.addEventListener('load', () => {
    // Se estiver na tela de Fechamento
    const selectMes = document.getElementById("selectMes");
    const selectAno = document.getElementById("selectAno");
    if (selectMes && selectAno) {
        buscarECarregarCompetenciaExistente(selectMes.value, selectAno.value, true);
    }
    
    // Se estiver na tela de Holerites
    if (document.getElementById("selectFuncionarioHolerite")) {
        carregarFuncionariosHolerite();
    }
});

// ========================================================
// CONTROLE DE ABAS E CARREGAMENTO DE PONTO
// ========================================================
function alternarAbaRH(abaId) {
    document.querySelectorAll('.conteudo-aba').forEach(aba => aba.style.display = 'none');
    document.querySelectorAll('.btn-aba-rh').forEach(btn => btn.style.background = '#e9ecef');

    const abaAlvo = document.getElementById(abaId);
    if(abaAlvo) abaAlvo.style.display = 'block';
    
    if(event && event.currentTarget) {
        event.currentTarget.style.background = '#0056b3';
        event.currentTarget.style.color = '#ffffff';
    }
}

async function iniciarCompetencia() {
    const selectMes = document.getElementById("selectMes");
    const selectAno = document.getElementById("selectAno");
    
    if (!selectMes || !selectAno) return alert("Campos de mês/ano não encontrados.");

    try {
        const res = await fetch("/api/rh/fechamento", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mes: Number(selectMes.value), ano: Number(selectAno.value) })
        });
        const dados = await res.json();
        
        if (dados.sucesso) {
            fechamentoAtualId = dados.fechamento_id;
            alert("Competência iniciada com sucesso!");
            await carregarDadosFechamento(fechamentoAtualId);
        } else {
            await buscarECarregarCompetenciaExistente(selectMes.value, selectAno.value);
        }
    } catch (erro) {
        alert("Erro de conexão ao tentar abrir a competência.");
    }
}

async function buscarECarregarCompetenciaExistente(mes, ano, silencioso = false) {
    try {
        const res = await fetch(`/api/rh/fechamento?mes=${mes}&ano=${ano}`);
        const dados = await res.json();

        if (dados.sucesso && dados.fechamento) {
            fechamentoAtualId = dados.fechamento.id;
            await carregarDadosFechamento(fechamentoAtualId);
        } else {
            fechamentoAtualId = null;
            const tbody = document.getElementById("tabelaFechamento");
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #666; padding: 20px;">Nenhuma competência aberta para este mês.</td></tr>`;
            }
            if (!silencioso) alert("Competência não encontrada.");
        }
    } catch (erro) {
        if (!silencioso) alert("Erro ao buscar competência existente.");
    }
}

async function recalcularPonto() {
    if (!fechamentoAtualId) return alert("Selecione uma competência ativa primeiro.");

    try {
        const res = await fetch(`/api/rh/fechamento/${fechamentoAtualId}/calcular`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });
        const dados = await res.json();
        
        if (res.ok && dados.sucesso) {
            alert("Cálculos processados com sucesso!");
            await carregarDadosFechamento(fechamentoAtualId);
        } else {
            alert("Erro ao calcular: " + (dados.erro || "Erro desconhecido"));
        }
    } catch (erro) {
        alert("Erro de conexão ao processar cálculos.");
    }
}

async function carregarDadosFechamento(id) {
    try {
        const res = await fetch(`/api/rh/fechamento/${id}`);
        const dados = await res.json();

        if (dados.sucesso) {
            fechamentoAtualId = dados.fechamento.id;
            const btnCalcular = document.getElementById("btnCalcular");
            if (btnCalcular) btnCalcular.style.display = "inline-block";

            const tbody = document.getElementById("tabelaFechamento");
            if (!tbody) return;
            
            tbody.innerHTML = "";

            if (!dados.funcionarios || dados.funcionarios.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">Nenhum funcionário encontrado.</td></tr>`;
                return;
            }

            dados.funcionarios.forEach(f => {
                let statusBadge = '';
                let btnAcao = '';
                let btnHolerite = '';

                if (f.aprovado) {
                    statusBadge = `<span style="color: green; font-weight: bold;">✔ CONCLUÍDO</span>`;
                    btnAcao = `<button disabled style="opacity: 0.5; padding: 5px 10px; border-radius: 4px;">Folha Fechada</button>`;
                    btnHolerite = `<button onclick="imprimirHoleriteIndividual(${id}, ${f.funcionario_id})" style="background:#f97316; color:#fff; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-weight:bold; margin-left:5px;">🖨️ Holerite</button>`;
                } 
                else if (f.aprovado_pelo_funcionario) {
                    statusBadge = `<span style="color: #10b981; font-weight: bold;">✍️ ASSINADO</span>`;
                    btnAcao = `<button onclick="aprovarFuncionario(${f.funcionario_id})" style="background-color: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight:bold;">Concluir Folha</button>`;
                    btnHolerite = `<button onclick="imprimirHoleriteIndividual(${id}, ${f.funcionario_id})" style="background:#f97316; color:#fff; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-weight:bold; margin-left:5px;">🖨️ Holerite</button>`;
                } 
                else if (f.liberado_para_assinatura) {
                    statusBadge = `<span style="color: #fb923c; font-weight: bold;">📱 NO APP</span>`;
                    btnAcao = `<button disabled style="opacity: 0.5; padding: 5px 10px; border-radius: 4px;">Aguardando</button>`;
                    btnHolerite = `<button onclick="imprimirHoleriteIndividual(${id}, ${f.funcionario_id})" style="background:#f97316; color:#fff; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-weight:bold; margin-left:5px;">🖨️ Holerite</button>`;
                } 
                else {
                    statusBadge = `<span style="color: #f43f5e; font-weight: bold;">🔍 EM ANÁLISE</span>`;
                    btnAcao = `<button onclick="liberarEspelho(${f.funcionario_id})" style="background-color: #fb923c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight:bold;">Liberar Espelho</button>`;
                }

                tbody.innerHTML += `
                    <tr>
                        <td><div style="font-size: 14px; font-weight: bold; color: #fff;">${f.nome}</div></td>
                        <td>${f.horas_previstas || '00:00'} hs</td>
                        <td>${f.horas_trabalhadas || '00:00'} hs</td>
                        <td style="color: green; font-weight:bold;">${f.horas_extras || '00:00'} hs</td>
                        <td style="color: red; font-weight:bold;">${f.atrasos || '00:00'} hs</td>
                        <td>${f.faltas || 0} d</td>
                        <td>${statusBadge}</td>
                        <td><div style="display: flex; align-items: center;">${btnAcao} ${btnHolerite}</div></td>
                    </tr>
                `;
            });
        }
    } catch (erro) { console.error(erro); }
}

async function liberarEspelho(funcionarioId) {
    if (!fechamentoAtualId) return;
    if (confirm("Deseja liberar este espelho para o funcionário assinar no app?")) {
        await fetch(`/api/rh/fechamento/${fechamentoAtualId}/liberar/${funcionarioId}`, { method: "PUT" });
        carregarDadosFechamento(fechamentoAtualId);
    }
}

async function aprovarFuncionario(funcionarioId) {
    if (!fechamentoAtualId) return;
    if (confirm("Concluir definitivamente a folha deste funcionário?")) {
        await fetch(`/api/rh/fechamento/${fechamentoAtualId}/aprovar/${funcionarioId}`, { method: "PUT" });
        carregarDadosFechamento(fechamentoAtualId);
    }
}

// ========================================================
// EMISSÃO DE HOLERITES - FUNÇÕES SEGURAS
// ========================================================
async function carregarFuncionariosHolerite() {
    const select = document.getElementById("selectFuncionarioHolerite");
    if (!select) return;

    try {
        select.innerHTML = '<option value="">Buscando funcionários...</option>';

        // Tenta a rota de funcionários do fechamento, se falhar tenta a geral
        let resposta = await fetch("/api/rh/fechamento/funcionarios-lista");
        if (!resposta.ok) resposta = await fetch("/api/funcionarios");

        if (!resposta.ok) {
            throw new Error("Rotas de funcionários indisponíveis.");
        }

        const dados = await resposta.json();
        
        let funcionarios = [];
        if (dados.sucesso && dados.funcionarios) {
            funcionarios = dados.funcionarios;
        } else if (Array.isArray(dados)) {
            funcionarios = dados;
        } else if (Array.isArray(dados.data)) {
            funcionarios = dados.data;
        }

        select.innerHTML = '<option value="todos">-- Todos os Funcionários --</option>';

        if (funcionarios.length === 0) {
            select.innerHTML += '<option value="" disabled>Nenhum funcionário encontrado</option>';
            return;
        }

        // Ordena por ordem alfabética
        funcionarios.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));

        funcionarios.forEach(f => {
            if (f.id && f.nome) {
                const opt = document.createElement("option");
                opt.value = f.id;
                opt.textContent = f.nome;
                select.appendChild(opt);
            }
        });

    } catch (erro) {
        console.error("Erro ao carregar o select:", erro);
        select.innerHTML = '<option value="">Erro ao carregar (Verifique o servidor)</option>';
    }
}

async function gerarHoleritesComFiltro() {
    const mes = document.getElementById('selectMesHolerite')?.value;
    const ano = document.getElementById('selectAnoHolerite')?.value;
    const funcionarioId = document.getElementById('selectFuncionarioHolerite')?.value;

    if (!mes || !ano) return alert("Selecione o mês e o ano da competência.");
    if (!funcionarioId || funcionarioId === "") return alert("Selecione um funcionário ou 'Todos os funcionários'.");

    try {
        const resComp = await fetch(`/api/rh/fechamento?mes=${mes}&ano=${ano}`);
        const dadosComp = await resComp.json();

        if (!dadosComp.sucesso || !dadosComp.fechamento) {
            return alert("Competência não encontrada ou não calculada/aberta para este mês e ano.");
        }

        const fechamentoId = dadosComp.fechamento.id;
        const url = `/api/rh/fechamento/holerites-lote/${fechamentoId}?funcionarioId=${funcionarioId}`;
        const resLote = await fetch(url);
        const dadosLote = await resLote.json();

        if (!dadosLote.sucesso || !dadosLote.holerites || dadosLote.holerites.length === 0) {
            return alert("Nenhum registro encontrado para gerar holerites com os filtros selecionados.");
        }

        const janelaImpressao = window.open('', '_blank');
        
        let conteudoHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Holerites - Competência ${dadosLote.holerites[0].competencia}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 10px; color: #000; margin: 0; background: #fff; }
                    .folha-a4 { width: 100%; max-width: 210mm; margin: 0 auto; page-break-after: always; box-sizing: border-box; }
                    .via-holerite { border: 1.5px solid #000; padding: 12px; border-radius: 4px; height: 46vh; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; }
                    .linha-corte { border-bottom: 2px dashed #333; margin: 15px 0; text-align: center; position: relative; }
                    .linha-corte span { background: #fff; padding: 0 10px; font-size: 10px; font-weight: bold; position: relative; top: 6px; color: #555; text-transform: uppercase; }

                    .header { text-align: center; border-bottom: 1.5px solid #000; padding-bottom: 5px; margin-bottom: 8px; }
                    .header h2 { margin: 0; font-size: 13px; text-transform: uppercase; }
                    .header p { margin: 1px 0; font-size: 9px; color: #333; }
                    
                    .info-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 6px; font-size: 10px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 6px; }
                    .info-item span { display: block; font-weight: bold; color: #555; font-size: 8px; text-transform: uppercase; }
                    
                    table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
                    th, td { border: 1px solid #000; padding: 3px 5px; font-size: 9px; text-align: left; }
                    th { background-color: #eaeaea; text-align: center; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    
                    .totais-box { border: 1px solid #000; border-top: none; display: flex; justify-content: space-between; padding: 6px; font-size: 10px; font-weight: bold; margin-bottom: 6px; background: #f9f9f9; }
                    .bases-box { border: 1px solid #000; padding: 5px; margin-bottom: 6px; display: flex; justify-content: space-between; font-size: 9px; background: #fefefe; }
                    .legenda-descontos { font-size: 8px; color: #444; margin-bottom: 6px; }
                    
                    .assinatura { margin-top: 10px; text-align: center; }
                    .assinatura div { border-top: 1px solid #000; width: 280px; margin: 0 auto; padding-top: 2px; font-size: 9px; }

                    .btn-topo { position: fixed; top: 10px; right: 10px; background: #f97316; color: #fff; border: none; padding: 10px 20px; font-size: 14px; font-weight: bold; border-radius: 5px; cursor: pointer; z-index: 999; }
                    @media print {
                        .btn-topo { display: none; }
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <button class="btn-topo" onclick="window.print()">🖨️ Imprimir Holerites</button>
        `;

        dadosLote.holerites.forEach((h) => {
            const blocoVia = (tipoVia) => `
                <div class="via-holerite">
                    <div>
                        <div class="header">
                            <h2>${h.empresaNome}</h2>
                            <p>CNPJ: ${h.empresaCnpj} | <strong>RECIBO DE PAGAMENTO (${tipoVia})</strong> — COMP: ${h.competencia}</p>
                        </div>

                        <div class="info-grid">
                            <div class="info-item"><span>Funcionário</span>${h.nome}</div>
                            <div class="info-item"><span>CPF</span>${h.cpf}</div>
                            <div class="info-item"><span>Admissão</span>${h.admissao}</div>
                            <div class="info-item"><span>Cargo</span>${h.cargo}</div>
                            <div class="info-item"><span>Salário Base</span>R$ ${h.salarioBase}</div>
                            <div class="info-item"><span>Competência</span>${h.competencia}</div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>Cód</th>
                                    <th>Descrição da Verba</th>
                                    <th>Referência</th>
                                    <th class="text-right">Proventos (R$)</th>
                                    <th class="text-right">Descontos (R$)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="text-center">001</td>
                                    <td>Salário Base Proporcional</td>
                                    <td class="text-center">220h</td>
                                    <td class="text-right">R$ ${h.salarioBruto}</td>
                                    <td class="text-right">-</td>
                                </tr>
                                ${Number(h.horasExtrasRef.replace(':', '')) > 0 ? `
                                <tr>
                                    <td class="text-center">002</td>
                                    <td>Horas Extras (50%)</td>
                                    <td class="text-center">${h.horasExtrasRef}h</td>
                                    <td class="text-right">R$ ${h.valorHorasExtras}</td>
                                    <td class="text-right">-</td>
                                </tr>` : ''}
                                <tr>
                                    <td class="text-center">101</td>
                                    <td>Contribuição INSS</td>
                                    <td class="text-center">-</td>
                                    <td class="text-right">-</td>
                                    <td class="text-right">R$ ${h.descontos.inss}</td>
                                </tr>
                                ${Number(h.atrasosRef.replace(':', '')) > 0 ? `
                                <tr>
                                    <td class="text-center">102</td>
                                    <td>Horas Faltantes / Atrasos</td>
                                    <td class="text-center">${h.atrasosRef}h</td>
                                    <td class="text-right">-</td>
                                    <td class="text-right">R$ ${h.descontos.atrasosFaltas}</td>
                                </tr>` : ''}
                                <tr>
                                    <td class="text-center">103</td>
                                    <td>Adiantamento de Vales</td>
                                    <td class="text-center">-</td>
                                    <td class="text-right">-</td>
                                    <td class="text-right">R$ ${h.descontos.vales}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div class="totais-box">
                            <div>Proventos: R$ ${(Number(h.salarioBruto) + Number(h.valorHorasExtras)).toFixed(2)}</div>
                            <div>Descontos: R$ ${(Number(h.descontos.inss) + Number(h.descontos.vales) + Number(h.descontos.atrasosFaltas)).toFixed(2)}</div>
                            <div style="color: #047857;">LÍQUIDO: R$ ${h.salarioLiquido}</div>
                        </div>

                        <div class="bases-box">
                            <div><strong>Base INSS:</strong> R$ ${h.salarioBruto}</div>
                            <div><strong>Base FGTS:</strong> R$ ${h.informativos.baseFgts}</div>
                            <div><strong>FGTS (8%):</strong> R$ ${h.informativos.fgtsMes}</div>
                        </div>

                        <div class="legenda-descontos">
                            * Descontos = INSS + Vales + Horas Faltantes.
                        </div>
                    </div>

                    <div class="assinatura">
                        <div>Assinatura do Colaborador (${tipoVia})</div>
                    </div>
                </div>
            `;

            conteudoHtml += `
                <div class="folha-a4">
                    ${blocoVia("VIA DO EMPREGADO")}
                    <div class="linha-corte"><span>✂️ Corte na linha pontilhada ✂️</span></div>
                    ${blocoVia("VIA DA EMPRESA")}
                </div>
            `;
        });

        conteudoHtml += `</body></html>`;

        janelaImpressao.document.write(conteudoHtml);
        janelaImpressao.document.close();

    } catch (e) {
        console.error(e);
        alert("Erro ao gerar holerites. Verifique a conexão com o servidor.");
    }
}

async function imprimirHoleriteIndividual(fechamentoId, funcionarioId) {
    try {
        const url = `/api/rh/fechamento/holerites-lote/${fechamentoId}?funcionarioId=${funcionarioId}`;
        const resLote = await fetch(url);
        const dadosLote = await resLote.json();

        if (!dadosLote.sucesso || !dadosLote.holerites || dadosLote.holerites.length === 0) {
            return alert("Erro ao carregar holerite do funcionário.");
        }

        const janelaImpressao = window.open('', '_blank');
        let conteudoHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Holerite - ${dadosLote.holerites[0].nome}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 10px; color: #000; margin: 0; background: #fff; }
                    .folha-a4 { width: 100%; max-width: 210mm; margin: 0 auto; page-break-after: always; box-sizing: border-box; }
                    .via-holerite { border: 1.5px solid #000; padding: 12px; border-radius: 4px; height: 46vh; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; }
                    .linha-corte { border-bottom: 2px dashed #333; margin: 15px 0; text-align: center; position: relative; }
                    .linha-corte span { background: #fff; padding: 0 10px; font-size: 10px; font-weight: bold; position: relative; top: 6px; color: #555; text-transform: uppercase; }

                    .header { text-align: center; border-bottom: 1.5px solid #000; padding-bottom: 5px; margin-bottom: 8px; }
                    .header h2 { margin: 0; font-size: 13px; text-transform: uppercase; }
                    .header p { margin: 1px 0; font-size: 9px; color: #333; }
                    
                    .info-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 6px; font-size: 10px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 6px; }
                    .info-item span { display: block; font-weight: bold; color: #555; font-size: 8px; text-transform: uppercase; }
                    
                    table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
                    th, td { border: 1px solid #000; padding: 3px 5px; font-size: 9px; text-align: left; }
                    th { background-color: #eaeaea; text-align: center; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    
                    .totais-box { border: 1px solid #000; border-top: none; display: flex; justify-content: space-between; padding: 6px; font-size: 10px; font-weight: bold; margin-bottom: 6px; background: #f9f9f9; }
                    .bases-box { border: 1px solid #000; padding: 5px; margin-bottom: 6px; display: flex; justify-content: space-between; font-size: 9px; background: #fefefe; }
                    .legenda-descontos { font-size: 8px; color: #444; margin-bottom: 6px; }
                    
                    .assinatura { margin-top: 10px; text-align: center; }
                    .assinatura div { border-top: 1px solid #000; width: 280px; margin: 0 auto; padding-top: 2px; font-size: 9px; }

                    .btn-topo { position: fixed; top: 10px; right: 10px; background: #f97316; color: #fff; border: none; padding: 10px 20px; font-size: 14px; font-weight: bold; border-radius: 5px; cursor: pointer; z-index: 999; }
                    @media print {
                        .btn-topo { display: none; }
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <button class="btn-topo" onclick="window.print()">🖨️ Imprimir Holerite</button>
        `;

        const h = dadosLote.holerites[0];
        const blocoVia = (tipoVia) => `
            <div class="via-holerite">
                <div>
                    <div class="header">
                        <h2>${h.empresaNome}</h2>
                        <p>CNPJ: ${h.empresaCnpj} | <strong>RECIBO DE PAGAMENTO (${tipoVia})</strong> — COMP: ${h.competencia}</p>
                    </div>

                    <div class="info-grid">
                        <div class="info-item"><span>Funcionário</span>${h.nome}</div>
                        <div class="info-item"><span>CPF</span>${h.cpf}</div>
                        <div class="info-item"><span>Admissão</span>${h.admissao}</div>
                        <div class="info-item"><span>Cargo</span>${h.cargo}</div>
                        <div class="info-item"><span>Salário Base</span>R$ ${h.salarioBase}</div>
                        <div class="info-item"><span>Competência</span>${h.competencia}</div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Cód</th>
                                <th>Descrição da Verba</th>
                                <th>Referência</th>
                                <th class="text-right">Proventos (R$)</th>
                                <th class="text-right">Descontos (R$)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="text-center">001</td>
                                <td>Salário Base Proporcional</td>
                                <td class="text-center">220h</td>
                                <td class="text-right">R$ ${h.salarioBruto}</td>
                                <td class="text-right">-</td>
                            </tr>
                            ${Number(h.horasExtrasRef.replace(':', '')) > 0 ? `
                            <tr>
                                <td class="text-center">002</td>
                                <td>Horas Extras (50%)</td>
                                <td class="text-center">${h.horasExtrasRef}h</td>
                                <td class="text-right">R$ ${h.valorHorasExtras}</td>
                                <td class="text-right">-</td>
                            </tr>` : ''}
                            <tr>
                                <td class="text-center">101</td>
                                <td>Contribuição INSS</td>
                                <td class="text-center">-</td>
                                <td class="text-right">-</td>
                                <td class="text-right">R$ ${h.descontos.inss}</td>
                            </tr>
                            ${Number(h.atrasosRef.replace(':', '')) > 0 ? `
                            <tr>
                                <td class="text-center">102</td>
                                <td>Horas Faltantes / Atrasos</td>
                                <td class="text-center">${h.atrasosRef}h</td>
                                <td class="text-right">-</td>
                                <td class="text-right">R$ ${h.descontos.atrasosFaltas}</td>
                            </tr>` : ''}
                            <tr>
                                <td class="text-center">103</td>
                                <td>Adiantamento de Vales</td>
                                <td class="text-center">-</td>
                                <td class="text-right">-</td>
                                <td class="text-right">R$ ${h.descontos.vales}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="totais-box">
                        <div>Proventos: R$ ${(Number(h.salarioBruto) + Number(h.valorHorasExtras)).toFixed(2)}</div>
                        <div>Descontos: R$ ${(Number(h.descontos.inss) + Number(h.descontos.vales) + Number(h.descontos.atrasosFaltas)).toFixed(2)}</div>
                        <div style="color: #047857;">LÍQUIDO: R$ ${h.salarioLiquido}</div>
                    </div>

                    <div class="bases-box">
                        <div><strong>Base INSS:</strong> R$ ${h.salarioBruto}</div>
                        <div><strong>Base FGTS:</strong> R$ ${h.informativos.baseFgts}</div>
                        <div><strong>FGTS (8%):</strong> R$ ${h.informativos.fgtsMes}</div>
                    </div>

                    <div class="legenda-descontos">
                        * Descontos = INSS + Vales + Horas Faltantes.
                    </div>
                </div>

                <div class="assinatura">
                    <div>Assinatura do Colaborador (${tipoVia})</div>
                </div>
            </div>
        `;

        conteudoHtml += `
            <div class="folha-a4">
                ${blocoVia("VIA DO EMPREGADO")}
                <div class="linha-corte"><span>✂️ Corte na linha pontilhada ✂️</span></div>
                ${blocoVia("VIA DA EMPRESA")}
            </div>
        </body></html>`;

        janelaImpressao.document.write(conteudoHtml);
        janelaImpressao.document.close();
    } catch (e) {
        console.error(e);
        alert("Erro ao gerar holerite individual.");
    }
}