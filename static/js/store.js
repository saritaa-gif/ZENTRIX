function formatCOP(value) {
  return '$' + Number(value).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

let allProducts = [];
let cart = { items: [], total: 0 };
let currentCategory = 'all';
let searchQuery = '';
let currentSlide = 0;
let slideInterval;
let isLoggedIn = false;

const cartIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>';
const emptyCartSvg = '<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#c5b9a8" stroke-width="1.2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>';

const productVariants = {
  default: {
    colors: [
      { name: 'Natural', hex: '#d4b896', filter: 'none' },
      { name: 'Gris', hex: '#8a8a8a', filter: 'grayscale(0.8)' },
      { name: 'Negro', hex: '#2d2d2d', filter: 'grayscale(1) brightness(0.4)' },
      { name: 'Blanco', hex: '#f5f0eb', filter: 'grayscale(1) brightness(1.3)' },
      { name: 'Verde Oliva', hex: '#6b7c4e', filter: 'sepia(0.4) hue-rotate(60deg) saturate(0.8)' },
      { name: 'Terracota', hex: '#c47a5a', filter: 'sepia(0.5) hue-rotate(-10deg) saturate(1.2)' },
    ],
    materials: [
      { name: 'Tela', icon: '🧵', desc: 'Suave y transpirable' },
      { name: 'Lino', icon: '🌾', desc: 'Natural y resistente' },
      { name: 'Cuero', icon: '🪑', desc: 'Elegante y duradero' },
      { name: 'Terciopelo', icon: '💎', desc: 'Lujoso y suave' },
    ]
  }
};

// --- CAROUSEL ---
function nextSlide() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.dot');
  slides[currentSlide].classList.remove('active');
  dots[currentSlide].classList.remove('active');
  currentSlide = (currentSlide + 1) % slides.length;
  slides[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');
}

function prevSlide() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.dot');
  slides[currentSlide].classList.remove('active');
  dots[currentSlide].classList.remove('active');
  currentSlide = (currentSlide - 1 + slides.length) % slides.length;
  slides[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');
}

function goToSlide(index) {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.dot');
  slides[currentSlide].classList.remove('active');
  dots[currentSlide].classList.remove('active');
  currentSlide = index;
  slides[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');
  resetSlideInterval();
}

function resetSlideInterval() {
  clearInterval(slideInterval);
  slideInterval = setInterval(nextSlide, 5000);
}

// --- AUTH ---
async function checkAuth() {
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    if (data.error) {
      isLoggedIn = false;
      document.querySelector('.navbar-nav').innerHTML = `
        <a href="/store" class="nav-link active">Tienda</a>
        <a href="/login" class="nav-link">Iniciar Sesión</a>
      `;
      return;
    }
    isLoggedIn = true;
    if (data.role === 'admin') {
      document.querySelector('.navbar-nav').innerHTML = `
        <a href="/admin" class="nav-link">Admin</a>
        <a href="/store" class="nav-link active">Tienda</a>
        <a href="/profile" class="nav-link">Mi Perfil</a>
        <a href="#" class="nav-link cart-link" onclick="openCart()">${cartIcon} <span class="cart-badge" id="cart-count">0</span></a>
        <a href="#" class="nav-link btn-accent" onclick="logout()">Salir</a>
      `;
    } else {
      document.querySelector('.navbar-nav').innerHTML = `
        <a href="/store" class="nav-link active">Tienda</a>
        <a href="/profile" class="nav-link">Mi Perfil</a>
        <a href="#" class="nav-link cart-link" onclick="openCart()">${cartIcon} <span class="cart-badge" id="cart-count">0</span></a>
        <a href="#" class="nav-link btn-accent" onclick="logout()">Salir</a>
      `;
    }
  } catch {
    isLoggedIn = false;
    document.querySelector('.navbar-nav').innerHTML = `
      <a href="/store" class="nav-link active">Tienda</a>
      <a href="/login" class="nav-link">Iniciar Sesión</a>
    `;
  }
}

// --- PRODUCTS ---
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    allProducts = data.map(p => ({ ...p, price: Number(p.price) }));
    renderProducts();
  } catch (e) {
    console.error('Error cargando productos:', e);
    document.getElementById('product-grid').innerHTML = '<p class="text-center" style="grid-column:1/-1;padding:40px;color:var(--text-light);">Error cargando productos</p>';
  }
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  let filtered = allProducts;
  if (currentCategory !== 'all') filtered = filtered.filter(p => p.category === currentCategory);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
  }
  if (filtered.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-light);">' + emptyCartSvg + '<p style="margin-top:12px;font-size:1rem;">No se encontraron productos</p></div>';
    return;
  }
  grid.innerHTML = filtered.map(p => `
    <div class="product-card" onclick="openProductDetail(${p.id})" style="cursor:pointer;">
      <div class="product-img-wrapper">
       <img class="product-img" id="product-img-${p.id}" src="${p.image || 'https://via.placeholder.com/400x300?text=' + encodeURIComponent(p.name)}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/400x300?text=Mueble'">
        <div class="product-badge-try" title="Personalizar colores y materiales">🎨</div>
      </div>
      <div class="product-body">
        <div class="product-category">${p.category}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.description || ''}</div>
      </div>
      <div class="product-footer">
        <div class="product-price">${formatCOP(p.price)}</div>
        <div class="product-actions">
          ${isLoggedIn
            ? `<button class="btn-fav" onclick="saveFurniture(${p.id}, '${p.name.replace(/'/g, "\\'")}', event)" title="Guardar favorito">♡</button>`
            : ''
          }
          ${isLoggedIn
            ? `<button class="btn-add" onclick="addToCart(${p.id}, event)">Agregar</button>`
            : `<a href="/login" class="btn-add" style="text-decoration:none;text-align:center;" onclick="event.stopPropagation();">Iniciar Sesión</a>`
          }
        </div>
      </div>
    </div>
  `).join('');
}

// --- PRODUCT DETAIL MODAL ---
function openProductDetail(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;
  const v = productVariants.default;

  const modal = document.getElementById('product-modal');
  modal.innerHTML = `
    <div class="modal" style="max-width:700px;" onclick="event.stopPropagation()">
      <button class="modal-close-x" onclick="closeProductDetail()">&times;</button>
      <div class="detail-grid">
        <div class="detail-img-section">
          <img id="detail-img" src="${product.image_url}" alt="${product.name}" style="width:100%;height:320px;object-fit:cover;border-radius:var(--radius-sm);background:#e8e2da;">
          <div class="detail-colors-row">
            ${v.colors.map((c, i) => `
              <div class="detail-color-swatch ${i === 0 ? 'active' : ''}"
                   style="background:${c.hex};"
                   title="${c.name}"
                   onclick="changeProductColor(${productId}, '${c.filter}', this)"></div>
            `).join('')}
          </div>
        </div>
        <div class="detail-info-section">
          <div class="product-category">${product.category}</div>
          <h2 style="font-size:1.4rem;font-weight:800;margin:8px 0 6px;">${product.name}</h2>
          <p style="color:var(--text-light);font-size:0.9rem;margin-bottom:16px;">${product.description || ''}</p>
          <div style="font-size:1.6rem;font-weight:800;color:var(--accent);margin-bottom:20px;">${formatCOP(product.price)}</div>

          <div style="margin-bottom:16px;">
            <div style="font-weight:600;font-size:0.85rem;margin-bottom:8px;">Color seleccionado: <span id="detail-color-name" style="color:var(--accent);">Natural</span></div>
          </div>

          <div style="margin-bottom:20px;">
            <div style="font-weight:600;font-size:0.85rem;margin-bottom:10px;">Material / Tela</div>
            <div class="detail-materials">
              ${v.materials.map((m, i) => `
                <div class="detail-material ${i === 0 ? 'active' : ''}" onclick="selectMaterial(this, '${m.name}')">
                  <span class="detail-material-icon">${m.icon}</span>
                  <div>
                    <div style="font-weight:600;font-size:0.85rem;">${m.name}</div>
                    <div style="font-size:0.75rem;color:var(--text-light);">${m.desc}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div style="font-size:0.82rem;color:var(--text-light);margin-bottom:20px;">
            <div>📦 Stock disponible: <strong>${product.stock} unidades</strong></div>
            <div style="margin-top:4px;">🚚 Envío gratis en compras mayores a $500.000</div>
          </div>

          ${isLoggedIn
            ? `<button class="btn btn-primary" onclick="addToCart(${product.id}, event);closeProductDetail();" style="width:100%;">Agregar al Carrito</button>`
            : `<a href="/login" class="btn btn-primary" style="text-decoration:none;">Iniciar Sesión para Comprar</a>`
          }
        </div>
      </div>
    </div>
  `;
  modal.classList.add('open');

  modal.onclick = function(e) {
    if (e.target === modal) closeProductDetail();
  };
}

function changeProductColor(productId, filter, el) {
  const img = document.getElementById('detail-img');
  if (img) img.style.filter = filter;
  document.querySelectorAll('.detail-color-swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('detail-color-name').textContent = el.title;
}

function selectMaterial(el, name) {
  document.querySelectorAll('.detail-material').forEach(m => m.classList.remove('active'));
  el.classList.add('active');
}

function closeProductDetail() {
  const modal = document.getElementById('product-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.innerHTML = '';
  }
}

function filterProducts(category, el) {
  currentCategory = category;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderProducts();
}

function searchProducts(q) {
  searchQuery = q;
  renderProducts();
}

async function saveFurniture(productId, productName, event) {
  if (event) event.stopPropagation();
  try {
    const res = await fetch('/api/preferences', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'furniture', value: productName, product_id: productId })
    });
    const data = await res.json();
    if (data.error) {
      if (res.status === 401) { window.location.href = '/login'; return; }
      return;
    }
    const btn = event ? event.target : null;
    if (btn) {
      btn.textContent = '♥';
      btn.style.color = 'var(--danger)';
      setTimeout(() => { btn.textContent = '♡'; btn.style.color = ''; }, 1500);
    }
  } catch {}
}

