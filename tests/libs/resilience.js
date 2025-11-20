// tests/libs/resilience.js
// Этот файл содержит классы для обеспечения отказоустойчивости приложений.
// CircuitBreaker - предохранитель, который защищает систему от каскадных сбоев.
// RetryStrategy - стратегия повторных попыток при ошибках.
// FallbackStrategy - стратегия резервного копирования при сбоях.

// для пауз между попытками
import { sleep } from 'k6';

export class CircuitBreaker {
    constructor(failureThreshold = 5, resetTimeout = 60000) {
        this.failureThreshold = failureThreshold; // Количество неудачных попыток до открытия предохранителя
        this.resetTimeout = resetTimeout;         // Время ожидания перед переходом в HALF_OPEN (в миллисекундах)
        this.failureCount = 0;                    // Текущее количество неудачных попыток
        this.lastFailureTime = null;              // Время последней неудачной попытки
        this.state = 'CLOSED';                    // Состояние: CLOSED (закрыт), OPEN (открыт), HALF_OPEN (полуоткрыт)
    }

    // Выполняет операцию через предохранитель
    // operation - функция, которую нужно выполнить
    execute(operation) {
        // Если предохранитель открыт, проверяем, пора ли переходить в полуоткрытое состояние
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.resetTimeout) {
                this.state = 'HALF_OPEN'; // Пробуем снова
            } else {
                // Возвращаем ошибку вместо выполнения операции
                return {
                    status: 503, // Service Unavailable
                    body: JSON.stringify({ error: 'Circuit breaker is OPEN - service temporarily unavailable' }),
                    timings: { duration: 0 }
                };
            }
        }

        try {
            // Выполняем операцию
            const result = operation();

            // Если мы в полуоткрытом состоянии и операция удалась, закрываем предохранитель
            if (this.state === 'HALF_OPEN') {
                this.state = 'CLOSED';
                this.failureCount = 0; // Сбрасываем счетчик неудач
            }

            return result; // Возвращаем результат успешной операции
        } catch (error) {
            // Операция не удалась
            this.failureCount++;           // Увеличиваем счетчик неудач
            this.lastFailureTime = Date.now(); // Запоминаем время неудачи

            // Если неудач слишком много, открываем предохранитель
            if (this.failureCount >= this.failureThreshold) {
                this.state = 'OPEN';
            }

            // Возвращаем объект ошибки вместо выбрасывания исключения
            return {
                status: 500, // Internal Server Error
                body: JSON.stringify({ error: error.message }),
                timings: { duration: 0 }
            };
        }
    }

    // Возвращает текущее состояние предохранителя (для отладки и мониторинга)
    getStatus() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime
        };
    }
}

// RetryStrategy для синхронного k6
export class RetryStrategy {
    static withExponentialBackoff(operation, maxRetries = 3, baseDelay = 1000) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return operation(); // Синхронный вызов
            } catch (error) {
                if (attempt === maxRetries) {
                    // ВОЗВРАЩАЕМ объект ошибки вместо throw
                    return {
                        status: 500,
                        body: JSON.stringify({ error: `Max retries exceeded: ${error.message}` }),
                        timings: { duration: 0 }
                    };
                }

                const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
                console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);

                // k6 sleep вместо Promise
                sleep(delay / 1000);
            }
        }
    }
}

export class FallbackStrategy {
    static withFallback(primaryOperation, fallbackOperation, fallbackCondition = (response) => response.status >= 500) {
        try {
            const result = primaryOperation();
            if (fallbackCondition(result)) {
                console.log("Primary operation failed, using fallback");
                return fallbackOperation();
            }
            return result;
        } catch (error) {
            console.log(`Primary operation error: ${error.message}, using fallback`);
            return fallbackOperation();
        }
    }

    // Пример использования FallbackStrategy:
    // const result = FallbackStrategy.withFallback(
    //     () => makeGetRequest('https://api.example.com/data'),
    //     () => makeGetRequest('https://backup-api.example.com/data')
    // );

    // Метод для создания цепочки fallback'ов
    static withChain(primaryOperation, ...fallbacks) {
        let result;
        try {
            result = primaryOperation();
            if (result.status < 500) {
                return result; // Успех
            }
        } catch (error) {
            console.log(`Primary operation error: ${error.message}`);
        }

        // Пробуем fallback'ы по порядку
        for (let i = 0; i < fallbacks.length; i++) {
            try {
                console.log(`Trying fallback ${i + 1}`);
                result = fallbacks[i]();
                if (result.status < 500) {
                    return result; // Успех в fallback
                }
            } catch (error) {
                console.log(`Fallback ${i + 1} error: ${error.message}`);
                continue; // Пробуем следующий fallback
            }
        }

        // Все операции провалились
        return {
            status: 503,
            body: JSON.stringify({ error: 'All operations failed, including fallbacks' }),
            timings: { duration: 0 }
        };
    }
}
