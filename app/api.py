from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import date
from app import db
from app.models import User, Medication, IntakeLog

api = Blueprint('api', __name__, url_prefix='/api')


# ── Auth ──────────────────────────────────────────────────────────────────────

@api.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({'error': 'E-Mail oder Passwort falsch.'}), 401
    token = create_access_token(identity=str(user.id))
    return jsonify({
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'role': user.role,
        'token': token,
    })

@api.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    role = data.get('role', 'casual')
    if not name or not email or not password:
        return jsonify({'error': 'Alle Felder sind Pflichtfelder.'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'E-Mail bereits registriert.'}), 409
    user = User(
        name=name,
        email=email,
        password=generate_password_hash(password),
        role=role,
    )
    db.session.add(user)
    db.session.commit()
    token = create_access_token(identity=str(user.id))
    return jsonify({
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'role': user.role,
        'token': token,
    }), 201

@api.route('/me')
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    return jsonify({
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'role': user.role,
    })


# ── Medikamente ───────────────────────────────────────────────────────────────

@api.route('/medications')
@jwt_required()
def get_medications():
    user_id = int(get_jwt_identity())
    meds = Medication.query.filter_by(user_id=user_id).all()
    return jsonify([{
        'id': m.id,
        'name': m.name,
        'dose': m.dose,
        'intake_time': m.intake_time,
        'food_required': m.food_required,
        'ingredient': m.ingredient,
        'notes': m.notes,
    } for m in meds])

@api.route('/medications', methods=['POST'])
@jwt_required()
def add_medication():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    med = Medication(
        user_id=user_id,
        name=data.get('name'),
        dose=data.get('dose'),
        interval_hours=data.get('interval_hours', 24),
        intake_time=data.get('intake_time'),
        food_required=data.get('food_required', False),
        ingredient=data.get('ingredient', ''),
        notes=data.get('notes', ''),
    )
    db.session.add(med)
    db.session.commit()
    return jsonify({'id': med.id}), 201

@api.route('/medications/<int:med_id>', methods=['PUT'])
@jwt_required()
def update_medication(med_id):
    user_id = int(get_jwt_identity())
    med = db.get_or_404(Medication, med_id)
    if med.user_id != user_id:
        return jsonify({'error': 'Nicht autorisiert'}), 403
    data = request.get_json()
    med.name = data.get('name', med.name)
    med.dose = data.get('dose', med.dose)
    med.intake_time = data.get('intake_time', med.intake_time)
    med.food_required = data.get('food_required', med.food_required)
    med.ingredient = data.get('ingredient', med.ingredient)
    med.notes = data.get('notes', med.notes)
    db.session.commit()
    return jsonify({'ok': True})

@api.route('/medications/<int:med_id>', methods=['DELETE'])
@jwt_required()
def delete_medication(med_id):
    user_id = int(get_jwt_identity())
    med = db.get_or_404(Medication, med_id)
    if med.user_id != user_id:
        return jsonify({'error': 'Nicht autorisiert'}), 403
    db.session.delete(med)
    db.session.commit()
    return jsonify({'ok': True})


# ── Einnahmen ─────────────────────────────────────────────────────────────────

@api.route('/intake', methods=['POST'])
@jwt_required()
def log_intake():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    log = IntakeLog(
        medication_id=data.get('medication_id'),
        user_id=user_id,
        taken=data.get('taken', True),
        food_eaten=data.get('food_eaten', False),
        wellbeing=data.get('wellbeing'),
    )
    db.session.add(log)
    db.session.commit()
    return jsonify({'id': log.id}), 201

@api.route('/intake/today')
@jwt_required()
def intake_today():
    user_id = int(get_jwt_identity())
    today = date.today()
    meds = Medication.query.filter_by(user_id=user_id).all()
    result = []
    for med in meds:
        log = IntakeLog.query.filter_by(
            medication_id=med.id,
            user_id=user_id,
        ).filter(
            db.func.date(IntakeLog.taken_at) == today
        ).order_by(IntakeLog.taken_at.desc()).first()
        result.append({
            'id': med.id,
            'name': med.name,
            'dose': med.dose,
            'intake_time': med.intake_time,
            'food_required': med.food_required,
            'ingredient': med.ingredient,
            'taken': log.taken if log else False,
            'logged': log is not None,
        })
    return jsonify(result)


# ── Wohlbefinden ──────────────────────────────────────────────────────────────

@api.route('/wellbeing', methods=['POST'])
@jwt_required()
def log_wellbeing():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    from app.models import WellbeingLog
    log = WellbeingLog(
        patient_id=user_id,
        value=data.get('value'),
    )
    db.session.add(log)
    db.session.commit()
    return jsonify({'id': log.id}), 201

