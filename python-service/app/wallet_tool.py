"""
Tool that lets the AI trading assistant look up the current user's real
simulated wallet balances by calling the Kotlin backend's
GET /api/wallets endpoint.
"""

from __future__ import annotations

import requests
from langchain_core.tools import tool

import os

KOTLIN_API_BASE = os.environ.get("KOTLIN_API_BASE_URL", "http://127.0.0.1:8080")


def _get_current_token() -> str | None:
    """Reads the JWT stashed on the Flask request context for this request."""
    from flask import g
    return getattr(g, "jwt_token", None)


@tool
def get_wallet_balances() -> str:
    """
    Fetch the current user's real wallet balances (USD and BTC) from the
    OpenEx exchange backend. Use this whenever the user asks about their
    balance, how much money or BTC they have, or their portfolio.
    """
    token = _get_current_token()
    if not token:
        return (
            "I couldn't verify your identity, so I can't look up your "
            "wallet balance right now. Please make sure you're logged in."
        )

    try:
        response = requests.get(
            f"{KOTLIN_API_BASE}/api/wallets",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
    except requests.RequestException as exc:
        return f"I couldn't reach the wallet service right now ({exc})."

    if response.status_code != 200:
        return f"The wallet service returned an error (status {response.status_code})."

    balances = response.json()
    if not balances:
        return "You don't have any wallet accounts yet."

    lines = [f"{b['currency']}: {b['balance']}" for b in balances]
    return "Current wallet balances:\n" + "\n".join(lines)