// --- CART ---
function flyToCart(productId) {
  const productCard = document.querySelector(`#product-img-${productId}`);
  if (!productCard) return null;

  const cartLink = document.querySelector('.cart-link') || document.querySelector('.cart-badge');
  if (!cartLink) return null;

  const imgRect = productCard.getBoundingClientRect();
  const cartRect = cartLink.getBoundingClientRect();

  const flyer = document.createElement('div');
  flyer.className = 'cart-flyer';
  flyer.innerHTML = `<img src="${productCard.src}" alt="">`;
  flyer.style.left = imgRect.left + imgRect.width / 2 - 30 + 'px';
  flyer.style.top = imgRect.top + imgRect.height / 2 - 30 + 'px';
  document.body.appendChild(flyer);

  requestAnimationFrame(() => {
    flyer.style.left = cartRect.left + cartRect.width / 2 - 30 + 'px';
    flyer.style.top = cartRect.top + cartRect.height / 2 - 30 + 'px';
    flyer.style.opacity = '0';
    flyer.style.transform = 'scale(0.2) rotate(20deg)';
  });

  setTimeout(() => {
    flyer.remove();
    const badge = document.querySelector('.cart-badge');
    if (badge) {
      badge.classList.add('cart-badge-bounce');
      setTimeout(() => badge.classList.remove('cart-badge-bounce'), 500);
    }
  }, 650);

  return true;
}

