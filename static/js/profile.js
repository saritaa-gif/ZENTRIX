function formatCOP(value) {
  return '$' + Number(value).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

let currentUser = null;
let allPreferences = [];

const styleLabels = {
  modern: 'Moderno', rustic: 'Rústico', classic: 'Clásico', bohemian: 'Bohemio'
};

const roomLabels = {
  sala: 'Sala', recamara: 'Recámara', comedor: 'Comedor', oficina: 'Oficina', infantil: 'Infantil'
};

const styleColors = {
  modern: '#2d2d2d', rustic: '#8B6914', classic: '#1a1612', bohemian: '#C47A5A',
  sala: '#b08968', recamara: '#6B4226', comedor: '#D4A574', oficina: '#555', infantil: '#E8B4B8'
};

async function checkAuth() {
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    if (data.error) { window.location.href = '/login'; return; }
    currentUser = data;
    renderProfile(data);
    if (data.role === 'admin') {
      document.querySelector('.navbar-nav').innerHTML = `
        <a href="/admin" class="nav-link">Admin</a>
        <a href="/store" class="nav-link">Tienda</a>
        <a href="/profile" class="nav-link active">Mi Perfil</a>
        <a href="#" class="nav-link btn-accent" onclick="logout()">Salir</a>
      `;
    }
  } catch { window.location.href = '/login'; }
}

function renderProfile(user) {
  document.getElementById('profile-avatar').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('profile-name').textContent = user.name;
  document.getElementById('prof-name').value = user.name;
  document.getElementById('prof-email').value = user.email;
  document.getElementById('prof-address').value = user.address || '';
  document.getElementById('prof-phone').value = user.phone || '';
}

async function updateProfile(e) {
  e.preventDefault();
  try {
    const res = await fetch('/api/profile', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('prof-name').value,
        address: document.getElementById('prof-address').value,
        phone: document.getElementById('prof-phone').value
      })
    });
    const data = await res.json();
    if (data.error) {
      document.getElementById('profile-alert').innerHTML = `<div class="alert alert-error">${data.error}</div>`;
      return;
    }
    document.getElementById('profile-alert').innerHTML = '<div class="alert alert-success">Perfil actualizado correctamente</div>';
    checkAuth();
    setTimeout(() => document.getElementById('profile-alert').innerHTML = '', 3000);
  } catch {
    document.getElementById('profile-alert').innerHTML = '<div class="alert alert-error">Error al actualizar</div>';
  }
}

async function loadOrders() {
  try {
    const res = await fetch('/api/orders');
    const orders = await res.json();
    const container = document.getElementById('orders-list');
    if (orders.length === 0) {
      container.innerHTML = '<p style="color:#7f8c8d;text-align:center;padding:20px;">Aún no tienes pedidos. <a href="/store">¡Empieza a comprar!</a></p>';
      return;
    }
    const paymentLabels = { credit_card: 'Crédito', debit_card: 'Débito', nequi: 'Nequi', daviplata: 'Daviplata', paypal: 'PayPal', cash: 'Efecty' };
    container.innerHTML = orders.map(o => `
      <div class="order-row">
        <div>
          <strong>Orden #${String(o.id).padStart(6, '0')}</strong>
          <div style="font-size:0.82rem;color:#7f8c8d;">${new Date(o.created_at).toLocaleDateString('es-ES')} - ${paymentLabels[o.payment_method] || o.payment_method}</div>
        </div>
        <div style="text-align:right;">
          <strong>${formatCOP(o.total)}</strong>
          <div><span class="order-status ${o.payment_status}">${o.payment_status === 'completed' ? 'Completada' : 'Pendiente'}</span></div>
        </div>
      </div>
    `).join('');
  } catch {}
}

async function loadPreferences() {
  try {
    const res = await fetch('/api/preferences');
    allPreferences = await res.json();
    renderPreferences();
  } catch {}
}

function renderPreferences() {
  const styles = allPreferences.filter(p => p.pref_type === 'style');
  const rooms = allPreferences.filter(p => p.pref_type === 'room');
  const furniture = allPreferences.filter(p => p.pref_type === 'furniture');

  const stylesEl = document.getElementById('pref-styles');
  const roomsEl = document.getElementById('pref-rooms');
  const furnitureEl = document.getElementById('pref-furniture');

  if (styles.length === 0) {
    stylesEl.innerHTML = '<p style="color:#7f8c8d;font-size:0.85rem;">Guarda tu estilo favorito desde la tienda.</p>';
  } else {
    stylesEl.innerHTML = styles.map(p => `
      <div class="pref-tag">
        <span class="pref-dot" style="background:${styleColors[p.pref_value] || '#b08968'}"></span>
        ${styleLabels[p.pref_value] || p.pref_value}
        <button class="pref-remove" onclick="removePreference(${p.id})">&times;</button>
      </div>
    `).join('');
  }

  if (rooms.length === 0) {
    roomsEl.innerHTML = '<p style="color:#7f8c8d;font-size:0.85rem;">Guarda las habitaciones que más te gusten.</p>';
  } else {
    roomsEl.innerHTML = rooms.map(p => `
      <div class="pref-tag">
        <span class="pref-dot" style="background:${styleColors[p.pref_value] || '#b08968'}"></span>
        ${roomLabels[p.pref_value] || p.pref_value}
        <button class="pref-remove" onclick="removePreference(${p.id})">&times;</button>
      </div>
    `).join('');
  }

  if (furniture.length === 0) {
    furnitureEl.innerHTML = '<p style="color:#7f8c8d;font-size:0.85rem;">Agrega muebles desde la <a href="/store">tienda</a>.</p>';
  } else {
    furnitureEl.innerHTML = furniture.map(p => `
      <div class="pref-tag pref-furniture-tag">
        ${p.pref_value}
        <button class="pref-remove" onclick="removePreference(${p.id})">&times;</button>
      </div>
    `).join('');
  }
}

async function removePreference(id) {
  try {
    await fetch(`/api/preferences/${id}`, { method: 'DELETE' });
    allPreferences = allPreferences.filter(p => p.id !== id);
    renderPreferences();
  } catch {}
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login';
}

checkAuth();
loadOrders();
loadPreferences();



