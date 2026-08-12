"""
AI trading assistant powered by a local Ollama model via LangChain.

Today this exposes a simple persona-driven chat completion. Day 13 will
extend this into a proper LangChain agent that can call tools (like
fetching the user's real wallet balance from the Kotlin backend).
"""

from __future__ import annotations

from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage

FINANCIAL_PERSONA = """\
You are Nova, the AI trading assistant embedded in OpenEx, a simulated \
crypto exchange. You help users understand their orders, their wallet \
balances, and general trading concepts.

Rules you must follow:
- Keep answers short, clear, and beginner-friendly.
- Never give real financial advice or tell someone to buy/sell a real asset.
- Remind users, when relevant, that OpenEx uses simulated funds only.
- If you don't know something about the user's actual account, say so \
honestly instead of guessing.
"""

# Built once and reused across requests, since creating this object
# just configures the connection, it doesn't call the model yet.
_llm = ChatOllama(model="llama3.2", temperature=0.3)


def ask_trading_assistant(user_message: str) -> str:
    """
    Send a user message to the local Ollama model with the financial
    persona system prompt, and return the model's plain text reply.
    """
    messages = [
        SystemMessage(content=FINANCIAL_PERSONA),
        HumanMessage(content=user_message),
    ]

    response = _llm.invoke(messages)
    return response.content