"""
Microgrid Digital Twin - FastAPI Backend
=========================================
REST API for the microgrid simulation engine.
Provides endpoints for running energy simulations with configurable parameters.
"""

import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from dotenv import load_dotenv

from simulation import MicrogridSimulator, SimulationConfig

# Load environment variables
load_dotenv()

# Try to import Groq
try:
    from groq import Groq
    GROQ_AVAILABLE = True
    groq_api_key = os.getenv("GROQ_API_KEY")
    if groq_api_key and groq_api_key != "your_groq_api_key_here":
        groq_client = Groq(api_key=groq_api_key)
    else:
        GROQ_AVAILABLE = False
        groq_client = None
except ImportError:
    GROQ_AVAILABLE = False
    groq_client = None


# ============================================
# FastAPI Application Setup
# ============================================
app = FastAPI(
    title="Microgrid Digital Twin API",
    description="Simulate 24-hour microgrid energy cycles with Solar, Battery, and Grid integration",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration - Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # Next.js dev server
        "http://127.0.0.1:3000",
        "http://localhost:3001", 
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# Request/Response Models
# ============================================
class SimulationRequest(BaseModel):
    """Request model for simulation parameters - Delhi, India context."""
    battery_capacity_kwh: Optional[float] = Field(
        default=10.0,
        ge=1.0,
        le=100.0,
        description="Battery storage capacity in kWh (1-100)"
    )
    solar_capacity_kw: Optional[float] = Field(
        default=5.0,
        ge=3.0,
        le=7.0,
        description="Solar panel capacity in kW (3-7)"
    )
    weather_mode: Optional[str] = Field(
        default="sunny",
        description="Weather mode: 'sunny' (100% efficiency) or 'cloudy' (50% efficiency)"
    )
    peak_load_demand: Optional[float] = Field(
        default=7.0,
        ge=1.0,
        le=20.0,
        description="Peak load demand in kW (1-20 kW)"
    )
    off_peak_price: Optional[float] = Field(
        default=4.00,
        ge=2.0,
        le=10.0,
        description="Off-peak electricity price in ₹/kWh (00:00-06:00)"
    )
    standard_price: Optional[float] = Field(
        default=6.50,
        ge=3.0,
        le=12.0,
        description="Standard electricity price in ₹/kWh (06:00-18:00)"
    )
    peak_price: Optional[float] = Field(
        default=8.50,
        ge=5.0,
        le=15.0,
        description="Peak hour electricity price in ₹/kWh (18:00-22:00)"
    )
    initial_soc: Optional[float] = Field(
        default=0.50,
        ge=0.2,
        le=1.0,
        description="Initial battery State of Charge (0.2-1.0)"
    )
    tariff_mode: Optional[str] = Field(
        default="manual",
        description="Tariff mode: 'manual' or 'derc'"
    )
    derc_season: Optional[str] = Field(
        default="summer",
        description="DERC season: 'summer' or 'winter'"
    )
    derc_discom: Optional[str] = Field(
        default="TPDDL",
        description="DERC DISCOM: 'TPDDL', 'BRPL', 'BYPL', 'NDMC'"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "battery_capacity_kwh": 10.0,
                "solar_capacity_kw": 5.0,
                "weather_mode": "sunny",
                "peak_load_demand": 7.0,
                "off_peak_price": 4.00,
                "standard_price": 6.50,
                "peak_price": 8.50,
                "initial_soc": 0.50,
                "tariff_mode": "manual",
                "derc_season": "summer",
                "derc_discom": "TPDDL"
            }
        }


# ============================================
# API Endpoints
# ============================================
@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "online",
        "service": "Microgrid Digital Twin API",
        "version": "1.0.0"
    }


@app.post("/simulate")
async def run_simulation(request: SimulationRequest = None):
    """
    Run a 24-hour microgrid simulation.
    
    Compares Baseline strategy (no battery usage) vs Smart strategy
    (intelligent battery dispatch with peak shaving).
    
    Returns hourly data for both strategies plus summary metrics
    including cost savings and grid usage reduction.
    """
    try:
        # Use defaults if no request body provided
        if request is None:
            request = SimulationRequest()
        
        # Create configuration from request
        config = SimulationConfig(
            battery_capacity_kwh=request.battery_capacity_kwh,
            solar_capacity_kw=request.solar_capacity_kw,
            weather_mode=request.weather_mode,
            peak_load_demand=request.peak_load_demand,
            off_peak_price=request.off_peak_price,
            standard_price=request.standard_price,
            peak_price=request.peak_price,
            initial_soc=request.initial_soc,
            tariff_mode=request.tariff_mode,
            derc_season=request.derc_season,
            derc_discom=request.derc_discom
        )
        
        # Run simulation
        simulator = MicrogridSimulator(config)
        results = simulator.run_comparison()
        
        return results
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Simulation error: {str(e)}"
        )


