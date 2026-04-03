from flask import Blueprint, render_template, redirect, url_for, request, flash, session
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, date
from app import db
from app.models import User, Medication, IntakeLog

main = Blueprint('main', __name__)

@main.route('/')
def index():
    if current_user.is_authenticated:
        if current_user.role == 'caregiver':
            return redirect(url_for('main.dashboard'))
        else:
            return redirect(url_for('main.home'))
    return redirect(url_for('main.login'))

@main.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = User.query.filter_by(email=email).first()
        if user and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for('main.index'))
        flash('E-Mail oder Passwort falsch.', 'error')
    return render_template('login.html')

@main.route('/logout')
@login_required
def logout():
    logout_user()
    session.pop('wellbeing_done', None)
    return redirect(url_for('main.login'))

@main.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        password = request.form.get('password')
        existing = User.query.filter_by(email=email).first()
        if existing:
            flash('E-Mail bereits registriert.', 'error')
            return redirect(url_for('main.register'))
        new_user = User(
            name=name,
            email=email,
            password=generate_password_hash(password),
            role='casual'
        )
        db.session.add(new_user)
        db.session.commit()
        login_user(new_user)
        return redirect(url_for('main.home'))
    return render_template('register.html')

@main.route('/wellbeing', methods=['POST'])
@login_required
def wellbeing():
    session['wellbeing_done'] = True
    return redirect(url_for('main.home'))

@main.route('/home')
@login_required
def home():
    medications = Medication.query.filter_by(user_id=current_user.id).all()
    today = date.today()
    taken_today = []
    for med in medications:
        log = IntakeLog.query.filter_by(
            medication_id=med.id,
            user_id=current_user.id
        ).filter(
            db.func.date(IntakeLog.taken_at) == today
        ).order_by(IntakeLog.taken_at.desc()).first()
        taken_today.append({'med': med, 'log': log})
    wellbeing_done = session.get('wellbeing_done', False)
    return render_template('home.html', user=current_user,
                           taken_today=taken_today,
                           wellbeing_done=wellbeing_done)

@main.route('/dashboard')
@login_required
def dashboard():
    if current_user.role != 'caregiver':
        return redirect(url_for('main.home'))
    patients = User.query.filter_by(role='patient').all()
    today = date.today()
    patient_data = []
    for patient in patients:
        medications = Medication.query.filter_by(user_id=patient.id).all()
        med_status = []
        for med in medications:
            log = IntakeLog.query.filter_by(
                medication_id=med.id,
                user_id=patient.id
            ).filter(
                db.func.date(IntakeLog.taken_at) == today
            ).order_by(IntakeLog.taken_at.desc()).first()
            med_status.append({'med': med, 'log': log})
        patient_data.append({'patient': patient, 'med_status': med_status})
    return render_template('dashboard.html', user=current_user, patient_data=patient_data)

@main.route('/patient/add', methods=['GET', 'POST'])
@login_required
def patient_add():
    if current_user.role != 'caregiver':
        return redirect(url_for('main.home'))
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        password = request.form.get('password')
        existing = User.query.filter_by(email=email).first()
        if existing:
            flash('E-Mail bereits vergeben.', 'error')
            return redirect(url_for('main.patient_add'))
        new_patient = User(
            name=name,
            email=email,
            password=generate_password_hash(password),
            role='patient'
        )
        db.session.add(new_patient)
        db.session.commit()
        flash(f'Patient {name} wurde angelegt.', 'success')
        return redirect(url_for('main.dashboard'))
    return render_template('patient_add.html')

@main.route('/patient/<int:patient_id>/medication/add', methods=['GET', 'POST'])
@login_required
def patient_medication_add(patient_id):
    if current_user.role != 'caregiver':
        return redirect(url_for('main.home'))
    patient = db.get_or_404(User, patient_id)
    if request.method == 'POST':
        name = request.form.get('name')
        dose = request.form.get('dose')
        interval_hours = request.form.get('interval_hours')
        intake_time = request.form.get('intake_time')
        food_required = request.form.get('food_required') == 'on'
        notes = request.form.get('notes')
        new_med = Medication(
            user_id=patient.id,
            name=name,
            dose=dose,
            interval_hours=int(interval_hours),
            intake_time=intake_time,
            food_required=food_required,
            notes=notes
        )
        db.session.add(new_med)
        db.session.commit()
        flash(f'Medikament für {patient.name} hinzugefügt.', 'success')
        return redirect(url_for('main.dashboard'))
    return render_template('patient_medication_add.html', patient=patient)

@main.route('/medication/add', methods=['GET', 'POST'])
@login_required
def medication_add():
    if current_user.role == 'patient':
        return redirect(url_for('main.home'))
    if request.method == 'POST':
        name = request.form.get('name')
        dose = request.form.get('dose')
        interval_hours = request.form.get('interval_hours')
        intake_time = request.form.get('intake_time')
        food_required = request.form.get('food_required') == 'on'
        notes = request.form.get('notes')
        new_med = Medication(
            user_id=current_user.id,
            name=name,
            dose=dose,
            interval_hours=int(interval_hours),
            intake_time=intake_time,
            food_required=food_required,
            notes=notes
        )
        db.session.add(new_med)
        db.session.commit()
        flash('Medikament wurde hinzugefügt.', 'success')
        return redirect(url_for('main.home'))
    return render_template('medication_add.html')

@main.route('/medication/<int:med_id>/intake', methods=['GET', 'POST'])
@login_required
def medication_intake(med_id):
    med = db.get_or_404(Medication, med_id)
    if med.user_id != current_user.id:
        return redirect(url_for('main.home'))
    if request.method == 'POST':
        action = request.form.get('action')
        food_eaten = request.form.get('food_eaten') == 'yes'
        taken = action == 'yes'
        log = IntakeLog(
            medication_id=med.id,
            user_id=current_user.id,
            taken=taken,
            food_eaten=food_eaten
        )
        db.session.add(log)
        db.session.commit()
        if taken:
            flash(f'{med.name} als eingenommen markiert.', 'success')
        else:
            flash(f'{med.name} übersprungen.', 'warning')
        return redirect(url_for('main.home'))
    return render_template('medication_intake.html', med=med)