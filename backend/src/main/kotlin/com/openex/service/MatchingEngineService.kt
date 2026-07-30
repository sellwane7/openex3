package com.openex.service

import com.openex.entity.*
import com.openex.repository.AccountRepository
import com.openex.repository.OrderRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.util.PriorityQueue
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.locks.ReentrantLock

data class Trade(
    val buyOrderId: java.util.UUID,
    val sellOrderId: java.util.UUID,
    val price: BigDecimal,
    val quantity: BigDecimal
)

/**
 * In-memory limit order book with price-time priority:
 *   - Bids (buys) are sorted highest price first, then earliest first.
 *   - Asks (sells) are sorted lowest price first, then earliest first.
 * A match happens whenever the best bid >= best ask. Market orders match
 * against the best available price(s) immediately and are never resting.
 *
 * One book per currency pair; each book has its own lock so pairs don't
 * block each other under concurrent order flow.
 */
@Service
class MatchingEngineService(
    private val orderRepository: OrderRepository,
    private val accountRepository: AccountRepository,
    private val ledgerService: LedgerService
) {
    // sequence gives us the "time" component of price-time priority
    private var sequence: Long = 0
    private fun nextSeq(): Long = ++sequence

    private data class BookOrder(val order: Order, val seq: Long)

    private val bidBooks = ConcurrentHashMap<String, PriorityQueue<BookOrder>>()
    private val askBooks = ConcurrentHashMap<String, PriorityQueue<BookOrder>>()
    private val bookLocks = ConcurrentHashMap<String, ReentrantLock>()

    private fun lockFor(pair: String) = bookLocks.computeIfAbsent(pair) { ReentrantLock() }

    private fun bidBook(pair: String) = bidBooks.computeIfAbsent(pair) {
        PriorityQueue(compareByDescending<BookOrder> { it.order.price }.thenBy { it.seq })
    }

    private fun askBook(pair: String) = askBooks.computeIfAbsent(pair) {
        PriorityQueue(compareBy<BookOrder> { it.order.price }.thenBy { it.seq })
    }

    /**
     * Submits an order to the engine. Matches it against the resting book as
     * far as possible; any unfilled LIMIT remainder rests on the book, any
     * unfilled MARKET remainder is simply left unfilled (no liquidity left).
     */
    @Transactional
    fun submit(order: Order): List<Trade> {
        val lock = lockFor(order.currencyPair)
        lock.lock()
        try {
            val trades = mutableListOf<Trade>()
            val opposingBook = if (order.side == OrderSide.BUY) askBook(order.currencyPair) else bidBook(order.currencyPair)
            val incoming = BookOrder(order, nextSeq())
            var remaining = order.quantity - order.filledQuantity

            while (remaining > BigDecimal.ZERO && opposingBook.isNotEmpty()) {
                val best = opposingBook.peek()

                val crosses = when (order.side) {
                    OrderSide.BUY -> order.type == OrderType.MARKET || order.price!! >= best.order.price
                    OrderSide.SELL -> order.type == OrderType.MARKET || order.price!! <= best.order.price
                }
                if (!crosses) break

                val bestRemaining = best.order.quantity - best.order.filledQuantity
                val fillQty = remaining.min(bestRemaining)
                val fillPrice = best.order.price!! // resting order's price always wins (price-time priority)

                settleTrade(order, best.order, fillQty, fillPrice)

                val trade = if (order.side == OrderSide.BUY)
                    Trade(order.id, best.order.id, fillPrice, fillQty)
                else
                    Trade(best.order.id, order.id, fillPrice, fillQty)
                trades.add(trade)

                order.filledQuantity += fillQty
                best.order.filledQuantity += fillQty
                remaining -= fillQty

                order.status = statusFor(order)
                best.order.status = statusFor(best.order)

                orderRepository.save(order)
                orderRepository.save(best.order)

                if (best.order.filledQuantity >= best.order.quantity) {
                    opposingBook.poll()
                }
            }

            // Rest any unfilled LIMIT remainder on the book. MARKET orders never rest.
            if (remaining > BigDecimal.ZERO && order.type == OrderType.LIMIT) {
                order.status = statusFor(order)
                orderRepository.save(order)
                val ownBook = if (order.side == OrderSide.BUY) bidBook(order.currencyPair) else askBook(order.currencyPair)
                ownBook.add(incoming)
            } else if (remaining > BigDecimal.ZERO) {
                order.status = statusFor(order) // MARKET order, partially or unfilled due to lack of liquidity
                orderRepository.save(order)
            }

            return trades
        } finally {
            lock.unlock()
        }
    }

    private fun statusFor(order: Order): OrderStatus = when {
        order.filledQuantity >= order.quantity -> OrderStatus.FILLED
        order.filledQuantity > BigDecimal.ZERO -> OrderStatus.PARTIALLY_FILLED
        else -> OrderStatus.OPEN
    }

    /**
     * Moves funds for one fill via the double-entry LedgerService. For a
     * BTC-USD trade: buyer pays quantity*price USD and receives quantity BTC;
     * seller receives quantity*price USD and gives up quantity BTC.
     */
    private fun settleTrade(incoming: Order, resting: Order, quantity: BigDecimal, price: BigDecimal) {
        val (buyOrder, sellOrder) = if (incoming.side == OrderSide.BUY) incoming to resting else resting to incoming
        val (baseCurrency, quoteCurrency) = incoming.currencyPair.split("-").let { it[0] to it[1] }

        val buyerQuote = accountRepository.findByUserIdAndCurrency(buyOrder.userId, quoteCurrency)!!
        val buyerBase = accountRepository.findByUserIdAndCurrency(buyOrder.userId, baseCurrency)!!
        val sellerQuote = accountRepository.findByUserIdAndCurrency(sellOrder.userId, quoteCurrency)!!
        val sellerBase = accountRepository.findByUserIdAndCurrency(sellOrder.userId, baseCurrency)!!

        val quoteAmount = quantity * price

        // Leg 1: buyer's quote currency (USD) -> seller's quote currency (USD)
        ledgerService.transfer(buyerQuote.id, sellerQuote.id, quoteAmount)
        // Leg 2: seller's base currency (BTC) -> buyer's base currency (BTC)
        ledgerService.transfer(sellerBase.id, buyerBase.id, quantity)
    }
}
