# HealthLens AI

HealthLens AI is an intelligent medical report analyzer designed to make complex laboratory blood reports accessible, structured, and easy to understand. Users can upload standard medical lab PDF reports to extract test biomarkers, calculate deterministic reference ranges, flag discrepancies, and receive plain-language educational explanations powered by Google Gemini AI.

> **Medical Disclaimer**: HealthLens AI is developed strictly for educational and informational purposes. It does not provide medical diagnosis, treatment advice, or clinical evaluations. Always consult a qualified healthcare provider for interpretation of medical lab results or clinical decisions.

---

## Features

- **Automated PDF Parsing**: Extracts medical test names, measured values, units of measurement, reference intervals, and printed report flags directly from PDF blood work reports.
- **Deterministic Evaluation**: Evaluates extracted biomarker values against laboratory reference ranges using strict boundary checks to classify results as `NORMAL`, `LOW`, `HIGH`, or `NOT_EVALUATED`.
- **Discrepancy Detection**: Identifies and flags discrepancies between lab-printed flags and calculated reference interval boundaries without silent data mutation.
- **Educational AI Explanations**: Integrates Google Gemini AI to provide clear, patient-friendly summaries explaining what biomarkers indicate, potential factors influencing values, and sensible discussion questions for physicians.
- **Interactive Results Dashboard**:
  - Filter results by status (`ALL`, `NORMAL`, `LOW`, `HIGH`, `NOT_EVALUATED`).
  - Expandable educational notes for each biomarker.
  - Responsive design supporting desktop tables and mobile stacked cards (<640px).
  - Compact summary transitions allowing seamless "Upload New Report" resets.
- **User Authentication**:
  - Secure registration and login flow.
  - Password hashing with `bcryptjs` (salt round 10).
  - Stateless JWT authentication delivered via secure `HttpOnly` cookies.
  - Ephemeral disk processing with automatic cleanup of uploaded PDFs.

---

## Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: TailwindCSS with curated healthcare design system (Forest Green `#245C4F`, Warm Off-White `#F7F7F2`, Manrope headings, Inter body typography)
- **Icons**: Lucide React
- **HTTP**: Native Fetch API with `credentials: 'include'` for cookie handling

### Backend
- **Runtime**: Node.js + Express (ES Modules)
- **Database**: MongoDB (MongoDB Atlas or local MongoDB) via Mongoose
- **Authentication**: JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `cookie-parser`
- **PDF Processing**: `pdf-parse`, `multer`
- **AI Integration**: Google Gemini API (`@google/genai`)

---

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: MongoDB Atlas cluster URI or local MongoDB instance (`mongodb://127.0.0.1:27017`)
- **Google Gemini API Key**: Obtainable from [Google AI Studio](https://aistudio.google.com/)

---

## Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/rahulkumbhakar62070-dotcom/HealthLens-ai.git
cd HealthLens-ai
```

### 2. Backend Setup
Navigate to the `backend` directory and install dependencies:
```bash
cd backend
npm install
```

Configure backend environment variables by copying `.env.example`:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend Origin
CORS_ORIGIN=http://localhost:5173

# Gemini API Key (Required for AI educational explanations)
GEMINI_API_KEY=your_gemini_api_key_here

# MongoDB Connection String (Atlas or local instance)
MONGODB_URI=mongodb://127.0.0.1:27017/healthlens

# JWT Secret for Session Authentication
JWT_SECRET=your_jwt_secret_key_here
```

### 3. Frontend Setup
In a separate terminal, navigate to the `frontend` directory and install dependencies:
```bash
cd frontend
npm install
```

---

## Running the Application

### Start the Backend Server
```bash
cd backend
npm run dev
```
The backend API starts on `http://localhost:5000`.

### Start the Frontend Dev Server
```bash
cd frontend
npm run dev
```
The Vite development server starts on `http://localhost:5173` with automatic API proxying to `http://localhost:5000`.

Open your browser and navigate to `http://localhost:5173`.

---

## Running Automated Tests

HealthLens AI includes comprehensive automated test suites:

```bash
# Run backend authentication tests
cd backend
npm run test:auth

# Run complete PDF upload & dashboard flow tests
npm run test:flow

# Run layout transition tests
npm run test:layout

# Run core backend tests
npm test
```

---

## Project Structure

```text
HealthLens AI/
├── backend/
│   ├── src/
│   │   ├── config/          # MongoDB connection configuration
│   │   ├── middleware/      # Auth & Multer upload middlewares
│   │   ├── models/          # Mongoose schemas (User)
│   │   ├── routes/          # Express route handlers (auth, reports)
│   │   ├── services/        # PDF extraction, evaluation, & Gemini AI
│   │   └── server.js        # Express application entrypoint
│   ├── tests/               # Automated test suites & synthetic fixtures
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components (Navbar, UploadSection, ExtractedResults, Auth)
│   │   ├── context/         # AuthContext provider
│   │   ├── App.jsx          # Root view controller
│   │   └── main.jsx
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── .gitignore
└── README.md
```

---

## License

This project is licensed under the MIT License.
