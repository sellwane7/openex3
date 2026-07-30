package com.openex

import com.openex.entity.Account
import com.openex.entity.EntryDirection
import com.openex.repository.AccountRepository
import com.openex.repository.LedgerEntryRepository
import com.openex.service.LedgerLeg
import com.openex.service.LedgerService
import com.openex.service.UnbalancedTransactionException
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import java.math.BigDecimal
import java.util.UUID

@SpringBootTest
@ActiveProfiles("test")
class LedgerServiceTest {

    @Autowired lateinit var ledgerService: LedgerService
    @Autowired lateinit var accountRepository: AccountRepository
    @Autowired lateinit var ledgerEntryRepository: LedgerEntryRepository

    private fun newAccount(currency: String = "USD"): Account =
        accountRepository.save(Account(userId = UUID.randomUUID(), currency = currency))

    @Test
    fun `a balanced transfer results in ledger entries that sum to exactly zero`() {
        val from = newAccount()
        val to = newAccount()

        ledgerService.transfer(from.id, to.id, BigDecimal("100.00000000"))

        val fromEntries = ledgerEntryRepository.findAllByAccountIdOrderByCreatedAtDesc(from.id)
        val toEntries = ledgerEntryRepository.findAllByAccountIdOrderByCreatedAtDesc(to.id)

        val allAmounts = (fromEntries + toEntries).sumOf {
            if (it.direction == EntryDirection.CREDIT) it.amount else it.amount.negate()
        }

        assertEquals(0, BigDecimal.ZERO.compareTo(allAmounts))
        assertEquals(0, BigDecimal("-100.00000000").compareTo(ledgerService.getBalance(from.id)))
        assertEquals(0, BigDecimal("100.00000000").compareTo(ledgerService.getBalance(to.id)))
    }

    @Test
    fun `an unbalanced transaction throws and writes nothing to the ledger`() {
        val a = newAccount()
        val b = newAccount()
        val txId = UUID.randomUUID()

        assertThrows(UnbalancedTransactionException::class.java) {
            ledgerService.postTransaction(
                txId,
                listOf(
                    LedgerLeg(a.id, BigDecimal("50.00"), EntryDirection.DEBIT),
                    LedgerLeg(b.id, BigDecimal("40.00"), EntryDirection.CREDIT) // deliberately mismatched
                )
            )
        }

        // Because the method is @Transactional, nothing from the failed call should exist.
        assertTrue(ledgerEntryRepository.findAllByTransactionId(txId).isEmpty())
        assertEquals(0, BigDecimal.ZERO.compareTo(ledgerService.getBalance(a.id)))
        assertEquals(0, BigDecimal.ZERO.compareTo(ledgerService.getBalance(b.id)))
    }

    @Test
    fun `a transaction with a zero or negative amount is rejected`() {
        val a = newAccount()
        val b = newAccount()

        assertThrows(IllegalArgumentException::class.java) {
            ledgerService.postTransaction(
                legs = listOf(
                    LedgerLeg(a.id, BigDecimal.ZERO, EntryDirection.DEBIT),
                    LedgerLeg(b.id, BigDecimal.ZERO, EntryDirection.CREDIT)
                )
            )
        }
    }

    @Test
    fun `multiple legs on each side still balance correctly (e.g. fee splitting)`() {
        val buyer = newAccount()
        val seller = newAccount()
        val feeAccount = newAccount()

        // Buyer pays 100, seller receives 99, house takes 1 as a fee.
        ledgerService.postTransaction(
            legs = listOf(
                LedgerLeg(buyer.id, BigDecimal("100.00"), EntryDirection.DEBIT),
                LedgerLeg(seller.id, BigDecimal("99.00"), EntryDirection.CREDIT),
                LedgerLeg(feeAccount.id, BigDecimal("1.00"), EntryDirection.CREDIT)
            )
        )

        assertEquals(0, BigDecimal("-100.00").compareTo(ledgerService.getBalance(buyer.id)))
        assertEquals(0, BigDecimal("99.00").compareTo(ledgerService.getBalance(seller.id)))
        assertEquals(0, BigDecimal("1.00").compareTo(ledgerService.getBalance(feeAccount.id)))
    }
}
