require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// ===============================
// MIDDLEWARES GLOBAIS
// ===============================
app.use(cors());

// Limite aumentado para 50mb para permitir o envio das fotos em Base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Servir arquivos estáticos (CSS, JS, Imagens de public)
app.use(express.static(path.join(__dirname, "public")));
app.use('/uploads', express.static(path.join(__dirname, "uploads")));

// ===============================
// IMPORTAR MÓDULOS DE ROTAS
// ===============================
const loginRoutes = require("./routes/login");
const pontoRoutes = require("./routes/ponto");
const configRoutes = require("./routes/config");
const valeRoutes = require("./routes/vale");
const empresaRoutes = require("./routes/empresa"); 
const cboRoutes = require("./routes/cbo");
const cargosRoutes = require("./routes/cargos");
const funcionariosRoutes = require("./routes/funcionarios");
const folhaRoutes = require("./routes/folha");
const dashboardRoutes = require("./routes/dashboard");
const controlePontoRoutes = require("./routes/controle_ponto");
const fechamentoRoutes = require("./routes/fechamento");

// ===============================
// REGISTRAR ROTAS DA API
// ===============================

// Autenticação (RH e PWA)
app.use("/api/login", loginRoutes);
app.use("/api/auth", loginRoutes); 

// Endpoints Principais (Consumidos pelo PWA do Funcionário e APIs gerais)
app.use("/api/configuracoes", configRoutes);
app.use("/api/ponto", pontoRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/vale", valeRoutes);
app.use("/api/controle-ponto", controlePontoRoutes);

// Cadastros Base
app.use("/api/cargos", cargosRoutes);
app.use("/api/funcionarios", funcionariosRoutes);
app.use("/api/folha", folhaRoutes);
app.use("/api/empresa", empresaRoutes); 

// Rotas Administrativas (Prefixo /api/rh/)
app.use("/api/rh/configuracoes", configRoutes);
app.use("/api/rh/fechamento", fechamentoRoutes);
app.use("/api/rh/ponto", pontoRoutes);
app.use("/api/rh/empresa", empresaRoutes);
app.use("/api/rh/cbo", cboRoutes);
app.use("/api/rh/cargos", cargosRoutes);
app.use("/api/rh/funcionarios", funcionariosRoutes);
app.use("/api/rh/folha", folhaRoutes);
app.use("/api/rh/dashboard", dashboardRoutes);
app.use("/api/rh/vale", valeRoutes);

// ===============================
// ROTA PARA NAVEGAÇÃO DAS PÁGINAS (PWA / PAGES)
// ===============================
// Redireciona a raiz "/" diretamente para a tela de login
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "pages", "login.html"));
});

// Permite acessar rotas como /login ou /dashboard sem digitar .html
app.get("/:pagina", (req, res, next) => {
    const page = req.params.pagina;
    const filePath = path.join(__dirname, "public", "pages", `${page}.html`);
    
    res.sendFile(filePath, (err) => {
        if (err) next(); // Se não for um HTML válido em pages, passa pro próximo manipulador
    });
});

// ===============================
// INICIALIZAÇÃO DO SERVIDOR
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor backend rodando em http://localhost:${PORT}`);
});