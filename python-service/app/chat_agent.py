"""
AI trading assistant powered by a local Ollama model via LangChain,
now upgraded to a proper agent that can call tools — starting with
looking up the user's real wallet balance from the Kotlin backend.
"""

from __future__ import annotations

from langchain_ollama import ChatOllama
from langgraph.prebuilt import create_react_agent

from app.wallet_tool import get_wallet_balances

FINANCIAL_PERSONA = """\
You are Nova, the AI trading assistant embedded in OpenEx, a simulated \
crypto exchange. You help users understand their orders, their wallet \
balances, and general trading concepts.

Rules you must follow:
- Keep answers short, clear, and beginner-friendly.
- Never give real financial advice or tell someone to buy/sell a real asset.
- Only mention that OpenEx uses simulated funds if the user seems confused \
about that, asks directly, or is about to place a large/risky-sounding \
order. Do not repeat this reminder on routine balance or portfolio checks.
- When asked about balance, portfolio, or how much money/BTC someone has, \
you MUST use tShe get_wallet_balances tool to check — never guess or make \
up a number.
- If a tool tells you it couldn't fetch the balance, relay that honestly \
instead of inventing one.
"""

# Built once and reused across requests. temperature=0 keeps tool-calling
# decisions consistent — we don't want creative guessing about when to
# call a financial tool.
import os

_ollama_base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
_llm = ChatOllama(model="llama3.2", temperature=0, base_url=_ollama_base_url)

_agent = create_react_agent(
    model=_llm,
    tools=[get_wallet_balances],
    prompt=FINANCIAL_PERSONA,
)


def ask_trading_assistant(user_message: str) -> str:
    """
    Send a user message to the agent. The agent decides on its own
    whether it needs to call a tool (like fetching wallet balances)
    before answering, using ReAct-style reasoning under the hood.
    """
    result = _agent.invoke({
        "messages": [{"role": "user", "content": user_message}]
    })

    # The agent returns the full conversation; the final message is the
    # assistant's answer after any tool calls have been resolved.
    final_message = result["messages"][-1]
    return final_message.content