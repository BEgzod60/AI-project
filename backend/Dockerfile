FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
RUN chmod +x entrypoint.sh

EXPOSE 10000
ENTRYPOINT ["./entrypoint.sh"]
# gthread — AI chat SSE (stream) so'rovlari workerni to'liq band qilib qo'ymasligi uchun
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:10000", \
     "--workers", "3", "--worker-class", "gthread", "--threads", "4", \
     "--timeout", "120", "--access-logfile", "-"]
