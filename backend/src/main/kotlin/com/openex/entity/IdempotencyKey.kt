package com.openex.entity

import jakarta.persistence.*
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "idempotency_keys")
data class IdempotencyKey(
    @Id
    @Column(name = "idempotency_key")
    val idempotencyKey: UUID,

    @Column(name = "user_id", nullable = false)
    val userId: UUID,

    @Column(name = "request_path", nullable = false)
    val requestPath: String,

    @Column(name = "response_status", nullable = false)
    val responseStatus: Int,

    @Column(name = "response_body", nullable = false, columnDefinition = "TEXT")
    val responseBody: String,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: LocalDateTime = LocalDateTime.now()
)
