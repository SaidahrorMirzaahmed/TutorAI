# AI Math Tutor

This project is a web-based, voice-enabled AI math tutor that provides interactive lessons and problem-solving assistance. It features a React frontend, a .NET backend with Ollama for AI-powered responses, and a Python-based speech-to-text service.

## Features

- **Interactive Voice Chat**: Speak with the AI tutor and receive spoken responses.
- **Dynamic Graphing**: The tutor can display graphs for equations using Desmos.
- **Multiple Topics**: Choose from various math topics like linear equations, quadratic functions, and more.
- **Session Management**: The application maintains a session for each user to track conversation history.
- **Silence Detection**: The voice recording automatically stops when you stop talking.

## Project Structure

- `voice-chat-app/`: Contains the React frontend application.
- `OllamaBackend/`: Contains the .NET backend that connects to the Ollama service.
- `python_asr/`: Contains the Python-based Automatic Speech Recognition (ASR) service using Whisper.

## Getting Started

### Prerequisites

- [Node.js and npm](https://nodejs.org/en/)
- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Python 3.x](https://www.python.org/downloads/)
- An Ollama instance running with the `gemma3` model.

### Installation & Running

1. **Frontend (React)**

   ```bash
   cd voice-chat-app
   npm install
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`.

2. **Backend (.NET)**

   ```bash
   cd OllamaBackend/OllamaBackend
   dotnet run
   ```
   The backend will be running on `https://localhost:7106` and `http://localhost:5166`.

3. **ASR Service (Python)**

   ```bash
   cd python_asr
   python -m venv venv
   source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
   pip install -r requirements.txt
   uvicorn asr_api:app --reload
   ```
   The ASR service will be available at `http://localhost:8000`.

### How to Use

1.  Navigate to the frontend URL in your browser.
2.  Choose a math topic to start a session.
3.  Use your voice to interact with the AI tutor. Ask questions, solve problems, and see graphs dynamically generated.

## Key Technologies

- **Frontend**: React, Vite, TypeScript
- **Backend**: .NET 9, ASP.NET Core
- **AI**: Ollama with Gemma3 model
- **Speech-to-Text**: Whisper (via Python FastAPI)
- **Graphing**: Desmos
