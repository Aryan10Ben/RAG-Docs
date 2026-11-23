from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.services.llm import generate_answer

router = APIRouter(prefix="/chat", tags=["Chat"])


class Question(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


@router.post("/ask")
def ask_question(
    q: Question,
    session_id: str = Header(..., alias="X-Session-Id", min_length=16, max_length=128),
):
    if not q.question.strip():
        raise HTTPException(status_code=422, detail="Please enter a question.")
    try:
        return generate_answer(session_id, q.question.strip())
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="The answer service is temporarily unavailable.") from exc
