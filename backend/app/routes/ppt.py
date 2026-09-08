from fastapi import APIRouter

router = APIRouter()


@router.get("/test")
async def ppt_test():
    """
    Temporary connectivity test endpoint.
    PPT processing with Gemini will be added in a future phase.
    """
    return {
        "message": "PPT analyzer backend is ready"
    }
