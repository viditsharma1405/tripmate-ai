<div align="center">

# TripMate AI — Multi-Agent Travel Intelligence System

<p align="center">
  <strong>An autonomous multi-agent travel planning platform orchestrated with LangGraph, Model Context Protocol (MCP), Supervisor decision-making, Input Guardrails, and Human-in-the-Loop (HITL) checkpoints.</strong>
</p>

[![Python Version](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136%2B-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-1.2%2B-FF6F00.svg)](https://langchain-ai.github.io/langgraph/)
[![Groq](https://img.shields.io/badge/LLM-Groq%20GPT--OSS--120B-F55036.svg)](https://groq.com/)
[![PostgreSQL](https://img.shields.io/badge/Checkpointer-PostgreSQL-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Three.js](https://img.shields.io/badge/3D%20Radar-Three.js-black.svg?logo=three.js&logoColor=white)](https://threejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## Overview

**TripMate AI** is a state-of-the-art travel planning engine that orchestrates five specialized autonomous agents under an intelligent Supervisor. The platform validates incoming user queries through security and relevance guardrails, queries live tools via the **Model Context Protocol (MCP)**, pauses execution for **Human-in-the-Loop (HITL)** draft review, and saves persistent conversation states into **PostgreSQL**.

The frontend features a sleek **obsidian & radiant warm orange (`#FF8C55`)** minimalist interface with an embedded **interactive Three.js 3D Flight Radar Globe**, real-time pipeline telemetry, PDF export, and zero emojis for a distraction-free experience.

---

## Key Features

- **Supervisor Orchestration**: A central reasoning agent dynamically plans, decomposes user requirements, and determines which specialist agents to activate.
- **Input Guardrails**: Safety validation filters out off-topic, adversarial, or out-of-scope requests before invoking downstream agents.
- **Five Specialist Agents**:
  - `01 Flight Agent`: Scrapes route and flight status via AviationStack MCP.
  - `02 Hotel Agent`: Discovers accommodations and pricing via Tavily Search.
  - `03 Weather Agent`: Gathers live forecasts and climate advisories via OpenWeather.
  - `04 Budget Agent`: Evaluates cost feasibility and provides itemized expense breakdowns.
  - `05 Itinerary Agent`: Composes structured, day-by-day travel schedules.
- **Human-in-the-Loop (HITL) Review Station**: The LangGraph execution pauses at a draft checkpoint, allowing users to inspect preliminary plans, request changes (e.g. adjust starting city, shift budget), or approve final synthesis.
- **State Persistence (PostgreSQL Checkpointer)**: Uses `langgraph-checkpoint-postgres` to store state snapshots across sessions, allowing threads to pause and resume reliably.
- **Interactive 3D Flight Radar**: Hardware-accelerated Three.js canvas featuring 13 global hubs, elevated 3D Great-Circle flight arcs, traveling aircraft light beacons, and drag-to-rotate navigation.
- **Export Capabilities**: Clean PDF generation via `html2pdf.js` and instant Markdown clipboard copying.

---

## System Architecture

```mermaid
flowchart TD
    subgraph Pipeline [TripMate AI Multi-Agent Architecture]
        User["User Travel Request"] --> Guardrail{"Input Guardrail Check"}
        
        Guardrail -->|Blocked| BlockedNode["Security Alert / Request Rejected"]
        BlockedNode --> TerminateNode["Pipeline Terminated"]
        
        Guardrail -->|Passed| Supervisor["Supervisor Agent (Groq LLM)"]
        
        Supervisor --> FA["01 Flight Agent (AviationStack MCP)"]
        Supervisor --> HA["02 Hotel Agent (Tavily Search MCP)"]
        Supervisor --> WA["03 Weather Agent (OpenWeather MCP)"]
        Supervisor --> BA["04 Budget Agent (Cost Engine)"]
        
        FA --> IA["05 Itinerary Agent (Draft Synthesis)"]
        HA --> IA
        WA --> IA
        BA --> IA
        
        IA --> Checkpoint["HITL Checkpoint (PostgresSaver)"]
        Checkpoint --> Review{"Human Review"}
        
        Review -->|Revision Requested| Supervisor
        Review -->|Approved| FinalAgent["Final Polish Agent"]
        FinalAgent --> Finished["Final Polished Itinerary"]
    end
```

---

## Agent Pipeline Breakdown

| Index | Agent | Integration / MCP | Role |
| :---: | :--- | :--- | :--- |
| **00** | **Supervisor Agent** | Groq (`openai/gpt-oss-120b`) | Evaluates query complexity, schedules specialists, and coordinates outputs. |
| **01** | **Flight Agent** | AviationStack MCP | Checks route connections, airline options, and flight availability. |
| **02** | **Hotel Agent** | Tavily Web Search MCP | Finds hotels, hostels, and homestays matching target budget and preferences. |
| **03** | **Weather Agent** | OpenWeather API MCP | Retrieves destination climate forecasts and weather warnings. |
| **04** | **Budget Agent** | Financial Logic Engine | Analyzes costs (transit, stay, food, activities) and verifies budget adherence. |
| **05** | **Itinerary Agent** | Multi-Agent Synthesizer | Combines research into a cohesive day-by-day itinerary draft. |
| **06** | **HITL Station** | LangGraph State Interrupter | Pauses pipeline execution for human review, feedback, or approval. |

---

## Project Structure

```text
├── app.py                         # FastAPI web server and REST API endpoints
├── backend.py                     # LangGraph graph definition, state, checkpointer, and agents
├── mcp_client.py                  # Client adapters for MCP server connections
├── custom_weather_mcp_server.py   # Standalone example MCP weather adapter
├── requirements.txt               # Production Python dependencies
├── render.yaml                    # Render Blueprint configuration for 1-click cloud deploy
├── Dockerfile                     # Multi-stage production container image
├── .dockerignore                  # Docker build exclusions
├── .gitignore                     # Git exclusions (.env, .venv, etc.)
├── .env.example                   # Template for environment configuration
├── templates/
│   └── index.html                 # Minimalist obsidian & orange web application
└── static/
    ├── style.css                  # Custom design tokens, typography, and layout styles
    ├── script.js                  # Frontend controller & Three.js 3D Flight Radar
    ├── three.min.js               # Local Three.js library
    ├── marked.min.js              # Local Markdown parser
    └── html2pdf.bundle.min.js     # Local client-side PDF generator
```

---

## Getting Started Locally

### 1. Prerequisites
- Python 3.11+
- Git
- PostgreSQL 14+ (Local instance or cloud provider like Render, Neon, or Supabase)

### 2. Clone the Repository
```bash
git clone https://github.com/viditsharma1405/tripmate-ai.git
cd tripmate-ai
```

### 3. Set Up Virtual Environment
```bash
# Using standard venv
python3 -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate

# Or using uv (faster)
uv venv
source .venv/bin/activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and fill in your API credentials:
```env
# Groq API Key (console.groq.com)
GROQ_API_KEY="your-groq-api-key"
GROQ_MODEL="openai/gpt-oss-120b"

# PostgreSQL connection string for LangGraph state persistence
DATABASE_URL="postgresql://user:password@localhost:5432/tripmate?sslmode=disable"

# Search and MCP Tool Keys
TAVILY_API_KEY="your-tavily-api-key"
OPENWEATHER_API_KEY="your-openweather-api-key"
AVIATION_STACK_API_KEY="your-aviation-stack-api-key"
```

### 6. Run the Application
```bash
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

Open **`http://127.0.0.1:8000`** in your browser.

---

## Deployment Guide

### Deploying to Render (Recommended)

This repository includes a preconfigured [`render.yaml`](render.yaml) blueprint:

1. Fork or push this repository to your GitHub account.
2. Log in to [dashboard.render.com](https://dashboard.render.com).
3. Click **New +** > **Web Service** (or **Blueprint**).
4. Select `viditsharma1405/tripmate-ai`.
5. Configure the build parameters:
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
6. Under **Environment Variables**, add:
   - `DATABASE_URL`: PostgreSQL connection URI (e.g. Internal or External Render Postgres URL)
   - `GROQ_API_KEY`: Groq API key
   - `GROQ_MODEL`: `openai/gpt-oss-120b`
   - `TAVILY_API_KEY`: Tavily API key
   - `OPENWEATHER_API_KEY`: OpenWeather API key
   - `AVIATION_STACK_API_KEY`: AviationStack API key
   - `PYTHON_VERSION`: `3.11.9`
7. Click **Deploy Web Service**.

### Deploying with Docker

```bash
# Build the container image
docker build -t tripmate-ai .

# Run the container
docker run -p 8000:8000 --env-file .env tripmate-ai
```

---

## API Reference

### 1. `POST /api/travel`
Start a new travel planning thread or resume an existing run.

**Request Body:**
```json
{
  "message": "Plan a 5-day bike trip from Delhi to Ladakh in January under 50,000 budget",
  "thread_id": "optional-thread-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "thread_id": "user_49fdc808...",
  "answer": "...",
  "requires_approval": true,
  "approval_request": "A preliminary itinerary draft has been generated. Approve it to finalize, or submit revision feedback below.",
  "selected_agents": ["flight_agent", "hotel_agent", "weather_agent", "budget_agent", "itinerary_agent"],
  "supervisor_reasoning": "User requests a multi-day bike trip to high altitude. Dispatching weather for road viability, hotel for winter homestays, and budget agent."
}
```

### 2. `POST /api/travel/approve`
Submit human review feedback or finalize the draft plan.

**Request Body:**
```json
{
  "thread_id": "user_49fdc808...",
  "approved": true,
  "feedback": ""
}
```

### 3. `GET /health`
Basic health check and service capability listing.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
