FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl wget git build-essential \
    libgl1 libglib2.0-0 libsm6 libxrender1 libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Install Tectonic LaTeX compiler
RUN curl -fsSL https://drop.cargopkg.io/tectonic/latest/x86_64-unknown-linux-musl/tectonic \
    -o /usr/local/bin/tectonic && chmod +x /usr/local/bin/tectonic || \
    (wget -q https://github.com/tectonic-typesetting/tectonic/releases/latest/download/tectonic-x86_64-unknown-linux-musl.tar.gz \
    -O /tmp/tectonic.tar.gz && tar -xzf /tmp/tectonic.tar.gz -C /usr/local/bin && chmod +x /usr/local/bin/tectonic)

# Install PyTorch CPU-only first (prevents pulling in CUDA)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install app dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app
ENV TORCH_DEVICE=cpu

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
