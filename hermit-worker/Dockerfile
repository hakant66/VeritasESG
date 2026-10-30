# Isolated Hermit evaluation worker. Deliberately NOT part of the main `app`
# image — see docs/hermit/architecture-review.md section 3 ("Option A chosen
# over Option B"). Core hermit-harness only; no evolution-method dependency
# groups (gepa/skillopt/harness2) are installed, since this phase is
# evaluation-only.
FROM python:3.12-slim

WORKDIR /worker

RUN apt-get update && apt-get install -y --no-install-recommends git && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./

EXPOSE 8800
CMD ["uvicorn", "control_api:app", "--host", "0.0.0.0", "--port", "8800"]
