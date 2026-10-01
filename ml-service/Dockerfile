FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV TF_ENABLE_ONEDNN_OPTS=0

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY training/ training/
RUN python training/train_symptom_model.py && python training/train_image_model.py

COPY app.py .

ENV PORT=8000

EXPOSE 8000

# Single worker — TensorFlow models are memory-heavy
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 1 --timeout 120 --preload app:app"]
