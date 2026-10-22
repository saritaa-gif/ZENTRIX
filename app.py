import pymysql
import pymysql.cursors
import bcrypt
import decimal
import os
import time
from functools import wraps
from flask import Flask, request, jsonify, session, render_template
from flask_cors import CORS

app = Flask(__name__)
app.secret_key = 'muebles-tienda-secret-2026'
CORS(app, supports_credentials=True)


@app.after_request
def add_no_cache_headers(resp):
    if resp.mimetype == 'text/html':
        resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        resp.headers['Pragma'] = 'no-cache'
        resp.headers['Expires'] = '0'
    return resp

# ============================================
# CONFIGURACION DE MYSQL
# ============================================
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'ZENTRIX',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}


def get_db():
    return pymysql.connect(**DB_CONFIG)


def convert_decimals(obj):
    if isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimals(i) for i in obj]
    elif isinstance(obj, decimal.Decimal):
        return float(obj)
    return obj


def init_db():
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) as c FROM products")
        count = cur.fetchone()['c']
        if count == 0:
            products = [
                ('Silla Moderna Ergonómica', 'Silla de oficina con soporte lumbar ajustable y base de aluminio pulido.', 189.99, 'sillas', 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400&h=300&fit=crop', 25),
                ('Sofá Seccional Gris', 'Sofá de 3 piezas con tapizado en tela premium y estructura de madera sólida.', 899.99, 'sofas', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop', 10),
                ('Mesa de Comedor Rústica', 'Mesa de roble macizo con acabado natural y patas torneadas.', 549.99, 'mesas', 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400&h=300&fit=crop', 8),
                ('Estantería Modular Blanca', 'Estantería de 5 niveles con diseño minimalista y material MDF de alta densidad.', 279.99, 'almacenamiento', 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=400&h=300&fit=crop', 15),
                ('Cama Queen con Canopy', 'Cama queen size con cabecera tapizada en terciopelo y estructura de metal negro.', 729.99, 'camas', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&h=300&fit=crop', 6),
                ('Lámpara de Pie Arco', 'Lámpara de piso con base de mármol y arco de acero cepillado, luz cálida.', 159.99, 'iluminacion', 'https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=400&h=300&fit=crop', 20),
                ('Escritorio Ejecutivo', 'Escritorio de 1.6m con cajones soft-close y superficie de bambú.', 449.99, 'escritorios', 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=300&fit=crop', 12),
                ('Mesa de Noche Minimalista', 'Mesita de noche de una sola gaveta con patas cónicas de madera.', 129.99, 'mesas', 'https://images.unsplash.com/photo-1532372576444-dda954194ad0?w=400&h=300&fit=crop', 30),
                ('Sillón Chesterfield', 'Sillón clásico capitoné en cuero sintético marrón con pushpins dorados.', 659.99, 'sofas', 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=300&fit=crop', 5),
                ('Rack para TV 180cm', 'Rack moderno con paneles combinados negro/roble y gestión de cables integrada.', 349.99, 'almacenamiento', 'https://images.unsplash.com/photo-1615876234886-fd9a39fda97f?w=400&h=300&fit=crop', 18),
                ('Mesa Auxiliar Bohemia', 'Mesa redonda con base de hierro forjado y encimera de mármol blanco.', 199.99, 'mesas', 'https://images.unsplash.com/photo-1499933374294-4584851497cc?w=400&h=300&fit=crop', 22),
                ('Butaca Nórdica con Tapizado', 'Butaca escandinava con patas de roble y tapizado en lino color crema.', 389.99, 'sillas', 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=300&fit=crop', 14),
            ]
            cur.executemany("INSERT INTO products (nombre, descripcion, precio, categoria, imagen, stock) VALUES (%s,%s,%s,%s,%s,%s)", products)

        cur.execute("SELECT COUNT(*) as c FROM users WHERE role='admin'")
        admin_count = cur.fetchone()['c']
        if admin_count == 0:
            pw = bcrypt.hashpw('admin123'.encode(), bcrypt.gensalt()).decode()
            cur.execute("INSERT INTO users (name, email, password, role) VALUES (%s,%s,%s,%s)", ('Administrador', 'admin@tienda.com', pw, 'admin'))

    conn.commit()
    conn.close()


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'No autenticado'}), 401
        return f(*args, **kwargs)
    return decorated


def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session or session.get('role') != 'admin':
            return jsonify({'error': 'Acceso denegado'}), 403
        return f(*args, **kwargs)
    return decorated


# ============================================
# PAGINAS HTML
# ============================================
@app.route('/')
@app.route('/index.html')
def index():
    return render_template('store.html')

@app.route('/login')
@app.route('/login.html')
def login_page():
    return render_template('index.html')

@app.route('/store')
@app.route('/store.html')
def store_page():
    return render_template('store.html')

@app.route('/checkout')
@app.route('/checkout.html')
def checkout_page():
    return render_template('checkout.html')

@app.route('/receipt')
@app.route('/receipt.html')
def receipt_page():
    return render_template('receipt.html')

@app.route('/admin')
@app.route('/admin.html')
def admin_page():
    return render_template('admin.html')

@app.route('/profile')
@app.route('/profile.html')
def profile_page():
    return render_template('profile.html')

@app.route('/calculator')
def calculator_page():
    return render_template('calculator.html')

@app.route('/quiz')
def quiz_page():
    return render_template('quiz.html')


# ============================================
# AUTH
# ============================================
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    address = data.get('address', '')
    phone = data.get('phone', '')
    if not name or not email or not password:
        return jsonify({'error': 'Nombre, email y contraseña son requeridos'}), 400
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email=%s", (email,))
            if cur.fetchone():
                return jsonify({'error': 'El email ya está registrado'}), 400
            hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
            cur.execute("INSERT INTO users (name, email, password, address, phone) VALUES (%s,%s,%s,%s,%s)",
                        (name, email, hashed, address, phone))
            conn.commit()
            user_id = cur.lastrowid
        session.clear()
        session['user_id'] = user_id
        session['name'] = name
        session['email'] = email
        session['role'] = 'client'
        return jsonify({'success': True, 'role': 'client', 'name': name})
    finally:
        conn.close()


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE email=%s", (email,))
            user = cur.fetchone()
        if not user or not bcrypt.checkpw(password.encode(), user['password'].encode()):
            return jsonify({'error': 'Credenciales inválidas'}), 401
        session.clear()
        session['user_id'] = user['id']
        session['name'] = user['name']
        session['email'] = user['email']
        session['role'] = user['role']
        return jsonify({'success': True, 'role': user['role'], 'name': user['name']})
    finally:
        conn.close()


@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})


@app.route('/api/me')
def me():
    if 'user_id' not in session:
        return jsonify({'error': 'No autenticado'}), 401
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, email, role, address, phone, created_at FROM users WHERE id=%s", (session['user_id'],))
            user = cur.fetchone()
        return jsonify(user)
    finally:
        conn.close()


@app.route('/api/profile', methods=['PUT'])
@require_auth
def update_profile():
    data = request.get_json()
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE users SET name=%s, address=%s, phone=%s WHERE id=%s",
                        (data.get('name', ''), data.get('address', ''), data.get('phone', ''), session['user_id']))
        conn.commit()
        session['name'] = data.get('name', session.get('name', ''))
        return jsonify({'success': True})
    finally:
        conn.close()


# ============================================
# USER PREFERENCES
# ============================================
@app.route('/api/preferences', methods=['GET'])
@require_auth
def get_preferences():
    pref_type = request.args.get('type', '')
    conn = get_db()
    try:
        with conn.cursor() as cur:
            if pref_type:
                cur.execute("SELECT * FROM user_preferences WHERE user_id=%s AND pref_type=%s ORDER BY created_at DESC",
                            (session['user_id'], pref_type))
            else:
                cur.execute("SELECT * FROM user_preferences WHERE user_id=%s ORDER BY created_at DESC",
                            (session['user_id'],))
            prefs = cur.fetchall()
        return jsonify(convert_decimals(prefs))
    finally:
        conn.close()


@app.route('/api/preferences', methods=['POST'])
@require_auth
def add_preference():
    data = request.get_json()
    pref_type = data.get('type', '')
    pref_value = data.get('value', '')
    product_id = data.get('product_id')
    if not pref_type or not pref_value:
        return jsonify({'error': 'Tipo y valor son requeridos'}), 400
    if pref_type not in ('style', 'room', 'furniture'):
        return jsonify({'error': 'Tipo inválido'}), 400
    conn = get_db()
    try:
        with conn.cursor() as cur:
            if pref_type == 'furniture' and product_id:
                cur.execute("SELECT id FROM products WHERE id=%s", (product_id,))
                if not cur.fetchone():
                    return jsonify({'error': 'Producto no encontrado'}), 404
                cur.execute("INSERT INTO user_preferences (user_id, pref_type, pref_value, product_id) VALUES (%s,%s,%s,%s) ON DUPLICATE KEY UPDATE id=id",
                            (session['user_id'], pref_type, pref_value, product_id))
            else:
                cur.execute("INSERT INTO user_preferences (user_id, pref_type, pref_value) VALUES (%s,%s,%s) ON DUPLICATE KEY UPDATE id=id",
                            (session['user_id'], pref_type, pref_value))
        conn.commit()
        return jsonify({'success': True})
    finally:
        conn.close()


@app.route('/api/preferences/<int:pref_id>', methods=['DELETE'])
@require_auth
def delete_preference(pref_id):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM user_preferences WHERE id=%s AND user_id=%s", (pref_id, session['user_id']))
        conn.commit()
        return jsonify({'success': True})
    finally:
        conn.close()


# ============================================
# PRODUCTS
# ============================================
@app.route('/api/products')
def get_products():
    category = request.args.get('category', 'all')
    search = request.args.get('search', '')
    conn = get_db()
    try:
        with conn.cursor() as cur:
            query = """SELECT id, nombre AS name, categoria AS category, 
                       descripcion AS description, precio AS price, 
                       stock, imagen AS image 
                       FROM products WHERE stock > 0"""
            params = []
            if category != 'all':
                query += " AND categoria=%s"
                params.append(category)
            if search:
                query += " AND (nombre LIKE %s OR descripcion LIKE %s)"
                params.extend([f'%{search}%', f'%{search}%'])
            query += " ORDER BY created_at DESC"
            cur.execute(query, params)
            products = cur.fetchall()
        return jsonify(convert_decimals(products))
    finally:
        conn.close()

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'images')
ALLOWED_EXT = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp', 'jfif', 'tiff', 'tif', 'ico'}


@app.route('/api/upload', methods=['POST'])
@require_admin
def upload_image():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No se envió ningún archivo'}), 400
        file = request.files['file']
        if not file.filename:
            return jsonify({'error': 'No seleccionaste ningún archivo'}), 400
        ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
        if ext not in ALLOWED_EXT:
            return jsonify({'error': 'Formato ".%s" no permitido. Usa JPG, PNG, WEBP, GIF, AVIF o BMP.' % ext}), 400
        filename = 'prod_%d_%s.%s' % (int(time.time()), os.urandom(4).hex(), ext)
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        file.save(os.path.join(UPLOAD_FOLDER, filename))
        print('UPLOAD OK -> %s (%s bytes)' % (filename, os.path.getsize(os.path.join(UPLOAD_FOLDER, filename))), flush=True)
        return jsonify({'success': True, 'url': '/static/images/' + filename})
    except Exception as e:
        print('UPLOAD ERROR -> %r' % e, flush=True)
        return jsonify({'error': 'Error del servidor al guardar: %s' % e}), 500


@app.route('/api/products/all')
@require_admin
def get_all_products():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""SELECT id, nombre AS name, categoria AS category, 
                           descripcion AS description, precio AS price, 
                           stock, imagen AS image 
                           FROM products ORDER BY created_at DESC""")
            products = cur.fetchall()
        return jsonify(convert_decimals(products))
    finally:
        conn.close()

@app.route('/api/products/<int:pid>')
def get_product(pid):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""SELECT id, nombre AS name, categoria AS category, 
                           descripcion AS description, precio AS price, 
                           stock, imagen AS image 
                           FROM products WHERE id=%s""", (pid,))
            product = cur.fetchone()
        if not product:
            return jsonify({'error': 'Producto no encontrado'}), 404
        return jsonify(convert_decimals(product))
    finally:
        conn.close()
@app.route('/api/products', methods=['POST'])
@require_admin
def create_product():
    data = request.get_json()
    name = data.get('name', '').strip()
    price = data.get('price', 0)
    if not name or not price:
        return jsonify({'error': 'Nombre y precio son requeridos'}), 400
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO products (nombre, descripcion, precio, categoria, imagen, stock) VALUES (%s,%s,%s,%s,%s,%s)",
                        (name, data.get('description', ''), price, data.get('category', 'general'), data.get('image_url', ''), data.get('stock', 0)))
            conn.commit()
            pid = cur.lastrowid
        return jsonify({'success': True, 'id': pid})
    finally:
        conn.close()


