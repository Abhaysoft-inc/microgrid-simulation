# 🔋 Microgrid Digital Twin

An interactive educational simulation platform for understanding smart microgrid energy management, built for the Virtual Labs (VLabs) initiative.

![Microgrid Simulation](https://img.shields.io/badge/Status-Live-brightgreen) ![Next.js](https://img.shields.io/badge/Next.js-15-black) ![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688) ![AI Powered](https://img.shields.io/badge/AI-Groq%20LLM-orange)

## 🎯 Overview

This project simulates a **24-hour residential microgrid system** with solar panels, battery storage, and grid connectivity. Students can experiment with different configurations and learn how smart energy management reduces costs and grid dependency.

### Key Features

- **🌞 Solar + Battery Simulation** - Realistic energy generation and storage modeling
- **📊 Interactive Visualization** - 3D microgrid scene, real-time energy flow charts, and animated dashboards
- **🤖 AI Lab Assistant** - Powered by Groq LLM, provides personalized hints and answers questions
- **📈 Strategy Comparison** - Compare baseline vs smart battery dispatch strategies
- **🏆 Eco-Score System** - Gamified learning with performance metrics
- **📚 VLabs Pedagogy** - Theory → Procedure → Simulation → Analysis → Quiz workflow

## 🖥️ Live Demo

- **Frontend**: [https://vgrass-sim.vercel.app/](https://vlabs-microgrid.vercel.app)
- **Backend API**: [https://microgrid-simulation.onrender.com](https://microgrid-simulation.onrender.com)
- **API Docs**: [https://microgrid-simulation.onrender.com/docs](https://microgrid-simulation.onrender.com/docs)

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Next.js App   │────▶│  FastAPI Server │────▶│   Groq LLM API  │
│   (Frontend)    │     │   (Backend)     │     │   (AI Hints)    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
      Vercel                 Render                  Groq Cloud
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS v4 |
| 3D Visualization | Three.js, React Three Fiber |
| Charts | Plotly.js, D3.js |
| Backend | Python 3.11+, FastAPI, Uvicorn |
| AI Engine | Groq API (Llama 3.3 70B) |
| Deployment | Vercel (Frontend), Render (Backend) |

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Groq API Key (free at [console.groq.com](https://console.groq.com))

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/vlabs-microgrid.git
cd vlabs-microgrid
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# Run the server
python main.py
```

The API server starts at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Open `http://localhost:3000/vlabs-simulation` in your browser.

## ⚙️ Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Required for AI Lab Assistant
GROQ_API_KEY=your_groq_api_key_here
```

### Frontend Environment Variables (Optional)

Create a `.env.local` file in the `frontend/` directory:

```env
# Override API URL (defaults to localhost:8000 in dev)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🎮 How to Use

1. **Theory Tab** - Read about microgrid concepts and time-of-use pricing
2. **Procedure Tab** - Follow step-by-step instructions with GIF demonstrations
3. **Simulation Tab** - Configure parameters and run the simulation
   - Adjust battery capacity (1-100 kWh)
   - Set solar panel capacity (3-7 kW)
   - Configure max load demand (1-20 kW)
   - Choose weather mode (sunny/cloudy)
4. **Analysis Tab** - Compare baseline vs smart strategy results
5. **Quiz Tab** - Test your understanding
6. **AI Assistant** - Click the Eco-Score badge for AI-powered tips and chat

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/simulate` | POST | Run 24-hour simulation |
| `/hints` | POST | Get AI-powered optimization hints |
| `/chat` | POST | Chat with AI assistant |
| `/docs` | GET | Interactive API documentation |

### Example: Run Simulation

```bash
curl -X POST https://microgrid-simulation.onrender.com/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "battery_capacity_kwh": 10,
    "solar_capacity_kw": 5,
    "peak_load_demand": 7,
    "weather_mode": "sunny",
    "initial_soc": 0.5
  }'
```

## 📊 Simulation Parameters

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| Battery Capacity | 1-100 kWh | 10 kWh | Energy storage capacity |
| Solar Capacity | 3-7 kW | 5 kW | Solar panel peak output |
| Max Load Demand | 1-20 kW | 7 kW | Peak household consumption |
| Initial SoC | 20-100% | 50% | Starting battery charge |
| Weather Mode | sunny/cloudy | sunny | Affects solar efficiency |

## 🧠 AI Lab Assistant

The AI assistant uses Groq's Llama 3.3 70B model to:

- Analyze your simulation results
- Provide personalized optimization hints
- Answer questions about microgrid concepts
- Explain peak shaving and load shifting strategies

**Example questions to ask:**
- "How do I improve my eco-score?"
- "Why is my battery empty during peak hours?"
- "Explain time-of-use pricing"
- "What's the best battery charging strategy?"

## 🚀 Deployment

### Deploy Frontend to Vercel

```bash
cd frontend
npm run build
vercel --prod
```

### Deploy Backend to Render

1. Create a new Web Service on [render.com](https://render.com)
2. Connect your GitHub repository
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variable: `GROQ_API_KEY`

## 📁 Project Structure

```
vlabs-microgrid/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── simulation.py        # Microgrid simulation engine
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Environment variables
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js app router
│   │   └── components/
│   │       ├── VLabsSimulation.tsx    # Main simulation component
│   │       ├── Microgrid3DScene.tsx   # Three.js 3D visualization
│   │       ├── EnergyFlowD3.tsx       # D3.js energy flow chart
│   │       └── Dashboard.tsx          # Metrics dashboard
│   ├── package.json
│   └── tailwind.config.ts
└── README.md
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Virtual Labs](https://www.vlab.co.in/) - For the educational framework
- [Groq](https://groq.com/) - For the fast LLM inference
- [Delhi BSES](https://www.bsesdelhi.com/) - For realistic ToD tariff data

---

**Built with ❤️ for VLabs Hackathon 2026**
