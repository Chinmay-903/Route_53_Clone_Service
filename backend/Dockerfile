# Multi-stage: dependencies are built with a compiler present, then copied into
# a slim runtime that has no build toolchain to inherit.

FROM python:3.12-slim AS builder

WORKDIR /build
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# argon2-cffi needs a compiler; the runtime stage will not.
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY app ./app
RUN pip install --no-cache-dir .


FROM python:3.12-slim AS runtime

# Never run as root: a container escape should not begin with uid 0.
RUN useradd --create-home --uid 10001 appuser

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app
COPY --chown=appuser:appuser app ./app
COPY --chown=appuser:appuser scripts ./scripts

# The database lives on a mounted volume, not in the image layers, so it
# survives redeploys. See docs/adr/0005-sqlite-persistence.md.
RUN mkdir -p /data && chown appuser:appuser /data
ENV DATABASE_URL=sqlite:////data/route53.db

USER appuser

# Most platforms assign the port at runtime through $PORT; 8000 is the local
# default. EXPOSE is documentation only, so it names the default.
ENV PORT=8000
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
    CMD python -c "import os,urllib.request; urllib.request.urlopen(f\"http://127.0.0.1:{os.environ.get('PORT','8000')}/healthz\")"

# Shell form on purpose: the exec form would pass the literal string "$PORT" to
# uvicorn instead of expanding it.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
