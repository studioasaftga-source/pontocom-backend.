const fs = require("fs");
const path = require("path");

const pasta = path.join(__dirname, "public");

fs.readdirSync(pasta).forEach((arquivo) => {

    if (!arquivo.endsWith(".html")) return;

    const caminho = path.join(pasta, arquivo);

    let html = fs.readFileSync(caminho, "utf8");

    html = html.replace(/<style>[\s\S]*?<\/style>/gi, "");

    if (!html.includes("css/tema.css")) {

        html = html.replace(
            "</head>",
            `
<link rel="stylesheet" href="css/tema.css">
<link rel="stylesheet" href="css/estilo.css">

</head>`
        );

    }

    fs.writeFileSync(caminho, html);

    console.log("✔", arquivo);

});

console.log("\nTodos os HTMLs foram limpos.");