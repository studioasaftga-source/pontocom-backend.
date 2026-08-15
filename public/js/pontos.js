// ==========================================
// FRONT-END: Lógica da Tela de Jornada (public/js/pontos.js)
// ==========================================

// ============================================================
// CONFIGURAÇÃO DA API (AUTOMÁTICA)
// ============================================================
let API_URL = "";

if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    API_URL = "http://localhost:3000";
} else {
    API_URL = "https://pontocom-backend.onrender.com";
}

// Pegamos o ID do Colaborador salvo no Login
const funcionarioId = localStorage.getItem('funcionarioId') || localStorage.getItem('funcionario_id') || 1;
const token = localStorage.getItem('token');
const META_JORNADA_MINUTOS = 8 * 60; // 8 horas = 480 minutos

const ROTULOS_PADRAO = [
    '1. Entrada',
    '2. Saída Almoço',
    '3. Retorno Almoço',
    '4. Saída'
];

const TEXTO_BOTAO_INTELIGENTE = {
    'ENTRADA': 'Registrar Entrada',
    'SAIDA_ALMOCO': 'Registrar Saída (Almoço)',
    'RETORNO_ALMOCO': 'Registrar Retorno (Almoço)',
    'SAIDA': 'Registrar Saída',
    'ENCERRADO': 'Expediente Encerrado'
};

// 1. Relógio Digital na Tela
function atualizarRelogio() {
    const agora = new Date();
    const relogio = document.getElementById('relogio-digital');
    const dataAtual = document.getElementById('data-atual');

    if (relogio && dataAtual) {
        const h = String(agora.getHours()).padStart(2, '0');
        const m = String(agora.getMinutes()).padStart(2, '0');
        const s = String(agora.getSeconds()).padStart(2, '0');
        relogio.innerText = `${h}:${m}:${s}`;
        
        const opcoes = { weekday: 'long', day: '2-digit', month: 'short' };
        dataAtual.innerText = agora.toLocaleDateString('pt-BR', opcoes);
    }
}
setInterval(atualizarRelogio, 1000);

