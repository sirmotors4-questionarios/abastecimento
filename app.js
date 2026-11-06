const config = window.ABASTECIMENTO_CONFIG || {};
const form = document.querySelector('#abastecimentoForm');
const submitButton = document.querySelector('#submitButton');
const syncStatus = document.querySelector('#syncStatus');
const successPanel = document.querySelector('#successPanel');
const valorTotalDisplay = document.querySelector('#valorTotalDisplay');

const normalise = value => String(value ?? '').trim();
// Responsáveis conhecidos neste navegador e, quando disponíveis, nos dados mestre.
// A coluna enviada à base de dados continua a chamar-se exactamente "Responsavel".
const responsavelSelect = document.querySelector('#responsavelSelect');
const outroResponsavel = document.querySelector('#outroResponsavel');
const outroResponsavelLabel = document.querySelector('#outroResponsavelLabel');
const RESPONSAVEIS_STORAGE = 'sirAbastecimentoResponsaveis';
let responsaveisMaster = [];
function responsaveisLocais() {
  try {
    const valores = JSON.parse(localStorage.getItem(RESPONSAVEIS_STORAGE) || '[]');
    return Array.isArray(valores) ? valores.filter(x => typeof x === 'string') : [];
  } catch { return []; }
}
function nomeResponsavel(item) {
  if (typeof item === 'string') return item.trim();
  return String(item?.Responsavel || item?.responsavel || item?.Nome ||
    item?.nome || item?.codigo || '').trim();
}
function actualizarCampoResponsavel() {
  const outro = responsavelSelect.value === '__outro__';
  outroResponsavelLabel.hidden = !outro;
  outroResponsavel.disabled = !outro;
  outroResponsavel.required = outro;
  if (!outro) outroResponsavel.classList.remove('invalid');
  updateProgress();
}
function preencherResponsaveis() {
  const anterior = responsavelSelect.value;
  const nomes = [...new Map([...responsaveisMaster, ...responsaveisLocais()]
    .map(nomeResponsavel).filter(nome => nome && nome.toLocaleLowerCase('pt') !== 'outro')
    .map(nome => [nome.toLocaleLowerCase('pt'), nome])).values()]
    .sort((x,y) => x.localeCompare(y, 'pt'));
  responsavelSelect.replaceChildren(
    new Option('OUTRO — indicar nome','__outro__'),
    ...nomes.map(nome => new Option(nome,nome))
  );
  responsavelSelect.value = nomes.includes(anterior) ? anterior : '__outro__';
  actualizarCampoResponsavel();
}
function responsavelEscolhido() {
  return (responsavelSelect.value === '__outro__' ?
    outroResponsavel.value : responsavelSelect.value).trim();
}
function guardarResponsavel(nome) {
  try {
    const nomes = [...responsaveisLocais(), nome].map(n => n.trim()).filter(Boolean);
    localStorage.setItem(RESPONSAVEIS_STORAGE, JSON.stringify(
      [...new Map(nomes.map(n => [n.toLocaleLowerCase('pt'),n])).values()]
    ));
  } catch (error) { console.warn('Não foi possível guardar os responsáveis localmente.',error); }
  preencherResponsaveis();
}
responsavelSelect.addEventListener('change', actualizarCampoResponsavel);


const postoSelect = document.querySelector('#postoSelect');
const outroPosto = document.querySelector('#outroPosto');
const outroPostoLabel = document.querySelector('#outroPostoLabel');
let postosMaster = [];
function nomePosto(item) {
  if (typeof item === 'string') return item.trim();
  return String(item?.nome || item?.Nome || item?.Posto || item?.posto || item?.codigo || '').trim();
}
function actualizarCampoPosto() {
  const outro = postoSelect.value === '__outro__';
  outroPostoLabel.hidden = !outro;
  outroPosto.disabled = !outro;
  outroPosto.required = outro;
  if (!outro) outroPosto.classList.remove('invalid');
  updateProgress();
}
function preencherPostos(lista = null) {
  if (Array.isArray(lista)) postosMaster = lista.filter(item => typeof item === 'string' || isActive(item));
  const anterior = postoSelect.value;
  const postos = [...new Map(postosMaster
    .map(nomePosto).filter(nome => nome && nome.toLocaleLowerCase('pt') !== 'outro')
    .map(nome => [nome.toLocaleLowerCase('pt'), nome])).values()]
    .sort((x,y) => x.localeCompare(y,'pt'));
  postoSelect.replaceChildren(new Option('OUTRO — indicar posto','__outro__'),
    ...postos.map(nome => new Option(nome,nome)));
  postoSelect.value = postos.includes(anterior) ? anterior : '__outro__';
  actualizarCampoPosto();
}
function postoEscolhido() {
  return (postoSelect.value === '__outro__' ? outroPosto.value : postoSelect.value).trim();
}
postoSelect.addEventListener('change',actualizarCampoPosto);