@app.route('/api/products/<int:pid>', methods=['PUT'])
@require_admin
def update_product(pid):
    data = request.get_json()
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE products SET nombre=%s, descripcion=%s, precio=%s, categoria=%s, imagen=%s, stock=%s WHERE id=%s",
                        (data.get('name', ''), data.get('description', ''), data.get('price', 0), data.get('category', 'general'), data.get('image_url', ''), data.get('stock', 0), pid))
            conn.commit()
        return jsonify({'success': True})
    finally:
        conn.close()


@app.route('/api/products/<int:pid>', methods=['DELETE'])
@require_admin
def delete_product(pid):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM cart WHERE product_id=%s", (pid,))
            cur.execute("DELETE FROM products WHERE id=%s", (pid,))
        conn.commit()
        return jsonify({'success': True})
    finally:
        conn.close()


# ============================================
# CART
# ============================================
@app.route('/api/cart')
@require_auth
def get_cart():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT c.id, c.quantity, p.id as product_id, p.nombre AS name, p.precio AS price, p.imagen AS image_url
                FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = %s
            """, (session['user_id'],))
            items = cur.fetchall()
        total = sum(i['price'] * i['quantity'] for i in items)
        return jsonify(convert_decimals({'items': items, 'total': float(total)}))
    finally:
        conn.close()


@app.route('/api/cart', methods=['POST'])
@require_auth
def add_to_cart():
    data = request.get_json()
    product_id = data.get('product_id')
    quantity = data.get('quantity', 1)
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM cart WHERE user_id=%s AND product_id=%s", (session['user_id'], product_id))
            existing = cur.fetchone()
            if existing:
                cur.execute("UPDATE cart SET quantity = quantity + %s WHERE id=%s", (quantity, existing['id']))
            else:
                cur.execute("INSERT INTO cart (user_id, product_id, quantity) VALUES (%s,%s,%s)",
                            (session['user_id'], product_id, quantity))
        conn.commit()
        return jsonify({'success': True})
    finally:
        conn.close()


@app.route('/api/cart/<int:cart_id>', methods=['PUT'])
@require_auth
def update_cart_item(cart_id):
    data = request.get_json()
    quantity = data.get('quantity', 1)
    conn = get_db()
    try:
        with conn.cursor() as cur:
            if quantity <= 0:
                cur.execute("DELETE FROM cart WHERE id=%s AND user_id=%s", (cart_id, session['user_id']))
            else:
                cur.execute("UPDATE cart SET quantity=%s WHERE id=%s AND user_id=%s", (quantity, cart_id, session['user_id']))
        conn.commit()
        return jsonify({'success': True})
    finally:
        conn.close()


@app.route('/api/cart/<int:cart_id>', methods=['DELETE'])
@require_auth
def remove_cart_item(cart_id):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM cart WHERE id=%s AND user_id=%s", (cart_id, session['user_id']))
        conn.commit()
        return jsonify({'success': True})
    finally:
        conn.close()


# ============================================
# ORDERS
# ============================================
@app.route('/api/orders', methods=['POST'])
@require_auth
def create_order():
    data = request.get_json()
    payment_method = data.get('payment_method', 'credit_card')
    shipping_address = data.get('shipping_address', '')
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT c.*, p.precio AS price, p.nombre AS name, p.stock FROM cart c
                JOIN products p ON c.product_id = p.id WHERE c.user_id = %s
            """, (session['user_id'],))
            cart_items = cur.fetchall()

            if not cart_items:
                return jsonify({'error': 'El carrito está vacío'}), 400

            for item in cart_items:
                if item['stock'] < item['quantity']:
                    return jsonify({'error': f"Stock insuficiente para {item['name']}"}), 400

            total = sum(float(i['price']) * i['quantity'] for i in cart_items)
            shipping = 0 if total >= 500000 else 10000
            grand_total = total + shipping

            cur.execute("INSERT INTO orders (user_id, total, payment_method, payment_status, shipping_address) VALUES (%s,%s,%s,%s,%s)",
                        (session['user_id'], grand_total, payment_method, 'completed', shipping_address))
            order_id = cur.lastrowid

            for item in cart_items:
                cur.execute("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (%s,%s,%s,%s)",
                            (order_id, item['product_id'], item['quantity'], item['price']))
                cur.execute("UPDATE products SET stock = stock - %s WHERE id=%s", (item['quantity'], item['product_id']))

            cur.execute("DELETE FROM cart WHERE user_id=%s", (session['user_id'],))

            cur.execute("SELECT * FROM orders WHERE id=%s", (order_id,))
            order = cur.fetchone()

            cur.execute("""
                SELECT oi.*, p.nombre AS name, p.imagen AS image_url FROM order_items oi
                JOIN products p ON oi.product_id = p.id WHERE oi.order_id = %s
            """, (order_id,))
            items = cur.fetchall()

            cur.execute("SELECT name, email, address FROM users WHERE id=%s", (session['user_id'],))
            user = cur.fetchone()

        conn.commit()
        order['items'] = items
        order['customer_name'] = user['name']
        order['customer_email'] = user['email']
        return jsonify({'success': True, 'order': convert_decimals(order)})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@app.route('/api/orders')