// 2. Carregar o Ponto de Hoje do Servidor
async function carregarPontoHoje() {
    const msgDiv = document.getElementById('mensagem-ponto');
    const btn = document.getElementById('btn-ponto');

    try {
        const response = await fetch(`${API_URL}/ponto/hoje/${funcionarioId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        });
        
        if (response.ok) {
            const motor = await response.json();
            
            renderizarGridBatidas(motor);
            atualizarPainelProgresso(motor);

            // Ajusta o nome do botão inteligente e bloqueia se já fez 4 batidas
            if (btn) {
                const qtd = motor.quantidade_batidas !== undefined ? motor.quantidade_batidas : (motor.marcacoes ? motor.marcacoes.length : 0);
                
                if (motor.proxima === 'ENCERRADO' || qtd >= 4) {
                    btn.innerText = TEXTO_BOTAO_INTELIGENTE['ENCERRADO'];
                    btn.disabled = true;
                } else {
                    const proximaFase = motor.proxima || 'ENTRADA';
                    btn.innerText = TEXTO_BOTAO_INTELIGENTE[proximaFase] || 'Registrar Ponto Agora';
                    btn.disabled = false;
                }
            }
        } else {
            renderizarGridVazia();
        }
    } catch (err) {
        console.error("❌ Erro de comunicação com o servidor:", err);
        if (msgDiv) {
            msgDiv.style.color = 'var(--brand-red)';
            msgDiv.innerText = 'Servidor indisponível.';
        }
        renderizarGridVazia();
    }
}

// 3. Montar a Grade 2x2 com os Horários
function renderizarGridBatidas(motor) {
    const grid = document.getElementById('grid-batidas-hoje');
    const txtQtd = document.getElementById('txt-qtd-batidas');
    if (!grid) return;
    
    // Tenta pegar os valores do novo padrão ou do antigo
    let vEntrada = motor.entrada || (motor.marcacoes && motor.marcacoes[0] ? motor.marcacoes[0].hora : null);
    let vSaidaAlmoco = motor.saida_almoco || (motor.marcacoes && motor.marcacoes[1] ? motor.marcacoes[1].hora : null);
    let vRetornoAlmoco = motor.retorno_almoco || (motor.marcacoes && motor.marcacoes[2] ? motor.marcacoes[2].hora : null);
    let vSaida = motor.saida || (motor.marcacoes && motor.marcacoes[3] ? motor.marcacoes[3].hora : null);

    const valoresHoras = [vEntrada, vSaidaAlmoco, vRetornoAlmoco, vSaida];
    let htmlContent = '';

    const qtd = motor.quantidade_batidas !== undefined ? motor.quantidade_batidas : (motor.marcacoes ? motor.marcacoes.length : 0);
    if (txtQtd) txtQtd.innerText = `${qtd} Batidas`;

    for (let i = 0; i < 4; i++) {
        const rotulo = ROTULOS_PADRAO[i];
        const horaFormatada = valoresHoras[i];

        if (horaFormatada) {
            htmlContent += `
                <div class="batida-card registrada">
                    <div class="batida-label">${rotulo}</div>
                    <div class="batida-hora">${horaFormatada}</div>
                </div>
            `;
        } else {
            htmlContent += `
                <div class="batida-card pendente">
                    <div class="batida-label">${rotulo}</div>
                    <div class="batida-hora">--:--</div>
                </div>
            `;
        }
    }
    grid.innerHTML = htmlContent;
}

function renderizarGridVazia() {
    renderizarGridBatidas({
        entrada: null, saida_almoco: null, retorno_almoco: null, saida: null,
        horas_trabalhadas: "00:00", horas_restantes: "08:00", quantidade_batidas: 0,
        marcacoes: []
    });
}

// 4. Preencher Barra de Progresso e Horas
function atualizarPainelProgresso(motor) {
    const horasTrabalhadas = motor.horas_trabalhadas || "00:00";
    const horasRestantes = motor.horas_restantes || "08:00";

    const txtTrab = document.getElementById('horas-trabalhadas-texto');
    const txtRest = document.getElementById('horas-restantes-texto');
    const barraFill = document.getElementById('progress-bar-fill');
    const badgeSaldo = document.getElementById('badge-saldo-dia');

    if (txtTrab) txtTrab.innerText = horasTrabalhadas;
    if (txtRest) txtRest.innerText = horasRestantes;

    const [h, m] = horasTrabalhadas.split(':').map(Number);
    const minutosTrabalhados = (h * 60) + (m || 0);
    const percentual = Math.min(Math.round((minutosTrabalhados / META_JORNADA_MINUTOS) * 100), 100);
    
    if (barraFill) barraFill.style.width = `${percentual}%`;

    if (badgeSaldo) {
        if (horasRestantes !== "00:00") {
            badgeSaldo.innerText = `-${horasRestantes}`;
            badgeSaldo.className = 'badge-saldo saldo-negativo';
        } else {
            badgeSaldo.innerText = `+00:00`;
            badgeSaldo.className = 'badge-saldo saldo-positivo';
        }
    }
}

// 5. Iniciar o Registro e Pegar GPS
async function iniciarRegistroPonto() {
    const msgDiv = document.getElementById('mensagem-ponto');
    const btn = document.getElementById('btn-ponto');

    if (msgDiv) {
        msgDiv.style.color = 'var(--brand-blue)';
        msgDiv.innerText = '📍 Validando sua localização GPS...';
    }
    if (btn) btn.disabled = true;

    if (!navigator.geolocation) {
        if (msgDiv) {
            msgDiv.style.color = 'var(--brand-red)';
            msgDiv.innerText = '❌ Seu dispositivo não suporta geolocalização.';
        }
        if (btn) btn.disabled = false;
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (posicao) => {
            await enviarRegistroPonto(posicao.coords.latitude, posicao.coords.longitude);
            if (btn) btn.disabled = false;
        },
        async (erro) => {
            console.warn("GPS Indisponível ou Bloqueado:", erro);
            await enviarRegistroPonto(null, null); // Envia sem localização se falhar
            if (btn) btn.disabled = false;
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// 6. Enviar para a API o Ponto Batido
async function enviarRegistroPonto(lat, lng) {
    const msgDiv = document.getElementById('mensagem-ponto');
    if (msgDiv) {
        msgDiv.style.color = 'var(--brand-blue)';
        msgDiv.innerText = 'Registrando marcação...';
    }

    try {
        const btn = document.getElementById('btn-ponto');
        let tipoDeducido = 'ENTRADA';
        if (btn) {
            const btnText = btn.innerText;
            if (btnText.includes('Almoço') && btnText.includes('Saída')) tipoDeducido = 'SAIDA_ALMOCO';
            else if (btnText.includes('Retorno')) tipoDeducido = 'RETORNO_ALMOCO';
            else if (btnText.includes('Saída')) tipoDeducido = 'SAIDA';
        }

        const payload = {
            funcionario_id: funcionarioId,
            latitude: lat,
            longitude: lng,
            tipo: tipoDeducido 
        };

        const response = await fetch(`${API_URL}/ponto`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(payload)
        });

        const resData = await response.json();

        if (response.ok) {
            if (msgDiv) {
                msgDiv.style.color = 'var(--brand-green)';
                msgDiv.innerText = `✓ Ponto registrado com sucesso!`;
            }
            await carregarPontoHoje(); 
        } else {
            if (msgDiv) {
                msgDiv.style.color = 'var(--brand-red)';
                msgDiv.innerText = resData.erro || 'Erro ao registrar ponto.';
            }
            await carregarPontoHoje();
        }
    } catch (err) {
        console.error("Erro na requisição:", err);
        if (msgDiv) {
            msgDiv.style.color = 'var(--brand-red)';
            msgDiv.innerText = 'Erro de comunicação com o servidor.';
        }
    }
}

// 7. Botão Reset Dev (Somente para Testes)
async function resetarPontosHoje() {
    if (!confirm('Deseja limpar todos os registros de ponto de hoje para testes?')) return;
    const msgDiv = document.getElementById('mensagem-ponto');
    
    if (msgDiv) {
        msgDiv.style.color = 'var(--brand-purple)';
        msgDiv.innerText = '🔄 Resetando batidas do dia...';
    }

    try {
        const response = await fetch(`${API_URL}/ponto/reset-hoje?funcionarioId=${funcionarioId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        });

        if (response.ok) {
            if (msgDiv) {
                msgDiv.style.color = 'var(--brand-green)';
                msgDiv.innerText = '✓ Batidas zeradas com sucesso!';
            }
            carregarPontoHoje();
        } else {
            if (msgDiv) {
                msgDiv.style.color = 'var(--brand-red)';
                msgDiv.innerText = 'Erro ao resetar batidas.';
            }
        }
    } catch (err) {
        if (msgDiv) {
            msgDiv.style.color = 'var(--brand-red)';
            msgDiv.innerText = 'Erro de comunicação ao resetar.';
        }
    }
}

// ==========================================
// INICIALIZAÇÃO QUANDO A PÁGINA CARREGA
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    atualizarRelogio();
    
    const nomeColaborador = localStorage.getItem('funcionarioNome');
    const spanNome = document.getElementById('nome-usuario');
    if (spanNome && nomeColaborador) {
        spanNome.innerText = nomeColaborador;
    }
    
    // Se a tela tiver a div de batidas, carrega o ponto!
    if (document.getElementById('grid-batidas-hoje')) {
        carregarPontoHoje();
    }
});