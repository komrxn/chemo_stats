"""
FastAPI Backend for ANOVA & PCA Analysis
Author: Senior Engineer
"""
import logging
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root (kkh-analysis/.env)
PROJECT_ROOT_ENV = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(PROJECT_ROOT_ENV)
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Body, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from services.anova import AnovaAnalyzer
from services.pca import PCAAnalyzer
from services.export import generate_anova_excel
from services.ai_assistant import ai_assistant
from routers import auth, admin
from database import init_db
from utils.file_parser import parse_uploaded_file, preview_file
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('analysis.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("🚀 Starting ANOVA/PCA Analysis Backend")
    init_db()  # Initialize Database Tables
    yield
    logger.info("🛑 Shutting down Analysis Backend")


app = FastAPI(
    title="ANOVA & PCA Analysis API",
    version="1.0.0",
    lifespan=lifespan
)

# Include Routers
app.include_router(auth.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

# CORS - Configure based on environment
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8080")
allowed_origins = [
    "http://localhost:8080",
    "http://localhost:3000",
    "http://127.0.0.1:8080",
]

# Add production frontend URL if set
if FRONTEND_URL not in allowed_origins:
    allowed_origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint"""
    return {"status": "healthy", "service": "analysis-backend"}


@app.post("/api/preview")
async def preview_uploaded_file(
    file: UploadFile = File(...)
) -> dict[str, Any]:
    """
    Preview file structure WITHOUT running analysis
    Detects DATA trigger and returns metadata columns
    
    Args:
        file: CSV/Excel file
    
    Returns:
        File structure information
    """
    try:
        logger.info(f"📋 Preview File: {file.filename}")
        
        preview_data = await preview_file(file)
        
        logger.info(f"✅ Preview Complete - Trigger: {preview_data['trigger_found']}, "
                   f"Metadata: {len(preview_data['metadata_columns'])}, "
                   f"Variables: {preview_data['num_variables']}")
        
        return preview_data
        
    except Exception as e:
        logger.error(f"❌ Preview Failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")


@app.post("/api/analyze/anova")
async def analyze_anova(
    file: UploadFile = File(...),
    class_column: str = Form(...),  # REQUIRED!
    fdr_threshold: float = Form(0.05),
    design_label: str = Form("Treatment"),
    plot_option: int = Form(3),
) -> dict[str, Any]:
    """
    Perform One-Way ANOVA analysis
    
    Args:
        file: CSV/Excel file (samples × variables)
        class_column: Name of column to use as classes (REQUIRED!)
        fdr_threshold: FDR threshold (default: 0.05)
        design_label: Design label name
        plot_option: Plotting option (0-4)
    
    Returns:
        ANOVA results with p-values, FDR, Bonferroni, and boxplot data
    """
    try:
        logger.info(f"📊 ANOVA Analysis Started - File: {file.filename}, Class: {class_column}")
        
        # Parse file with specified class column
        data, classes, var_names = await parse_uploaded_file(file, class_column)
        logger.info(f"✅ Data parsed: {data.shape[0]} samples × {data.shape[1]} variables")
        
        # Run ANOVA
        analyzer = AnovaAnalyzer(fdr_threshold=fdr_threshold)
        results = analyzer.analyze(data, classes, design_label, plot_option, var_names)
        
        # Add original data for export
        results['original_data'] = data.tolist()
        results['classes'] = classes.tolist()
        results['variable_names'] = var_names
        
        logger.info(f"✅ ANOVA Complete - {results['summary']['benjamini_significant']} Benjamini significant, "
                    f"{results['summary']['bonferroni_significant']} Bonferroni significant")
        return results
        
    except Exception as e:
        logger.error(f"❌ ANOVA Failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/analyze/pca")
async def analyze_pca(
    file: UploadFile = File(...),
    num_pcs: int = Form(3),
    scaling_method: str = Form("auto"),
    design_label: str = Form("Treatment"),
) -> dict[str, Any]:
    """
    Perform PCA analysis
    
    Args:
        file: CSV/Excel file (samples × variables)
        num_pcs: Number of principal components
        scaling_method: Scaling method (auto/mean/pareto)
        design_label: Design label name
    
    Returns:
        PCA results with scores, loadings, and explained variance
    """
    try:
        logger.info(f"🔬 PCA Analysis Started - File: {file.filename}")
        
        # Parse file
        data, classes, var_names = await parse_uploaded_file(file)
        logger.info(f"✅ Data parsed: {data.shape[0]} samples × {data.shape[1]} variables")
        
        # Run PCA
        analyzer = PCAAnalyzer(n_components=num_pcs, scaling=scaling_method)
        results = analyzer.analyze(data, classes, design_label, var_names)
        
        logger.info(f"✅ PCA Complete - {num_pcs} components computed")
        return results
        
    except Exception as e:
        logger.error(f"❌ PCA Failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/export/anova")
async def export_anova(
    export_data: dict = Body(...)
) -> StreamingResponse:
    """
    Export ANOVA results to Excel file (5 sheets)
    
    Args:
        export_data: Dictionary containing all results data
    
    Returns:
        Excel file download
    """
    try:
        logger.info("📥 Excel Export Started")
        
        # Validate required fields
        required_fields = ['results', 'multicomparison', 'global_stats', 'group_stats', 
                          'original_data', 'classes', 'variable_names']
        
        missing = [f for f in required_fields if f not in export_data]
        if missing:
            raise ValueError(f"Missing required fields: {missing}")
        
        # Convert lists to numpy arrays
        import numpy as np
        data = np.array(export_data['original_data'])
        classes = np.array(export_data['classes'])
        
        # Generate Excel file
        excel_file = generate_anova_excel(
            results=export_data['results'],
            multicomp=export_data['multicomparison'],
            global_stats=export_data['global_stats'],
            group_stats=export_data['group_stats'],
            data=data,
            classes=classes,
            var_names=export_data['variable_names']
        )
        
        logger.info("✅ Excel Export Complete")
        
        return StreamingResponse(
            excel_file,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": "attachment; filename=ANOVA_results.xlsx"
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Excel Export Failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════
# AI Assistant Endpoints
# ═══════════════════════════════════════════════════════════════════════════

class ChatRequest(BaseModel):
    file_id: str = Field(
        min_length=1,
        max_length=100,
        description="Unique file identifier"
    )
    message: str = Field(
        min_length=1,
        max_length=5000,
        description="User message to AI assistant"
    )
    file_name: str | None = Field(
        default=None,
        max_length=255,
        description="Optional filename for context"
    )
    
    model_config = {"validate_assignment": True}
    
    @property
    def is_message_empty(self) -> bool:
        """Check if message is empty or only whitespace"""
        return not self.message or self.message.strip() == ""


class ChatResponse(BaseModel):
    response: str
    file_id: str


@app.post("/api/chat")
async def chat_with_assistant(request: ChatRequest) -> ChatResponse:
    """
    Chat with AI Assistant
    
    Args:
        request: Chat request with file_id and message
    
    Returns:
        AI response
    """
    try:
        # Validate message is not just whitespace
        if request.is_message_empty:
            raise HTTPException(
                status_code=400,
                detail="Message cannot be empty or only whitespace"
            )
        
        logger.info(f"💬 Chat request for file: {request.file_id}")
        
        response = await ai_assistant.chat(
            file_id=request.file_id,
            user_message=request.message,
            file_name=request.file_name
        )
        
        return ChatResponse(response=response, file_id=request.file_id)
        
    except Exception as e:
        logger.error(f"❌ Chat failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@app.post("/api/chat/context")
async def store_analysis_context(
    file_id: str = Form(...),
    analysis_type: str = Form(...),
    results: str = Form(...)  # JSON string
) -> dict[str, str]:
    """
    Store analysis results as AI context
    
    Args:
        file_id: Unique file identifier
        analysis_type: 'anova' or 'pca'
        results: JSON string of results
    
    Returns:
        Confirmation
    """
    try:
        import json as json_module
        results_dict = json_module.loads(results)
        
        ai_assistant.store_analysis_context(file_id, analysis_type, results_dict)
        
        return {"status": "ok", "message": f"Context stored for {file_id}"}
        
    except Exception as e:
        logger.error(f"❌ Store context failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/history/{file_id}")
async def get_chat_history(file_id: str) -> dict[str, Any]:
    """Get chat history for a file"""
    history = ai_assistant.get_chat_history(file_id)
    context = ai_assistant.get_analysis_context(file_id)
    
    return {
        "history": history,
        "has_context": context is not None,
        "context_type": context.get("type") if context else None
    }


@app.delete("/api/chat/context/{file_id}")
async def clear_file_context(file_id: str) -> dict[str, str]:
    """Clear context and chat history for a file"""
    ai_assistant.clear_context(file_id)
    return {"status": "ok", "message": f"Context cleared for {file_id}"}


@app.post("/api/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...)
) -> dict[str, str]:
    """
    Transcribe audio using OpenAI Whisper
    
    Args:
        audio: Audio file (webm, mp3, wav, etc.)
    
    Returns:
        Transcribed text
    """
    try:
        if not ai_assistant.client:
            raise HTTPException(status_code=503, detail="OpenAI not configured")
        
        logger.info(f"🎤 Transcribing audio: {audio.filename}")
        
        # Read audio file
        audio_bytes = await audio.read()
        
        # Create a file-like object for OpenAI
        from io import BytesIO
        audio_file = BytesIO(audio_bytes)
        audio_file.name = audio.filename or "audio.webm"
        
        # Transcribe with Whisper
        transcript = ai_assistant.client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )
        
        logger.info(f"✅ Transcription complete: {len(transcript.text)} chars")
        
        return {"text": transcript.text}
        
    except Exception as e:
        logger.error(f"❌ Transcription failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")

