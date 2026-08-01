// =====================================
// PONTOCOM RH - NAVEGAÇÃO INTERNA (SPA)
// =====================================

/**
 * Carrega o conteúdo HTML de um módulo dentro do contêiner principal
 * @param {string} pagina - Nome do módulo/arquivo a ser carregado
 */
async function carregarPagina(pagina) {
    const area = document.getElementById("paginaInterna");

    if (!area) {
        console.error("Elemento 'paginaInterna' não encontrado no DOM.");
        return;
    }

    try {
        // Trata a string para remover caminhos extras, barras ou a extensão .html
        const paginaLimpa = pagina
            .replace(/^pages\//, '')
            .replace(/^\//, '')
            .replace(/\.html$/, '');

        // Faz o fetch garantindo a busca a partir da raiz (/pages/nome.html)
        const resposta = await fetch(`/pages/${paginaLimpa}.html`);

        if (!resposta.ok) {
            throw new Error(`Não foi possível carregar a página: status ${resposta.status}`);
        }

        const html = await resposta.text();
        area.innerHTML = html;

        // Extrai e re-executa os scripts contidos na página carregada
        const scripts = area.querySelectorAll("script");
        scripts.forEach(script => {
            const novoScript = document.createElement("script");
            if (script.src) {
                novoScript.src = script.src;
            } else {
                novoScript.textContent = script.textContent;
            }
            document.body.appendChild(novoScript);
        });

        // INICIALIZAÇÃO DE MÓDULOS ESPECÍFICOS
        if (paginaLimpa === 'controle_ponto') {
            // Aguarda a renderização do DOM e a carga do script para inicializar
            setTimeout(() => {
                if (typeof carregarSolicitacoesPendentes === 'function') {
                    carregarSolicitacoesPendentes();
                }
                if (typeof carregarFuncionariosSelect === 'function') {
                    carregarFuncionariosSelect();
                }
            }, 100);
        }

    } catch (erro) {
        console.error("Erro ao carregar módulo:", erro);
        area.innerHTML = `
        <div class="card" style="padding: 20px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; margin: 20px;">
            <h3 style="margin-top: 0;">Erro ao carregar módulo</h3>
            <p style="margin-bottom: 0;">${erro.message}</p>
        </div>`;
    }
}

// =====================================
// INTERCEPTADOR DE CLIQUES DO MENU
// =====================================

document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll(".menu a");

    links.forEach(link => {
        link.addEventListener("click", function (e) {
            const destino = this.getAttribute("href");

            // Ignora links sem destino definido ou âncoras nulas
            if (!destino || destino === "#" || destino.startsWith("javascript:")) {
                return;
            }

            // Mantém a navegação padrão de recarregamento para a Home/Index
            if (destino === "index.html" || destino === "/") {
                return;
            }

            // Impede a navegação padrão do formulário/browser
            e.preventDefault();

            // Carrega dinamicamente a página solicitada
            carregarPagina(destino);

            // Atualiza o estado de seleção visual do menu
            links.forEach(l => l.classList.remove("ativo"));
            this.classList.add("ativo");
        });
    });
});