const precoHistorico = document.querySelector('#precoHistorico');
const precoSelect = document.querySelector('#precoSelect');
const outroPreco = document.querySelector('#outroPreco');
const outroPrecoLabel = document.querySelector('#outroPrecoLabel');
let precosPostos = {}, precosDistintos = [];
function chavePosto(valor) { return normalise(valor).toLocaleLowerCase('pt'); }
function precoEscolhido() { return precoSelect.value === '__outro__' ? outroPreco.value : precoSelect.value; }
function atualizarCampoPreco() {
  const outro = precoSelect.value === '__outro__';
  outroPrecoLabel.hidden = !outro;
  outroPreco.disabled = !outro;
  outroPreco.required = outro;
  calcValorTotal();
  updateProgress();
}
function carregarPrecoHistorico() {
  const posto = postoEscolhido();
  const anterior = precosPostos[chavePosto(posto)];
  const ultimo = anterior && Number(anterior.valor)>0 ? Number(anterior.valor).toFixed(2) : '';
  // Último preço do posto em primeiro lugar. Os restantes valores distintos
  // seguem a ordem de recência enviada pela sincronização. OUTRO fica no fim.
  const valores = [...new Set([...(ultimo ? [ultimo] : []), ...precosDistintos]
    .map(v => Number(v)).filter(v => Number.isFinite(v) && v > 0).map(v => v.toFixed(2)))];
  precoSelect.replaceChildren(
    ...valores.map(v => new Option(new Intl.NumberFormat('pt-MZ', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(Number(v)) + ' MT', v)),
    new Option('OUTRO — indicar preço', '__outro__')
  );
  precoSelect.value = valores[0] || '__outro__';
  precoHistorico.textContent = ultimo ?
    'Último preço deste posto: ' + ultimo + ' MT/litro (data: ' + anterior.data + '). Pode seleccionar outro valor.' :
    valores.length ?
      'Sem preço anterior deste posto. Seleccionado o valor mais recente da base de dados; confirme antes de enviar.' :
      'Não foram recebidos preços unitários válidos do Excel. Utilize OUTRO e confirme a sincronização.';
  atualizarCampoPreco();
}
postoSelect.addEventListener('change', carregarPrecoHistorico);
outroPosto.addEventListener('input', carregarPrecoHistorico);
precoSelect.addEventListener('change', atualizarCampoPreco);
outroPreco.addEventListener('input', () => { calcValorTotal(); updateProgress(); });

const isActive = item => !item.estado || ['activo','activa','operacional','disponível','disponivel'].includes(normalise(item.estado).toLowerCase());

function setToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  form.elements['Data'].value = local.toISOString().slice(0, 10);
  document.querySelector('#todayLabel').textContent = new Intl.DateTimeFormat('pt-MZ', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(now);
}
async function loadMasterData() {
  try {
    const url = config.masterDataUrl || 'data/master-data.json';
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Não foi possível consultar as listas.');
    const data = await response.json();
    fillSelect('viaturas', data.viaturas, item => `${item.matricula || item.codigo}${item.modelo ? ` · ${item.modelo}` : ''}`, item => item.matricula || item.codigo);
    preencherPostos(Array.isArray(data.postos) ? data.postos : []);
    precosPostos = {};
    for (const item of (Array.isArray(data.precosPostos) ? data.precosPostos : [])) {
      const nome = nomePosto(item);
      if (nome) precosPostos[chavePosto(nome)] = {valor:item.valor, data:item.data};
    }
    precosDistintos = Array.isArray(data.precosDistintos) ? data.precosDistintos : [];
    carregarPrecoHistorico();
    const responsaveis = data.responsaveis || data.responsaveisAbastecimento || data.utilizadores || [];
    responsaveisMaster = Array.isArray(responsaveis) ? responsaveis : [];
    preencherResponsaveis();
    const updated = data.actualizadoEm ? new Date(data.actualizadoEm) : new Date();
    document.querySelector('#dataTimestamp').textContent = `Listas actualizadas: ${new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'short', timeStyle: 'short' }).format(updated)}`;
    syncStatus.className = 'sync online';
    syncStatus.innerHTML = '<span></span>Dados actualizados';
  } catch (error) {
    syncStatus.className = 'sync error';
    syncStatus.innerHTML = '<span></span>Falha na actualização';
    document.querySelectorAll('select[data-list]').forEach(select => select.innerHTML = '<option value="">Lista indisponível</option>');
  }
}

function fillSelect(key, items = [], label, value, optional = false) {
  const select = document.querySelector(`[data-list="${key}"]`);
  const active = items.filter(item => typeof item === 'string' || isActive(item));
  select.innerHTML = `<option value="">${optional ? 'Sem assistente / Seleccionar' : 'Seleccionar'}</option>` + active.map(item => `<option value="${escapeHtml(value(item))}">${escapeHtml(label(item))}</option>`).join('');
}

function escapeHtml(value) {
  return normalise(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));
}
function updateProgress() {
  const required = [...form.querySelectorAll('[required]')];
  const complete = required.filter(field => field.value.trim()).length;
  const pct = Math.round((complete / required.length) * 100);
  document.querySelector('#progressText').textContent = `${pct}%`;
  document.querySelector('#progressBar').style.width = `${pct}%`;
}

