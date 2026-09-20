const config = window.ABASTECIMENTO_CONFIG || {};
const form = document.querySelector('#abastecimentoForm');
const submitButton = document.querySelector('#submitButton');
const syncStatus = document.querySelector('#syncStatus');
const successPanel = document.querySelector('#successPanel');
const valorTotalDisplay = document.querySelector('#valorTotalDisplay');

const normalise = value => String(value ?? '').trim();
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
    fillSelect('postos', data.postos, item => item.nome || item.codigo, item => item.nome || item.codigo);
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
  const valorUnitario = parseFloat(form.elements['ValorUnitario'].value);
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

  const payload = Object.fromEntries(new FormData(form).entries());
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
  setToday();
  form.hidden = false;
  successPanel.hidden = true;
  valorTotalDisplay.value = '';
  document.querySelector('#formHint').textContent = 'Confirme os dados antes de enviar.';
  updateProgress();
});

setToday();
loadMasterData();
updateProgress();
