from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS
from flask_jwt_extended import JWTManager

db = SQLAlchemy()
login_manager = LoginManager()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)

    app.config['SECRET_KEY'] = 'careThiq-dev-key'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///careThiq.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = 'careThiq-jwt-secret'
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False

    db.init_app(app)
    login_manager.init_app(app)
    jwt.init_app(app)
    login_manager.login_view = 'main.login'

    CORS(app, supports_credentials=True)

    from app.routes import main
    app.register_blueprint(main)

    from app.api import api
    app.register_blueprint(api)

    with app.app_context():
        db.create_all()

    return app