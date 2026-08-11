from flask import Flask
from flask_cors import CORS


def create_app() -> Flask:
    """
    Application factory: builds and configures the Flask app.
    Using a factory (instead of a bare module-level app) makes the
    service easier to test and keeps configuration explicit.
    """
    app = Flask(__name__)

    # Allow the React frontend (running on a different port) to call this API
    CORS(app)

    from app.routes import bp
    app.register_blueprint(bp)

    return app