function calcValorTotal() {
  const litros = parseFloat(form.elements['Litros'].value);
  const valorUnitario = parseFloat(precoEscolhido());
  if (!isNaN(litros) && !isNaN(valorUnitario)) {
    const total = litros * valorUnitario;
    valorTotalDisplay.value = new Intl.NumberFormat('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(total);
    return total;
  }
  valorTotalDisplay.value = '';
  return null;
}

form.addEventListener('input', event => {
  event.target.classList.remove('invalid');
  calcValorTotal();
  updateProgress();
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  const invalid = [...form.querySelectorAll('[required]')].filter(field => !field.value.trim());
  if (invalid.length) {
    invalid.forEach(field => field.classList.add('invalid'));
    invalid[0].focus();
    document.querySelector('#formHint').textContent = 'Preencha todos os campos obrigatórios.';
    return;
  }

  const responsavel = responsavelEscolhido();
  if (!responsavel) {
    outroResponsavel.classList.add('invalid');
    outroResponsavel.focus();
    document.querySelector('#formHint').textContent = 'Indique o responsável pelo abastecimento.';
    return;
  }
  const posto = postoEscolhido();
  if (!posto) {
    outroPosto.classList.add('invalid');
    outroPosto.focus();
    document.querySelector('#formHint').textContent = 'Indique o posto de abastecimento.';
    return;
  }
  const payload = Object.fromEntries(new FormData(form).entries());
  delete payload.postoEscolha;
  delete payload.postoNovo;
  payload.Posto = posto;
  delete payload.responsavelSeleccao;
  delete payload.responsavelNovo;
  payload.Responsavel = responsavel;
  delete payload.precoEscolha;
  delete payload.precoNovo;
  const valorUnitarioEscolhido = Number(precoEscolhido());
  if (!Number.isFinite(valorUnitarioEscolhido) || valorUnitarioEscolhido <= 0) {
    document.querySelector('#formHint').textContent = 'Indique um valor unitário válido.';
    (precoSelect.value === '__outro__' ? outroPreco : precoSelect).focus();
    return;
  }
  payload.ValorUnitario = valorUnitarioEscolhido.toFixed(2);
  delete payload.ValorTotalDisplay;
  // Valor Total é uma coluna calculada em tbl_abastecimentos (=[@Litros]*[@[Valor Unitario]]).
  // Enviamos o valor calculado também, para o caso de o fluxo do Power Automate precisar dele explicitamente.
  const valorTotal = calcValorTotal();
  payload.ValorTotal = valorTotal !== null ? valorTotal.toFixed(2) : '';
  payload.registadoEm = new Date().toISOString();
  payload.origem = 'web-abastecimento';

  submitButton.disabled = true;
  submitButton.querySelector('span').textContent = 'A enviar...';
  try {
    if (config.submissionUrl && !config.demoMode) {
      const response = await fetch(config.submissionUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error('Submissão recusada.');
    } else {
      const entries = JSON.parse(localStorage.getItem('sirAbastecimentoDemo') || '[]');
      entries.push(payload);
      localStorage.setItem('sirAbastecimentoDemo', JSON.stringify(entries));
    }
    guardarResponsavel(responsavel);
    form.hidden = true;
    successPanel.hidden = false;
    document.querySelector('#successMessage').textContent = config.demoMode ? 'Modo de demonstração: o registo ficou guardado neste dispositivo.' : 'Os dados foram enviados para o sistema com sucesso.';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    document.querySelector('#formHint').textContent = 'Não foi possível enviar. Confirme a ligação e tente novamente.';
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector('span').textContent = 'Enviar registo';
  }
});
document.querySelector('#newEntry').addEventListener('click', () => {
  form.reset();
  outroPreco.value = '';
  outroPosto.value = '';
  preencherPostos();
  carregarPrecoHistorico();
  outroResponsavel.value = '';
  preencherResponsaveis();
  setToday();
  form.hidden = false;
  successPanel.hidden = true;
  valorTotalDisplay.value = '';
  document.querySelector('#formHint').textContent = 'Confirme os dados antes de enviar.';
  updateProgress();
});

preencherResponsaveis();
preencherPostos();
carregarPrecoHistorico();
setToday();
loadMasterData();
updateProgress();