async function addToCart(productId, event) {
  if (event) event.stopPropagation();

  const product = allProducts.find(p => p.id === productId);
  if (product) {
    flyToCart(productId);
  }

  try {
    const res = await fetch('/api/cart', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, quantity: 1 })
    });
    if (res.status === 401) {
      alert('Debes iniciar sesión para agregar productos al carrito');
      window.location.href = '/login';
      return;
    }
    const data = await res.json();
    if (data.error) { alert(data.error); return; }
    loadCart();
  } catch { alert('Error al agregar al carrito'); }
}

async function loadCart() {
  try {
    const res = await fetch('/api/cart');
    if (!res.ok) {
      cart = { items: [], total: 0 };
      const badge = document.getElementById('cart-count');
      if (badge) badge.textContent = '0';
      renderCart();
      return;
    }
    cart = await res.json();
    const badge = document.getElementById('cart-count');
    if (badge) badge.textContent = cart.items.length;
    renderCart();
  } catch {
    cart = { items: [], total: 0 };
  }
}

function renderCart() {
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  const btnCheckout = document.getElementById('btn-checkout');
  const shippingEl = document.getElementById('shipping-progress');
  const FREE_SHIPPING = 500000;
  const SHIPPING_COST = 10000;

  if (cart.items.length === 0) {
    container.innerHTML = '<div class="cart-empty">' + emptyCartSvg + '<p>Tu carrito está vacío</p></div>';
    totalEl.textContent = '$0';
    btnCheckout.disabled = true;
    shippingEl.innerHTML = '';
    return;
  }

  btnCheckout.disabled = false;

  const subtotal = cart.total;
  const shipping = subtotal >= FREE_SHIPPING ? 0 : SHIPPING_COST;
  const grandTotal = subtotal + shipping;

  totalEl.textContent = formatCOP(grandTotal);

if (shipping > 0) {
    const remaining = FREE_SHIPPING - subtotal;
    const pct = Math.min((subtotal / FREE_SHIPPING) * 100, 100);
    shippingEl.innerHTML = `
      <div class="shipping-progress">
        <div class="shipping-text">Te faltan <strong>${formatCOP(remaining)}</strong> para envío gratis 🚚</div>
        <div class="shipping-bar"><div class="shipping-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  } else {
    shippingEl.innerHTML = `
      <div class="shipping-progress achieved">
        <div class="shipping-text">🎉 ¡Tienes envío gratis!</div>
        <div class="shipping-bar"><div class="shipping-fill achieved" style="width:100%"></div></div>
      </div>
    `;
  }

  container.innerHTML = cart.items.map(item => `
    <div class="cart-item">
      <img src="${item.image_url || 'https://via.placeholder.com/68'}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/68'">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatCOP(item.price * item.quantity)}</div>
        <div class="cart-item-controls">
          <button onclick="updateCartItem(${item.id}, ${item.quantity - 1})">-</button>
          <span>${item.quantity}</span>
          <button onclick="updateCartItem(${item.id}, ${item.quantity + 1})">+</button>
        </div>
        <button class="cart-item-remove" onclick="removeCartItem(${item.id})">Eliminar</button>
      </div>
    </div>
  `).join('') + `
    <div class="cart-summary-lines">
      <div class="cart-summary-line"><span>Subtotal</span><span>${formatCOP(subtotal)}</span></div>
      <div class="cart-summary-line"><span>Envío</span><span>${shipping === 0 ? 'Gratis' : formatCOP(shipping)}</span></div>
    </div>
  `;
}

async function updateCartItem(cartId, qty) {
  if (qty <= 0) { await removeCartItem(cartId); return; }
  await fetch(`/api/cart/${cartId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity: qty })
  });
  loadCart();
}

async function removeCartItem(cartId) {
  await fetch(`/api/cart/${cartId}`, { method: 'DELETE' });
  loadCart();
}

function openCart() {
  document.getElementById('cart-overlay').classList.add('open');
  document.getElementById('cart-sidebar').classList.add('open');
}

function closeCart() {
  document.getElementById('cart-overlay').classList.remove('open');
  document.getElementById('cart-sidebar').classList.remove('open');
}

function goToCheckout() {
  if (cart.items.length === 0) return;
  closeCart();
  window.location.href = '/checkout';
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  sessionStorage.clear();
  cart = { items: [], total: 0 };
  window.location.href = '/login';
}

function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

// --- INIT ---
checkAuth();
loadProducts();
loadCart();
resetSlideInterval();