@api.route('/patients/<int:patient_id>/wellbeing')
@jwt_required()
def get_patient_wellbeing(patient_id):
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    if user.role != 'caregiver':
        return jsonify({'error': 'Nicht autorisiert'}), 403
    from app.models import WellbeingLog
    logs = WellbeingLog.query.filter_by(patient_id=patient_id).order_by(WellbeingLog.recorded_at.desc()).limit(100).all()
    return jsonify([{
        'id': l.id,
        'value': l.value,
        'recorded_at': l.recorded_at.isoformat(),
    } for l in logs])


# ── Patienten (Pfleger) ───────────────────────────────────────────────────────

@api.route('/patients')
@jwt_required()
def get_patients():
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    if user.role != 'caregiver':
        return jsonify({'error': 'Nicht autorisiert'}), 403
    patients = User.query.filter_by(role='patient').all()
    today = date.today()
    result = []
    for p in patients:
        meds = Medication.query.filter_by(user_id=p.id).all()
        med_status = []
        for med in meds:
            log = IntakeLog.query.filter_by(
                medication_id=med.id,
                user_id=p.id,
            ).filter(
                db.func.date(IntakeLog.taken_at) == today
            ).order_by(IntakeLog.taken_at.desc()).first()
            med_status.append({
                'id': med.id,
                'name': med.name,
                'dose': med.dose,
                'intake_time': med.intake_time,
                'food_required': med.food_required,
                'ingredient': med.ingredient,
                'taken': log.taken if log else False,
            })
        result.append({
            'id': p.id,
            'name': p.name,
            'email': p.email,
            'birthdate': p.birthdate,
            'room': p.room,
            'address': p.address,
            'latitude': p.latitude,
            'longitude': p.longitude,
            'medications': med_status,
        })
    return jsonify(result)

@api.route('/patients', methods=['POST'])
@jwt_required()
def add_patient():
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    if user.role != 'caregiver':
        return jsonify({'error': 'Nicht autorisiert'}), 403
    data = request.get_json()
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({'error': 'E-Mail bereits vergeben.'}), 409
    patient = User(
        name=data.get('name'),
        email=data.get('email'),
        password=generate_password_hash(data.get('password', 'changeme')),
        role='patient',
        birthdate=data.get('birthdate'),
        room=data.get('room'),
        address=data.get('address'),
        latitude=data.get('latitude'),
        longitude=data.get('longitude'),
    )
    db.session.add(patient)
    db.session.commit()
    return jsonify({'id': patient.id, 'name': patient.name, 'email': patient.email}), 201

@api.route('/patients/<int:patient_id>', methods=['PUT'])
@jwt_required()
def update_patient(patient_id):
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    if user.role != 'caregiver':
        return jsonify({'error': 'Nicht autorisiert'}), 403
    patient = db.get_or_404(User, patient_id)
    data = request.get_json()
    patient.name = data.get('name', patient.name)
    patient.birthdate = data.get('birthdate', patient.birthdate)
    patient.room = data.get('room', patient.room)
    patient.address = data.get('address', patient.address)
    patient.latitude = data.get('latitude', patient.latitude)
    patient.longitude = data.get('longitude', patient.longitude)
    db.session.commit()
    return jsonify({'ok': True})

@api.route('/patients/<int:patient_id>', methods=['DELETE'])
@jwt_required()
def delete_patient(patient_id):
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    if user.role != 'caregiver':
        return jsonify({'error': 'Nicht autorisiert'}), 403
    patient = db.get_or_404(User, patient_id)
    from app.models import VitalLog, BehaviorLog, WellbeingLog
    VitalLog.query.filter_by(patient_id=patient_id).delete()
    BehaviorLog.query.filter_by(patient_id=patient_id).delete()
    WellbeingLog.query.filter_by(patient_id=patient_id).delete()
    IntakeLog.query.filter_by(user_id=patient_id).delete()
    db.session.delete(patient)
    db.session.commit()
    return jsonify({'ok': True})

@api.route('/patients/<int:patient_id>/medications')
@jwt_required()
def get_patient_medications(patient_id):
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    if user.role != 'caregiver':
        return jsonify({'error': 'Nicht autorisiert'}), 403
    meds = Medication.query.filter_by(user_id=patient_id).all()
    return jsonify([{
        'id': m.id,
        'name': m.name,
        'dose': m.dose,
        'intake_time': m.intake_time,
        'food_required': m.food_required,
        'ingredient': m.ingredient,
        'notes': m.notes,
    } for m in meds])

