"""
Market data simulator.

Generates a simulated price feed for a trading pair using a random walk
with drift, and computes rolling moving averages over that series.
"""

from __future__ import annotations

import time
import numpy as np
import pandas as pd


def generate_price_series(
    start_price: float = 42000.0,
    num_ticks: int = 200,
    drift: float = 0.0002,
    volatility: float = 0.004,
    seed: int | None = None,
) -> pd.DataFrame:
    """
    Generate a simulated price series using a random walk with drift.

    Each tick's return is drawn from a normal distribution with mean
    `drift` and standard deviation `volatility`. Prices compound over
    time, similar to how real asset prices move.

    Returns a DataFrame with columns: timestamp, tick, price
    """
    rng = np.random.default_rng(seed)

    returns = rng.normal(loc=drift, scale=volatility, size=num_ticks)
    price_path = start_price * np.cumprod(1 + returns)

    now = int(time.time())
    timestamps = [now - (num_ticks - i) for i in range(num_ticks)]

    df = pd.DataFrame({
        "tick": range(num_ticks),
        "timestamp": timestamps,
        "price": price_path,
    })

    return df


def add_moving_averages(df: pd.DataFrame, short_window: int = 5, long_window: int = 20) -> pd.DataFrame:
    """
    Add short and long simple moving averages to a price DataFrame.
    """
    df = df.copy()
    df["sma_short"] = df["price"].rolling(window=short_window).mean()
    df["sma_long"] = df["price"].rolling(window=long_window).mean()
    return df


def get_market_snapshot(
    start_price: float = 42000.0,
    num_ticks: int = 200,
    seed: int | None = None,
) -> list[dict]:
    """
    Build a full market snapshot: price series + moving averages,
    returned as a list of plain dicts ready for JSON serialization.
    """
    df = generate_price_series(start_price=start_price, num_ticks=num_ticks, seed=seed)
    df = add_moving_averages(df)

    records = df.to_dict(orient="records")

    # Convert NaN -> None at the Python level (not the DataFrame level),
    # since Pandas coerces None back to NaN in float columns.
    for record in records:
        for key, value in record.items():
            if isinstance(value, float) and np.isnan(value):
                record[key] = None

    return records