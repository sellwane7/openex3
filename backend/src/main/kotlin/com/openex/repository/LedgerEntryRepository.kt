package com.openex.repository

import com.openex.entity.LedgerEntry
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.math.BigDecimal
import java.util.UUID

interface LedgerEntryRepository : JpaRepository<LedgerEntry, UUID> {

    fun findAllByTransactionId(transactionId: UUID): List<LedgerEntry>

    fun findAllByAccountIdOrderByCreatedAtDesc(accountId: UUID): List<LedgerEntry>

    // The balance is NEVER stored — it's always computed fresh from the ledger.
    // COALESCE handles the case of a brand-new account with zero entries.
    @Query(
        """
        SELECT COALESCE(SUM(
            CASE WHEN le.direction = 'CREDIT' THEN le.amount ELSE -le.amount END
        ), 0)
        FROM LedgerEntry le
        WHERE le.accountId = :accountId
        """
    )
    fun balanceOf(@Param("accountId") accountId: UUID): BigDecimal
}
