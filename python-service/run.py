import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    # debug=True is a security hole in production (Werkzeug's debugger allows
    # remote code execution on an unhandled error), so it's opt-in only via
    # env var and off by default. In production this file isn't even the
    # entrypoint — gunicorn imports `app` directly (see Dockerfile CMD).
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=debug)