@require_auth
def get_orders():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            if session.get('role') == 'admin':
                cur.execute("""
                    SELECT o.*, u.name as customer_name, u.email as customer_email FROM orders o
                    JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC
                """)
            else:
                cur.execute("SELECT * FROM orders WHERE user_id=%s ORDER BY created_at DESC", (session['user_id'],))
            orders = cur.fetchall()
        return jsonify(convert_decimals(orders))
    finally:
        conn.close()


@app.route('/api/orders/<int:oid>')
@require_auth
def get_order(oid):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT o.*, u.name as customer_name, u.email as customer_email FROM orders o
                JOIN users u ON o.user_id = u.id WHERE o.id = %s
            """, (oid,))
            order = cur.fetchone()
            if not order:
                return jsonify({'error': 'Orden no encontrada'}), 404
            if session.get('role') != 'admin' and order['user_id'] != session['user_id']:
                return jsonify({'error': 'Acceso denegado'}), 403
            cur.execute("""
                SELECT oi.*, p.nombre AS name, p.imagen AS image_url FROM order_items oi
                JOIN products p ON oi.product_id = p.id WHERE oi.order_id = %s
            """, (oid,))
            items = cur.fetchall()
        order['items'] = items
        return jsonify(convert_decimals(order))
    finally:
        conn.close()


# ============================================
# ADMIN STATS
# ============================================
@app.route('/api/admin/stats')
@require_admin
def admin_stats():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as c FROM products")
            total_products = cur.fetchone()['c']
            cur.execute("SELECT COUNT(*) as c FROM orders")
            total_orders = cur.fetchone()['c']
            cur.execute("SELECT COALESCE(SUM(total), 0) as t FROM orders")
            total_revenue = float(cur.fetchone()['t'])
            cur.execute("SELECT COUNT(*) as c FROM users WHERE role='client'")
            total_users = cur.fetchone()['c']
        return jsonify(convert_decimals({
            'totalProducts': total_products,
            'totalOrders': total_orders,
            'totalRevenue': total_revenue,
            'totalUsers': total_users
        }))
    finally:
        conn.close()


if __name__ == '__main__':
    print('Conectando a MySQL...')
    init_db()
    print('Base de datos lista.')
    print('Tienda de Muebles: http://localhost:3000')
    app.run(host='0.0.0.0', port=3000, debug=True)
