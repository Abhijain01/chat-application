@echo off
echo Starting FastAPI Real-Time Chat Application...

:: Check if virtual environment exists, if it does, activate it (optional, but good practice)
:: if exist venv\Scripts\activate call venv\Scripts\activate

:: Start the Uvicorn server
echo Running Uvicorn server on http://127.0.0.1:8000
uvicorn app.main:app --reload

pause
