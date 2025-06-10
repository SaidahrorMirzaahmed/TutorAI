from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import whisper
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = whisper.load_model("base")

@app.post("/api/asr")
async def transcribe_audio(audio: UploadFile):
    with open("temp_audio.webm", "wb") as f:
        f.write(await audio.read())
    result = model.transcribe("temp_audio.webm")
    return {"text": result['text']}
