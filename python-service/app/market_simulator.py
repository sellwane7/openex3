"""
Market data simulator.

Generates a simulated price feed for a trading pair using a random walk
with drift, computes rolling moving averages, and simulates a trade
volume figure per tick (loosely correlated with price movement size,
like real markets tend to be).
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


def add_volume(df: pd.DataFrame, base_volume: float = 5.0, seed: int | None = None) -> pd.DataFrame:
    """
    Add a simulated trade volume figure per tick.

    Volume is loosely tied to how big each tick's price move was (bigger
    moves tend to come with more trading activity in real markets), plus
    log-normal random noise so it isn't perfectly smooth or predictable.
    """
    df = df.copy()
    rng = np.random.default_rng(seed)

    price_change = df["price"].diff().abs().fillna(0)
    normalized_change = price_change / df["price"].mean()

    noise = rng.lognormal(mean=0, sigma=0.4, size=len(df))
    volume = base_volume * (1 + normalized_change * 50) * noise

    df["volume"] = volume.round(3)
    return df


def get_market_snapshot(
    start_price: float = 42000.0,
    num_ticks: int = 200,
    seed: int | None = None,
) -> list[dict]:
    """
    Build a full market snapshot: price series, moving averages, and
    simulated volume, returned as a list of plain dicts ready for JSON
    serialization.
    """
    df = generate_price_series(start_price=start_price, num_ticks=num_ticks, seed=seed)
    df = add_moving_averages(df)
    df = add_volume(df, seed=seed)

    records = df.to_dict(orient="records")

    # Convert NaN -> None at the Python level (not the DataFrame level),
    # since Pandas coerces None back to NaN in float columns.
    for record in records:
        for key, value in record.items():
            if isinstance(value, float) and np.isnan(value):
                record[key] = None

    return records