#!/bin/bash
# exits if any commands fails
set -e

# kill background processes on exit
trap 'kill $(jobs -p) 2>/dev/null' exit

# run from the home directory
cd "$(dirname "$0")"

# detect OS and install dependencies
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo ">>> macOS detected."

  if ! command -v brew &>/dev/null; then
    echo ">>> Installing Homebrew."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  fi

  if ! command -v git &>/dev/null; then
    echo ">>> Installing Git."
    brew install git
  fi

  if ! command -v python3.12 &>/dev/null; then
    echo ">>> Installing Python 3.12."
    brew install python@3.12
  fi

  if ! command -v node &>/dev/null; then
    echo ">>> Installing Node.js."
    brew install node
  fi
  else
    echo ">>> This executable it for Mac only"
    exit 1
  fi

### Backend ###
echo ">>> Setting up backend."
cd Backend

if [ ! -d "venv" ]; then
  echo ">>> Creating virtual environment."
  python3.12 -m venv venv
else
  echo ">>> Virtual environment already exists, skipping."
fi

if [ ! -f .env ]; then
  echo ">>> Creating .env file."
  cat > .env <<ENVEOF
ROBOFLOW_API_KEY=6atWA2cbQchB3BYxyeTs
ROBOFLOW_MODEL_ID=hull-updated/2
ENVEOF
else
  echo ">>> .env already exists, skipping."
fi

source venv/bin/activate

if [ ! -f venv/.pip_installed ]; then
  echo ">>> Installing pip packages."
  pip install -r requirements.txt
  touch venv/.pip_installed
else
  echo ">>> pip packages already installed, skipping."
fi

echo ">>> Starting backend."
python3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 &

echo ">>> Waiting for backend to start."
for i in {1..20}; do
  if curl -s http://127.0.0.1:8000/api/v1/ping &>/dev/null; then
    echo ">>> Backend is ready!"
    break
  fi
  sleep 1
done

### Frontend ###
echo ">>> Setting up frontend."
cd ..

if [ ! -f node_modules/.npm_installed ]; then
  echo ">>> Installing npm packages."
  npm install
  touch node_modules/.npm_installed
else
  echo ">>> npm packages already installed, skipping."
fi

echo ">>> Starting frontend."
npm run dev &
sleep 5
open http://localhost:5173
wait
