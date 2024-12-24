from fastapi import FastAPI, UploadFile, File, Form
from typing import Optional
import os
from dotenv import load_dotenv
import openai
from langchain.chat_models import ChatOpenAI
import uuid
import tempfile

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

import whisper
import subprocess
app = FastAPI()

model = whisper.load_model("base")  # or "small", "medium", "large"

@app.post("/api/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    whisper_model: str = Form("base")
):
    # read file content
    audio_bytes = await file.read()

    # get system temp folder (Windows might be C:\Users\You\AppData\Local\Temp)
    temp_dir = tempfile.gettempdir()
    temp_id = str(uuid.uuid4())
    temp_path = os.path.join(temp_dir, f"{temp_id}.wav")

    with open(temp_path, "wb") as f:
        f.write(audio_bytes)

    # ... load whisper, transcribe, etc. ...
    # Example:
    import whisper
    model = whisper.load_model(whisper_model)
    result = model.transcribe(temp_path)

    # cleanup
    os.remove(temp_path)

    return {"transcript": result["text"]}

@app.post("/api/chat")
async def chat_endpoint(
    model: str = Form("gpt-3.5-turbo"),
    message: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """
    Single endpoint for text + optional image, plus model choice.
    GPT-3.5 / GPT-4 can't really interpret images,
    but we can pass a note about it to the model.
    """
    chat_model = ChatOpenAI(
        temperature=0.7,
        openai_api_key=openai.api_key,
        model_name=model
    )

    note = ""
    if file:
        os.makedirs("images", exist_ok=True)
        file_path = os.path.join("images", file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        note = f"User also uploaded an image: {file.filename}\n"

    user_input = (message or "") + "\n" + note
    if not user_input.strip():
        return {"response": "No message or image provided."}

    response_text = chat_model.predict(user_input)
    return {"response": response_text}

@app.get("/")
def root():
    return {"message": "Backend running!"}