@app.get("/simulate/default")
async def run_default_simulation():
    """
    Run simulation with default parameters.
    
    Convenience endpoint for quick testing without request body.
    Uses: 10 kWh battery, $0.25 peak, $0.10 off-peak pricing.
    """
    simulator = MicrogridSimulator()
    return simulator.run_comparison()


@app.get("/config/defaults")
async def get_default_config():
    """Get default simulation configuration values."""
    config = SimulationConfig()
    return {
        "battery_capacity_kwh": config.battery_capacity_kwh,
        "battery_efficiency": config.battery_efficiency,
        "min_soc": config.min_soc,
        "max_soc": config.max_soc,
        "initial_soc": config.initial_soc,
        "peak_price": config.peak_price,
        "off_peak_price": config.off_peak_price,
        "peak_hours": config.peak_hours
    }


# ============================================
# AI Hint Engine Models & Endpoint
# ============================================
class SimulationHistoryItem(BaseModel):
    """A single simulation run's key metrics."""
    eco_score: float = Field(description="Eco-score (0-100) for this simulation")
    cost_saved_percent: float = Field(description="Percentage of cost saved vs baseline")
    grid_reduced_percent: float = Field(description="Percentage of grid usage reduced")
    battery_utilization: float = Field(description="How well the battery was used (0-100)")
    solar_utilization: float = Field(description="How well solar was used (0-100)")
    battery_empty_during_peak: bool = Field(description="Whether battery was empty during peak hours")
    battery_full_during_solar: bool = Field(description="Whether battery was full when solar was generating")
    charging_during_peak: bool = Field(description="Whether grid charging happened during peak hours")

class HintRequest(BaseModel):
    """Request model for AI hints based on simulation history."""
    simulation_history: List[SimulationHistoryItem] = Field(
        description="List of recent simulation results (last 3)"
    )
    current_config: dict = Field(
        description="Current simulation configuration parameters"
    )

class HintResponse(BaseModel):
    """Response model for AI-generated hints."""
    should_show_hint: bool
    hint_title: str
    hint_message: str
    suggestion_type: str  # "battery", "solar", "pricing", "general"
    confidence: float


def generate_fallback_hint(history: List[SimulationHistoryItem], config: dict) -> HintResponse:
    """Generate rule-based hints when Gemini is not available."""
    latest = history[-1] if history else None
    
    if not latest:
        return HintResponse(
            should_show_hint=False,
            hint_title="",
            hint_message="",
            suggestion_type="general",
            confidence=0
        )
    
    # Check for specific issues and provide targeted hints
    if latest.battery_empty_during_peak:
        return HintResponse(
            should_show_hint=True,
            hint_title="💡 Battery Strategy Tip",
            hint_message="I noticed your battery is empty during peak hours (6-10 PM) when electricity is most expensive. Try charging it during off-peak hours (midnight to 6 AM) when prices are lower. This way, you'll have stored energy ready for the expensive evening hours!",
            suggestion_type="battery",
            confidence=0.9
        )
    
    if latest.charging_during_peak:
        return HintResponse(
            should_show_hint=True,
            hint_title="⚡ Avoid Peak Charging",
            hint_message="Your battery is charging during peak pricing hours - that's like paying premium prices to store energy! Consider setting your initial State of Charge higher, or let the battery charge from excess solar during the day instead.",
            suggestion_type="pricing",
            confidence=0.85
        )
    
    if latest.battery_full_during_solar:
        return HintResponse(
            should_show_hint=True,
            hint_title="☀️ Solar Waste Alert",
            hint_message="Your battery is already full when the sun is shining brightest! This means excess solar energy is being wasted. Try starting with a lower initial battery charge (30-40%) so there's room to store the free solar energy.",
            suggestion_type="solar",
            confidence=0.85
        )
    
    if latest.solar_utilization < 60:
        return HintResponse(
            should_show_hint=True,
            hint_title="🌞 Maximize Your Solar",
            hint_message=f"Your solar utilization is only {latest.solar_utilization:.0f}%. Consider increasing your battery capacity to store more solar energy, or try the 'Smart' strategy which optimizes battery charging from solar.",
            suggestion_type="solar",
            confidence=0.8
        )
    
    if latest.cost_saved_percent < 10:
        return HintResponse(
            should_show_hint=True,
            hint_title="💰 Cost Saving Opportunity",
            hint_message="Your cost savings are below 10%. The key to saving money is TIME-SHIFTING: store cheap energy (solar or off-peak grid) and use it during expensive peak hours. Try increasing battery capacity or adjusting your charging schedule.",
            suggestion_type="general",
            confidence=0.75
        )
    
    return HintResponse(
        should_show_hint=False,
        hint_title="",
        hint_message="",
        suggestion_type="general",
        confidence=0
    )


