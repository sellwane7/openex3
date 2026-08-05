package com.openex.dto

import java.math.BigDecimal

/**
 * One aggregated price level in the order book: total quantity resting
 * at that price, across however many individual orders make it up.
 */
data class OrderBookLevel(
    val price: BigDecimal,
    val quantity: BigDecimal
)

/**
 * Full snapshot broadcast to /topic/orderbook whenever the book changes.
 * bids are sorted highest-first, asks lowest-first — exactly the order
 * the React order book component (Day 10) will want to render them in.
 */
data class OrderBookSnapshot(
    val currencyPair: String,
    val bids: List<OrderBookLevel>,
    val asks: List<OrderBookLevel>
)
