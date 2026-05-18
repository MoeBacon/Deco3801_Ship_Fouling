# DECO3801 Ship Fouling Detection

A web application for detecting and reporting ship hull fouling using computer vision and machine learning.

## Prerequisites

- [Python 3.11](https://www.python.org/downloads/)
  ```
  winget install python.python.3.11
  ```
- [Node.js](https://nodejs.org/)
  ```
  winget install OpenJS.Node.JS
  ```
- [Git](https://git-scm.com/)

---

## Project Structure

```
Deco3801_Ship_Fouling/          ← repo root (also the frontend)
├── Backend/
│   ├── app/
│   │   ├── routers/
│   │   │   ├── frames.py
│   │   │   ├── jobs.py
│   │   │   └── videos.py
│   │   ├── services/
│   │   │   ├── frame_extractor.py
│   │   │   ├── ml_stub.py
│   │   │   └── preprocessing.py
│   │   ├── database.py
│   │   ├── main.py
│   │   └── schemas.py
│   ├── requirements.txt
│   └── .env                    ← create this (not in git)
├── src/
│   ├── components/
│   ├── features/
│   │   ├── analysis/
│   │   ├── auth/
│   │   └── import/
│   ├── lib/
│   ├── pages/
│   └── main.tsx
├── public/
├── package.json
└── README.md
```

---

## Setup Instructions

### Step 1 — Clone the Repository

### Clone the main from https://github.com/MoeBacon/Deco3801_Ship_Fouling

```bash
git clone https://github.com/MoeBacon/Deco3801_Ship_Fouling
```

---

### Step 2 — Backend Setup

All backend steps run from inside the `Backend` folder of the cloned repo.

#### 2.1 Create a Virtual Environment

```bash
cd Deco3801_Ship_Fouling\Backend
py -3.11 -m venv venv
# again, python not python3? 
```

#### 2.2 Create the `.env` File

In the `Backend` folder, create a file named `.env` with the following contents:

```
ROBOFLOW_API_KEY=6atWA2cbQchB3BYxyeTs
ROBOFLOW_MODEL_ID=enable-startup/hull-updated/2
```

#### 2.3 Activate the Virtual Environment

**Windows:**

```bash
.\venv\Scripts\activate
```

**Mac / Linux:**

```bash
source venv/bin/activate
```

#### 2.4 Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### 2.5 Start the Backend Server

```bash
python3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
# should this say python instead of python3
```

Leave this terminal running.

---

### Step 3 — Frontend Setup

Open a **new terminal** and navigate to the repo root (the `Deco3801_Ship_Fouling` folder):

```bash
cd Deco3801_Ship_Fouling
```

#### 3.1 Install Node Dependencies

```bash
npm install
```

#### 3.2 Start the Frontend

```bash
npm run dev
```

#### 3.3 Open the App

Open the local URL printed in the terminal output, for example:

```
http://localhost:5173/
```

---

## Test Login Credentials

| Field    | Value   |
| -------- | ------- |
| Username | `admin` |
| Password | `admin` |

---

## Available Scripts (Frontend)

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `npm run dev`     | Start development server     |
| `npm run build`   | Build for production         |
| `npm run preview` | Preview the production build |
| `npm run test`    | Run unit tests               |
| `npm run lint`    | Run ESLint                   |