async def generate_groq_hint(history: List[SimulationHistoryItem], config: dict) -> HintResponse:
    """Generate AI-powered hints using Groq - analyzes simulation intelligently."""
    try:
        latest = history[-1] if history else None
        
        # Format the latest simulation data for detailed analysis
        latest_text = ""
        if latest:
            latest_text = f"""Latest Simulation Results:
- Eco-Score: {latest.eco_score:.1f}/100
- Cost Savings: {latest.cost_saved_percent:.1f}% vs baseline
- Grid Dependency Reduced: {latest.grid_reduced_percent:.1f}%
- Solar Energy Utilization: {latest.solar_utilization:.1f}%
- Battery Utilization: {latest.battery_utilization:.1f}%

Key Issues Detected:
- Battery empty during peak hours (6-10 PM): {latest.battery_empty_during_peak}
- Battery charging from grid during peak prices: {latest.charging_during_peak}
- Battery already full when solar is generating: {latest.battery_full_during_solar}
"""
        
        # Include history if available
        history_text = ""
        if len(history) > 1:
            history_text = "\nPrevious Runs:\n" + "\n".join([
                f"Run {i+1}: Eco-Score={h.eco_score:.1f}, Cost Saved={h.cost_saved_percent:.1f}%"
                for i, h in enumerate(history[:-1])
            ])
        
        prompt = f"""You are an expert energy systems tutor helping a student understand microgrid optimization.

{latest_text}
{history_text}

Current System Configuration:
- Battery Capacity: {config.get('battery_capacity', 10)} kWh
- Solar Panel Capacity: {config.get('solar_capacity', 5)} kW
- Max Load Demand: {config.get('peak_load_demand', 7)} kW
- Weather: {config.get('weather_mode', 'sunny')}
- Initial Battery Charge: {config.get('initial_soc', 50)}%

Based on this data, provide a personalized learning hint. Consider:

1. **If Eco-Score < 50**: Focus on the biggest issue (battery timing, solar waste, or peak pricing)
2. **If Eco-Score 50-70**: Suggest optimization tweaks
3. **If Eco-Score > 70**: Congratulate and suggest advanced strategies
4. **If battery_empty_during_peak is True**: Explain why having battery charge during 6-10 PM saves money
5. **If charging_during_peak is True**: Warn about expensive grid charging during peak
6. **If battery_full_during_solar is True**: Suggest starting with lower initial charge to capture free solar
7. **If solar_utilization < 60%**: Explain how to maximize free solar energy

Respond ONLY with this JSON (no other text):
{{
    "hint_title": "Catchy title with emoji (max 35 chars)",
    "hint_message": "Friendly 2-3 sentence explanation tailored to their specific results. Be specific about numbers and actionable advice.",
    "suggestion_type": "battery|solar|pricing|general|congratulations",
    "confidence": 0.0 to 1.0
}}"""

        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful microgrid energy tutor. Analyze simulation data and give specific, educational hints. Always respond with valid JSON only, no markdown."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=400,
        )
        
        response_text = chat_completion.choices[0].message.content.strip()
        
        # Clean up the response (remove markdown code blocks if present)
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()
        
        hint_data = json.loads(response_text)
        
        return HintResponse(
            should_show_hint=True,
            hint_title=hint_data.get("hint_title", "💡 Energy Tip"),
            hint_message=hint_data.get("hint_message", "Try adjusting your battery charging schedule!"),
            suggestion_type=hint_data.get("suggestion_type", "general"),
            confidence=float(hint_data.get("confidence", 0.8))
        )
        
    except Exception as e:
        print(f"Groq API error: {e}")
        # Fall back to rule-based hints
        return generate_fallback_hint(history, config)


