function formatCOP(value) {
  return '$' + Number(value).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const paymentLabels = {
  credit_card: 'Tarjeta de Crédito',
  debit_card: 'Tarjeta de Débito',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  paypal: 'PayPal',
  cash: 'Efectivo (Efecty)'
};

async function loadReceipt() {
  let order = null;
  try {
    const stored = sessionStorage.getItem('lastOrder');
    if (stored) {
      order = JSON.parse(stored);
    }
  } catch {}

  if (!order) {
    document.getElementById('receipt').innerHTML = `
      <div class="receipt-header">
        <div class="check-icon">❌</div>
        <h1>No se encontró la orden</h1>
        <p style="color:var(--text-light);margin-top:8px;">Realiza una compra para ver tu recibo</p>
      </div>
      <div class="receipt-actions" style="justify-content:center;margin-top:20px;">
        <a href="/store" class="btn btn-primary" style="width:auto;">Ir a la Tienda</a>
      </div>
    `;
    return;
  }

  document.getElementById('r-order-id').textContent = `#${String(order.id).padStart(6, '0')}`;
  const date = new Date(order.created_at || Date.now());
  document.getElementById('r-date').textContent = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  document.getElementById('r-customer').textContent = order.customer_name || 'Cliente';
  document.getElementById('r-email').textContent = order.customer_email || '';
  document.getElementById('r-payment').textContent = paymentLabels[order.payment_method] || order.payment_method;
  document.getElementById('r-address').textContent = order.shipping_address;

  if (order.payment_method === 'cash' && order.efecty_ref) {
    document.getElementById('r-efecty-section').classList.remove('hidden');
    document.getElementById('r-efecty-ref').textContent = order.efecty_ref;
  }

  document.getElementById('r-items').innerHTML = order.items.map(item => `
    <div class="receipt-item">
      <div>
        <div class="receipt-item-name">${item.name}</div>
        <div class="receipt-item-qty">Cantidad: ${item.quantity} x ${formatCOP(item.price)}</div>
      </div>
      <div>${formatCOP(item.price * item.quantity)}</div>
    </div>
  `).join('');

  const SHIPPING_COST = 10000;
  const FREE_SHIPPING = 500000;

  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= FREE_SHIPPING ? 0 : SHIPPING_COST;
  const grandTotal = subtotal + shipping;

  document.getElementById('r-subtotal').textContent = formatCOP(subtotal);
  document.getElementById('r-shipping').textContent = shipping === 0 ? 'Gratis' : formatCOP(shipping);
  document.getElementById('r-total').textContent = formatCOP(grandTotal);
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login';
}

loadReceipt();
