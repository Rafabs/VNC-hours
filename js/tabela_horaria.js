let linhasDisponiveis = [];
let veiculosDisponiveis = [];
let horariosPredefinidos = [];
let escalaAtual = [];
let horariosCarregados = false;

// Carregar dados dos arquivos JSON
async function carregarDados() {
    try {
        // Carregar linhas
        const responseLinhas = await fetch('data/linhas.json');
        linhasDisponiveis = await responseLinhas.json();
        
        // Carregar veículos
        const responseVeiculos = await fetch('data/vehicles.json');
        veiculosDisponiveis = await responseVeiculos.json();
        
        // Carregar horários pré-definidos (MANTENDO os padrões CARRO X)
        const responseHorarios = await fetch('data/VNC_horario_seg_sex_model.json');
        horariosPredefinidos = await responseHorarios.json();
        
        console.log('Dados carregados:', {
            linhas: linhasDisponiveis.length,
            veiculos: veiculosDisponiveis.length,
            horarios: horariosPredefinidos.length
        });
        
        // Atualizar interface
        document.getElementById('tipoDiaAtual').textContent = 'Dia de Semana';
        document.getElementById('tituloTipoDia').textContent = 'Dia de Semana';
        
        // Atualizar preview do nome do arquivo
        atualizarPreviewNomeArquivo();
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        alert('Erro ao carregar os arquivos de dados. Verifique o console.');
    }
}

// Agrupar horários por linha e veículo
function agruparHorariosPorLinhaEVeiculo(horarios) {
    const agrupamento = {};
    
    horarios.forEach(horario => {
        const chave = `${horario.LINHA}-${horario.CARRO}`;
        if (!agrupamento[chave]) {
            agrupamento[chave] = {
                linha: horario.LINHA,
                veiculo: horario.CARRO,
                bg_color: horario.BG_COLOR,
                txt_color: horario.TXT_COLOR,
                horarios: []
            };
        }
        agrupamento[chave].horarios.push({
            partida: horario.PARTIDA,
            parada: horario.PARADA,
            destino: horario.DESTINO,
            duracao: horario.DURACAO
        });
    });
    
    return Object.values(agrupamento);
}

// Formatar data para o padrão dd_mm_yyyy - CORRIGIDA (problema de fuso horário)
function formatarDataParaArquivo(dataISO) {
    // Corrigir problema de fuso horário - garantir que use a data local
    const data = new Date(dataISO + 'T00:00:00'); // Forçar meia-noite no fuso local
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}_${mes}_${ano}`;
}

// Função alternativa mais robusta
function formatarDataParaArquivoCorrigida(dataISO) {
    // Dividir a data ISO manualmente para evitar problemas de fuso
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}_${mes}_${ano}`;
}

// Atualizar a função para usar a versão corrigida
function atualizarPreviewNomeArquivo() {
    const data = document.getElementById('dataEscala').value;
    const tipoDia = document.getElementById('tipoDia').value;
    
    if (data) {
        // Usar a versão corrigida
        const dataFormatada = formatarDataParaArquivoCorrigida(data);
        const nomeArquivo = `${dataFormatada}_tabela_horaria`;
        document.getElementById('previewNomeArquivo').textContent = nomeArquivo;
    } else {
        document.getElementById('previewNomeArquivo').textContent = 'selecione_uma_data';
    }
}

// Carregar escala pré-definida baseada no tipo de dia
async function carregarEscalaPredefinida() {
    const data = document.getElementById('dataEscala').value;
    if (!data) {
        alert('Selecione uma data!');
        return;
    }

    const tipoDia = document.getElementById('tipoDia').value;
    const filtroGaragem = document.getElementById('filtroGaragem').value;
    
    // Determinar qual arquivo carregar baseado no tipo de dia
    let arquivoHorarios = '';
    switch(tipoDia) {
        case 'semana':
            arquivoHorarios = 'data/VNC_horario_seg_sex_model.json';
            break;
        case 'sabado':
            arquivoHorarios = 'data/VNC_horario_sab_model.json';
            break;
        case 'domingo_feriado':
            arquivoHorarios = 'data/VNC_horario_dom_e_fer_model.json';
            break;
    }

    try {
        // Carregar horários específicos para o tipo de dia
        const response = await fetch(arquivoHorarios);
        horariosPredefinidos = await response.json();
        
        console.log(`Carregados ${horariosPredefinidos.length} horários para ${tipoDia} (padrões CARRO X mantidos)`);
        
        // Atualizar textos da interface
        const nomeTipoDia = obterNomeTipoDia(tipoDia);
        document.getElementById('tipoDiaAtual').textContent = nomeTipoDia;
        document.getElementById('tituloTipoDia').textContent = nomeTipoDia;

        carregarHorariosPredefinidos();
        carregarInterfaceAtribuicaoVeiculos(filtroGaragem, tipoDia);
        
        horariosCarregados = true;
    } catch (error) {
        console.error('Erro ao carregar horários:', error);
        alert('Erro ao carregar a tabela horária. Verifique o console.');
    }
}

// Adicione esta função para debug da interface
function debugInterfaceLinha(codigoLinha) {
    console.log(`🐛 DEBUG Interface linha ${codigoLinha}`);
    
    const selects = document.querySelectorAll(`select[data-linha="${codigoLinha}"]`);
    const assignedElements = document.querySelectorAll(`[id^="veiculo-assigned-${codigoLinha}-"]`);
    
    console.log(`Selects encontrados: ${selects.length}`);
    console.log(`Assigned elements encontrados: ${assignedElements.length}`);
    
    selects.forEach((select, i) => {
        const index = select.getAttribute('data-index');
        const assigned = document.getElementById(`veiculo-assigned-${codigoLinha}-${index}`);
        console.log(`Index ${index}: select.value="${select.value}", assigned.display="${assigned?.style.display}"`);
    });
    
    // Mostrar estado atual dos dados
    const horariosLinha = horariosPredefinidos.filter(h => h.LINHA === codigoLinha);
    console.log('Dados atuais:', horariosLinha.map(h => `${h.PARTIDA}: ${h.CARRO}`));
}

// Adicione um botão temporário no HTML para testar:
// <button onclick="debugInterfaceLinha('L42-VP2')">🐛 Debug L42-VP2</button>

