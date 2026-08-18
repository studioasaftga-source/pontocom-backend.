const fs = require('fs');
const path = require('path');

const pasta = './public/pages';
const termoProcurado = 'Últimas batidas'; // O texto que aparece na sua foto

console.log(`🕵️‍♂️ Procurando pelo arquivo que contém: "${termoProcurado}"...`);

fs.readdirSync(pasta).forEach(arquivo => {
    if (arquivo.endsWith('.html')) {
        const caminho = path.join(pasta, arquivo);
        const conteudo = fs.readFileSync(caminho, 'utf8');
        
        // Verifica se o texto existe no arquivo (ignorando letras maiúsculas/minúsculas)
        if (conteudo.toLowerCase().includes(termoProcurado.toLowerCase())) {
            console.log(`\n✅ BÊNÇÃO! Achei! O conteúdo do Dashboard está dentro do arquivo: ===>  ${arquivo}  <===\n`);
        }
    }
});