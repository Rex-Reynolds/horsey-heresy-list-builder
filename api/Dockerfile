FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY api/requirements.txt /app/api/
COPY requirements.txt /app/

# Install dependencies
RUN pip install --no-cache-dir -r api/requirements.txt

# Copy application code
COPY . /app

# Copy database (or mount as volume)
COPY data/auxilia.db /app/data/

# Expose port
EXPOSE 8000

# Run FastAPI
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
