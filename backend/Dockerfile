# Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
# ffmpeg might be needed for pydub to process audio files
RUN apt-get update && apt-get install -y \
    gcc \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install poetry

# Copy project definition files
COPY pyproject.toml poetry.lock ./

# Install dependencies
# --no-root: triggers installation of dependencies but not the project itself (if it's a package)
# virtualenvs.create false: install globally in the container
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-root

# Copy app code
COPY . .

# Expose port
EXPOSE 8000

# Run with uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
