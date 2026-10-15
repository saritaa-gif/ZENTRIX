function formatCOP(value) {
  return '$' + Number(value).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

let cart = { items: [], total: 0 };
let selectedPayment = 'credit_card';
let efectyRefCode = '';

function generateEfectyRef() {
  const num = Math.floor(100000 + Math.random() * 900000);
  efectyRefCode = 'ZEN-' + num;
  const el = document.getElementById('efecty-ref-code');
  if (el) el.textContent = efectyRefCode;
}

async function checkAuth() {
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    if (data.error) { window.location.href = '/login'; return; }
    if (data.address) document.getElementById('shipping-address').value = data.address;
    if (data.name) document.getElementById('customer-name').value = data.name;
    if (data.email) document.getElementById('customer-email').value = data.email;
  } catch { window.location.href = '/login'; }
}

async function loadCart() {
  try {
    const res = await fetch('/api/cart');
    cart = await res.json();
    if (cart.items.length === 0) { window.location.href = '/store'; return; }
    renderOrderSummary();
  } catch { window.location.href = '/store'; }
}

function renderOrderSummary() {
  const SHIPPING_COST = 10000;
  const FREE_SHIPPING = 500000;

  const subtotal = cart.total;
  const shipping = subtotal >= FREE_SHIPPING ? 0 : SHIPPING_COST;
  const grandTotal = subtotal + shipping;

  document.getElementById('order-items').innerHTML = cart.items.map(item => `
    <div class="order-summary-item">
      <span>${item.name} x${item.quantity}</span>
      <span>${formatCOP(item.price * item.quantity)}</span>
    </div>
  `).join('');

  document.getElementById('order-subtotal').textContent = formatCOP(subtotal);
  document.getElementById('order-shipping').textContent = shipping === 0 ? 'Gratis' : formatCOP(shipping);
  document.getElementById('order-total').textContent = formatCOP(grandTotal);
}

function selectPayment(method, el) {
  selectedPayment = method;
  document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');

  const cardDetails = document.getElementById('card-details');
  const nequiDetails = document.getElementById('nequi-details');
  const daviplataDetails = document.getElementById('daviplata-details');
  const paypalDetails = document.getElementById('paypal-details');
  const efectyDetails = document.getElementById('efecty-details');

  cardDetails.style.display = 'none';
  nequiDetails.classList.add('hidden');
  daviplataDetails.classList.add('hidden');
  paypalDetails.classList.add('hidden');
  efectyDetails.classList.add('hidden');

  if (method === 'credit_card' || method === 'debit_card') {
    cardDetails.style.display = 'block';
  } else if (method === 'nequi') {
    nequiDetails.classList.remove('hidden');
  } else if (method === 'daviplata') {
    daviplataDetails.classList.remove('hidden');
  } else if (method === 'paypal') {
    paypalDetails.classList.remove('hidden');
  } else if (method === 'cash') {
    efectyDetails.classList.remove('hidden');
    generateEfectyRef();
  }
}

function formatCardNumber(e) {
  let v = e.target.value.replace(/\D/g, '').substring(0, 16);
  e.target.value = v.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(e) {
  let v = e.target.value.replace(/\D/g, '').substring(0, 4);
  if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2);
  e.target.value = v;
}

function formatNequiPhone(e) {
  let v = e.target.value.replace(/\D/g, '').substring(0, 10);
  if (v.length > 6) v = v.substring(0, 3) + ' ' + v.substring(3, 6) + ' ' + v.substring(6);
  else if (v.length > 3) v = v.substring(0, 3) + ' ' + v.substring(3);
  e.target.value = v;
}

function formatCedula(e) {
  let v = e.target.value.replace(/\D/g, '').substring(0, 10);
  if (v.length > 7) v = v.substring(0, 1) + '.' + v.substring(1, 4) + '.' + v.substring(4, 7) + '.' + v.substring(7);
  else if (v.length > 4) v = v.substring(0, 1) + '.' + v.substring(1, 4) + '.' + v.substring(4);
  else if (v.length > 1) v = v.substring(0, 1) + '.' + v.substring(1);
  e.target.value = v;
}

