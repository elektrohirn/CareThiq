from app import db, login_manager
from flask_login import UserMixin
from datetime import datetime, timezone

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

class User(db.Model, UserMixin):
    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(100), nullable=False)
    email       = db.Column(db.String(150), unique=True, nullable=False)
    password    = db.Column(db.String(200), nullable=False)
    role        = db.Column(db.String(20), nullable=False)
    birthdate   = db.Column(db.String(10), nullable=True)
    room        = db.Column(db.String(100), nullable=True)
    address     = db.Column(db.String(300), nullable=True)
    latitude    = db.Column(db.Float, nullable=True)
    longitude   = db.Column(db.Float, nullable=True)
    created_at  = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    medications = db.relationship('Medication', backref='user', lazy=True, cascade='all, delete-orphan')

class Medication(db.Model):
    id             = db.Column(db.Integer, primary_key=True)
    user_id        = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name           = db.Column(db.String(100), nullable=False)
    dose           = db.Column(db.String(50), nullable=False)
    interval_hours = db.Column(db.Integer, nullable=False)
    intake_time    = db.Column(db.String(5), nullable=False, default='08:00')
    photo_path     = db.Column(db.String(200))
    notes          = db.Column(db.Text)
    food_required  = db.Column(db.Boolean, default=False)
    ingredient     = db.Column(db.String(200), nullable=True)
    created_at     = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    logs           = db.relationship('IntakeLog', backref='medication', lazy=True, cascade='all, delete-orphan')

class IntakeLog(db.Model):
    id            = db.Column(db.Integer, primary_key=True)
    medication_id = db.Column(db.Integer, db.ForeignKey('medication.id'), nullable=False)
    user_id       = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    taken         = db.Column(db.Boolean, nullable=False)
    food_eaten    = db.Column(db.Boolean, default=False)
    wellbeing     = db.Column(db.Integer, nullable=True)
    taken_at      = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class WellbeingLog(db.Model):
    __tablename__ = 'wellbeing_log'
    id          = db.Column(db.Integer, primary_key=True)
    patient_id  = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    value       = db.Column(db.Integer, nullable=False)
    recorded_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class VitalLog(db.Model):
    __tablename__ = 'vital_log'
    id           = db.Column(db.Integer, primary_key=True)
    patient_id   = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    caregiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    blutdruck    = db.Column(db.String(20), nullable=True)
    puls         = db.Column(db.Integer, nullable=True)
    gewicht      = db.Column(db.Float, nullable=True)
    recorded_at  = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class BehaviorLog(db.Model):
    __tablename__ = 'behavior_log'
    id           = db.Column(db.Integer, primary_key=True)
    patient_id   = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    caregiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    tags         = db.Column(db.String(500), nullable=True)
    recorded_at  = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))