VNC-hours
⚠️ PROJETO DIDÁTICO COM DADOS FICTÍCIOS
Este projeto foi desenvolvido exclusivamente para fins de aprendizado e demonstração. Todos os dados, horários, linhas e destinos são fictícios e não representam informações reais de transporte público.

Um painel digital em tempo real para exibição de partidas de ônibus, desenvolvido com HTML, CSS e JavaScript.

📌 AVISO IMPORTANTE
ESTE É UM PROJETO EDUCACIONAL

Todos os dados apresentados são fictícios

Horários e linhas são meramente ilustrativos

Desenvolvido para fins de aprendizado em programação web

Não utilize para informações reais de transporte

✨ Características
⏰ Tempo Real
Atualização automática a cada 10 segundos

🌐 Multilíngue
Alternância automática entre Português e Inglês

🎯 Status Inteligente
🟡 EMBARQUE IMEDIATO (0-4 minutos)

🟢 CONFIRMADO (5-6 minutos)

🔵 PREVISTO (7+ minutos)

⚫ PARTIU (após saída)

📱 Design Responsivo
Adaptável a diferentes tamanhos de tela

📊 Scroll Inteligente
Mostra 10 partidas inicialmente, scroll para ver mais

🗂️ Múltiplos Horários
Suporte a dias da semana, sábados e domingos/feriados

🚀 Como Usar
Estrutura de Arquivos
text
projeto-painel-onibus/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── schedule.js
│   ├── csvLoader.js
│   └── translations.js
└── data/
    ├── VNC_horario_seg_sex.csv
    ├── VNC_horario_sab.csv
    └── VNC_horario_dom_e_fer.csv
Formato dos Arquivos CSV
Os arquivos CSV devem seguir este formato (dados fictícios):

csv
PARADA,PARTIDA,BG_COLOR,TXT_COLOR,LINHA,DESTINO,CARRO
2,04:40,#FFD966,#000000,L42-VP2,ISOLINA MAZZEI (VIA SANTANA),48-02540
3,04:40,#806000,#FFFFFF,L003/10,VILA RICA,P 2034
5,04:40,#203764,#FFFFFF,L002/10,METRÔ SANTANA,P 2030
Colunas:

Coluna	Descrição
PARADA	Número da plataforma (fictício)
PARTIDA	Horário no formato HH:MM (fictício)
BG_COLOR	Cor de fundo da linha (hex)
TXT_COLOR	Cor do texto da linha (hex)
LINHA	Identificação da linha de ônibus (fictícia)
DESTINO	Destino final do ônibus (fictício)
CARRO	Identificação do veículo (fictícia)
🛠️ Instalação e Configuração
Clone ou baixe os arquivos para seu servidor web

Prepare os dados fictícios:

Coloque os arquivos CSV na pasta data/

Use os nomes corretos:

VNC_horario_seg_sex.csv (segunda a sexta - dados fictícios)

VNC_horario_sab.csv (sábados - dados fictícios)

VNC_horario_dom_e_fer.csv (domingos e feriados - dados fictícios)

Acesse o painel:

Abra index.html em um navegador web

Ou hospede em um servidor web

🎮 Funcionalidades
Cabeçalho Inteligente
⏰ Relógio digital em tempo real

📅 Data atual automática

🏢 Nome da estação centralizado

Controles Ocultos
🔘 SEM: Carrega horários de segunda a sexta (fictícios)

🔘 SAB: Carrega horários de sábado (fictícios)

🔘 DOM: Carrega horários de domingo/feriados (fictícios)

Os botões ficam semi-transparentes no canto superior esquerdo e aparecem ao passar o mouse

Sistema de Status
javascript
// Exemplo de temporização (horário atual: 15:00) - DADOS FICTÍCIOS
15:01 → 🟡 EMBARQUE IMEDIATO
15:05 → 🟢 CONFIRMADO  
15:06 → 🟢 CONFIRMADO
15:10 → 🔵 PREVISTO
15:15 → 🔵 PREVISTO
Internacionalização Automática
Alterna entre PT/EN a cada 30 segundos

Traduz todos os textos e status

Data formatada no idioma correto

🔧 Personalização
Cores e Estilo
Edite css/style.css para personalizar:

css
/* Cores principais */
body { background-color: #1a1a2e; }
table { background-color: #0a0e1a; }
th { background-color: #24272c; }

/* Cores dos status */
.immediate { background-color: #ffcc00; }
.confirmed { background-color: #28a745; }
.scheduled { background-color: #2d4059; }
Configurações
Em js/schedule.js:

javascript
this.config = {
    immediateThreshold: 4,    // Minutos para "Embarque Imediato"
    confirmedThreshold: 6,    // Minutos para "Confirmado"  
    updateInterval: 10000,    // Atualização a cada 10 segundos
    language: 'pt'            // Idioma inicial
};
Adicionar Novos Idiomas
Em js/translations.js:

javascript
const translations = {
    pt: { /* traduções em português */ },
    en: { /* traduções em inglês */ },
    es: { /* adicione espanhol aqui */ }
};
🐛 Solução de Problemas
Erro: "Cannot read properties of null"
Verifique se todos os IDs no HTML batem com os seletores no JavaScript

Confirme que os arquivos estão na estrutura correta de pastas

Dados Não Carregam
Verifique se os arquivos CSV estão na pasta data/

Confirme os nomes dos arquivos CSV

Verifique o console do navegador para erros de carregamento

Horários Não Atualizam
Confirme se o JavaScript está habilitado no navegador

Verifique se não há erros no console do desenvolvedor (F12)

📋 Requisitos
Navegador web moderno com JavaScript habilitado

Servidor web (recomendado para carregar arquivos CSV)

Arquivos CSV formatados corretamente (com dados fictícios)

🔄 Atualizações Futuras
Integração com API em tempo real (para projetos reais)

Notificações sonoras para embarque imediato

Modo tela cheia para displays públicos

Histórico de partidas

Previsão de tráfego em tempo real

📞 Suporte
Para issues e sugestões, verifique:

Console do navegador (F12) para erros

Formatação dos arquivos CSV

Estrutura de pastas do projeto

⚠️ LEMBRETE: Este projeto utiliza dados fictícios para fins educacionais. Não representa informações reais de transporte público.