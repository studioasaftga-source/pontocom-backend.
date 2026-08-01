// Arquivo: public/js/tema.js

document.addEventListener("DOMContentLoaded", async () => {
    // Define a URL correta dependendo de onde o sistema está rodando (Live Server ou Produção)
    const API_URL = (window.location.port === '5501' || window.location.port === '5500' || window.location.port === '3000') 
        ? 'http://localhost:3000/api/configuracoes' 
        : '/api/configuracoes';

    try {
        // Busca as configurações (GPS e Cores) do backend
        const res = await fetch(API_URL);
        
        if (res.ok) {
            const data = await res.json();
            
            // Verifica se retornou dados válidos
            if (data && Object.keys(data).length > 0) {
                const root = document.documentElement;

                // 1. COR PRIMÁRIA
                // Altera a cor principal dos botões, textos em destaque e marcadores
                if (data.cor_primaria) {
                    root.style.setProperty('--cor-primaria', data.cor_primaria);
                    // Para evitar que o hover volte para o laranja antigo, aplicamos a nova cor aqui também
                    root.style.setProperty('--cor-primaria-hover', data.cor_primaria); 
                }
                
                // 2. COR SECUNDÁRIA
                if (data.cor_secundaria) {
                    root.style.setProperty('--cor-header', data.cor_secundaria);
                    root.style.setProperty('--cor-menu', data.cor_secundaria);
                    
                    // NOVIDADE: Atualiza a cor da barra de status no PWA/Celular
                    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
                    if (metaThemeColor) {
                        metaThemeColor.setAttribute("content", data.cor_secundaria);
                    }
                }
                
                // 3. COR DE DESTAQUE
                // Altera a cor de botões de edição (azul original) e ícones de informação
                if (data.cor_destaque) {
                    root.style.setProperty('--cor-info', data.cor_destaque);
                }
            }
        }
    } catch (e) {
        console.error("Erro ao carregar a identidade visual da empresa:", e);
    }
});