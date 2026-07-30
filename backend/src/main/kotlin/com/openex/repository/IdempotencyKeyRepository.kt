package com.openex.repository

import com.openex.entity.IdempotencyKey
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface IdempotencyKeyRepository : JpaRepository<IdempotencyKey, UUID>
