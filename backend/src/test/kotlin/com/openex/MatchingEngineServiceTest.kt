package com.openex

import com.openex.entity.*
import com.openex.repository.AccountRepository
import com.openex.repository.OrderRepository
import com.openex.repository.UserRepository
import com.openex.service.LedgerService
import com.openex.service.MatchingEngineService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import java.math.BigDecimal
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

@SpringBootTest
@ActiveProfiles("test")
class MatchingEngineServiceTest {

    @Autowired lateinit var matchingEngine: MatchingEngineService
    @Autowired lateinit var orderRepository: OrderRepository
    @Autowired lateinit var accountRepository: AccountRepository
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var ledgerService: LedgerService

    private fun newTrader(usdFunding: BigDecimal = BigDecimal.ZERO, btcFunding: BigDecimal = BigDecimal.ZERO): Triple<UUID, Account, Account> {
        val user = userRepository.save(User(email = "t-${UUID.randomUUID()}@openex.test", passwordHash = "x"))
        val usd = accountRepository.save(Account(userId = user.id, currency = "USD"))
        val btc = accountRepository.save(Account(userId = user.id, currency = "BTC"))

        // fund via a throwaway counterparty so the ledger stays balanced
        if (usdFunding > BigDecimal.ZERO) {
            val funder = accountRepository.save(Account(userId = UUID.randomUUID(), currency = "USD"))
            ledgerService.transfer(funder.id, usd.id, usdFunding)
        }
        if (btcFunding > BigDecimal.ZERO) {
            val funder = accountRepository.save(Account(userId = UUID.randomUUID(), currency = "BTC"))
            ledgerService.transfer(funder.id, btc.id, btcFunding)
        }
        return Triple(user.id, usd, btc)
    }

    @Test
    fun `a resting limit sell matches an incoming limit buy at the resting price`() {
        val (sellerId, _, sellerBtc) = newTrader(btcFunding = BigDecimal("1.0"))
        val (buyerId, buyerUsd, _) = newTrader(usdFunding = BigDecimal("100000"))

        val sellOrder = orderRepository.save(
            Order(userId = sellerId, side = OrderSide.SELL, type = OrderType.LIMIT,
                price = BigDecimal("50000.00"), quantity = BigDecimal("0.10"))
        )
        matchingEngine.submit(sellOrder)

        val buyOrder = orderRepository.save(
            Order(userId = buyerId, side = OrderSide.BUY, type = OrderType.LIMIT,
                price = BigDecimal("50000.00"), quantity = BigDecimal("0.10"))
        )
        val trades = matchingEngine.submit(buyOrder)

        assertEquals(1, trades.size)
        assertEquals(0, BigDecimal("0.10").compareTo(trades[0].quantity))
        assertEquals(OrderStatus.FILLED, orderRepository.findById(sellOrder.id).get().status)
        assertEquals(OrderStatus.FILLED, orderRepository.findById(buyOrder.id).get().status)
    }

    @Test
    fun `10 concurrent overlapping orders match correctly and the ledger stays accurate`() {
        // 5 sellers each resting 0.02 BTC at 50000, 5 buyers each market-buying 0.02 BTC
        val sellers = (1..5).map { newTrader(btcFunding = BigDecimal("1.0")) }
        val buyers = (1..5).map { newTrader(usdFunding = BigDecimal("100000")) }

        val sellOrders = sellers.map {
            orderRepository.save(
                Order(userId = it.first, side = OrderSide.SELL, type = OrderType.LIMIT,
                    price = BigDecimal("50000.00"), quantity = BigDecimal("0.02"))
            )
        }
        sellOrders.forEach { matchingEngine.submit(it) }

        val executor = Executors.newFixedThreadPool(5)
        val latch = CountDownLatch(5)
        val allTrades = java.util.Collections.synchronizedList(mutableListOf<com.openex.service.Trade>())

        buyers.forEach { buyer ->
            executor.submit {
                try {
                    val buyOrder = orderRepository.save(
                        Order(userId = buyer.first, side = OrderSide.BUY, type = OrderType.MARKET,
                            quantity = BigDecimal("0.02"))
                    )
                    val trades = matchingEngine.submit(buyOrder)
                    allTrades.addAll(trades)
                } finally {
                    latch.countDown()
                }
            }
        }

        assertTrue(latch.await(10, TimeUnit.SECONDS), "all concurrent orders should complete within 10s")
        executor.shutdown()

        assertEquals(5, allTrades.size, "each of the 5 buy orders should produce exactly one trade")

        // Every seller should now hold 0.02*50000 = 1000 USD and 0.98 BTC (1.0 - 0.02 sold)
        sellers.forEach { (_, usdAcc, btcAcc) ->
            assertEquals(0, BigDecimal("1000.00000000").compareTo(ledgerService.getBalance(usdAcc.id)))
            assertEquals(0, BigDecimal("0.98000000").compareTo(ledgerService.getBalance(btcAcc.id)))
        }

        // Every buyer should now hold 99000 USD and 0.02 BTC
        buyers.forEach { (_, usdAcc, btcAcc) ->
            assertEquals(0, BigDecimal("99000.00000000").compareTo(ledgerService.getBalance(usdAcc.id)))
            assertEquals(0, BigDecimal("0.02000000").compareTo(ledgerService.getBalance(btcAcc.id)))
        }
    }
}
