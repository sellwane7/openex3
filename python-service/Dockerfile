FROM python:3.12-slim

WORKDIR /app

# Install dependencies first so Docker can cache this layer separately
# from your actual code — code changes won't force a full reinstall.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY run.py .

EXPOSE 5000

CMD ["python", "run.py"]