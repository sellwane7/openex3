package com.openex.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

enum class EntryDirection { CREDIT, DEBIT }

@Entity
@Table(name = "ledger_entries")
data class LedgerEntry(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "transaction_id", nullable = false)
    val transactionId: UUID,

    @Column(name = "account_id", nullable = false)
    val accountId: UUID,

    @Column(nullable = false, precision = 18, scale = 8)
    val amount: BigDecimal,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val direction: EntryDirection,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: LocalDateTime = LocalDateTime.now()
)
