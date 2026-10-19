FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

# Host foydalanuvchisi bilan bir xil UID — ulangan db.sqlite3 va media/ ga yozish uchun
ARG APP_UID=1000
RUN useradd --uid ${APP_UID} --create-home app

COPY --chown=app:app . .
RUN chmod +x docker-entrypoint.sh && mkdir -p static media && chown app:app static media

USER app

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120", "--access-logfile", "-"]
