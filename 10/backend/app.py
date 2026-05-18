import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from models import db
from routes import api_bp

def create_app():
    app = Flask(__name__, static_folder='../frontend/dist', static_url_path='')
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(os.path.dirname(os.path.abspath(__file__)), 'burp_helper.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

    db.init_app(app)
    CORS(app)

    app.register_blueprint(api_bp, url_prefix='/api')

    with app.app_context():
        db.create_all()
        init_default_config()

    @app.route('/')
    def index():
        return send_from_directory(app.static_folder, 'index.html')

    @app.errorhandler(404)
    def not_found(e):
        return send_from_directory(app.static_folder, 'index.html')

    return app

def init_default_config():
    from models import Config
    default_configs = {
        'auto_parse': 'true',
        'auto_tagging': 'true',
        'highlight_sensitive': 'true',
        'sensitive_keywords': 'password,token,secret,key,auth,authorization,cookie,session,jwt',
        'export_format': 'xml',
        'items_per_page': '20',
        'theme': 'dark'
    }
    for key, value in default_configs.items():
        if not Config.query.filter_by(key=key).first():
            config = Config(key=key, value=value)
            db.session.add(config)
    db.session.commit()

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