@app.post("/hints", response_model=HintResponse)
async def get_ai_hint(request: HintRequest):
    """
    Get AI-powered hints based on simulation performance.
    
    Analyzes the student's simulation results and provides
    personalized, contextual hints to improve their understanding
    of microgrid energy management. Works immediately after first simulation.
    """
    history = request.simulation_history
    config = request.current_config
    
    # Need at least 1 simulation to analyze
    if len(history) < 1:
        return HintResponse(
            should_show_hint=False,
            hint_title="",
            hint_message="",
            suggestion_type="general",
            confidence=0
        )
    
    # Generate hint using Groq if available, otherwise use fallback
    if GROQ_AVAILABLE:
        return await generate_groq_hint(history, config)
    else:
        return generate_fallback_hint(history, config)


# ============================================
# Chat Request/Response Models
# ============================================
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    simulation_context: Optional[dict] = None  # Current simulation state

class ChatResponse(BaseModel):
    response: str
    suggestion_type: Optional[str] = "general"


@app.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(request: ChatRequest):
    """
    Chat with the AI Lab Assistant about microgrids.
    Maintains conversation context and provides educational responses.
    """
    if not GROQ_AVAILABLE:
        return ChatResponse(
            response="I'm sorry, the AI assistant is currently unavailable. Please check back later or refer to the theory section for help.",
            suggestion_type="general"
        )
    
    try:
        # Build context from simulation data if available
        context_text = ""
        if request.simulation_context:
            ctx = request.simulation_context
            context_text = f"""
Current Simulation Setup:
- Battery: {ctx.get('battery_capacity', 10)} kWh at {ctx.get('initial_soc', 50)}% charge
- Solar: {ctx.get('solar_capacity', 5)} kW capacity
- Max Load: {ctx.get('peak_load_demand', 7)} kW
- Weather: {ctx.get('weather_mode', 'sunny')}
- Latest Eco-Score: {ctx.get('eco_score', 'Not run yet')}
"""

        # Format conversation history
        formatted_messages = [
            {
                "role": "system",
                "content": f"""You are a friendly and knowledgeable AI Lab Assistant for a microgrid energy simulation lab. Your role is to help students understand:

1. **Microgrid Concepts**: Solar panels, batteries, grid integration, energy flow
2. **Time-of-Use Pricing**: Peak hours (6PM-10PM cost more), off-peak hours (midnight-6AM cost less)
3. **Smart Energy Strategies**: Peak shaving, load shifting, battery scheduling
4. **Optimization Tips**: How to maximize solar utilization, minimize grid costs

{context_text}

Guidelines:
- Be concise but educational (2-4 sentences typically)
- Use simple analogies when explaining complex concepts
- Reference the student's current simulation setup when relevant
- Suggest specific parameter changes when asked for optimization advice
- Use emojis sparingly to be friendly 🔋☀️⚡
- If asked about something outside microgrids, politely redirect to the topic"""
            }
        ]
        
        # Add conversation history
        for msg in request.messages[-10:]:  # Keep last 10 messages for context
            formatted_messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        chat_completion = groq_client.chat.completions.create(
            messages=formatted_messages,
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=500,
        )
        
        response_text = chat_completion.choices[0].message.content.strip()
        
        # Determine suggestion type based on content
        suggestion_type = "general"
        lower_response = response_text.lower()
        if "battery" in lower_response or "charge" in lower_response or "soc" in lower_response:
            suggestion_type = "battery"
        elif "solar" in lower_response or "panel" in lower_response or "sun" in lower_response:
            suggestion_type = "solar"
        elif "price" in lower_response or "cost" in lower_response or "peak" in lower_response:
            suggestion_type = "pricing"
        
        return ChatResponse(
            response=response_text,
            suggestion_type=suggestion_type
        )
        
    except Exception as e:
        print(f"Chat API error: {e}")
        return ChatResponse(
            response="I encountered an issue processing your question. Could you try rephrasing it?",
            suggestion_type="general"
        )


# ============================================
# Run with Uvicorn
# ============================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
