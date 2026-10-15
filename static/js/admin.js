function formatCOP(value) {
  return '$' + Number(value).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

let allProducts = [];

async function checkAuth() {
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    if (data.error || data.role !== 'admin') { window.location.href = '/login'; return; }
  } catch { window.location.href = '/login'; }
}

async function loadStats() {
  try {
    const res = await fetch('/api/admin/stats');
    const s = await res.json();
    document.getElementById('admin-stats').innerHTML = `
      <div class="stat-card"><div class="stat-number">${s.totalProducts}</div><div class="stat-label">Productos</div></div>
      <div class="stat-card"><div class="stat-number">${s.totalOrders}</div><div class="stat-label">Órdenes</div></div>
      <div class="stat-card"><div class="stat-number">${formatCOP(s.totalRevenue)}</div><div class="stat-label">Ingresos</div></div>
      <div class="stat-card"><div class="stat-number">${s.totalUsers}</div><div class="stat-label">Clientes</div></div>
    `;
  } catch {}
}

async function loadProducts() {
  try {
    const res = await fetch('/api/products/all');
    allProducts = await res.json();
    renderAdminProducts(allProducts);
  } catch {}
}

function renderAdminProducts(products) {
  const tbody = document.getElementById('admin-products-table');
  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#7f8c8d;padding:20px;">No hay productos</td></tr>';
    return;
  }
  tbody.innerHTML = products.map(p => `
    <tr>
      <td><img src="${p.image_url || 'https://via.placeholder.com/50x35'}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/50x35'"></td>
      <td><strong>${p.name}</strong></td>
      <td>${p.category}</td>
      <td>${formatCOP(p.price)}</td>
      <td>${p.stock}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-outline btn-sm" onclick="editProduct(${p.id})">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterAdminProducts(q) {
  const filtered = allProducts.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
  renderAdminProducts(filtered);
}

function openProductModal(product = null) {
  document.getElementById('product-modal').classList.add('open');
  document.getElementById('modal-alert').innerHTML = '';
  if (product) {
    document.getElementById('modal-title').textContent = 'Editar Producto';
    document.getElementById('edit-product-id').value = product.id;
    document.getElementById('p-name').value = product.name;
    document.getElementById('p-desc').value = product.description;
    document.getElementById('p-price').value = product.price;
    document.getElementById('p-stock').value = product.stock;
    document.getElementById('p-category').value = product.category;
    document.getElementById('p-image').value = product.image_url;
  } else {
    document.getElementById('modal-title').textContent = 'Agregar Producto';
    document.getElementById('edit-product-id').value = '';
    document.getElementById('p-name').value = '';
    document.getElementById('p-desc').value = '';
    document.getElementById('p-price').value = '';
    document.getElementById('p-stock').value = '0';
    document.getElementById('p-category').value = 'sillas';
    document.getElementById('p-image').value = '';
  }
}

function closeProductModal() {
  document.getElementById('product-modal').classList.remove('open');
}

function editProduct(id) {
  const product = allProducts.find(p => p.id === id);
  if (product) openProductModal(product);
}

async function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('edit-product-id').value;
  const body = {
    name: document.getElementById('p-name').value,
    description: document.getElementById('p-desc').value,
    price: parseFloat(document.getElementById('p-price').value),
    category: document.getElementById('p-category').value,
    image_url: document.getElementById('p-image').value,
    stock: parseInt(document.getElementById('p-stock').value) || 0
  };

  try {
    const url = id ? `/api/products/${id}` : '/api/products';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.error) {
      document.getElementById('modal-alert').innerHTML = `<div class="alert alert-error">${data.error}</div>`;
      return;
    }
    closeProductModal();
    loadProducts();
    loadStats();
  } catch {
    document.getElementById('modal-alert').innerHTML = '<div class="alert alert-error">Error al guardar</div>';
  }
}

async function deleteProduct(id, name) {
  if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return;
  try {
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    loadProducts();
    loadStats();
  } catch {}
}

async function loadOrders() {
  try {
    const res = await fetch('/api/orders');
    const orders = await res.json();
    const tbody = document.getElementById('admin-orders-table');
    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#7f8c8d;padding:20px;">No hay órdenes aún</td></tr>';
      return;
    }
    const paymentLabels = { credit_card: 'Crédito', debit_card: 'Débito', nequi: 'Nequi', daviplata: 'Daviplata', paypal: 'PayPal', cash: 'Efecty' };
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><strong>#${String(o.id).padStart(6, '0')}</strong></td>
        <td>${o.customer_name || 'N/A'}</td>
        <td><strong>${formatCOP(o.total)}</strong></td>
        <td>${paymentLabels[o.payment_method] || o.payment_method}</td>
        <td><span class="order-status ${o.payment_status}">${o.payment_status === 'completed' ? 'Completada' : 'Pendiente'}</span></td>
        <td>${new Date(o.created_at).toLocaleDateString('es-ES')}</td>
      </tr>
    `).join('');
  } catch {}
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login';
}

checkAuth();
loadStats();
loadProducts();
loadOrders();



