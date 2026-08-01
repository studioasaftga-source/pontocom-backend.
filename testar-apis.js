const rotas = [
    "/api/login",
    "/api/ponto",
    "/api/cargos",
    "/api/funcionarios",
    "/api/dashboard",
    "/api/folha",
    "/api/rh/empresa",
    "/api/rh/cbo",
    "/api/rh/cargos",
    "/api/rh/funcionarios",
    "/api/rh/folha",
    "/api/rh/dashboard"
];

async function testarApis() {
    console.log("🔍 Testando rotas da API em http://localhost:3000...\n");
    
    for (const rota of rotas) {
        try {
            const url = `http://localhost:3000${rota}`;
            const resposta = await fetch(url);
            
            // Status diferentes de 404 significam que a rota existe e foi encontrada pelo Express
            if (resposta.status === 404) {
                console.log(`❌ [404 NOT FOUND] ${rota}`);
            } else {
                console.log(`✅ [Status ${resposta.status}] ${rota}`);
            }
        } catch (err) {
            console.log(`⚠️ [ERRO DE REDE] ${rota} - O servidor está ligado?`);
        }
    }
    console.log("\n✨ Teste finalizado!");
}

testarApis();