from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import requests
from apscheduler.schedulers.background import BackgroundScheduler
import os
print("=" * 80)
print("app starting")
print("=" * 80)

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///medications.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)

CORS(app)
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
@jwt.invalid_token_loader
def invalid_token_callback(error):
    print("=" * 50)
    print("Token not valid,", error)
    print("=" * 50)
    return jsonify({'error': 'Invalid token'}), 422

@jwt.unauthorized_loader
def unauthorized_callback(error):
    print("=" * 50)
    print("UNAUTHORIZED ERROR:", error)
    print("=" * 50)
    return jsonify({'error': 'Missing Authorization header'}), 422
scheduler = BackgroundScheduler()


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    medications = db.relationship('Medication', backref='user', lazy=True, cascade='all, delete-orphan')
    adherence_logs = db.relationship('AdherenceLog', backref='user', lazy=True, cascade='all, delete-orphan')

class Medication(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    dosage = db.Column(db.String(100), nullable=False)
    frequency = db.Column(db.String(50), nullable=False)  
    time_of_day = db.Column(db.JSON)  
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime)
    notes = db.Column(db.Text)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AdherenceLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    medication_id = db.Column(db.Integer, db.ForeignKey('medication.id'), nullable=False)
    scheduled_time = db.Column(db.DateTime, nullable=False)
    taken_time = db.Column(db.DateTime)
    status = db.Column(db.String(20), nullable=False)  
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class DrugInteraction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    drug1 = db.Column(db.String(200), nullable=False)
    drug2 = db.Column(db.String(200), nullable=False)
    severity = db.Column(db.String(50))
    description = db.Column(db.Text)
    cached_at = db.Column(db.DateTime, default=datetime.utcnow)