// Visualizar todos os horários de um CARRO X específico - COM DEBUG
function visualizarCarroX(codigoLinha, carroPadrao) {
    console.log(`🔍 Visualizando ${carroPadrao} na linha ${codigoLinha}`);
    
    // Busca mais flexível para encontrar todos os CARRO X
    const horariosCarroX = horariosPredefinidos.filter(h => 
        h.LINHA === codigoLinha && 
        h.CARRO && 
        h.CARRO.toString().includes('CARRO') &&
        h.CARRO.toString().includes(carroPadrao.replace('CARRO', '').trim())
    );
    
    console.log(`📊 Total encontrado: ${horariosCarroX.length} horários`, 
        horariosCarroX.map(h => `${h.PARTIDA} - ${h.CARRO}`));
    
    horariosCarroX.sort((a, b) => a.PARTIDA.localeCompare(b.PARTIDA));
    
    const info = `
        <h4>🚗 ${carroPadrao} - Linha ${codigoLinha}</h4>
        <p><strong>Total de horários encontrados:</strong> ${horariosCarroX.length}</p>
        <p><strong>Debug:</strong> ${horariosCarroX.map(h => `${h.PARTIDA} (${h.CARRO})`).join(', ')}</p>
        <div style="max-height: 400px; overflow-y: auto;">
            ${horariosCarroX.map(horario => `
                <div class="horario-padrao-item">
                    <strong>${horario.PARTIDA}</strong> - Parada ${horario.PARADA}
                    <br><small>${horario.DESTINO} | ${horario.DURACAO}min</small>
                    <br><small style="color: #e67e22;">CARRO: ${horario.CARRO}</small>
                </div>
            `).join('')}
        </div>
    `;
    
    // Mostrar em modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            ${info}
            <div class="modal-actions">
                <button class="btn-info" onclick="fecharModal()">Fechar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Função para diagnosticar os CARRO X
function diagnosticarCarroX() {
    console.log("🔍 DIAGNÓSTICO DOS CARRO X:");
    
    const todosCarroX = horariosPredefinidos.filter(h => 
        h.CARRO && h.CARRO.toString().includes('CARRO')
    );
    
    console.log(`Total de horários com CARRO X: ${todosCarroX.length}`);
    
    // Agrupar por linha e CARRO X
    const agrupados = {};
    todosCarroX.forEach(horario => {
        const chave = `${horario.LINHA}-${horario.CARRO}`;
        if (!agrupados[chave]) {
            agrupados[chave] = [];
        }
        agrupados[chave].push(horario.PARTIDA);
    });
    
    console.log("Agrupamento por CARRO X:", agrupados);
    
    // Mostrar em alerta
    let mensagem = "🔍 DIAGNÓSTICO CARRO X:\n\n";
    Object.keys(agrupados).forEach(chave => {
        const [linha, carro] = chave.split('-');
        mensagem += `${linha} - ${carro}: ${agrupados[chave].length} horários\n`;
        mensagem += `  Horários: ${agrupados[chave].join(', ')}\n\n`;
    });
    
    alert(mensagem);
}

// Adicione um botão para testar no HTML temporariamente:
// <button onclick="diagnosticarCarroX()">🔍 Diagnosticar CARRO X</button>

// Verificar disponibilidade de veículos
function verificarDisponibilidade() {
    const data = document.getElementById('dataEscala').value;
    const tipoDia = document.getElementById('tipoDia').value;
    const filtroGaragem = document.getElementById('filtroGaragem').value;
    
    if (!data) {
        alert('Selecione uma data primeiro!');
        return;
    }
    
    if (!horariosCarregados) {
        alert('Carregue a tabela horária primeiro!');
        return;
    }
    
    // Filtrar veículos disponíveis
    const veiculosFiltrados = veiculosDisponiveis.filter(veiculo => 
        veiculo.STATUS_OP === 'EM OPERAÇÃO' && 
        (!filtroGaragem || veiculo.GARAGEM === filtroGaragem)
    );
    
    // Contar horários sem veículo atribuído (apenas os que não têm prefixo real)
    const horariosSemVeiculo = horariosPredefinidos.filter(h => 
        !h.CARRO || 
        h.CARRO.startsWith('CARRO ') || 
        !h.CARRO.trim()
    );
    const horariosComVeiculo = horariosPredefinidos.filter(h => 
        h.CARRO && 
        !h.CARRO.startsWith('CARRO ') && 
        h.CARRO.trim()
    );
    
    // Agrupar por linha
    const linhasComHorarios = {};
    horariosPredefinidos.forEach(horario => {
        if (!linhasComHorarios[horario.LINHA]) {
            linhasComHorarios[horario.LINHA] = {
                bg_color: horario.BG_COLOR,
                txt_color: horario.TXT_COLOR,
                total: 0,
                com_veiculo: 0,
                sem_veiculo: 0
            };
        }
        linhasComHorarios[horario.LINHA].total++;
        if (horario.CARRO && !horario.CARRO.startsWith('CARRO ') && horario.CARRO.trim()) {
            linhasComHorarios[horario.LINHA].com_veiculo++;
        } else {
            linhasComHorarios[horario.LINHA].sem_veiculo++;
        }
    });
    
    // Criar relatório
    let html = `
        <div class="info-box">
            <h3>📊 Relatório de Disponibilidade</h3>
            <p><strong>Data:</strong> ${formatarData(data)}</p>
            <p><strong>Tipo de Dia:</strong> ${obterNomeTipoDia(tipoDia)}</p>
            <p><strong>Garagem:</strong> ${filtroGaragem || 'Todas'}</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin: 20px 0;">
            <div class="stat-card" style="background: #e8f5e8; padding: 15px; border-radius: 8px; text-align: center;">
                <h3 style="margin: 0; color: #27ae60;">${veiculosFiltrados.length}</h3>
                <p style="margin: 5px 0; font-weight: bold;">Veículos Disponíveis</p>
            </div>
            <div class="stat-card" style="background: #e3f2fd; padding: 15px; border-radius: 8px; text-align: center;">
                <h3 style="margin: 0; color: #2196f3;">${horariosPredefinidos.length}</h3>
                <p style="margin: 5px 0; font-weight: bold;">Total de Horários</p>
            </div>
            <div class="stat-card" style="background: #fff3cd; padding: 15px; border-radius: 8px; text-align: center;">
                <h3 style="margin: 0; color: #856404;">${horariosSemVeiculo.length}</h3>
                <p style="margin: 5px 0; font-weight: bold;">Horários sem Veículo</p>
            </div>
            <div class="stat-card" style="background: #d4edda; padding: 15px; border-radius: 8px; text-align: center;">
                <h3 style="margin: 0; color: #155724;">${horariosComVeiculo.length}</h3>
                <p style="margin: 5px 0; font-weight: bold;">Horários com Veículo</p>
            </div>
        </div>
    `;
    
    // Adicionar progresso geral
    const percentualCompleto = ((horariosComVeiculo.length / horariosPredefinidos.length) * 100).toFixed(1);
    html += `
        <div style="margin: 20px 0;">
            <h4>📈 Progresso Geral da Atribuição</h4>
            <div style="background: #f8f9fa; border-radius: 10px; padding: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>${percentualCompleto}% completo</span>
                    <span>${horariosComVeiculo.length}/${horariosPredefinidos.length}</span>
                </div>
                <div style="background: #e9ecef; border-radius: 5px; height: 20px;">
                    <div style="background: #28a745; height: 100%; border-radius: 5px; width: ${percentualCompleto}%; transition: width 0.3s;"></div>
                </div>
            </div>
        </div>
    `;
    
    // Listar linhas com status
    html += `<h4>🚏 Status por Linha</h4>`;
    html += `<div style="max-height: 400px; overflow-y: auto;">`;
    
    Object.keys(linhasComHorarios).sort().forEach(linhaCodigo => {
        const linhaData = linhasComHorarios[linhaCodigo];
        const percentualLinha = ((linhaData.com_veiculo / linhaData.total) * 100).toFixed(1);
        const statusColor = percentualLinha == 100 ? '#28a745' : percentualLinha > 50 ? '#ffc107' : '#dc3545';
        const statusIcon = percentualLinha == 100 ? '✅' : percentualLinha > 50 ? '🟡' : '🔴';
        
        html += `
            <div class="linha-status" style="border-left: 4px solid ${statusColor}; padding: 10px; margin: 8px 0; background: white; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${linhaCodigo}</strong> ${statusIcon}
                        <br><small>${linhaData.com_veiculo}/${linhaData.total} horários atribuídos</small>
                    </div>
                    <div style="text-align: right;">
                        <strong style="color: ${statusColor};">${percentualLinha}%</strong>
                    </div>
                </div>
                <div style="background: #e9ecef; border-radius: 3px; height: 6px; margin-top: 5px;">
                    <div style="background: ${statusColor}; height: 100%; border-radius: 3px; width: ${percentualLinha}%;"></div>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    
    // Mostrar veículos disponíveis
    html += `
        <div style="margin-top: 20px;">
            <h4>🚌 Veículos Disponíveis (${veiculosFiltrados.length})</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; max-height: 200px; overflow-y: auto;">
                ${veiculosFiltrados.map(veiculo => {
                    const disponivel = verificarDisponibilidadeVeiculo(horario, veiculo.PREFIXO);
                    const motivoIndisponivel = !disponivel ? getMotivoIndisponibilidade(horario, veiculo.PREFIXO) : '';
                    
                    return `
                        <option value="${veiculo.PREFIXO}" 
                                ${horario.CARRO === veiculo.PREFIXO ? 'selected' : ''}
                                ${!disponivel ? 'disabled style="color: #ccc; background: #f8f8f8;"' : ''}>
                            ${veiculo.PREFIXO} - ${veiculo.TIPO} - ${veiculo.GARAGEM}
                            ${!disponivel ? ` (🚫 ${motivoIndisponivel})` : ''}
                        </option>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    // Mostrar em modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            ${html}
            <div class="modal-actions">
                <button class="btn-info" onclick="fecharModal()">Fechar</button>
                <button class="btn-success" onclick="focarHorariosSemVeiculo()">🎯 Focar em Horários sem Veículo</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Obter motivo da indisponibilidade do veículo
function getMotivoIndisponibilidade(horarioAtual, veiculoPrefix) {
    // Verificar conflito na mesma linha primeiro
    const conflitoCarroX = verificarConflitoCarroX(horarioAtual.LINHA, veiculoPrefix);
    if (conflitoCarroX.encontrado) {
        return `em uso no ${conflitoCarroX.carroX}`;
    }
    
    // Verificar conflito de horário
    const conflitoHorario = verificarConflitoHorarioEntreLinhas(veiculoPrefix, horarioAtual);
    if (conflitoHorario.conflito) {
        const [linhaConflito] = conflitoHorario.mensagem.match(/linha\s+([^\s]+)/) || ['outra linha'];
        return `ocupado às ${horarioAtual.PARTIDA}`;
    }
    
    return "indisponível";
}

// Verificar disponibilidade de um veículo específico considerando horários
function verificarDisponibilidadeVeiculo(horarioAtual, veiculoPrefix) {
    // Verificar conflito na mesma linha (CARRO X)
    const conflitoCarroX = verificarConflitoCarroX(horarioAtual.LINHA, veiculoPrefix);
    if (conflitoCarroX.encontrado) {
        return false;
    }
    
    // Verificar conflito de horário entre linhas
    const conflitoHorario = verificarConflitoHorarioEntreLinhas(veiculoPrefix, horarioAtual);
    if (conflitoHorario.conflito) {
        return false;
    }
    
    return true;
}

// Função para focar nos horários sem veículo
function focarHorariosSemVeiculo() {
    fecharModal();
    
    // Encontrar a primeira linha com horários sem veículo
    const linhasComHorarios = {};
    horariosPredefinidos.forEach(horario => {
        if (!linhasComHorarios[horario.LINHA]) {
            linhasComHorarios[horario.LINHA] = {
                sem_veiculo: 0
            };
        }
        if (!horario.CARRO || horario.CARRO.startsWith('CARRO ') || !horario.CARRO.trim()) {
            linhasComHorarios[horario.LINHA].sem_veiculo++;
        }
    });
    
    // Encontrar linha com mais horários sem veículo
    let linhaParaFocar = null;
    let maxSemVeiculo = 0;
    
    Object.keys(linhasComHorarios).forEach(linha => {
        if (linhasComHorarios[linha].sem_veiculo > maxSemVeiculo) {
            maxSemVeiculo = linhasComHorarios[linha].sem_veiculo;
            linhaParaFocar = linha;
        }
    });
    
    if (linhaParaFocar) {
        // Rolar até a linha
        const elementoLinha = document.querySelector(`[id*="resumo-${linhaParaFocar}"]`);
        if (elementoLinha) {
            elementoLinha.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Destacar visualmente
            elementoLinha.parentElement.parentElement.style.background = '#fff3cd';
            elementoLinha.parentElement.parentElement.style.border = '2px solid #ffc107';
            
            setTimeout(() => {
                elementoLinha.parentElement.parentElement.style.background = '';
                elementoLinha.parentElement.parentElement.style.border = '';
            }, 3000);
            
            alert(`🎯 Focando na linha ${linhaParaFocar} com ${maxSemVeiculo} horários sem veículo`);
        }
    } else {
        alert('✅ Todos os horários já têm veículos atribuídos!');
    }
}



// Carregar horários pré-definidos na interface
function carregarHorariosPredefinidos() {
    const container = document.getElementById('listaHorariosPredefinidos');
    
    if (horariosPredefinidos.length === 0) {
        container.innerHTML = '<p>Nenhum horário pré-definido carregado.</p>';
        return;
    }
    
    // Agrupar horários por linha
    const horariosPorLinha = {};
    horariosPredefinidos.forEach(horario => {
        if (!horariosPorLinha[horario.LINHA]) {
            horariosPorLinha[horario.LINHA] = [];
        }
        horariosPorLinha[horario.LINHA].push(horario);
    });

    let html = '';
    
    Object.keys(horariosPorLinha).forEach(linhaCodigo => {
        const horariosLinha = horariosPorLinha[linhaCodigo];
        
        html += `
            <div class="linha-card">
                <h4 style="margin: 0; color: #2c3e50;">
                    <span class="color-indicator" style="background-color: ${horariosLinha[0].BG_COLOR || '#cccccc'};"></span>
                    ${linhaCodigo}
                </h4>
                <div style="font-size: 0.9em; color: #7f8c8d;">
                    ${horariosLinha.length} partidas programadas
                </div>
                <div style="margin-top: 10px;">
                    ${horariosLinha.map(horario => `
                        <div class="horario-item">
                            <div class="horario-info">
                                <strong>${horario.PARTIDA}</strong> - Parada ${horario.PARADA} 
                                <br><small>${horario.DESTINO} | Duração: ${horario.DURACAO}min</small>
                                ${horario.CARRO && horario.CARRO.startsWith('CARRO ') ? 
                                    `<br><small style="color: #e67e22; font-weight: bold;">🚗 ${horario.CARRO}</small>` : 
                                    ''
                                }
                            </div>
                            <div class="horario-actions">
                                <span style="background: #f8f9fa; color: #6c757d; padding: 2px 8px; border-radius: 3px; font-size: 0.8em;">
                                    ${horario.CARRO && !horario.CARRO.startsWith('CARRO ') ? `✅ ${horario.CARRO}` : 
                                     horario.CARRO && horario.CARRO.startsWith('CARRO ') ? `🚗 ${horario.CARRO} (grupo)` : 'Aguardando veículo'}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html || '<p>Nenhum horário pré-definido encontrado para este tipo de dia.</p>';
}

// Remover veículo de um horário específico - COM REMOÇÃO POR CARRO X CORRIGIDA
function removerVeiculoHorario(codigoLinha, index) {
    const horariosLinha = horariosPredefinidos.filter(h => h.LINHA === codigoLinha);
    
    if (index >= horariosLinha.length) return;
    
    const horarioAtual = horariosLinha[index];
    if (!horarioAtual) return;
    
    const carroPadrao = horarioAtual.CARRO;
    
    console.log(`🗑️ Removendo veículo do ${carroPadrao} na linha ${codigoLinha}`);
    
    // Se há um padrão CARRO X, remover de todos os horários com mesmo padrão
    if (carroPadrao && carroPadrao.toString().includes('CARRO')) {
        // Encontrar todos os horários desta linha com o mesmo CARRO X
        const horariosDoCarroX = horariosPredefinidos.filter(h => 
            h.LINHA === codigoLinha && 
            h.CARRO && 
            h.CARRO.toString().includes('CARRO') &&
            h.CARRO.toString().includes(carroPadrao.replace('CARRO', '').trim())
        );
        
        console.log(`📋 Encontrados ${horariosDoCarroX.length} horários para remover:`, 
            horariosDoCarroX.map(h => `${h.PARTIDA} - ${h.CARRO}`));
        
        // Remover veículo de todos os horários do CARRO X
        horariosDoCarroX.forEach(horario => {
            const indexReal = horariosPredefinidos.findIndex(h => 
                h.LINHA === codigoLinha && 
                h.PARTIDA === horario.PARTIDA && 
                h.PARADA === horario.PARADA &&
                h.DESTINO === horario.DESTINO
            );
            
            if (indexReal !== -1) {
                horariosPredefinidos[indexReal].CARRO = carroPadrao; // Volta para "CARRO 1", etc.
                atualizarInterfaceHorarioIndividual(codigoLinha, indexReal, '');
                console.log(`✅ Removido veículo de ${horario.PARTIDA}`);
            }
        });
        
        console.log(`🗑️ Veículo removido de ${horariosDoCarroX.length} horários do ${carroPadrao}`);
    } else {
        // Remoção individual
        horarioAtual.CARRO = '';
        atualizarInterfaceHorarioIndividual(codigoLinha, index, '');
        console.log(`✅ Remoção individual de ${horarioAtual.PARTIDA}`);
    }
    
    // Atualizar resumo
    document.getElementById(`resumo-${codigoLinha}`).innerHTML = gerarResumoAtribuicao(codigoLinha, horariosLinha);
}

// Verificar conflito de horários entre diferentes linhas
function verificarConflitoHorarioEntreLinhas(veiculoPrefix, novoHorario) {
    console.log(`🔍 Verificando conflito de horário para ${veiculoPrefix} em ${novoHorario.PARTIDA}`);
    
    // Obter todos os horários já atribuídos a este veículo (em TODAS as linhas)
    const horariosAtribuidos = horariosPredefinidos.filter(h => 
        h.CARRO === veiculoPrefix && 
        h.CARRO && 
        !h.CARRO.toString().includes('CARRO') // É um veículo real
    );
    
    if (horariosAtribuidos.length === 0) {
        console.log(`✅ Veículo ${veiculoPrefix} disponível - nenhum horário atribuído`);
        return { conflito: false };
    }
    
    // Calcular início e fim do novo horário
    const [novoHora, novoMinuto] = novoHorario.PARTIDA.split(':').map(Number);
    const novoInicio = novoHora * 60 + novoMinuto;
    const novoFim = novoInicio + novoHorario.DURACAO;
    
    console.log(`📊 Novo horário: ${novoHorario.PARTIDA} (${novoInicio}min) por ${novoHorario.DURACAO}min → até ${formatarMinutosParaHora(novoFim)}`);
    
    // Verificar cada horário já atribuído
    for (const horarioExistente of horariosAtribuidos) {
        const [existenteHora, existenteMinuto] = horarioExistente.PARTIDA.split(':').map(Number);
        const existenteInicio = existenteHora * 60 + existenteMinuto;
        const existenteFim = existenteInicio + horarioExistente.DURACAO;
        
        console.log(`📋 Comparando com: ${horarioExistente.PARTIDA} (${existenteInicio}min) por ${horarioExistente.DURACAO}min → até ${formatarMinutosParaHora(existenteFim)} [${horarioExistente.LINHA}]`);
        
        // Verificar sobreposição
        const haSobreposicao = (novoInicio >= existenteInicio && novoInicio < existenteFim) ||
                              (existenteInicio >= novoInicio && existenteInicio < novoFim);
        
        if (haSobreposicao) {
            console.log(`🚫 CONFLITO DETECTADO: ${veiculoPrefix} está em ${horarioExistente.LINHA} das ${horarioExistente.PARTIDA} às ${formatarMinutosParaHora(existenteFim)}`);
            return {
                conflito: true,
                mensagem: `Conflito de horário: Veículo ${veiculoPrefix} já está em operação na linha ${horarioExistente.LINHA} das ${horarioExistente.PARTIDA} às ${formatarMinutosParaHora(existenteFim)} (${horarioExistente.DURACAO}min)\n\nNova viagem: ${novoHorario.PARTIDA} por ${novoHorario.DURACAO}min na linha ${novoHorario.LINHA}`,
                horarioConflitante: horarioExistente
            };
        }
    }
    
    console.log(`✅ Veículo ${veiculoPrefix} disponível para ${novoHorario.PARTIDA} - sem conflitos`);
    return { conflito: false };
}

// Adicionar estas funções ao tabela_horaria.js

// 1. CORREÇÃO: Atribuição completa com um clique
function atribuirVeiculoParaCarroXCompleto(codigoLinha, carroPadrao, veiculoPrefix) {
    console.log(`🎯 Atribuição COMPLETA do ${carroPadrao} na linha ${codigoLinha}`);
    
    // VERIFICAR CONFLITO DE CARRO X NA MESMA LINHA
    const conflitoCarroX = verificarConflitoCarroX(codigoLinha, veiculoPrefix);
    if (conflitoCarroX.encontrado) {
        alert(`🚫 CONFLITO: O veículo ${veiculoPrefix} já está atribuído ao ${conflitoCarroX.carroX} nesta linha!\n\nHorários: ${conflitoCarroX.horarios.join(', ')}`);
        return false;
    }
    
    // Encontrar todos os horários desta linha com o mesmo CARRO X
    const horariosDoCarroX = horariosPredefinidos.filter(h => 
        h.LINHA === codigoLinha && 
        h.CARRO && 
        h.CARRO.toString().includes('CARRO') &&
        h.CARRO.toString().includes(carroPadrao.replace('CARRO', '').trim())
    );
    
    console.log(`📋 Encontrados ${horariosDoCarroX.length} horários do ${carroPadrao}`);
    
    if (horariosDoCarroX.length === 0) {
        alert(`⚠️ Nenhum horário encontrado para ${carroPadrao} na linha ${codigoLinha}`);
        return false;
    }
    
    // VERIFICAR CONFLITOS DE HORÁRIO PARA TODOS OS HORÁRIOS DO GRUPO
    const horariosComConflito = [];
    
    for (const horario of horariosDoCarroX) {
        const conflitoHorario = verificarConflitoHorarioEntreLinhas(veiculoPrefix, horario);
        if (conflitoHorario.conflito) {
            horariosComConflito.push({
                partida: horario.PARTIDA,
                mensagem: conflitoHorario.mensagem
            });
        }
    }
    
    if (horariosComConflito.length > 0) {
        const mensagemConflitos = horariosComConflito.map(c => `• ${c.partida}: ${c.mensagem.split('\n')[0]}`).join('\n');
        alert(`🚫 CONFLITOS DE HORÁRIO ENCONTRADOS!\n\nVeículo ${veiculoPrefix} não pode ser atribuído devido aos seguintes conflitos:\n\n${mensagemConflitos}\n\nAtribuição cancelada.`);
        return false;
    }
    
    let totalAtribuidos = 0;
    const resultados = [];
    
    // Atribuir o veículo a TODOS os horários do CARRO X de uma vez
    horariosDoCarroX.forEach(horario => {
        // Encontrar índice real no array principal
        const indexReal = horariosPredefinidos.findIndex(h => 
            h.LINHA === codigoLinha && 
            h.PARTIDA === horario.PARTIDA && 
            h.PARADA === horario.PARADA &&
            h.DESTINO === horario.DESTINO
        );
        
        if (indexReal !== -1) {
            const veiculoAntigo = horariosPredefinidos[indexReal].CARRO;
            horariosPredefinidos[indexReal].CARRO = veiculoPrefix;
            totalAtribuidos++;
            
            resultados.push({
                partida: horario.PARTIDA,
                index: indexReal,
                sucesso: true
            });
            
            console.log(`✅ Atribuído ${veiculoPrefix} para ${horario.PARTIDA}`);
        } else {
            resultados.push({
                partida: horario.PARTIDA,
                sucesso: false,
                erro: "Índice não encontrado"
            });
        }
    });
    
    // ATUALIZAR INTERFACE COMPLETA DE UMA VEZ
    forcarAtualizacaoCompletaLinha(codigoLinha);
    
    console.log(`🎯 Veículo ${veiculoPrefix} atribuído para ${totalAtribuidos} horários do ${carroPadrao}`);
    
    if (totalAtribuidos === horariosDoCarroX.length) {
        alert(`✅ Atribuição COMPLETA do ${carroPadrao}!\n\nVeículo ${veiculoPrefix} atribuído para ${totalAtribuidos} horários na linha ${codigoLinha}`);
    } else {
        alert(`⚠️ Atribuição PARCIAL do ${carroPadrao}\n\n✅ ${totalAtribuidos} de ${horariosDoCarroX.length} horários atribuídos\n❌ ${horariosDoCarroX.length - totalAtribuidos} horários com erro`);
    }
    
    return totalAtribuidos > 0;
}

// Função para forçar atualização completa da linha
function forcarAtualizacaoCompletaLinha(codigoLinha) {
    console.log(`🔄 Forçando atualização COMPLETA da linha ${codigoLinha}`);
    
    const horariosLinha = horariosPredefinidos.filter(h => h.LINHA === codigoLinha);
    
    // Atualizar TODOS os elementos da linha
    horariosLinha.forEach((horario, index) => {
        const select = document.querySelector(`select[data-linha="${codigoLinha}"][data-index="${index}"]`);
        const veiculoAssigned = document.getElementById(`veiculo-assigned-${codigoLinha}-${index}`);
        
        if (select && veiculoAssigned) {
            if (horario.CARRO && !horario.CARRO.startsWith('CARRO ')) {
                // Tem veículo real atribuído
                select.value = horario.CARRO;
                const span = veiculoAssigned.querySelector('span');
                if (span) {
                    span.textContent = `✅ ${horario.CARRO}`;
                }
                veiculoAssigned.style.display = 'flex';
                select.style.display = 'none';
            } else {
                // Não tem veículo ou é CARRO X
                veiculoAssigned.style.display = 'none';
                select.style.display = 'block';
                if (horario.CARRO && horario.CARRO.startsWith('CARRO ')) {
                    select.value = ''; // Limpar seleção para CARRO X
                }
            }
        }
    });
    
    // Atualizar o resumo
    document.getElementById(`resumo-${codigoLinha}`).innerHTML = gerarResumoAtribuicao(codigoLinha, horariosLinha);
    
    console.log(`✅ Interface da linha ${codigoLinha} completamente atualizada`);
}

// 2. SISTEMA DE EXCLUSÃO DE LINHAS
let linhasExcluidas = JSON.parse(localStorage.getItem('linhasExcluidas')) || {};

// Função para excluir linha da escala atual
function excluirLinha(codigoLinha) {
    const data = document.getElementById('dataEscala').value;
    const tipoDia = document.getElementById('tipoDia').value;
    
    if (!data) {
        alert('Selecione uma data primeiro!');
        return;
    }
    
    const chaveExclusao = `${data}_${tipoDia}`;
    
    if (!linhasExcluidas[chaveExclusao]) {
        linhasExcluidas[chaveExclusao] = [];
    }
    
    if (linhasExcluidas[chaveExclusao].includes(codigoLinha)) {
        alert(`A linha ${codigoLinha} já está excluída para esta data!`);
        return;
    }
    
    const confirmar = confirm(`Deseja excluir a linha ${codigoLinha} da escala de ${formatarData(data)} (${obterNomeTipoDia(tipoDia)})?\n\nEsta linha não aparecerá na escala deste dia, mas permanecerá no arquivo JSON.`);
    
    if (confirmar) {
        linhasExcluidas[chaveExclusao].push(codigoLinha);
        localStorage.setItem('linhasExcluidas', JSON.stringify(linhasExcluidas));
        
        // Recarregar a interface
        const filtroGaragem = document.getElementById('filtroGaragem').value;
        carregarInterfaceAtribuicaoVeiculos(filtroGaragem, tipoDia);
        
        alert(`✅ Linha ${codigoLinha} excluída da escala!\n\nEla não aparecerá mais na escala de ${formatarData(data)}.`);
    }
}

// Função para reativar linha excluída
function reativarLinha(codigoLinha) {
    const data = document.getElementById('dataEscala').value;
    const tipoDia = document.getElementById('tipoDia').value;
    
    if (!data) {
        alert('Selecione uma data primeiro!');
        return;
    }
    
    const chaveExclusao = `${data}_${tipoDia}`;
    
    if (!linhasExcluidas[chaveExclusao] || !linhasExcluidas[chaveExclusao].includes(codigoLinha)) {
        alert(`A linha ${codigoLinha} não está excluída para esta data!`);
        return;
    }
    
    linhasExcluidas[chaveExclusao] = linhasExcluidas[chaveExclusao].filter(linha => linha !== codigoLinha);
    localStorage.setItem('linhasExcluidas', JSON.stringify(linhasExcluidas));
    
    // Recarregar a interface
    const filtroGaragem = document.getElementById('filtroGaragem').value;
    carregarInterfaceAtribuicaoVeiculos(filtroGaragem, tipoDia);
    
    alert(`✅ Linha ${codigoLinha} reativada na escala!`);
}

// Função para gerenciar linhas excluídas
function gerenciarLinhasExcluidas() {
    const data = document.getElementById('dataEscala').value;
    const tipoDia = document.getElementById('tipoDia').value;
    
    if (!data) {
        alert('Selecione uma data primeiro!');
        return;
    }
    
    const chaveExclusao = `${data}_${tipoDia}`;
    const linhasExcluidasHoje = linhasExcluidas[chaveExclusao] || [];
    
    let html = `
        <h3>🚫 Linhas Excluídas - ${formatarData(data)}</h3>
        <p><strong>Tipo de Dia:</strong> ${obterNomeTipoDia(tipoDia)}</p>
        <div class="info-box">
            💡 <strong>Instruções:</strong> Linhas excluídas não aparecem na escala do dia selecionado, mas permanecem no arquivo JSON.
        </div>
    `;
    
    if (linhasExcluidasHoje.length === 0) {
        html += `<p style="text-align: center; color: #6c757d; padding: 20px;">Nenhuma linha excluída para esta data.</p>`;
    } else {
        html += `
            <div style="max-height: 300px; overflow-y: auto; margin: 15px 0;">
                ${linhasExcluidasHoje.map(linha => `
                    <div class="linha-excluida-item" style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 10px; margin: 5px 0; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${linha}</strong>
                            <br><small style="color: #721c24;">Excluída da escala</small>
                        </div>
                        <button class="btn-success" onclick="reativarLinha('${linha}')" style="font-size: 0.8em; padding: 5px 10px;">✅ Reativar</button>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Modal de gerenciamento
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            ${html}
            <div class="modal-actions">
                <button class="btn-info" onclick="fecharModal()">Fechar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Modificar a função carregarInterfaceAtribuicaoVeiculos para considerar linhas excluídas
function carregarInterfaceAtribuicaoVeiculos(filtroGaragem, tipoDia) {
    const container = document.getElementById('linhasContainer');
    
    // Agrupar horários por linha
    const linhasComHorarios = {};
    horariosPredefinidos.forEach(horario => {
        if (!linhasComHorarios[horario.LINHA]) {
            linhasComHorarios[horario.LINHA] = {
                bg_color: horario.BG_COLOR,
                txt_color: horario.TXT_COLOR,
                horarios: []
            };
        }
        linhasComHorarios[horario.LINHA].horarios.push(horario);
    });

    // Verificar linhas excluídas para esta data
    const data = document.getElementById('dataEscala').value;
    const chaveExclusao = `${data}_${tipoDia}`;
    const linhasExcluidasHoje = linhasExcluidas[chaveExclusao] || [];

    // Filtra veículos por garagem e status
    const veiculosFiltrados = veiculosDisponiveis.filter(veiculo => 
        veiculo.STATUS_OP === 'EM OPERAÇÃO' && 
        (!filtroGaragem || veiculo.GARAGEM === filtroGaragem)
    );

    container.innerHTML = `
        <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0;">🚏 Linhas com Horários Programados - ${Object.keys(linhasComHorarios).length} linhas</h3>
            <button class="btn-warning" onclick="gerenciarLinhasExcluidas()" style="margin-left: auto;">🚫 Gerenciar Linhas Excluídas</button>
        </div>
        <p>📅 Data: ${formatarData(data)} | 🗓️ Tipo: ${obterNomeTipoDia(tipoDia)} | 🏠 Garagem: ${filtroGaragem || 'Todas'}</p>
        <p>🚌 Veículos disponíveis: ${veiculosFiltrados.length}</p>
        ${linhasExcluidasHoje.length > 0 ? 
            `<div class="info-box" style="background: #fff3cd; border-color: #ffeaa7;">
                ⚠️ <strong>${linhasExcluidasHoje.length} linha(s) excluída(s):</strong> ${linhasExcluidasHoje.join(', ')}
            </div>` : 
            ''
        }
        <div class="info-box">
            💡 <strong>Instruções:</strong> Selecione os veículos para cada horário. Os horários agrupados por "CARRO X" serão atribuídos em conjunto.
        </div>
    `;
    
    Object.keys(linhasComHorarios).forEach(codigoLinha => {
        // Pular linhas excluídas
        if (linhasExcluidasHoje.includes(codigoLinha)) {
            return;
        }
        
        const linhaData = linhasComHorarios[codigoLinha];
        const horariosLinha = linhaData.horarios;
        
        // Ordenar horários por partida
        horariosLinha.sort((a, b) => a.PARTIDA.localeCompare(b.PARTIDA));
        
        const card = document.createElement('div');
        card.className = `linha-card ${tipoDia}`;
        card.innerHTML = `
            <div style="display: flex; justify-content: between; align-items: center;">
                <div style="flex: 1;">
                    <h4 style="margin: 0; color: #2c3e50;">
                        <span class="color-indicator" style="background-color: ${linhaData.bg_color || '#cccccc'}; color: ${linhaData.txt_color || '#000000'}; padding: 2px 8px; border-radius: 3px; margin-right: 10px;">
                            ${codigoLinha}
                        </span>
                        Atribuição de Veículos
                    </h4>
                    <div style="font-size: 0.9em; color: #7f8c8d;">
                        ${horariosLinha.length} partidas programadas
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-info" onclick="mostrarInfoDuracao('${codigoLinha}')" style="font-size: 0.8em; padding: 5px 10px;">
                        📊 Ver Durações
                    </button>
                    <button class="btn-warning" onclick="excluirLinha('${codigoLinha}')" style="font-size: 0.8em; padding: 5px 10px;" title="Excluir linha da escala atual">
                        🚫 Excluir Linha
                    </button>
                </div>
            </div>

            <div style="margin: 10px 0; display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="lote-button" onclick="atribuirPadraoInteligente('${codigoLinha}', prompt('Digite o prefixo do veículo:'))">
                    🧠 Atribuição Inteligente
                </button>
                <button class="lote-button" style="background: #6c757d;" onclick="atribuirVeiculoEmLote('${codigoLinha}', prompt('Digite o prefixo do veículo:'))">
                    🚀 Atribuição em Lote
                </button>
            </div>

            <div style="margin-top: 15px;">
                <strong>Horários da Linha:</strong>
                <div class="horarios-grid">
                    ${horariosLinha.map((horario, index) => {
                        // Gerar sugestão para este horário
                        const sugestao = sugerirVeiculoPorDuracao(codigoLinha, index);
                        
                        // Verificar se é um CARRO X
                        const isCarroX = horario.CARRO && horario.CARRO.startsWith('CARRO ');
                        const carroXInfo = isCarroX ? `<br><small style="color: #e67e22; font-weight: bold;">🚗 ${horario.CARRO} (grupo)</small>` : '';
                        
                        return `
                        <div class="horario-atribuicao">
                            <div class="horario-info">
                                <strong>${horario.PARTIDA}</strong> - Parada ${horario.PARADA}
                                <br><small>${horario.DESTINO} | ${horario.DURACAO}min</small>
                                ${carroXInfo}
                                ${sugestao ? `<br><small style="color: #28a745;">💡 Sugestão: ${sugestao.veiculo} (${Math.round(sugestao.confianca)}% confiança)</small>` : ''}
                                <button class="btn-info" onclick="visualizarPadraoCompleto('${codigoLinha}', '${horario.DESTINO}', '${horario.PARADA}')" 
                                        style="font-size: 0.7em; padding: 3px 8px; margin-top: 5px;" title="Ver todos os horários deste padrão">
                                    👁️ Ver Padrão
                                </button>
                                ${isCarroX ? `<button class="btn-info" onclick="atribuirVeiculoParaCarroXCompleto('${codigoLinha}', '${horario.CARRO}', prompt('Digite o prefixo do veículo:'))" 
                                        style="font-size: 0.7em; padding: 3px 8px; margin-top: 5px; background: #e67e22;" title="Atribuir veículo para TODOS os horários deste CARRO X">
                                    🚗 Atribuir Grupo
                                </button>` : ''}
                            </div>
                            <div class="horario-select">
                                <select class="veiculo-select" data-linha="${codigoLinha}" data-index="${index}" onchange="atualizarVeiculoHorario('${codigoLinha}', ${index})">
                                    <option value="">-- Selecione --</option>
                                    ${sugestao ? 
                                        `<option value="${sugestao.veiculo}" class="sugestao-option">
                                            💡 ${sugestao.veiculo} (${Math.round(sugestao.confianca)}% confiança)
                                        </option>` : 
                                        ''
                                    }
                                    ${veiculosFiltrados.map(veiculo => 
                                        `<option value="${veiculo.PREFIXO}" ${horario.CARRO === veiculo.PREFIXO ? 'selected' : ''}>
                                            ${veiculo.PREFIXO} - ${veiculo.TIPO} - ${veiculo.GARAGEM}
                                        </option>`
                                    ).join('')}
                                </select>
                                <div class="veiculo-assigned" id="veiculo-assigned-${codigoLinha}-${index}" style="display: ${horario.CARRO && !isCarroX ? 'flex' : 'none'};">
                                    <span>✅ ${horario.CARRO || ''}</span>
                                    <button class="btn-remover" onclick="removerVeiculoHorario('${codigoLinha}', ${index})" title="Remover veículo">🗑️</button>
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <div style="margin-top: 15px; background: #f8f9fa; padding: 10px; border-radius: 5px;">
                <strong>Resumo da Atribuição:</strong>
                <div id="resumo-${codigoLinha}" class="resumo-atribuicao">
                    ${gerarResumoAtribuicao(codigoLinha, horariosLinha)}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Modificar a função atualizarVeiculoHorario para usar a nova função completa
function atualizarVeiculoHorario(codigoLinha, index) {
    const select = document.querySelector(`select[data-linha="${codigoLinha}"][data-index="${index}"]`);
    const veiculoAssigned = document.getElementById(`veiculo-assigned-${codigoLinha}-${index}`);
    const prefixoSelecionado = select.value;
    
    if (!prefixoSelecionado) {
        // Se não há veículo selecionado, remover
        removerVeiculoHorario(codigoLinha, index);
        return;
    }
    
    // Encontrar o horário específico
    const horariosLinha = horariosPredefinidos.filter(h => h.LINHA === codigoLinha);
    if (index >= horariosLinha.length) return;
    
    const horarioAtual = horariosLinha[index];
    
    // VERIFICAR CONFLITO ENTRE LINHAS PRIMEIRO
    const conflitoHorario = verificarConflitoHorarioEntreLinhas(prefixoSelecionado, horarioAtual);
    if (conflitoHorario.conflito) {
        alert(`🚫 CONFLITO DE HORÁRIO!\n\n${conflitoHorario.mensagem}\n\nNão é possível atribuir o veículo neste horário.`);
        select.value = ''; // Limpar a seleção
        return;
    }
    
    // VERIFICAR SE O VEÍCULO JÁ ESTÁ EM OUTRO CARRO X NA MESMA LINHA
    const conflitoCarroX = verificarConflitoCarroX(codigoLinha, prefixoSelecionado);
    if (conflitoCarroX.encontrado) {
        alert(`🚫 CONFLITO: O veículo ${prefixoSelecionado} já está atribuído ao ${conflitoCarroX.carroX} nesta linha!\n\nNão é possível usar o mesmo veículo em múltiplos CARRO X da mesma linha.`);
        select.value = ''; // Limpar a seleção
        return;
    }
    
    const carroPadrao = horarioAtual.CARRO; // "CARRO 1", "CARRO 2", etc.
    
    // Se há um padrão CARRO X definido, usar a NOVA FUNÇÃO COMPLETA
    if (carroPadrao && carroPadrao.toString().includes('CARRO')) {
        const sucesso = atribuirVeiculoParaCarroXCompleto(codigoLinha, carroPadrao, prefixoSelecionado);
        if (!sucesso) {
            select.value = ''; // Limpar se falhou
        }
    } else {
        // Atribuição individual (fallback)
        horarioAtual.CARRO = prefixoSelecionado;
        atualizarInterfaceHorarioIndividual(codigoLinha, index, prefixoSelecionado);
        
        // Atualizar resumo
        const horariosAtualizados = horariosPredefinidos.filter(h => h.LINHA === codigoLinha);
        document.getElementById(`resumo-${codigoLinha}`).innerHTML = gerarResumoAtribuicao(codigoLinha, horariosAtualizados);
    }
}

// Verificar se um veículo já está em outro CARRO X na mesma linha
function verificarConflitoCarroX(codigoLinha, veiculoPrefix) {
    console.log(`🔍 Verificando conflito para ${veiculoPrefix} na linha ${codigoLinha}`);
    
    // Encontrar todos os CARRO X na linha que já têm este veículo
    const carroXComVeiculo = horariosPredefinidos.filter(h => 
        h.LINHA === codigoLinha &&
        h.CARRO && 
        h.CARRO.toString().includes('CARRO') &&
        h.CARRO !== veiculoPrefix && // Não é o próprio veículo
        !h.CARRO.startsWith('CARRO ') && // Já tem um veículo real atribuído
        h.CARRO === veiculoPrefix
    );
    
    if (carroXComVeiculo.length > 0) {
        const carroXEncontrado = carroXComVeiculo[0].CARRO;
        console.log(`🚫 Conflito encontrado: ${veiculoPrefix} já está no ${carroXEncontrado}`);
        return {
            encontrado: true,
            carroX: carroXEncontrado,
            horarios: carroXComVeiculo.map(h => h.PARTIDA)
        };
    }
    
    // Busca mais abrangente: verificar se o veículo já aparece em qualquer horário da linha
    const veiculoNaLinha = horariosPredefinidos.find(h => 
        h.LINHA === codigoLinha &&
        h.CARRO === veiculoPrefix &&
        h.CARRO && 
        !h.CARRO.toString().includes('CARRO') // É um veículo real, não um CARRO X
    );
    
    if (veiculoNaLinha) {
        console.log(`🚫 Veículo ${veiculoPrefix} já está em uso na linha ${codigoLinha}`);
        return {
            encontrado: true,
            carroX: "outro horário",
            horarios: [veiculoNaLinha.PARTIDA]
        };
    }
    
    console.log(`✅ Veículo ${veiculoPrefix} disponível para uso`);
    return { encontrado: false };
}

// Atribuir veículo para todos os horários do mesmo CARRO X - CORRIGIDA
function atribuirVeiculoParaCarroX(codigoLinha, carroPadrao, veiculoPrefix) {
    console.log(`🔍 Buscando horários do ${carroPadrao} na linha ${codigoLinha}`);
    
    // VERIFICAR CONFLITO DE CARRO X NA MESMA LINHA
    const conflitoCarroX = verificarConflitoCarroX(codigoLinha, veiculoPrefix);
    if (conflitoCarroX.encontrado) {
        alert(`🚫 CONFLITO: O veículo ${veiculoPrefix} já está atribuído ao ${conflitoCarroX.carroX} nesta linha!\n\nHorários: ${conflitoCarroX.horarios.join(', ')}`);
        return;
    }
    
    // Encontrar todos os horários desta linha com o mesmo CARRO X
    const horariosDoCarroX = horariosPredefinidos.filter(h => 
        h.LINHA === codigoLinha && 
        h.CARRO && 
        h.CARRO.toString().includes('CARRO') &&
        h.CARRO.toString().includes(carroPadrao.replace('CARRO', '').trim())
    );
    
    console.log(`📋 Encontrados ${horariosDoCarroX.length} horários do ${carroPadrao}:`, 
        horariosDoCarroX.map(h => `${h.PARTIDA} - ${h.CARRO}`));
    
    if (horariosDoCarroX.length === 0) {
        console.warn(`⚠️ Nenhum horário encontrado para ${carroPadrao} na linha ${codigoLinha}`);
        return;
    }
    
    // VERIFICAR CONFLITOS DE HORÁRIO PARA TODOS OS HORÁRIOS DO GRUPO
    const horariosComConflito = [];
    
    for (const horario of horariosDoCarroX) {
        const conflitoHorario = verificarConflitoHorarioEntreLinhas(veiculoPrefix, horario);
        if (conflitoHorario.conflito) {
            horariosComConflito.push({
                partida: horario.PARTIDA,
                mensagem: conflitoHorario.mensagem
            });
        }
    }
    
    if (horariosComConflito.length > 0) {
        const mensagemConflitos = horariosComConflito.map(c => `• ${c.partida}: ${c.mensagem.split('\n')[0]}`).join('\n');
        alert(`🚫 CONFLITOS DE HORÁRIO ENCONTRADOS!\n\nVeículo ${veiculoPrefix} não pode ser atribuído devido aos seguintes conflitos:\n\n${mensagemConflitos}\n\nAtribuição cancelada.`);
        return;
    }
    
    let totalAtribuidos = 0;
    
    // Atribuir o veículo a todos os horários do CARRO X
    horariosDoCarroX.forEach(horario => {
        // Encontrar índice real no array principal usando comparação completa
        const indexReal = horariosPredefinidos.findIndex(h => 
            h.LINHA === codigoLinha && 
            h.PARTIDA === horario.PARTIDA && 
            h.PARADA === horario.PARADA &&
            h.DESTINO === horario.DESTINO &&
            h.CARRO === horario.CARRO
        );
        
        if (indexReal !== -1) {
            const veiculoAntigo = horariosPredefinidos[indexReal].CARRO;
            horariosPredefinidos[indexReal].CARRO = veiculoPrefix;
            totalAtribuidos++;
            
            console.log(`✅ Atribuído ${veiculoPrefix} para ${horario.PARTIDA} (era: ${veiculoAntigo}) - índice: ${indexReal}`);
            
            try {
                // Usar a função corrigida
                atualizarInterfaceHorarioIndividual(codigoLinha, indexReal, veiculoPrefix);
            } catch (error) {
                console.error(`❌ Erro ao atualizar interface ${codigoLinha}-${indexReal}:`, error);
            }
        } else {
            console.error(`❌ Índice não encontrado para: ${horario.PARTIDA} - ${horario.PARADA}`);
        }
    });
    
    console.log(`🎯 Veículo ${veiculoPrefix} atribuído para ${totalAtribuidos} horários do ${carroPadrao} na linha ${codigoLinha}`);
    
    // FORÇAR ATUALIZAÇÃO COMPLETA DA LINHA
    setTimeout(() => {
        forcarAtualizacaoLinha(codigoLinha);
    }, 100);
}

// Função para debug dos índices
function debugIndicesLinha(codigoLinha) {
    console.log(`🐛 DEBUG ÍNDICES - Linha ${codigoLinha}`);
    
    const horariosLinha = horariosPredefinidos.filter(h => h.LINHA === codigoLinha);
    const selects = document.querySelectorAll(`select[data-linha="${codigoLinha}"]`);
    
    console.log(`📊 Total de horários no array: ${horariosLinha.length}`);
    console.log(`📊 Total de selects na interface: ${selects.length}`);
    
    // Mostrar mapeamento de índices
    console.log('🗺️ MAPEAMENTO DE ÍNDICES:');
    horariosLinha.forEach((horario, index) => {
        console.log(`Array[${index}]: ${horario.PARTIDA} - ${horario.PARADA} - ${horario.CARRO}`);
    });
    
    selects.forEach((select, i) => {
        const indexSelect = select.getAttribute('data-index');
        const horarioSelect = horariosLinha[indexSelect];
        console.log(`Select[${i}] - data-index="${indexSelect}": ${horarioSelect ? horarioSelect.PARTIDA : 'NÃO ENCONTRADO'}`);
    });
}

// Substituir a função atualizarInterfaceHorarioIndividual por esta versão corrigida:
function atualizarInterfaceHorarioIndividual(codigoLinha, indexReal, veiculoPrefix) {
    console.log(`🔄 Atualizando interface: linha ${codigoLinha}, índice real ${indexReal}, veículo ${veiculoPrefix}`);
    
    // Obter o horário específico do array principal
    const horarioReal = horariosPredefinidos[indexReal];
    if (!horarioReal) {
        console.error(`❌ Horário não encontrado no índice ${indexReal}`);
        return;
    }
    
    // Encontrar o índice correto na interface usando os dados do horário
    const horariosLinha = horariosPredefinidos.filter(h => h.LINHA === codigoLinha);
    const indexNaLinha = horariosLinha.findIndex(h => 
        h.PARTIDA === horarioReal.PARTIDA && 
        h.PARADA === horarioReal.PARADA &&
        h.DESTINO === horarioReal.DESTINO
    );
    
    if (indexNaLinha === -1) {
        console.error(`❌ Horário não encontrado na linha ${codigoLinha}: ${horarioReal.PARTIDA} - ${horarioReal.PARADA}`);
        return;
    }
    
    // Buscar elementos usando o índice correto da linha
    const select = document.querySelector(`select[data-linha="${codigoLinha}"][data-index="${indexNaLinha}"]`);
    const veiculoAssigned = document.getElementById(`veiculo-assigned-${codigoLinha}-${indexNaLinha}`);
    
    if (!select || !veiculoAssigned) {
        console.error(`❌ Elementos não encontrados para ${codigoLinha}-${indexNaLinha}`);
        console.log(`🔍 Procurando elementos alternativos...`);
        
        // Tentativa alternativa: procurar por todos os elementos e encontrar pelo horário
        const todosSelects = document.querySelectorAll(`select[data-linha="${codigoLinha}"]`);
        let selectEncontrado = null;
        let assignedEncontrado = null;
        
        todosSelects.forEach(s => {
            const idx = parseInt(s.getAttribute('data-index'));
            const horarioSelect = horariosLinha[idx];
            if (horarioSelect && 
                horarioSelect.PARTIDA === horarioReal.PARTIDA && 
                horarioSelect.PARADA === horarioReal.PARADA) {
                selectEncontrado = s;
                assignedEncontrado = document.getElementById(`veiculo-assigned-${codigoLinha}-${idx}`);
            }
        });
        
        if (selectEncontrado && assignedEncontrado) {
            atualizarElementosInterface(selectEncontrado, assignedEncontrado, veiculoPrefix);
            console.log(`✅ Interface atualizada (busca alternativa): ${codigoLinha} - ${horarioReal.PARTIDA}`);
        } else {
            console.error(`❌ Elementos não encontrados mesmo com busca alternativa`);
        }
        return;
    }
    
    atualizarElementosInterface(select, veiculoAssigned, veiculoPrefix);
    console.log(`✅ Interface atualizada: ${codigoLinha}-${indexNaLinha} → ${veiculoPrefix}`);
}

// Função auxiliar para atualizar os elementos da interface
function atualizarElementosInterface(select, veiculoAssigned, veiculoPrefix) {
    if (veiculoPrefix) {
        // Atualizar o select
        select.value = veiculoPrefix;
        
        // Atualizar o texto do span
        const span = veiculoAssigned.querySelector('span');
        if (span) {
            span.textContent = `✅ ${veiculoPrefix}`;
        }
        
        // Mostrar o assigned e esconder o select
        veiculoAssigned.style.display = 'flex';
        select.style.display = 'none';
    } else {
        // Limpar a atribuição
        veiculoAssigned.style.display = 'none';
        select.style.display = 'block';
        select.value = '';
    }
}

// Também precisamos corrigir a função atribuirVeiculoParaCarroX para usar os índices corretos:
function atribuirVeiculoParaCarroX(codigoLinha, carroPadrao, veiculoPrefix) {
    console.log(`🔍 Buscando horários do ${carroPadrao} na linha ${codigoLinha}`);
    
    // VERIFICAR CONFLITO DE CARRO X NA MESMA LINHA
    const conflitoCarroX = verificarConflitoCarroX(codigoLinha, veiculoPrefix);
    if (conflitoCarroX.encontrado) {
        alert(`🚫 CONFLITO: O veículo ${veiculoPrefix} já está atribuído ao ${conflitoCarroX.carroX} nesta linha!\n\nHorários: ${conflitoCarroX.horarios.join(', ')}`);
        return;
    }
    
    // Encontrar todos os horários desta linha com o mesmo CARRO X
    const horariosDoCarroX = horariosPredefinidos.filter(h => 
        h.LINHA === codigoLinha && 
        h.CARRO && 
        h.CARRO.toString().includes('CARRO') &&
        h.CARRO.toString().includes(carroPadrao.replace('CARRO', '').trim())
    );
    
    console.log(`📋 Encontrados ${horariosDoCarroX.length} horários do ${carroPadrao}:`, 
        horariosDoCarroX.map(h => `${h.PARTIDA} - ${h.CARRO}`));
    
    if (horariosDoCarroX.length === 0) {
        console.warn(`⚠️ Nenhum horário encontrado para ${carroPadrao} na linha ${codigoLinha}`);
        return;
    }
    
    // VERIFICAR CONFLITOS DE HORÁRIO PARA TODOS OS HORÁRIOS DO GRUPO
    const horariosComConflito = [];
    
    for (const horario of horariosDoCarroX) {
        const conflitoHorario = verificarConflitoHorarioEntreLinhas(veiculoPrefix, horario);
        if (conflitoHorario.conflito) {
            horariosComConflito.push({
                partida: horario.PARTIDA,
                mensagem: conflitoHorario.mensagem
            });
        }
    }
    
    if (horariosComConflito.length > 0) {
        const mensagemConflitos = horariosComConflito.map(c => `• ${c.partida}: ${c.mensagem.split('\n')[0]}`).join('\n');
        alert(`🚫 CONFLITOS DE HORÁRIO ENCONTRADOS!\n\nVeículo ${veiculoPrefix} não pode ser atribuído devido aos seguintes conflitos:\n\n${mensagemConflitos}\n\nAtribuição cancelada.`);
        return;
    }
    
    let totalAtribuidos = 0;
    
    // Atribuir o veículo a todos os horários do CARRO X
    horariosDoCarroX.forEach(horario => {
        // Encontrar índice real no array principal
        const indexReal = horariosPredefinidos.findIndex(h => 
            h.LINHA === codigoLinha && 
            h.PARTIDA === horario.PARTIDA && 
            h.PARADA === horario.PARADA &&
            h.DESTINO === horario.DESTINO
        );
        
        if (indexReal !== -1) {
            const veiculoAntigo = horariosPredefinidos[indexReal].CARRO;
            horariosPredefinidos[indexReal].CARRO = veiculoPrefix;
            totalAtribuidos++;
            
            console.log(`✅ Atribuído ${veiculoPrefix} para ${horario.PARTIDA} (era: ${veiculoAntigo}) - índice: ${indexReal}`);
            
            // Usar a função corrigida para atualizar a interface
            atualizarInterfaceHorarioIndividual(codigoLinha, indexReal, veiculoPrefix);
        } else {
            console.error(`❌ Índice não encontrado para: ${horario.PARTIDA} - ${horario.PARADA}`);
        }
    });
    
    console.log(`🎯 Veículo ${veiculoPrefix} atribuído para ${totalAtribuidos} horários do ${carroPadrao} na linha ${codigoLinha}`);
    
    // Atualizar resumo
    const horariosLinha = horariosPredefinidos.filter(h => h.LINHA === codigoLinha);
    document.getElementById(`resumo-${codigoLinha}`).innerHTML = gerarResumoAtribuicao(codigoLinha, horariosLinha);
}

// Função alternativa para encontrar elementos quando o índice não corresponde
function tentarAtualizacaoAlternativa(codigoLinha, indexReal, veiculoPrefix) {
    // Obter o horário real do array
    const horarioReal = horariosPredefinidos[indexReal];
    if (!horarioReal) {
        console.error(`❌ Horário não encontrado no índice ${indexReal}`);
        return;
    }
    
    console.log(`🔍 Buscando elementos para: ${horarioReal.PARTIDA} - ${horarioReal.PARADA}`);
    
    // Encontrar todos os elementos da linha
    const selects = document.querySelectorAll(`select[data-linha="${codigoLinha}"]`);
    
    selects.forEach(select => {
        const indexSelect = parseInt(select.getAttribute('data-index'));
        const horarioSelect = horariosPredefinidos[indexSelect];
        
        if (horarioSelect && 
            horarioSelect.PARTIDA === horarioReal.PARTIDA && 
            horarioSelect.PARADA === horarioReal.PARADA) {
            
            const assigned = document.getElementById(`veiculo-assigned-${codigoLinha}-${indexSelect}`);
            
            if (select && assigned) {
                if (veiculoPrefix) {
                    select.value = veiculoPrefix;
                    const span = assigned.querySelector('span');
                    if (span) {
                        span.textContent = `✅ ${veiculoPrefix}`;
                    }
                    assigned.style.display = 'flex';
                    select.style.display = 'none';
                    console.log(`✅ Interface atualizada (alternativa): ${codigoLinha}-${indexSelect} → ${veiculoPrefix}`);
                } else {
                    assigned.style.display = 'none';
                    select.style.display = 'block';
                    select.value = '';
                    console.log(`🗑️ Interface limpa (alternativa): ${codigoLinha}-${indexSelect}`);
                }
            }
        }
    });
}

// Função para forçar atualização completa da interface de uma linha
function forcarAtualizacaoLinha(codigoLinha) {
    console.log(`🔄 Forçando atualização da linha ${codigoLinha}`);
    
    const horariosLinha = horariosPredefinidos.filter(h => h.LINHA === codigoLinha);
    
    horariosLinha.forEach((horario, index) => {
        const select = document.querySelector(`select[data-linha="${codigoLinha}"][data-index="${index}"]`);
        const veiculoAssigned = document.getElementById(`veiculo-assigned-${codigoLinha}-${index}`);
        
        if (select && veiculoAssigned) {
            if (horario.CARRO && !horario.CARRO.startsWith('CARRO ')) {
                // Tem veículo real atribuído
                select.value = horario.CARRO;
                const span = veiculoAssigned.querySelector('span');
                if (span) {
                    span.textContent = `✅ ${horario.CARRO}`;
                }
                veiculoAssigned.style.display = 'flex';
                select.style.display = 'none';
            } else {
                // Não tem veículo ou é CARRO X
                veiculoAssigned.style.display = 'none';
                select.style.display = 'block';
                select.value = '';
            }
        }
    });
    
    // Atualizar o resumo
    document.getElementById(`resumo-${codigoLinha}`).innerHTML = gerarResumoAtribuicao(codigoLinha, horariosLinha);
    
    console.log(`✅ Interface da linha ${codigoLinha} atualizada`);
}

// Função para autocompletar veículos CORRETA - apenas horários com MESMO DESTINO e MESMA PARADA
function autocompletarVeiculoLinha(codigoLinha, veiculoPrefix, horarioIndex) {
    const horariosLinha = horariosPredefinidos.filter(h => h.LINHA === codigoLinha);
    const horarioAtual = horariosLinha[horarioIndex];
    
    if (!veiculoPrefix || !horarioAtual) return;
    
    // Encontrar APENAS horários com MESMO DESTINO e MESMA PARADA que ainda não têm veículo
    const horariosParaAutocompletar = horariosLinha.filter((h, index) => 
        index !== horarioIndex && 
        !h.CARRO &&
        h.DESTINO === horarioAtual.DESTINO && 
        h.PARADA === horarioAtual.PARADA
    );
    
    if (horariosParaAutocompletar.length > 0) {
        // VERIFICAR CONFLITOS 
        const verificacaoConflito = verificarConflitoHorarios(veiculoPrefix, horariosParaAutocompletar);
        
        if (verificacaoConflito.conflito) {
            alert(`⚠️ ${verificacaoConflito.mensagem}\n\nNão é possível autocompletar para evitar conflito de horários.`);
            return;
        }
        
        // Ordenar por horário para mostrar de forma organizada
        horariosParaAutocompletar.sort((a, b) => a.PARTIDA.localeCompare(b.PARTIDA));
        
        const horariosStr = horariosParaAutocompletar.map(h => h.PARTIDA).join(', ');
        
        const confirmar = confirm(
            `Deseja atribuir o veículo ${veiculoPrefix} também para os ${horariosParaAutocompletar.length} horários com MESMO DESTINO e MESMA PARADA?\n\n` +
            `Linha: ${codigoLinha}\n` +
            `Destino: ${horarioAtual.DESTINO}\n` +
            `Parada: ${horarioAtual.PARADA}\n` +
            `Horários: ${horariosStr}`
        );
        
        if (confirmar) {
            let totalAtribuidos = 0;
            
            horariosParaAutocompletar.forEach(horario => {
                // Encontrar índice real no array principal
                const indexReal = horariosPredefinidos.findIndex(h => 
                    h.LINHA === codigoLinha && 
                    h.PARTIDA === horario.PARTIDA && 
                    h.PARADA === horario.PARADA &&
                    h.DESTINO === horario.DESTINO
                );
                
                if (indexReal !== -1 && !horariosPredefinidos[indexReal].CARRO) {
                    horariosPredefinidos[indexReal].CARRO = veiculoPrefix;
                    totalAtribuidos++;
                    
                    // Atualizar interface
                    const select = document.querySelector(`select[data-linha="${codigoLinha}"][data-index="${indexReal}"]`);
                    const veiculoAssigned = document.getElementById(`veiculo-assigned-${codigoLinha}-${indexReal}`);
                    
                    if (select && veiculoAssigned) {
                        select.value = veiculoPrefix;
                        const span = veiculoAssigned.querySelector('span');
                        if (span) {
                            span.textContent = `✅ ${veiculoPrefix}`;
                        }
                        veiculoAssigned.style.display = 'flex';
                        select.style.display = 'none';
                    }
                }
            });
            
            // Atualizar resumo
            const horariosAtualizados = horariosPredefinidos.filter(h => h.LINHA === codigoLinha);
            document.getElementById(`resumo-${codigoLinha}`).innerHTML = gerarResumoAtribuicao(codigoLinha, horariosAtualizados);
            
            alert(`✅ Veículo ${veiculoPrefix} atribuído para ${totalAtribuidos + 1} horários:\n• ${horarioAtual.PARTIDA}\n• ${horariosParaAutocompletar.map(h => h.PARTIDA).join('\n• ')}`);
        }
    } else {
        console.log('Nenhum horário com mesmo destino e parada encontrado para autocompletar');
    }
}

// Verificar se há conflito de horários para um veículo
function verificarConflitoHorarios(veiculoPrefix, novosHorarios) {
    // Obter todos os horários já atribuídos a este veículo
    const horariosAtribuidos = horariosPredefinidos.filter(h => 
        h.CARRO === veiculoPrefix
    );
    
    if (horariosAtribuidos.length === 0) return { conflito: false };
    
    // Verificar cada horário que queremos atribuir
    for (const novoHorario of novosHorarios) {
        for (const horarioExistente of horariosAtribuidos) {
            // Calcular se há sobreposição
            const [novoHora, novoMinuto] = novoHorario.PARTIDA.split(':').map(Number);
            const [existenteHora, existenteMinuto] = horarioExistente.PARTIDA.split(':').map(Number);
            
            const novoInicio = novoHora * 60 + novoMinuto;
            const existenteInicio = existenteHora * 60 + existenteMinuto;
            const novoFim = novoInicio + novoHorario.DURACAO;
            const existenteFim = existenteInicio + horarioExistente.DURACAO;
            
            // Verificar sobreposição
            if ((novoInicio >= existenteInicio && novoInicio < existenteFim) ||
                (existenteInicio >= novoInicio && existenteInicio < novoFim)) {
                return {
                    conflito: true,
                    mensagem: `Conflito: Veículo ${veiculoPrefix} já está em viagem das ${horarioExistente.PARTIDA} às ${formatarMinutosParaHora(existenteFim)} (nova viagem: ${novoHorario.PARTIDA} por ${novoHorario.DURACAO}min)`
                };
            }
        }
    }
    
    return { conflito: false };
}

// Função auxiliar para formatar minutos para hora
function formatarMinutosParaHora(totalMinutos) {
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

// Atribuição inteligente baseada no padrão de horários do veículo
function atribuirPadraoInteligente(codigoLinha, veiculoPrefix) {
    const horariosLinha = horariosPredefinidos.filter(h => h.LINHA === codigoLinha && !h.CARRO);
    
    if (horariosLinha.length === 0) {
        alert('Todos os horários desta linha já têm veículos atribuídos!');
        return;
    }
    
    // Agrupar por destino e parada
    const grupos = {};
    horariosLinha.forEach(horario => {
        const chave = `${horario.DESTINO}-${horario.PARADA}`;
        if (!grupos[chave]) {
            grupos[chave] = [];
        }
        grupos[chave].push(horario);
    });
    
    let html = `<h4>Atribuição Inteligente - Linha ${codigoLinha}</h4>`;
    html += `<p>Selecione o padrão de horários para o veículo <strong>${veiculoPrefix}</strong>:</p>`;
    
    Object.keys(grupos).forEach(chave => {
        const grupo = grupos[chave];
        const horariosOrdenados = grupo.map(h => h.PARTIDA).sort();
        const primeiroHorario = horariosOrdenados[0];
        const ultimoHorario = horariosOrdenados[horariosOrdenados.length - 1];
        
        html += `
            <div class="grupo-padrao">
                <label>
                    <input type="radio" name="padraoHorario" value="${chave}" data-grupo='${JSON.stringify(grupo)}'>
                    <strong>${grupo[0].DESTINO}</strong> - Parada ${grupo[0].PARADA}
                    <br><small>Horários: ${primeiroHorario} até ${ultimoHorario} (${grupo.length} viagens)</small>
                    <br><small>Duração: ${grupo[0].DURACAO}min</small>
                </label>
            </div>
        `;
    });
    
    // Modal para seleção inteligente
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            ${html}
            <div class="modal-actions">
                <button class="btn-warning" onclick="fecharModal()">Cancelar</button>
                <button class="btn-success" onclick="confirmarAtribuicaoInteligente('${codigoLinha}', '${veiculoPrefix}')">Confirmar Atribuição</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Confirmar atribuição inteligente
function confirmarAtribuicaoInteligente(codigoLinha, veiculoPrefix) {
    const radioSelecionado = document.querySelector('input[name="padraoHorario"]:checked');
    
    if (!radioSelecionado) {
        alert('Selecione um padrão de horários!');
        return;
    }
    
    const grupo = JSON.parse(radioSelecionado.getAttribute('data-grupo'));
    
    let totalAtribuidos = 0;
    
    grupo.forEach(horario => {
        // Encontrar no array principal e atribuir
        const indexReal = horariosPredefinidos.findIndex(h => 
            h.LINHA === codigoLinha && 
            h.PARTIDA === horario.PARTIDA && 
            h.PARADA === horario.PARADA &&
            h.DESTINO === horario.DESTINO
        );
        
        if (indexReal !== -1 && !horariosPredefinidos[indexReal].CARRO) {
            horariosPredefinidos[indexReal].CARRO = veiculoPrefix;
            totalAtribuidos++;
            
            // Atualizar interface
            const select = document.querySelector(`select[data-linha="${codigoLinha}"][data-index="${indexReal}"]`);
            const veiculoAssigned = document.getElementById(`veiculo-assigned-${codigoLinha}-${indexReal}`);
            
            if (select && veiculoAssigned) {
                select.value = veiculoPrefix;
                const span = veiculoAssigned.querySelector('span');
                if (span) {
                    span.textContent = `✅ ${veiculoPrefix}`;
                }
                veiculoAssigned.style.display = 'flex';
                select.style.display = 'none';
            }
        }
    });
    
    fecharModal();
    
    // Atualizar resumo
    const horariosLinha = horariosPredefinidos.filter(h => h.LINHA === codigoLinha);
    document.getElementById(`resumo-${codigoLinha}`).innerHTML = gerarResumoAtribuicao(codigoLinha, horariosLinha);
    
    alert(`✅ Veículo ${veiculoPrefix} atribuído para ${totalAtribuidos} horários do padrão selecionado`);
}

// Atribuir veículo para múltiplos horários de uma vez
function atribuirVeiculoEmLote(codigoLinha, veiculoPrefix) {
    const horariosLinha = horariosPredefinidos.filter(h => h.LINHA === codigoLinha && !h.CARRO);
    
    if (horariosLinha.length === 0) {
        alert('Todos os horários desta linha já têm veículos atribuídos!');
        return;
    }
    
    // Agrupar horários por destino e parada
    const horariosAgrupados = {};
    horariosLinha.forEach(horario => {
        const chave = `${horario.DESTINO}-${horario.PARADA}`;
        if (!horariosAgrupados[chave]) {
            horariosAgrupados[chave] = [];
        }
        horariosAgrupados[chave].push(horario);
    });
    
    let html = `<h4>Atribuir ${veiculoPrefix} para horários da linha ${codigoLinha}</h4>`;
    html += `<p>Selecione os grupos de horários para atribuir:</p>`;
    
    Object.keys(horariosAgrupados).forEach(chave => {
        const grupo = horariosAgrupados[chave];
        const horariosStr = grupo.map(h => h.PARTIDA).sort().join(', ');
        html += `
            <div class="grupo-horarios">
                <label>
                    <input type="checkbox" class="grupo-checkbox" value="${chave}">
                    <strong>${grupo[0].DESTINO}</strong> - Parada ${grupo[0].PARADA}
                    <br><small>Horários: ${horariosStr} (${grupo.length} viagens)</small>
                </label>
            </div>
        `;
    });
    
    // Criar modal para seleção
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            ${html}
            <div class="modal-actions">
                <button class="btn-warning" onclick="fecharModal()">Cancelar</button>
                <button class="btn-success" onclick="confirmarAtribuicaoLote('${codigoLinha}', '${veiculoPrefix}')">Confirmar Atribuição</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Confirmar atribuição em lote
function confirmarAtribuicaoLote(codigoLinha, veiculoPrefix) {
    const checkboxes = document.querySelectorAll('.grupo-checkbox:checked');
    
    if (checkboxes.length === 0) {
        alert('Selecione pelo menos um grupo de horários!');
        return;
    }
    
    let totalAtribuidos = 0;
    
    checkboxes.forEach(checkbox => {
        const [destino, parada] = checkbox.value.split('-');
        const horariosParaAtribuir = horariosPredefinidos.filter(h => 
            h.LINHA === codigoLinha && 
            h.DESTINO === destino && 
            h.PARADA === parada &&
            !h.CARRO
        );
        
        horariosParaAtribuir.forEach(horario => {
            horario.CARRO = veiculoPrefix;
            totalAtribuidos++;
            
            // Atualizar interface
            const horariosLinha = horariosPredefinidos.filter(h => h.LINHA === codigoLinha);
            const index = horariosLinha.findIndex(h => h.PARTIDA === horario.PARTIDA);
            
            if (index !== -1) {
                const select = document.querySelector(`select[data-linha="${codigoLinha}"][data-index="${index}"]`);
                const veiculoAssigned = document.getElementById(`veiculo-assigned-${codigoLinha}-${index}`);
                
                if (select && veiculoAssigned) {
                    select.value = veiculoPrefix;
                    const span = veiculoAssigned.querySelector('span');
                    if (span) {
                        span.textContent = `✅ ${veiculoPrefix}`;
                    }
                    veiculoAssigned.style.display = 'flex';
                    select.style.display = 'none';
                }
            }
        });
    });
    
    fecharModal();
    
    // Atualizar resumo
    const horariosLinha = horariosPredefinidos.filter(h => h.LINHA === codigoLinha);
    document.getElementById(`resumo-${codigoLinha}`).innerHTML = gerarResumoAtribuicao(codigoLinha, horariosLinha);
    
    alert(`✅ Veículo ${veiculoPrefix} atribuído para ${totalAtribuidos} horários da linha ${codigoLinha}`);
}

function fecharModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// Sugerir veículo baseado na duração e padrões de viagem
function sugerirVeiculoPorDuracao(codigoLinha, horarioIndex) {
    const horariosLinha = horariosPredefinidos.filter(h => h.LINHA === codigoLinha);
    const horarioAtual = horariosLinha[horarioIndex];
    
    if (!horarioAtual) return null;
    
    // Encontrar horários similares (mesmo destino, parada e duração similar)
    const horariosSimilares = horariosLinha.filter(h => 
        h.DESTINO === horarioAtual.DESTINO && 
        h.PARADA === horarioAtual.PARADA &&
        Math.abs(h.DURACAO - horarioAtual.DURACAO) <= 10 && // Duração similar (±10 min)
        h.CARRO &&
        h.PARTIDA !== horarioAtual.PARTIDA // Horário diferente
    );
    
    if (horariosSimilares.length > 0) {
        // Agrupar por veículo e contar ocorrências
        const veiculosCount = {};
        horariosSimilares.forEach(h => {
            veiculosCount[h.CARRO] = (veiculosCount[h.CARRO] || 0) + 1;
        });
        
        // Ordenar por frequência e selecionar o mais comum
        const veiculoSugerido = Object.keys(veiculosCount).reduce((a, b) => 
            veiculosCount[a] > veiculosCount[b] ? a : b
        );
        
        return {
            veiculo: veiculoSugerido,
            confianca: (veiculosCount[veiculoSugerido] / horariosSimilares.length) * 100,
            totalSimilar: horariosSimilares.length
        };
    }
    
    return null;
}

// Sugerir veículo baseado em padrões
function sugerirVeiculo(codigoLinha, horarioIndex) {
    const horariosLinha = horariosPredefinidos.filter(h => h.LINHA === codigoLinha);
    const horarioAtual = horariosLinha[horarioIndex];
    
    // Verificar se há veículos já usados neste padrão
    const horariosSimilares = horariosLinha.filter(h => 
        h.DESTINO === horarioAtual.DESTINO && 
        h.PARADA === horarioAtual.PARADA &&
        h.CARRO
    );
    
    if (horariosSimilares.length > 0) {
        // Encontrar veículo mais comum neste padrão
        const veiculosCount = {};
        horariosSimilares.forEach(h => {
            veiculosCount[h.CARRO] = (veiculosCount[h.CARRO] || 0) + 1;
        });
        
        const veiculoSugerido = Object.keys(veiculosCount).reduce((a, b) => 
            veiculosCount[a] > veiculosCount[b] ? a : b
        );
        
        return veiculoSugerido;
    }
    
    return null;
}

// Gerar resumo de atribuição por veículo
function gerarResumoAtribuicao(codigoLinha, horariosLinha) {
    const veiculosUtilizados = {};
    
    horariosLinha.forEach(horario => {
        if (horario.CARRO) {
            if (!veiculosUtilizados[horario.CARRO]) {
                veiculosUtilizados[horario.CARRO] = [];
            }
            veiculosUtilizados[horario.CARRO].push(horario.PARTIDA);
        }
    });
    
    if (Object.keys(veiculosUtilizados).length === 0) {
        return '<span style="color: #6c757d;">Nenhum veículo atribuído ainda</span>';
    }
    
    return Object.keys(veiculosUtilizados).map(veiculo => {
        const horarios = veiculosUtilizados[veiculo].sort();
        return `
            <div class="veiculo-resumo">
                <strong>${veiculo}:</strong> ${horarios.length} partidas (${horarios.join(', ')})
            </div>
        `;
    }).join('');
}

// Função para visualizar padrão completo
function visualizarPadraoCompleto(codigoLinha, destino, parada) {
    const horariosPadrao = horariosPredefinidos.filter(h => 
        h.LINHA === codigoLinha && 
        h.DESTINO === destino && 
        h.PARADA === parada
    );
    
    horariosPadrao.sort((a, b) => a.PARTIDA.localeCompare(b.PARTIDA));
    
    const info = `
        <h4>📋 Padrão Completo - ${codigoLinha}</h4>
        <p><strong>Destino:</strong> ${destino} | <strong>Parada:</strong> ${parada}</p>
        <div style="max-height: 400px; overflow-y: auto;">
            ${horariosPadrao.map(horario => `
                <div class="horario-padrao-item ${horario.CARRO ? 'com-veiculo' : 'sem-veiculo'}">
                    <strong>${horario.PARTIDA}</strong> - ${horario.DURACAO}min
                    ${horario.CARRO ? `<span style="color: #28a745; margin-left: 10px;">✅ ${horario.CARRO}</span>` : '<span style="color: #6c757d; margin-left: 10px;">⏳ Sem veículo</span>'}
                </div>
            `).join('')}
        </div>
        <p><strong>Total:</strong> ${horariosPadrao.length} horários</p>
    `;
    
    // Mostrar em modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            ${info}
            <div class="modal-actions">
                <button class="btn-info" onclick="fecharModal()">Fechar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Mostrar informações de duração para ajudar na decisão
function mostrarInfoDuracao(codigoLinha) {
    const horariosLinha = horariosPredefinidos.filter(h => h.LINHA === codigoLinha);
    
    // Agrupar por destino, parada e duração
    const grupos = {};
    horariosLinha.forEach(horario => {
        const chave = `${horario.DESTINO}-${horario.PARADA}-${horario.DURACAO}`;
        if (!grupos[chave]) {
            grupos[chave] = {
                destino: horario.DESTINO,
                parada: horario.PARADA,
                duracao: horario.DURACAO,
                horarios: [],
                veiculos: new Set()
            };
        }
        grupos[chave].horarios.push(horario.PARTIDA);
        if (horario.CARRO) {
            grupos[chave].veiculos.add(horario.CARRO);
        }
    });
    
    let info = `<h4>📊 Padrões de Duração - Linha ${codigoLinha}</h4>`;
    
    Object.values(grupos).forEach(grupo => {
        grupo.horarios.sort();
        info += `
            <div class="grupo-duracao">
                <strong>${grupo.destino}</strong> - Parada ${grupo.parada} - ${grupo.duracao}min
                <br><small>Horários: ${grupo.horarios.join(', ')}</small>
                ${grupo.veiculos.size > 0 ? 
                    `<br><small>Veículos usados: ${Array.from(grupo.veiculos).join(', ')}</small>` : 
                    ''
                }
            </div>
        `;
    });
    
    // Mostrar em modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            ${info}
            <div class="modal-actions">
                <button class="btn-info" onclick="fecharModal()">Fechar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Salvar escala atual
function salvarEscala() {
    const data = document.getElementById('dataEscala').value;
    const tipoDia = document.getElementById('tipoDia').value;
    
    if (!data) {
        alert('Selecione uma data!');
        return;
    }

    // Coletar apenas horários que têm veículos atribuídos
    const horariosComVeiculos = horariosPredefinidos.filter(horario => horario.CARRO);
    
    escalaAtual = {
        data: data,
        dataFormatada: formatarData(data),
        tipoDia: tipoDia,
        tipoDiaFormatado: obterNomeTipoDia(tipoDia),
        timestamp: new Date().toISOString(),
        horarios: horariosComVeiculos,
        resumo: gerarResumoCompleto()
    };

    alert(`✅ Escala salva para ${formatarData(data)}!\n\n📊 Resumo:\n• ${horariosComVeiculos.length} horários com veículos atribuídos\n• ${Object.keys(escalaAtual.resumo.veiculosUtilizados).length} veículos utilizados\n• Tipo: ${obterNomeTipoDia(tipoDia)}`);
}

// Gerar resumo completo
function gerarResumoCompleto() {
    const veiculosUtilizados = {};
    const linhasAtendidas = new Set();
    
    horariosPredefinidos.forEach(horario => {
        if (horario.CARRO) {
            linhasAtendidas.add(horario.LINHA);
            if (!veiculosUtilizados[horario.CARRO]) {
                veiculosUtilizados[horario.CARRO] = [];
            }
            veiculosUtilizados[horario.CARRO].push({
                linha: horario.LINHA,
                partida: horario.PARTIDA,
                destino: horario.DESTINO
            });
        }
    });
    
    return {
        totalHorarios: horariosPredefinidos.filter(h => h.CARRO).length,
        totalVeiculos: Object.keys(veiculosUtilizados).length,
        totalLinhas: linhasAtendidas.size,
        veiculosUtilizados: veiculosUtilizados
    };
}

// Exportar para JSON no padrão dd_mm_yyyy_tabela_horaria.json
function exportarJSON() {
    if (!escalaAtual.horarios || escalaAtual.horarios.length === 0) {
        alert('Nenhuma escala para exportar! Atribua veículos aos horários primeiro.');
        return;
    }

    const data = document.getElementById('dataEscala').value;
    if (!data) {
        alert('Selecione uma data!');
        return;
    }

    const dataFormatada = formatarDataParaArquivo(data);
    const nomeArquivo = `${dataFormatada}_tabela_horaria.json`;

    const dataStr = JSON.stringify(escalaAtual.horarios, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = nomeArquivo;
    link.click();
    
    console.log('Escala exportada:', {
        arquivo: nomeArquivo,
        horarios: escalaAtual.horarios.length
    });

    alert(`✅ Arquivo exportado com sucesso!\n\n📁 Nome: ${nomeArquivo}\n🕒 Horários: ${escalaAtual.horarios.length}`);
}

// Funções de abas
function abrirTab(tabName) {
    // Esconder todas as tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });

    // Mostrar a tab selecionada
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Limpar escala atual
function limparEscala() {
    if (confirm('Tem certeza que deseja limpar toda a escala atual?')) {
        document.getElementById('dataEscala').value = '';
        document.getElementById('linhasContainer').innerHTML = '';
        document.getElementById('listaHorariosPredefinidos').innerHTML = '';
        document.getElementById('relatorioContainer').innerHTML = '';
        escalaAtual = [];
        horariosCarregados = false;
        atualizarPreviewNomeArquivo();
    }
}

// Função para atribuição aleatória de veículos
function atribuicaoAutomatica() {
    const data = document.getElementById('dataEscala').value;
    const tipoDia = document.getElementById('tipoDia').value;
    const filtroGaragem = document.getElementById('filtroGaragem').value;
    
    if (!data) {
        alert('Selecione uma data primeiro!');
        return;
    }
    
    if (!horariosCarregados) {
        alert('Carregue a tabela horária primeiro!');
        return;
    }
    
    // Filtrar veículos disponíveis
    const veiculosFiltrados = veiculosDisponiveis.filter(veiculo => 
        veiculo.STATUS_OP === 'EM OPERAÇÃO' && 
        (!filtroGaragem || veiculo.GARAGEM === filtroGaragem)
    );
    
    if (veiculosFiltrados.length === 0) {
        alert('Nenhum veículo disponível para a garagem selecionada!');
        return;
    }
    
    // Contar horários sem veículo
    const horariosSemVeiculo = horariosPredefinidos.filter(h => 
        !h.CARRO || h.CARRO.startsWith('CARRO ') || !h.CARRO.trim()
    );
    
    if (horariosSemVeiculo.length === 0) {
        alert('Todos os horários já têm veículos atribuídos!');
        return;
    }
    
    // Modal de confirmação
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>🎲 Atribuição Automática de Veículos</h3>
            <div class="info-box">
                <p><strong>Esta função irá:</strong></p>
                <ul>
                    <li>Atribuir veículos aleatoriamente aos horários sem veículo</li>
                    <li>Respeitar os grupos CARRO X (mesmo veículo para todo o grupo)</li>
                    <li>Evitar conflitos de horário entre linhas</li>
                    <li>Usar apenas veículos disponíveis da garagem selecionada</li>
                </ul>
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p><strong>📊 Estatísticas:</strong></p>
                <p>• Veículos disponíveis: ${veiculosFiltrados.length}</p>
                <p>• Horários sem veículo: ${horariosSemVeiculo.length}</p>
                <p>• Tipo de dia: ${obterNomeTipoDia(tipoDia)}</p>
                <p>• Garagem: ${filtroGaragem || 'Todas'}</p>
            </div>
            <div class="modal-actions">
                <button class="btn-warning" onclick="fecharModal()">Cancelar</button>
                <button class="btn-success" onclick="executarAtribuicaoAutomatica()">🎲 Executar Atribuição Automática</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Executar a atribuição automática
function executarAtribuicaoAutomatica() {
    fecharModal();
    
    const filtroGaragem = document.getElementById('filtroGaragem').value;
    
    // Filtrar veículos disponíveis
    const veiculosDisponiveisArray = veiculosDisponiveis.filter(veiculo => 
        veiculo.STATUS_OP === 'EM OPERAÇÃO' && 
        (!filtroGaragem || veiculo.GARAGEM === filtroGaragem)
    );
    
    if (veiculosDisponiveisArray.length === 0) {
        alert('Nenhum veículo disponível!');
        return;
    }
    
    // Criar cópia dos veículos para usar como "pool"
    let veiculosPool = [...veiculosDisponiveisArray];
    let totalAtribuidos = 0;
    let tentativas = 0;
    const maxTentativas = 1000; // Prevenir loop infinito
    
    // Primeiro, processar todos os CARRO X
    const carrosXProcessados = new Set();
    
    horariosPredefinidos.forEach(horario => {
        if (tentativas >= maxTentativas) return;
        
        // Se já tem veículo, pular
        if (horario.CARRO && !horario.CARRO.startsWith('CARRO ') && horario.CARRO.trim()) {
            return;
        }
        
        // Se é CARRO X e ainda não foi processado
        if (horario.CARRO && horario.CARRO.startsWith('CARRO ') && !carrosXProcessados.has(horario.CARRO)) {
            carrosXProcessados.add(horario.CARRO);
            
            // Encontrar veículo disponível para todo o grupo
            const veiculoEncontrado = encontrarVeiculoParaCarroX(horario.LINHA, horario.CARRO, veiculosPool);
            
            if (veiculoEncontrado) {
                // Atribuir a todos os horários do CARRO X
                atribuirVeiculoParaCarroX(horario.LINHA, horario.CARRO, veiculoEncontrado.PREFIXO);
                totalAtribuidos++;
                
                // Remover veículo do pool
                veiculosPool = veiculosPool.filter(v => v.PREFIXO !== veiculoEncontrado.PREFIXO);
            }
            
            tentativas++;
        }
    });
    
    // Depois, processar horários individuais
    horariosPredefinidos.forEach(horario => {
        if (tentativas >= maxTentativas) return;
        
        // Se já tem veículo ou é CARRO X (já processado), pular
        if (horario.CARRO && 
            (!horario.CARRO.startsWith('CARRO ') || carrosXProcessados.has(horario.CARRO)) && 
            horario.CARRO.trim()) {
            return;
        }
        
        // Encontrar veículo disponível para este horário
        const veiculoEncontrado = encontrarVeiculoParaHorario(horario, veiculosPool);
        
        if (veiculoEncontrado) {
            // Atribuição individual
            horario.CARRO = veiculoEncontrado.PREFIXO;
            totalAtribuidos++;
            
            // Remover veículo do pool
            veiculosPool = veiculosPool.filter(v => v.PREFIXO !== veiculoEncontrado.PREFIXO);
        }
        
        tentativas++;
    });
    
    // Atualizar interface
    carregarInterfaceAtribuicaoVeiculos(filtroGaragem, document.getElementById('tipoDia').value);
    
    // Mostrar resultado
    setTimeout(() => {
        alert(`🎲 Atribuição Automática Concluída!\n\n✅ ${totalAtribuidos} horários atribuídos\n🚌 ${veiculosDisponiveisArray.length - veiculosPool.length} veículos utilizados\n📊 Eficiência: ${((totalAtribuidos / horariosPredefinidos.length) * 100).toFixed(1)}%`);
    }, 500);
}

// Encontrar veículo disponível para um CARRO X
function encontrarVeiculoParaCarroX(codigoLinha, carroPadrao, veiculosPool) {
    // Encontrar todos os horários do CARRO X
    const horariosDoCarroX = horariosPredefinidos.filter(h => 
        h.LINHA === codigoLinha && 
        h.CARRO === carroPadrao
    );
    
    // Verificar cada veículo no pool
    for (const veiculo of veiculosPool) {
        let veiculoValido = true;
        
        // Verificar conflitos para todos os horários do grupo
        for (const horario of horariosDoCarroX) {
            const conflitoHorario = verificarConflitoHorarioEntreLinhas(veiculo.PREFIXO, horario);
            const conflitoCarroX = verificarConflitoCarroX(codigoLinha, veiculo.PREFIXO);
            
            if (conflitoHorario.conflito || conflitoCarroX.encontrado) {
                veiculoValido = false;
                break;
            }
        }
        
        if (veiculoValido) {
            return veiculo;
        }
    }
    
    return null;
}

// Encontrar veículo disponível para um horário individual
function encontrarVeiculoParaHorario(horario, veiculosPool) {
    for (const veiculo of veiculosPool) {
        const conflitoHorario = verificarConflitoHorarioEntreLinhas(veiculo.PREFIXO, horario);
        const conflitoCarroX = verificarConflitoCarroX(horario.LINHA, veiculo.PREFIXO);
        
        if (!conflitoHorario.conflito && !conflitoCarroX.encontrado) {
            return veiculo;
        }
    }
    
    return null;
}

// Funções auxiliares
function formatarData(dataISO) {
    const data = new Date(dataISO);
    return data.toLocaleDateString('pt-BR');
}

function obterNomeTipoDia(tipo) {
    const tipos = {
        'semana': 'Dia de Semana',
        'sabado': 'Sábado', 
        'domingo_feriado': 'Domingo/Feriado'
    };
    return tipos[tipo] || tipo;
}

// Inicializar
carregarDados();

// Definir data atual como padrão
const hoje = new Date().toISOString().split('T')[0];
document.getElementById('dataEscala').value = hoje;
atualizarPreviewNomeArquivo();