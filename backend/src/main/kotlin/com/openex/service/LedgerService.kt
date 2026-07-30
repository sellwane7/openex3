package com.openex.service

import com.openex.entity.EntryDirection
import com.openex.entity.LedgerEntry
import com.openex.repository.LedgerEntryRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.util.UUID

/**
 * A single leg of a transaction: move `amount` of `direction` in/out of `accountId`.
 */
data class LedgerLeg(
    val accountId: UUID,
    val amount: BigDecimal,
    val direction: EntryDirection
)

class UnbalancedTransactionException(message: String) : RuntimeException(message)

@Service
class LedgerService(
    private val ledgerEntryRepository: LedgerEntryRepository
) {

    /**
     * Posts a group of ledger legs as a single atomic transaction.
     *
     * Rule: sum(CREDIT legs) must exactly equal sum(DEBIT legs).
     * If they don't match, we throw BEFORE writing anything, and thanks to
     * @Transactional, if any exception escapes this method, every insert
     * made so far in this call is rolled back — no half-written transaction
     * can ever exist in the ledger.
     *
     * Example: crediting a buyer 0.5 BTC and debiting a seller 0.5 BTC
     * for the same trade would be two legs, transactionId shared, sums equal.
     */
    @Transactional
    fun postTransaction(transactionId: UUID = UUID.randomUUID(), legs: List<LedgerLeg>): List<LedgerEntry> {
        require(legs.isNotEmpty()) { "A transaction must have at least one leg" }

        val totalCredits = legs.filter { it.direction == EntryDirection.CREDIT }
            .fold(BigDecimal.ZERO) { acc, leg -> acc + leg.amount }
        val totalDebits = legs.filter { it.direction == EntryDirection.DEBIT }
            .fold(BigDecimal.ZERO) { acc, leg -> acc + leg.amount }

        if (totalCredits.compareTo(totalDebits) != 0) {
            throw UnbalancedTransactionException(
                "Transaction $transactionId does not balance: credits=$totalCredits debits=$totalDebits"
            )
        }

        legs.forEach { leg ->
            require(leg.amount > BigDecimal.ZERO) { "Ledger amounts must be positive; got ${leg.amount}" }
        }

        val entries = legs.map { leg ->
            LedgerEntry(
                transactionId = transactionId,
                accountId = leg.accountId,
                amount = leg.amount,
                direction = leg.direction
            )
        }

        return ledgerEntryRepository.saveAll(entries)
    }

    /** Convenience for the common "move money from A to B" case (e.g. a deposit or a trade). */
    @Transactional
    fun transfer(fromAccountId: UUID, toAccountId: UUID, amount: BigDecimal, transactionId: UUID = UUID.randomUUID()): List<LedgerEntry> {
        return postTransaction(
            transactionId,
            listOf(
                LedgerLeg(fromAccountId, amount, EntryDirection.DEBIT),
                LedgerLeg(toAccountId, amount, EntryDirection.CREDIT)
            )
        )
    }

    fun getBalance(accountId: UUID): BigDecimal = ledgerEntryRepository.balanceOf(accountId)
}
