package com.openex.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.openex.entity.IdempotencyKey
import com.openex.repository.IdempotencyKeyRepository
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class IdempotencyService(
    private val repository: IdempotencyKeyRepository,
    private val objectMapper: ObjectMapper
) {

    /**
     * Executes [action] exactly once per (idempotencyKey). If this key has
     * been seen before, the previously stored response is replayed verbatim
     * instead of running [action] again.
     *
     * Concurrency note: if two requests with the same brand-new key race each
     * other, the unique primary key on idempotency_keys means only one insert
     * wins; the loser gets a DataIntegrityViolationException, which we treat
     * as "someone else already handled this — go read what they stored".
     */
    @Transactional
    fun <T> execute(
        idempotencyKey: UUID,
        userId: UUID,
        requestPath: String,
        responseType: Class<T>,
        action: () -> ResponseEntity<T>
    ): ResponseEntity<T> {
        val existing = repository.findById(idempotencyKey)
        if (existing.isPresent) {
            val cached = existing.get()
            val body = objectMapper.readValue(cached.responseBody, responseType)
            return ResponseEntity.status(cached.responseStatus).body(body)
        }

        val response = action()

        try {
            repository.save(
                IdempotencyKey(
                    idempotencyKey = idempotencyKey,
                    userId = userId,
                    requestPath = requestPath,
                    responseStatus = response.statusCodeValue,
                    responseBody = objectMapper.writeValueAsString(response.body)
                )
            )
        } catch (ex: DataIntegrityViolationException) {
            // Lost the race to a concurrent identical request — fall through
            // and just return our own freshly-computed response is unsafe here
            // (could differ), so re-read the winner's cached response instead.
            val winner = repository.findById(idempotencyKey).orElseThrow()
            val body = objectMapper.readValue(winner.responseBody, responseType)
            return ResponseEntity.status(winner.responseStatus).body(body)
        }

        return response
    }
}
