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

## Quick Start

### macOS
1. Download `start.command` from this repository
2. Open Terminal and run:
```bash
   chmod +x start.command
   xattr -d com.apple.quarantine start.command
```
3. Double-click `start.command` in Finder
4. Wait for the browser to open automatically at `http://localhost:5173`

### Windows
1. Download `start.bat` from this repository
2. Double-click `start.bat`
3. If dependencies are installed for the first time, close and re-run `start.bat`
4. Wait for the browser to open automatically at `http://localhost:5173`

> **Note:** First run will take a few minutes to install dependencies. Subsequent runs will be faster.
---

### Manual Setup Instructions

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

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Start development server |
| `npm run test` | Run unit tests           |

---

## Ideal Use Case

1. Log in using the credentials in this README. You are now on the Dashboard page
2. Click Upload Footage from the dashboard or side navigation.
3. Fill out Vessel details - required field
4. Select a video file and click Upload Video & Queue Job to start the process.
5. Wait for the import to complete (view status job), then click Run Analysis.
6. View Analysis & Results, seeing the extracted frames.
7. Use the detection timeline to hover over a specificdot and view details further or fully click to jump to frame.
8. Inspect the detection list on the right for class types and the amount.
9. Click Export CSV to download analysis results as a CSV file.
10. Click Generate report to navigate to the Reports page.
11. Scroll to view full report.
12. Click Download PDF to open a Window Print view, or alternatively click Back to Analysis to return to the Analysis Page.
