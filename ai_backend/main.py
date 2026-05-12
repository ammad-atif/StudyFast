"""Main entry point for the ChatGPT extraction and embedding pipeline.

Uses the ChatPipeline class to orchestrate the workflow.
"""

import asyncio
from chat_pipeline import ChatPipeline


async def main():
    """Run the complete pipeline."""
    chat_url = "https://chatgpt.com/share/6a008a5c-1948-83e8-9098-28733e94d061"
    
    pipeline = ChatPipeline(index_name="chatgpt-extracts")
    await pipeline.run_full_pipeline(chat_url)


if __name__ == "__main__":
    asyncio.run(main())
