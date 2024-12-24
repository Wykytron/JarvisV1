from fastapi import FastAPI, UploadFile, File, Form
from typing import Optional
import os
from dotenv import load_dotenv
import openai
import uuid
import tempfile
import whisper

from database import SessionLocal, ChatExchange  # <-- Make sure you have these

# If you're using LangChain's ChatOpenAI:
from langchain.chat_models import ChatOpenAI

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI()

# Transcription endpoint (local Whisper as example)
@app.post("/api/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    whisper_model: str = Form("base")
):
    audio_bytes = await file.read()
    temp_dir = tempfile.gettempdir()
    temp_id = str(uuid.uuid4())
    temp_path = os.path.join(temp_dir, f"{temp_id}.wav")

    with open(temp_path, "wb") as f:
        f.write(audio_bytes)

    model_w = whisper.load_model(whisper_model)
    result = model_w.transcribe(temp_path)

    os.remove(temp_path)
    return {"transcript": result["text"]}


# Actual chat endpoint with real LLM call
@app.post("/api/chat")
async def chat_endpoint(
    message: str = Form(...),
    model: str = Form("gpt-3.5-turbo")
):
    """
    Calls the ChatOpenAI model, then stores the user message and LLM response in DB.
    """
    llm = ChatOpenAI(
        openai_api_key=openai.api_key,
        model_name=model,
        temperature=0.7
    )
    llm_response = llm.predict(message)

    db = SessionLocal()
    try:
        new_exchange = ChatExchange(
            user_message=message,
            llm_response=llm_response
        )
        db.add(new_exchange)
        db.commit()
        db.refresh(new_exchange)
    finally:
        db.close()

    return {"response": llm_response}


@app.get("/api/history")
def get_chat_history():
    db = SessionLocal()
    try:
        exchanges = db.query(ChatExchange).order_by(ChatExchange.timestamp.asc()).all()
        history = [
            {
                "id": exch.id,
                "user_message": exch.user_message,
                "llm_response": exch.llm_response,
                "timestamp": exch.timestamp.isoformat()
            }
            for exch in exchanges
        ]
        return {"history": history}
    finally:
        db.close()

