// =====================================
// PONTOCOM RH - CARGOS
// =====================================

(function () {

    // ============================================================
    // CONFIGURAÇÃO AUTOMÁTICA DA API
    // ============================================================

    const HOST = window.location.hostname;

    var API_URL = "";

    if (
        HOST === "localhost" ||
        HOST === "127.0.0.1"
    ) {
        API_URL = "http://localhost:3000";
    } else {
        API_URL = "https://pontocom-backend.onrender.com";
    }

    console.log("=====================================");
    console.log("PONTOCOM RH - CARGOS");
    console.log("Hostname:", HOST);
    console.log("API utilizada:", API_URL);
    console.log("=====================================");


    // ============================================================
    // VARIÁVEIS GLOBAIS
    // ============================================================

    window.listaCargosGlobal = [];
    window.cargoEmEdicaoId = null;


    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================

    window.inicializarTelaCargos = function () {

        console.log("Inicializando tela de cargos...");

        carregarListaCargos();
    };


    // ============================================================
    // CARREGAR CARGOS
    // ============================================================

    window.carregarListaCargos = async function () {

        const tbody = document.getElementById("tabelaCargosBody");

        if (!tbody) {
            console.error(
                "❌ Elemento #tabelaCargosBody não encontrado."
            );
            return;
        }

        console.log("🔎 Buscando cargos...");

        tbody.innerHTML = `
            <tr>
                <td colspan="5"
                    style="
                        text-align:center;
                        color:#94a3b8;
                        padding:25px;
                    ">
                    Carregando cargos...
                </td>
            </tr>
        `;

        try {

            const url = `${API_URL}/api/cargos`;

            console.log("➡️ GET:", url);

            const resposta = await fetch(url, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                cache: "no-cache"
            });

            console.log(
                "⬅️ Status da API:",
                resposta.status
            );

            if (!resposta.ok) {

                const textoErro = await resposta.text();

                console.error(
                    "❌ API retornou erro:",
                    textoErro
                );

                throw new Error(
                    `Erro HTTP ${resposta.status}`
                );
            }

            const dados = await resposta.json();

            console.log(
                "✅ Cargos recebidos:",
                dados
            );

            window.listaCargosGlobal =
                Array.isArray(dados) ? dados : [];

            tbody.innerHTML = "";

            // ====================================================
            // NENHUM CARGO
            // ====================================================

            if (window.listaCargosGlobal.length === 0) {

                tbody.innerHTML = `
                    <tr>
                        <td colspan="5"
                            style="
                                text-align:center;
                                color:#94a3b8;
                                padding:25px;
                            ">
                            Nenhum cargo cadastrado.
                        </td>
                    </tr>
                `;

                return;
            }


            // ====================================================
            // MONTAR TABELA
            // ====================================================

            window.listaCargosGlobal.forEach(cargo => {

                const entrada =
                    cargo.hora_entrada
                        ? String(cargo.hora_entrada).substring(0, 5)
                        : "--:--";

                const saidaAlmoco =
                    cargo.saida_almoco
                        ? String(cargo.saida_almoco).substring(0, 5)
                        : "--:--";

                const retornoAlmoco =
                    cargo.retorno_almoco
                        ? String(cargo.retorno_almoco).substring(0, 5)
                        : "--:--";

                const saida =
                    cargo.hora_saida
                        ? String(cargo.hora_saida).substring(0, 5)
                        : "--:--";

                const nome =
                    cargo.nome ||
                    cargo.nome_interno ||
                    "Cargo sem nome";

                const cbo =
                    cargo.cbo ||
                    "Sem CBO";

                const carga =
                    cargo.carga_horaria !== null &&
                    cargo.carga_horaria !== undefined
                        ? `${cargo.carga_horaria}h/mês`
                        : "--";


                const tr = document.createElement("tr");

                tr.innerHTML = `
                    <td>
                        <strong>
                            ${escapeHtml(nome)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHtml(cbo)}
                    </td>

                    <td>
                        ${escapeHtml(carga)}
                    </td>

                    <td>
                        <small>
                            ${entrada}
                            às
                            ${saida}
                        </small>
                    </td>

                    <td>

                        <button
                            type="button"
                            class="btn-acao btn-editar"
                            onclick="editarCargo(${Number(cargo.id)})">
                            ✏️ Editar
                        </button>

                        <button
                            type="button"
                            class="btn-acao btn-excluir"
                            onclick="deletarCargo(${Number(cargo.id)})">
                            🗑️ Excluir
                        </button>

                    </td>
                `;

                tbody.appendChild(tr);
            });

            console.log(
                `✅ ${window.listaCargosGlobal.length} cargo(s) exibido(s) na tabela.`
            );

        } catch (erro) {

            console.error(
                "❌ ERRO AO CARREGAR CARGOS:",
                erro
            );

            tbody.innerHTML = `
                <tr>
                    <td colspan="5"
                        style="
                            text-align:center;
                            color:#f43f5e;
                            padding:25px;
                        ">

                        ❌ Erro ao carregar os cargos.

                        <br>

                        <small style="color:#94a3b8;">
                            Verifique o console do navegador.
                        </small>

                    </td>
                </tr>
            `;
        }
    };


    // ============================================================
    // EDITAR CARGO
    // ============================================================

    window.editarCargo = function (id) {

        const cargo =
            window.listaCargosGlobal.find(
                item => Number(item.id) === Number(id)
            );

        if (!cargo) {

            console.error(
                "Cargo não encontrado:",
                id
            );

            return;
        }

        window.cargoEmEdicaoId = id;

        console.log(
            "✏️ Editando cargo:",
            cargo
        );


        const formatarHora = function (hora) {

            if (!hora) return "";

            return String(hora).substring(0, 5);
        };


        const campoNome =
            document.getElementById("nomeCargo");

        const campoCbo =
            document.getElementById("cboCargo");

        const campoEntrada =
            document.getElementById("horaEntrada");

        const campoSaidaAlmoco =
            document.getElementById("horaSaidaAlmoco");

        const campoRetornoAlmoco =
            document.getElementById("horaRetornoAlmoco");

        const campoSaida =
            document.getElementById("horaSaida");

        const campoCarga =
            document.getElementById("cargaHoraria");


        if (campoNome) {
            campoNome.value =
                cargo.nome ||
                cargo.nome_interno ||
                "";
        }

        if (campoCbo) {
            campoCbo.value =
                cargo.cbo || "";
        }

        if (campoEntrada) {
            campoEntrada.value =
                formatarHora(cargo.hora_entrada);
        }

        if (campoSaidaAlmoco) {
            campoSaidaAlmoco.value =
                formatarHora(cargo.saida_almoco);
        }

        if (campoRetornoAlmoco) {
            campoRetornoAlmoco.value =
                formatarHora(cargo.retorno_almoco);
        }

        if (campoSaida) {
            campoSaida.value =
                formatarHora(cargo.hora_saida);
        }

        if (campoCarga) {
            campoCarga.value =
                cargo.carga_horaria || "";
        }


        const btnSalvar =
            document.getElementById("btnSalvar");

        if (btnSalvar) {

            btnSalvar.innerHTML =
                "✏️ Atualizar Cargo";

            btnSalvar.style.backgroundColor =
                "#fbbf24";

            btnSalvar.style.color =
                "#0b0f19";
        }


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };


    // ============================================================
    // SALVAR / ATUALIZAR
    // ============================================================

    window.salvarCargo = async function (event) {

        if (event) {
            event.preventDefault();
        }

        const nome =
            document.getElementById("nomeCargo")?.value?.trim();

        const cbo =
            document.getElementById("cboCargo")?.value?.trim();

        const horaEntrada =
            document.getElementById("horaEntrada")?.value;

        const horaSaidaAlmoco =
            document.getElementById("horaSaidaAlmoco")?.value;

        const horaRetornoAlmoco =
            document.getElementById("horaRetornoAlmoco")?.value;

        const horaSaida =
            document.getElementById("horaSaida")?.value;

        const cargaHoraria =
            document.getElementById("cargaHoraria")?.value;


        const payload = {

            nome_interno: nome,

            cbo: cbo,

            hora_entrada:
                horaEntrada || null,

            hora_saida_almoco:
                horaSaidaAlmoco || null,

            hora_retorno_almoco:
                horaRetornoAlmoco || null,

            hora_saida:
                horaSaida || null,

            carga_horaria:
                cargaHoraria || null
        };


        console.log(
            "📤 Dados enviados:",
            payload
        );


        const id =
            window.cargoEmEdicaoId;

        const url =
            id
                ? `${API_URL}/api/cargos/${id}`
                : `${API_URL}/api/cargos`;

        const method =
            id ? "PUT" : "POST";


        console.log(
            `➡️ ${method}:`,
            url
        );


        try {

            const resposta =
                await fetch(url, {

                    method: method,

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"
                    },

                    body:
                        JSON.stringify(payload)
                });


            console.log(
                "⬅️ Status:",
                resposta.status
            );


            const texto =
                await resposta.text();

            let dados = {};

            try {
                dados =
                    texto
                        ? JSON.parse(texto)
                        : {};
            } catch {
                dados = {
                    mensagem: texto
                };
            }


            if (!resposta.ok) {

                console.error(
                    "❌ Erro ao salvar:",
                    dados
                );

                alert(
                    "Erro ao salvar cargo:\n\n" +
                    (
                        dados.erro ||
                        dados.mensagem ||
                        `Erro HTTP ${resposta.status}`
                    )
                );

                return;
            }


            console.log(
                "✅ Cargo salvo:",
                dados
            );


            alert(
                id
                    ? "Cargo atualizado com sucesso!"
                    : "Cargo cadastrado com sucesso!"
            );


            const form =
                document.getElementById("formCargo");

            if (form) {
                form.reset();
            }


            window.cargoEmEdicaoId =
                null;


            const btnSalvar =
                document.getElementById("btnSalvar");

            if (btnSalvar) {

                btnSalvar.innerHTML =
                    "💾 Salvar Cargo";

                btnSalvar.style.backgroundColor =
                    "#38bdf8";

                btnSalvar.style.color =
                    "#0b0f19";
            }


            // IMPORTANTE:
            // Busca novamente no banco depois do POST/PUT

            await carregarListaCargos();

        } catch (erro) {

            console.error(
                "❌ Erro de comunicação:",
                erro
            );

            alert(
                "Falha de comunicação com o servidor.\n\n" +
                erro.message
            );
        }
    };


    // ============================================================
    // EXCLUIR CARGO
    // ============================================================

    window.deletarCargo = async function (id) {

        if (
            !confirm(
                "Tem certeza que deseja excluir este cargo?"
            )
        ) {
            return;
        }


        try {

            const url =
                `${API_URL}/api/cargos/${id}`;

            console.log(
                "🗑️ DELETE:",
                url
            );


            const resposta =
                await fetch(url, {
                    method: "DELETE",
                    headers: {
                        "Accept":
                            "application/json"
                    }
                });


            const texto =
                await resposta.text();

            let dados = {};

            try {
                dados =
                    texto
                        ? JSON.parse(texto)
                        : {};
            } catch {
                dados = {
                    mensagem: texto
                };
            }


            if (!resposta.ok) {

                console.error(
                    "Erro ao excluir:",
                    dados
                );

                alert(
                    dados.erro ||
                    dados.mensagem ||
                    "Erro ao excluir cargo."
                );

                return;
            }


            alert(
                "🗑️ Cargo excluído com sucesso!"
            );


            await carregarListaCargos();

        } catch (erro) {

            console.error(
                "❌ Erro ao deletar cargo:",
                erro
            );

            alert(
                "Falha de comunicação com o servidor."
            );
        }
    };


    // ============================================================
    // SEGURANÇA PARA TEXTO
    // ============================================================

    function escapeHtml(valor) {

        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    // ============================================================
    // INICIALIZAÇÃO AUTOMÁTICA
    // ============================================================

    let cargosInicializados = false;
    let observerCargos = null;


    function iniciar() {

        // Evita que o módulo seja iniciado várias vezes
        if (cargosInicializados) {
            return;
        }

        console.log(
            "🚀 Iniciando módulo de cargos..."
        );


        const tabela =
            document.getElementById(
                "tabelaCargosBody"
            );


        // ========================================================
        // TABELA JÁ EXISTE
        // ========================================================

        if (tabela) {

            cargosInicializados = true;

            console.log(
                "✅ Tabela de cargos encontrada. Carregando..."
            );

            carregarListaCargos();


            // Se o observer estiver ativo, encerra
            if (observerCargos) {

                observerCargos.disconnect();

                observerCargos = null;
            }

            return;
        }


        // ========================================================
        // TABELA AINDA NÃO EXISTE
        // ========================================================

        console.log(
            "⏳ Tabela de cargos ainda não está no DOM."
        );


        // Evita criar vários observers
        if (observerCargos) {
            return;
        }


        // ========================================================
        // OBSERVAR ALTERAÇÕES NO DOM
        // ========================================================

        observerCargos =
            new MutationObserver(function () {

                const tabelaAtual =
                    document.getElementById(
                        "tabelaCargosBody"
                    );


                if (!tabelaAtual) {
                    return;
                }


                console.log(
                    "✅ Tabela de cargos apareceu no DOM."
                );


                cargosInicializados = true;


                carregarListaCargos();


                observerCargos.disconnect();

                observerCargos = null;
            });


        // Observa alterações na página
        if (document.body) {

            observerCargos.observe(
                document.body,
                {
                    childList: true,
                    subtree: true
                }
            );

        } else {

            console.warn(
                "⚠️ document.body ainda não está disponível."
            );
        }
    }


    // ============================================================
    // EXECUTA QUANDO O DOCUMENTO ESTIVER PRONTO
    // ============================================================

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            iniciar,
            {
                once: true
            }
        );

    } else {

        iniciar();
    }


})();