document.addEventListener('DOMContentLoaded', () => {
  const cn = document.getElementById('card-number');
  const ce = document.getElementById('card-expiry');
  const np = document.getElementById('nequi-phone');
  const dp = document.getElementById('daviplata-phone');
  const dc = document.getElementById('daviplata-cedula');
  const ef = document.getElementById('efecty-cedula');
  const ep = document.getElementById('efecty-phone');
  if (cn) cn.addEventListener('input', formatCardNumber);
  if (ce) ce.addEventListener('input', formatExpiry);
  if (np) np.addEventListener('input', formatNequiPhone);
  if (dp) dp.addEventListener('input', formatNequiPhone);
  if (dc) dc.addEventListener('input', formatCedula);
  if (ef) ef.addEventListener('input', formatCedula);
  if (ep) ep.addEventListener('input', formatNequiPhone);
});

async function processPayment() {
  const btn = document.getElementById('btn-pay');
  const address = document.getElementById('shipping-address').value;
  if (!address) { showAlert('checkout-alert', 'Por favor ingresa la dirección de envío', 'error'); return; }

  if (selectedPayment === 'credit_card' || selectedPayment === 'debit_card') {
    const cn = document.getElementById('card-number').value.replace(/\s/g, '');
    const ce = document.getElementById('card-expiry').value;
    const cv = document.getElementById('card-cvv').value;
    const nm = document.getElementById('card-name').value;
    if (!cn || !ce || !cv || !nm) {
      showAlert('checkout-alert', 'Por favor completa los datos de la tarjeta', 'error');
      return;
    }
  }

  if (selectedPayment === 'nequi') {
    const phone = document.getElementById('nequi-phone').value.replace(/\s/g, '');
    const name = document.getElementById('nequi-name').value;
    if (!phone || phone.length < 10) {
      showAlert('checkout-alert', 'Ingresa un número de celular Nequi válido (10 dígitos)', 'error');
      return;
    }
    if (!name) {
      showAlert('checkout-alert', 'Ingresa el nombre asociado a tu cuenta Nequi', 'error');
      return;
    }
  }

  if (selectedPayment === 'daviplata') {
    const phone = document.getElementById('daviplata-phone').value.replace(/\s/g, '');
    const name = document.getElementById('daviplata-name').value;
    const cedula = document.getElementById('daviplata-cedula').value;
    if (!phone || phone.length < 10) {
      showAlert('checkout-alert', 'Ingresa un número de celular Daviplata válido (10 dígitos)', 'error');
      return;
    }
    if (!name) {
      showAlert('checkout-alert', 'Ingresa tu nombre completo', 'error');
      return;
    }
    if (!cedula) {
      showAlert('checkout-alert', 'Ingresa tu número de cédula', 'error');
      return;
    }
  }

  if (selectedPayment === 'paypal') {
    const email = document.getElementById('paypal-email').value;
    const name = document.getElementById('paypal-name').value;
    if (!email || !email.includes('@')) {
      showAlert('checkout-alert', 'Ingresa un correo electrónico válido de PayPal', 'error');
      return;
    }
    if (!name) {
      showAlert('checkout-alert', 'Ingresa tu nombre completo', 'error');
      return;
    }
  }

  if (selectedPayment === 'cash') {
    const cedula = document.getElementById('efecty-cedula').value;
    const name = document.getElementById('efecty-name').value;
    const phone = document.getElementById('efecty-phone').value;
    if (!cedula) {
      showAlert('checkout-alert', 'Ingresa tu número de cédula o documento', 'error');
      return;
    }
    if (!name) {
      showAlert('checkout-alert', 'Ingresa tu nombre completo', 'error');
      return;
    }
    if (!phone || phone.replace(/\s/g, '').length < 10) {
      showAlert('checkout-alert', 'Ingresa un número de teléfono válido', 'error');
      return;
    }
  }

  btn.disabled = true;
  btn.textContent = 'Procesando pago...';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_method: selectedPayment,
        shipping_address: address
      })
    });
    const data = await res.json();
    if (data.error) { showAlert('checkout-alert', data.error, 'error'); btn.disabled = false; btn.textContent = 'Confirmar y Pagar'; return; }

    if (selectedPayment === 'cash') {
      data.order.efecty_ref = efectyRefCode;
      data.order.customer_cedula = document.getElementById('efecty-cedula').value;
      data.order.customer_name = document.getElementById('efecty-name').value;
    }

    sessionStorage.setItem('lastOrder', JSON.stringify(data.order));
    window.location.href = '/receipt';
  } catch {
    showAlert('checkout-alert', 'Error al procesar el pago', 'error');
    btn.disabled = false;
    btn.textContent = 'Confirmar y Pagar';
  }
}

function showAlert(id, msg, type) {
  document.getElementById(id).innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login';
}

checkAuth();
loadCart();
