"""
AI Assistant Service
OpenAI-powered assistant for ANOVA/PCA analysis interpretation
with Redis-based context memory per file
"""
import os
import json
import hashlib
from typing import Optional, List, Dict, Any
from openai import OpenAI
import redis
import logging

logger = logging.getLogger(__name__)

# System prompt for the AI assistant
SYSTEM_PROMPT = """You are Chemostats AI — an expert mentor and assistant for statistical analysis interpretation.

Your expertise:
- One-way ANOVA analysis and interpretation
- Multiple comparison corrections (Bonferroni, Benjamini-Hochberg FDR)
- Principal Component Analysis (PCA)
- Metabolomics and bioinformatics data interpretation
- Statistical significance and p-values
- Box plots and data visualization

Your role:
1. Help users understand their analysis results in plain language
2. Explain what statistical values mean (p-values, FDR, effect sizes)
3. Guide interpretation of significant vs non-significant findings
4. Suggest next steps based on results
5. Answer questions about methodology

Guidelines:
- Be concise but thorough
- Use examples when helpful
- If you see analysis results in context, reference specific variables/values
- Explain complex concepts simply
- Be encouraging and supportive
- Use markdown formatting for clarity (bold, lists, code blocks for numbers)

Language: Respond in the same language the user writes in (English, Russian, or Uzbek).
"""


class AIAssistant:
    """AI Assistant with OpenAI and Redis memory"""
    
    def __init__(self):
        self.client: Optional[OpenAI] = None
        self.redis_client: Optional[redis.Redis] = None
        self._init_openai()
        self._init_redis()
    
    def _init_openai(self):
        """Initialize OpenAI client"""
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            self.client = OpenAI(api_key=api_key)
            logger.info("OpenAI client initialized")
        else:
            logger.warning("OPENAI_API_KEY not set - AI assistant disabled")
    
    def _init_redis(self):
        """Initialize Redis client"""
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        try:
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            self.redis_client.ping()
            logger.info(f"Redis connected: {redis_url}")
        except Exception as e:
            logger.warning(f"Redis not available: {e} - using in-memory fallback")
            self.redis_client = None
            self._memory_fallback: Dict[str, Any] = {}
    
    def _get_file_key(self, file_id: str) -> str:
        """Generate Redis key for file context"""
        return f"chemostats:context:{file_id}"
    
    def _get_chat_key(self, file_id: str) -> str:
        """Generate Redis key for chat history"""
        return f"chemostats:chat:{file_id}"
    
    def store_analysis_context(self, file_id: str, analysis_type: str, results: Dict[str, Any]):
        """Store analysis results in Redis for AI context"""
        context = {
            "type": analysis_type,
            "results": self._summarize_results(analysis_type, results),
            "timestamp": str(results.get("timestamp", ""))
        }
        
        key = self._get_file_key(file_id)
        
        if self.redis_client:
            self.redis_client.setex(key, 86400, json.dumps(context))  # 24h TTL
        else:
            self._memory_fallback[key] = context
        
        logger.info(f"Stored {analysis_type} context for file {file_id}")
    
    def _summarize_results(self, analysis_type: str, results: Dict[str, Any]) -> Dict[str, Any]:
        """Create a concise summary for AI context"""
        if analysis_type == "anova":
            summary = results.get("summary", {})
            top_results = results.get("results", [])[:10]  # Top 10 variables
            
            return {
                "total_variables": summary.get("total_variables", 0),
                "benjamini_significant": summary.get("benjamini_significant", 0),
                "bonferroni_significant": summary.get("bonferroni_significant", 0),
                "num_groups": summary.get("num_groups", 0),
                "top_significant": [
                    {
                        "variable": r.get("variable"),
                        "p_value": r.get("pValue"),
                        "fdr": r.get("fdr"),
                        "significant": r.get("benjamini", False)
                    }
                    for r in top_results
                ]
            }
        elif analysis_type == "pca":
            return {
                "total_variance_explained": results.get("summary", {}).get("total_variance_explained", 0),
                "num_components": len(results.get("explained_variance", [])),
                "explained_variance": results.get("explained_variance", [])[:5]
            }
        return results
    
    def get_analysis_context(self, file_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve analysis context from Redis"""
        key = self._get_file_key(file_id)
        
        if self.redis_client:
            data = self.redis_client.get(key)
            return json.loads(data) if data else None
        else:
            return self._memory_fallback.get(key)
    
    def get_chat_history(self, file_id: str, limit: int = 20) -> List[Dict[str, str]]:
        """Get chat history for a file"""
        key = self._get_chat_key(file_id)
        
        if self.redis_client:
            messages = self.redis_client.lrange(key, -limit, -1)
            return [json.loads(m) for m in messages]
        else:
            history = self._memory_fallback.get(key, [])
            return history[-limit:]
    
    def add_to_chat_history(self, file_id: str, role: str, content: str):
        """Add message to chat history"""
        key = self._get_chat_key(file_id)
        message = json.dumps({"role": role, "content": content})
        
        if self.redis_client:
            self.redis_client.rpush(key, message)
            self.redis_client.ltrim(key, -50, -1)  # Keep last 50 messages
            self.redis_client.expire(key, 86400)  # 24h TTL
        else:
            if key not in self._memory_fallback:
                self._memory_fallback[key] = []
            self._memory_fallback[key].append({"role": role, "content": content})
            self._memory_fallback[key] = self._memory_fallback[key][-50:]
    
    async def chat(
        self,
        file_id: str,
        user_message: str,
        file_name: Optional[str] = None
    ) -> str:
        """Send message to AI and get response"""
        if not self.client:
            return "⚠️ AI Assistant is not configured. Please set OPENAI_API_KEY environment variable."
        
        # Build context
        context = self.get_analysis_context(file_id)
        history = self.get_chat_history(file_id)
        
        # Build messages
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        
        # Add context if available
        if context:
            context_msg = f"""
**Current Analysis Context:**
- File: {file_name or file_id}
- Analysis Type: {context['type'].upper()}
- Results Summary:
```json
{json.dumps(context['results'], indent=2)}
```

Use this context to provide specific, relevant answers about the analysis results.
"""
            messages.append({"role": "system", "content": context_msg})
        
        # Add chat history
        for msg in history[-10:]:  # Last 10 messages for context
            messages.append({"role": msg["role"], "content": msg["content"]})
        
        # Add current message
        messages.append({"role": "user", "content": user_message})
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=1000,
                temperature=0.7
            )
            
            assistant_message = response.choices[0].message.content
            
            # Save to history
            self.add_to_chat_history(file_id, "user", user_message)
            self.add_to_chat_history(file_id, "assistant", assistant_message)
            
            return assistant_message
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return f"⚠️ Error communicating with AI: {str(e)}"
    
    def clear_context(self, file_id: str):
        """Clear context and chat history for a file"""
        context_key = self._get_file_key(file_id)
        chat_key = self._get_chat_key(file_id)
        
        if self.redis_client:
            self.redis_client.delete(context_key, chat_key)
        else:
            self._memory_fallback.pop(context_key, None)
            self._memory_fallback.pop(chat_key, None)


# Singleton instance
ai_assistant = AIAssistant()

