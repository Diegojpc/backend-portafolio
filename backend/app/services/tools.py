# services/tools.py — Agentic External Executable Tools

from bs4 import BeautifulSoup
import httpx
from loguru import logger

def fetch_url(url: str) -> str:
    """
    Fetches the content of a URL and scrapes the text.
    The Gemini model can autonomously call this tool if a user asks about a link.
    """
    try:
        logger.info(f"[Tools] Fetching and parsing URL: {url}")
        
        # We spoof a user-agent to prevent basic bot-blocking
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
        }
        
        with httpx.Client(timeout=15.0, follow_redirects=True, headers=headers) as client:
            response = client.get(url)
            response.raise_for_status()
            
            # Parse HTML
            soup = BeautifulSoup(response.text, "html.parser")
            
            # Remove invisible structural elements
            for element in soup(["script", "style", "nav", "footer", "header"]):
                element.decompose()
                
            text = soup.get_text(separator="\n", strip=True)
            
            # Hard limit context to prevent blowing out Gemini Token buffer (20000 chars default limits)
            if len(text) > 20000:
                logger.warning(f"[Tools] URL text heavily truncated ({len(text)} chars down to 20000 limit).")
                return text[:20000] + "\n...(content truncated for length)..."
                
            return text
            
    except httpx.HTTPError as he:
         logger.error(f"[Tools] HTTP Error fetching {url}: {he}")
         return f"Error fetching URL (HTTP Issue): {str(he)}"
    except Exception as e:
        logger.error(f"[Tools] General Tool Failure on {url}: {e}")
        return f"Tool Execution Error: {str(e)}"