@api.route('/patients/<int:patient_id>/medications', methods=['POST'])
@jwt_required()
def add_patient_medication(patient_id):
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    if user.role != 'caregiver':
        return jsonify({'error': 'Nicht autorisiert'}), 403
    data = request.get_json()
    med = Medication(
        user_id=patient_id,
        name=data.get('name'),
        dose=data.get('dose'),
        interval_hours=data.get('interval_hours', 24),
        intake_time=data.get('intake_time'),
        food_required=data.get('food_required', False),
        ingredient=data.get('ingredient', ''),
        notes=data.get('notes', ''),
    )
    db.session.add(med)
    db.session.commit()
    return jsonify({'id': med.id}), 201

@api.route('/patients/<int:patient_id>/medications/<int:med_id>', methods=['PUT'])
@jwt_required()
def update_patient_medication(patient_id, med_id):
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    if user.role != 'caregiver':
        return jsonify({'error': 'Nicht autorisiert'}), 403
    med = db.get_or_404(Medication, med_id)
    if med.user_id != patient_id:
        return jsonify({'error': 'Nicht autorisiert'}), 403
    data = request.get_json()
    med.name = data.get('name', med.name)
    med.dose = data.get('dose', med.dose)
    med.intake_time = data.get('intake_time', med.intake_time)
    med.food_required = data.get('food_required', med.food_required)
    med.ingredient = data.get('ingredient', med.ingredient)
    med.notes = data.get('notes', med.notes)
    db.session.commit()
    return jsonify({'ok': True})

@api.route('/patients/<int:patient_id>/medications/<int:med_id>', methods=['DELETE'])
@jwt_required()
def delete_patient_medication(patient_id, med_id):
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    if user.role != 'caregiver':
        return jsonify({'error': 'Nicht autorisiert'}), 403
    med = db.get_or_404(Medication, med_id)
    if med.user_id != patient_id:
        return jsonify({'error': 'Nicht autorisiert'}), 403
    db.session.delete(med)
    db.session.commit()
    return jsonify({'ok': True})

@api.route('/patients/<int:patient_id>/intake')
@jwt_required()
def get_patient_intake(patient_id):
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    if user.role != 'caregiver':
        return jsonify({'error': 'Nicht autorisiert'}), 403
    logs = IntakeLog.query.filter_by(
        user_id=patient_id,
        taken=True,
    ).order_by(IntakeLog.taken_at.desc()).limit(50).all()
    return jsonify([{
        'id': l.id,
        'medication_id': l.medication_id,
        'medication_name': l.medication.name if l.medication else '',
        'dose': l.medication.dose if l.medication else '',
        'wellbeing': l.wellbeing,
        'taken_at': l.taken_at.isoformat(),
    } for l in logs])


# ── Vitalwerte ────────────────────────────────────────────────────────────────

@api.route('/vitals', methods=['POST'])
@jwt_required()
def add_vital():
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    if user.role != 'caregiver':
        return jsonify({'error': 'Nicht autorisiert'}), 403
    data = request.get_json()
    from app.models import VitalLog
    vital = VitalLog(
        patient_id=data.get('patient_id'),
        caregiver_id=user_id,
        blutdruck=data.get('blutdruck'),
        puls=data.get('puls'),
        gewicht=data.get('gewicht'),
    )
    db.session.add(vital)
    db.session.commit()
    return jsonify({'id': vital.id}), 201

@api.route('/vitals/<int:patient_id>')
@jwt_required()
def get_vitals(patient_id):
    from app.models import VitalLog
    vitals = VitalLog.query.filter_by(patient_id=patient_id).order_by(VitalLog.recorded_at.desc()).limit(50).all()
    return jsonify([{
        'id': v.id,
        'blutdruck': v.blutdruck,
        'puls': v.puls,
        'gewicht': v.gewicht,
        'recorded_at': v.recorded_at.isoformat(),
    } for v in vitals])


# ── Verhaltens-Tags ───────────────────────────────────────────────────────────

@api.route('/behavior', methods=['POST'])
@jwt_required()
def add_behavior():
    user_id = int(get_jwt_identity())
    user = db.get_or_404(User, user_id)
    if user.role != 'caregiver':
        return jsonify({'error': 'Nicht autorisiert'}), 403
    data = request.get_json()
    from app.models import BehaviorLog
    log = BehaviorLog(
        patient_id=data.get('patient_id'),
        caregiver_id=user_id,
        tags=','.join(data.get('tags', [])),
    )
    db.session.add(log)
    db.session.commit()
    return jsonify({'id': log.id}), 201

@api.route('/behavior/<int:patient_id>')
@jwt_required()
def get_behavior(patient_id):
    from app.models import BehaviorLog
    logs = BehaviorLog.query.filter_by(patient_id=patient_id).order_by(BehaviorLog.recorded_at.desc()).limit(50).all()
    return jsonify([{
        'id': l.id,
        'tags': l.tags.split(',') if l.tags else [],
        'recorded_at': l.recorded_at.isoformat(),
    } for l in logs])