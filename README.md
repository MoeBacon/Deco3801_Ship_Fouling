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
- [GitHub](https://github.com/)

---

### Setup Instructions

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
```

#### 2.2 Create the `.env` File

In the `Backend` folder, create a file named `.env` with the following contents:

```
ROBOFLOW_API_KEY=6atWA2cbQchB3BYxyeTs
ROBOFLOW_MODEL_ID=hull-updated/2
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
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

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

#### 3.2 Audit Fix

```bash
npm audit fix
```

#### 3.3 Start the Frontend

```bash
npm run dev
```

#### 3.4 Open the App

Open the local URL printed in the terminal output, for example:

```
http://localhost:5173/
```

---

## Login Credentials

| Field    | Value          |
| -------- | -------------- |
| Username | `admin`        |
| Password | `inspector123` |

---

## Available Scripts (Frontend)

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `npm run dev`     | Start development server     |
| `npm run build`   | Build for production         |
| `npm run preview` | Preview the production build |
| `npm run test`    | Run unit tests               |
| `npm run lint`    | Run ESLint                   |

---

## Ideal Use Case

1. Log in using the credentials in this README. You are now on the Dashboard page
2. Click **Upload Footage** from the dashboard or side navigation.
3. Fill out Vessel details - required field
4. Select a video file and click **Upload Video & Queue Job** to start the process.
5. Wait for the import to complete (view status job), then click **Run Analysis**.
6. View Analysis & Results, seeing the extracted frames.
7. Use the detection timeline to hover over a specificdot and view details further or fully click to jump to frame.
8. Inspect the detection list on the right for class types and the amount.
9. Click **Export CSV** to download analysis results as a CSV file.
10. Click **Generate report** to navigate to the Reports page.
11. Scroll to view full report.
12. Click **Download PDF** to open a Window Print view, or alternatively click **Back to Analysis** to return to the Analysis Page.
