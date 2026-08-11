from flask import Blueprint, jsonify, request

from app.market_simulator import get_market_snapshot

bp = Blueprint("market", __name__)


@bp.route("/api/health", methods=["GET"])
def health():
    """Simple health check so we can verify the service is up."""
    return jsonify({"status": "ok"}), 200


@bp.route("/api/market/ticks", methods=["GET"])
def market_ticks():
    """
    Return a simulated market snapshot: historical + current ticks
    with moving averages, as a clean JSON array.

    Optional query params:
      - pair: currency pair label (default BTC-USD, cosmetic only for now)
      - ticks: number of ticks to generate (default 200)
      - seed: fix the random seed for reproducible output (optional)
    """
    pair = request.args.get("pair", "BTC-USD")
    num_ticks = request.args.get("ticks", default=200, type=int)
    seed = request.args.get("seed", default=None, type=int)

    data = get_market_snapshot(num_ticks=num_ticks, seed=seed)

    return jsonify({
        "pair": pair,
        "count": len(data),
        "ticks": data,
    }), 200