@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already taken'}), 400
    
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    
    new_user = User(
        username=data['username'],
        email=data['email'],
        password=hashed_password
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    access_token = create_access_token(identity=str(new_user.id))
    
    return jsonify({
        'message': 'User created successfully',
        'access_token': access_token,
        'user': {
            'id': new_user.id,
            'username': new_user.username,
            'email': new_user.email
        }
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not bcrypt.check_password_hash(user.password, data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    access_token = create_access_token(identity=str(user.id))
    
    return jsonify({
        'access_token': access_token,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email
        }
    }), 200


@app.route('/api/medications', methods=['GET'])
@jwt_required()
def get_medications():
    user_id = get_jwt_identity()
    medications = Medication.query.filter_by(user_id=user_id, active=True).all()
    
    return jsonify([{
        'id': med.id,
        'name': med.name,
        'dosage': med.dosage,
        'frequency': med.frequency,
        'time_of_day': med.time_of_day,
        'start_date': med.start_date.isoformat(),
        'end_date': med.end_date.isoformat() if med.end_date else None,
        'notes': med.notes
    } for med in medications]), 200

@app.route('/api/medications', methods=['POST'])
@jwt_required()
def add_medication():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        print("=" * 50)
        print("RECEIVED DATA:", data)
        print("USER ID:", user_id)
        print("=" * 50)
        
        end_date_value = None
        if data.get('end_date') and data['end_date'].strip():
            end_date_value = datetime.fromisoformat(data['end_date'])
        
        new_medication = Medication(
            user_id=user_id,
            name=data['name'],
            dosage=data['dosage'],
            frequency=data['frequency'],
            time_of_day=data.get('time_of_day', ['08:00']),
            start_date=datetime.fromisoformat(data['start_date']),
            end_date=end_date_value,
            notes=data.get('notes', '')
        )
        
        db.session.add(new_medication)
        db.session.commit()
        
        return jsonify({
            'message': 'Medication added successfully',
            'medication': {
                'id': new_medication.id,
                'name': new_medication.name,
                'dosage': new_medication.dosage
            }
        }), 201
        
    except Exception as e:
        print("=" * 50)
        print("ERROR:", str(e))
        print("ERROR TYPE:", type(e).__name__)
        import traceback
        traceback.print_exc()
        print("=" * 50)
        db.session.rollback()
        return jsonify({'error': str(e)}), 422

@app.route('/api/medications/<int:med_id>', methods=['PUT'])
@jwt_required()
def update_medication(med_id):
    user_id = get_jwt_identity()
    medication = Medication.query.filter_by(id=med_id, user_id=user_id).first()
    
    if not medication:
        return jsonify({'error': 'Medication not found'}), 404
    
    data = request.get_json()
    
    medication.name = data.get('name', medication.name)
    medication.dosage = data.get('dosage', medication.dosage)
    medication.frequency = data.get('frequency', medication.frequency)
    medication.time_of_day = data.get('time_of_day', medication.time_of_day)
    medication.notes = data.get('notes', medication.notes)
    
    db.session.commit()
    
    return jsonify({'message': 'Medication updated successfully'}), 200

@app.route('/api/medications/<int:med_id>', methods=['DELETE'])
@jwt_required()
def delete_medication(med_id):
    user_id = get_jwt_identity()
    medication = Medication.query.filter_by(id=med_id, user_id=user_id).first()
    
    if not medication:
        return jsonify({'error': 'Medication not found'}), 404
    
    medication.active = False
    db.session.commit()
    
    return jsonify({'message': 'Medication deleted successfully'}), 200

@app.route('/api/interactions/check', methods=['POST'])
@jwt_required()
def check_interactions():
    data = request.get_json()
    medications = data.get('medications', [])
    
    if len(medications) < 2:
        return jsonify({'interactions': []}), 200
    
    interactions = []
    
    for i in range(len(medications)):
        for j in range(i + 1, len(medications)):
            drug1 = medications[i].lower()
            drug2 = medications[j].lower()
            
            cached = DrugInteraction.query.filter(
                ((DrugInteraction.drug1 == drug1) & (DrugInteraction.drug2 == drug2)) |
                ((DrugInteraction.drug1 == drug2) & (DrugInteraction.drug2 == drug1))
            ).first()
            
            if cached and (datetime.utcnow() - cached.cached_at).days < 30:
                interactions.append({
                    'drug1': cached.drug1,
                    'drug2': cached.drug2,
                    'severity': cached.severity,
                    'description': cached.description
                })
            else:
                try:
                    url = f"https://api.fda.gov/drug/label.json?search=openfda.brand_name:{drug1}+AND+drug_interactions:{drug2}&limit=1"
                    response = requests.get(url, timeout=5)
                    
                    if response.status_code == 200:
                        results = response.json().get('results', [])
                        if results:
                            drug_interactions_text = results[0].get('drug_interactions', [''])[0]
                            
                            if drug2 in drug_interactions_text.lower():
                                severity = 'moderate'
                                if any(word in drug_interactions_text.lower() for word in ['severe', 'contraindicated', 'avoid']):
                                    severity = 'severe'
                                elif any(word in drug_interactions_text.lower() for word in ['minor', 'minimal']):
                                    severity = 'minor'
                                
                                interaction = {
                                    'drug1': drug1,
                                    'drug2': drug2,
                                    'severity': severity,
                                    'description': drug_interactions_text[:500]
                                }
                                interactions.append(interaction)
                                
                         
                                new_interaction = DrugInteraction(
                                    drug1=drug1,
                                    drug2=drug2,
                                    severity=severity,
                                    description=drug_interactions_text[:500]
                                )
                                db.session.add(new_interaction)
                                db.session.commit()
                except Exception as e:
                    print(f"Error checking interaction: {e}")
    
    return jsonify({'interactions': interactions}), 200


@app.route('/api/adherence/log', methods=['POST'])
@jwt_required()
def log_adherence():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    log = AdherenceLog(
        user_id=user_id,
        medication_id=data['medication_id'],
        scheduled_time=datetime.fromisoformat(data['scheduled_time']),
        taken_time=datetime.utcnow() if data['status'] == 'taken' else None,
        status=data['status']
    )
    
    db.session.add(log)
    db.session.commit()
    
    return jsonify({'message': 'Adherence logged successfully'}), 201

@app.route('/api/adherence/stats', methods=['GET'])
@jwt_required()
def get_adherence_stats():
    user_id = get_jwt_identity()
    days = request.args.get('days', 30, type=int)
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    logs = AdherenceLog.query.filter(
        AdherenceLog.user_id == user_id,
        AdherenceLog.scheduled_time >= start_date
    ).all()
    
    total = len(logs)
    taken = sum(1 for log in logs if log.status == 'taken')
    missed = sum(1 for log in logs if log.status == 'missed')
    skipped = sum(1 for log in logs if log.status == 'skipped')
    
    adherence_rate = (taken / total * 100) if total > 0 else 0
    
 
    daily_stats = {}
    for log in logs:
        date_key = log.scheduled_time.strftime('%Y-%m-%d')
        if date_key not in daily_stats:
            daily_stats[date_key] = {'taken': 0, 'missed': 0, 'skipped': 0}
        daily_stats[date_key][log.status] += 1
    
    return jsonify({
        'adherence_rate': round(adherence_rate, 2),
        'total_doses': total,
        'taken': taken,
        'missed': missed,
        'skipped': skipped,
        'daily_stats': daily_stats
    }), 200


@app.route('/api/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    user_id = get_jwt_identity()
    
  
    active_meds = Medication.query.filter_by(user_id=user_id, active=True).count()
    
    today = datetime.utcnow().date()
    today_logs = AdherenceLog.query.filter(
        AdherenceLog.user_id == user_id,
        db.func.date(AdherenceLog.scheduled_time) == today
    ).all()
    
    today_taken = sum(1 for log in today_logs if log.status == 'taken')
    today_total = len(today_logs)
    
    medications = Medication.query.filter_by(user_id=user_id, active=True).all()
    upcoming = []
    
    for med in medications:
        for time_str in med.time_of_day:
            hour, minute = map(int, time_str.split(':'))
            scheduled_time = datetime.utcnow().replace(hour=hour, minute=minute, second=0, microsecond=0)
            
            if scheduled_time > datetime.utcnow() and scheduled_time < datetime.utcnow() + timedelta(hours=24):
                upcoming.append({
                    'medication': med.name,
                    'dosage': med.dosage,
                    'time': scheduled_time.isoformat()
                })
    
    upcoming.sort(key=lambda x: x['time'])
    
    return jsonify({
        'active_medications': active_meds,
        'today_adherence': {
            'taken': today_taken,
            'total': today_total,
            'rate': round((today_taken / today_total * 100) if today_total > 0 else 0, 2)
        },
        'upcoming_doses': upcoming[:5]
    }), 200

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
