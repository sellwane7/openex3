FROM python:3.12-slim

WORKDIR /app

# Install dependencies first so Docker can cache this layer separately
# from your actual code — code changes won't force a full reinstall.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY run.py .

EXPOSE 5000

# --timeout 180: chat requests go through the LLM (and sometimes a cold
# Ollama model load), which can take a lot longer than gunicorn's 30s
# default. --workers 2 gives a little concurrency without needing much RAM.
# Shell form so env vars expand — Render assigns PORT at runtime (falls
# back to 5000 for local/docker-compose use). OLLAMA_HOST/OLLAMA_PORT are
# only set on Render (via fromService in render.yaml, which can't embed a
# URL scheme directly) — when present, they're assembled into the
# OLLAMA_BASE_URL the app actually reads; when absent, OLLAMA_BASE_URL is
# left as whatever docker-compose/the environment already set.
CMD sh -c '\
  if [ -n "$OLLAMA_HOST" ]; then export OLLAMA_BASE_URL="http://${OLLAMA_HOST}:${OLLAMA_PORT:-11434}"; fi; \
  if [ -n "$KOTLIN_API_HOST" ]; then export KOTLIN_API_BASE_URL="http://${KOTLIN_API_HOST}:${KOTLIN_API_PORT:-8080}"; fi; \
  exec gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 2 --timeout 180 run:app'
