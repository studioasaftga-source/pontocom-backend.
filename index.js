require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// ===============================
// MIDDLEWARES GLOBAIS
// ===============================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve TUDO dentro de public (incluindo css, imagens, js, etc)
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
app.use("/api/login", loginRoutes);
app.use("/api/auth", loginRoutes); 
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

// Rotas Administrativas (/api/rh/)
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
// ROTAS DE PÁGINAS (HTML)
// ===============================
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "pages", "login.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "pages", "login.html"));
});

// ===============================
// INICIALIZAÇÃO
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});