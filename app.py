from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3

app = Flask(__name__)
app.secret_key = 'super_secret_key_expense_tracker' # Secret for sessions
# Define the path for the SQLite database file
db_path = 'database.db'

def init_db():
    """
    Initialize the SQLite database.
    Creates the 'users' and 'expenses' table if they don't already exist.
    """
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                date TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')
        conn.commit()

@app.route('/')
def index():
    """Render the main single-page application."""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Handle user login."""
    if request.method == 'GET':
        if 'user_id' in session:
            return redirect(url_for('index'))
        return render_template('login.html')
        
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        with sqlite3.connect(db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
            user = cursor.fetchone()
            
            if user and check_password_hash(user['password_hash'], password):
                session['user_id'] = user['id']
                return redirect(url_for('index'))
            else:
                return render_template('login.html', error='Invalid username or password')

@app.route('/register', methods=['POST'])
def register():
    """Handle user registration."""
    username = request.form.get('username')
    password = request.form.get('password')
    
    if not username or not password:
        return render_template('login.html', error='Username and password are required')
        
    password_hash = generate_password_hash(password)
    
    try:
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', (username, password_hash))
            conn.commit()
            session['user_id'] = cursor.lastrowid
            return redirect(url_for('index'))
    except sqlite3.IntegrityError:
        return render_template('login.html', error='Username already exists')

@app.route('/logout')
def logout():
    """Log out the user."""
    session.pop('user_id', None)
    return redirect(url_for('login'))

@app.route('/expenses', methods=['GET'])
def get_expenses():
    """
    API endpoint to retrieve all expenses for the logged in user.
    Returns the expenses as a JSON array, ordered by date.
    """
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
        
    user_id = session['user_id']
    with sqlite3.connect(db_path) as conn:
        # Use Row factory to get dictionary-like objects
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC', (user_id,))
        expenses = [dict(row) for row in cursor.fetchall()]
    return jsonify(expenses)

@app.route('/add_expense', methods=['POST'])
def add_expense():
    """
    API endpoint to add a new expense.
    Expects a JSON payload with amount, category, description, and date.
    """
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user_id = session['user_id']
    
    data = request.json
    amount = data.get('amount')
    category = data.get('category')
    description = data.get('description', '')
    date = data.get('date')

    # Basic server-side validation
    if not all([amount, category, date]):
        return jsonify({'error': 'Missing required fields: amount, category, or date'}), 400

    try:
        amount = float(amount)
    except ValueError:
        return jsonify({'error': 'Amount must be a numeric value'}), 400

    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO expenses (user_id, amount, category, description, date)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, amount, category, description, date))
        conn.commit()
        expense_id = cursor.lastrowid

    return jsonify({'id': expense_id, 'message': 'Expense added successfully'}), 201

@app.route('/update_expense/<int:id>', methods=['PUT'])
def update_expense(id):
    """API endpoint to update an existing expense."""
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user_id = session['user_id']
    
    data = request.json
    amount = data.get('amount')
    category = data.get('category')
    description = data.get('description', '')
    date = data.get('date')

    if not all([amount, category, date]):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        amount = float(amount)
    except ValueError:
        return jsonify({'error': 'Amount must be a numeric value'}), 400

    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE expenses 
            SET amount = ?, category = ?, description = ?, date = ?
            WHERE id = ? AND user_id = ?
        ''', (amount, category, description, date, id, user_id))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': 'Expense not found or unauthorized'}), 404

    return jsonify({'message': 'Expense updated successfully'})

@app.route('/delete_expense/<int:id>', methods=['DELETE'])
def delete_expense(id):
    """
    API endpoint to delete an expense by its ID. It verifies the user owns it.
    """
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user_id = session['user_id']
    
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM expenses WHERE id = ? AND user_id = ?', (id, user_id))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': 'Expense not found or unauthorized'}), 404
    return jsonify({'message': 'Expense deleted successfully'})

if __name__ == '__main__':
    # Initialize the DB before running the app
    init_db()
    # Run the Flask app on localhost (default port 5000)
    app.run(debug=True)
