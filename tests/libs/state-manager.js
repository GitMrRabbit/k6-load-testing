// tests/libs/state-manager.js
// файл содержит класс StateManager для управления общим состоянием между виртуальными пользователями (VUs) в k6.
// Позволяет хранить данные в памяти, кэшировать запросы и реализовывать распределенные блокировки.

// sleep для пауз
import { sleep } from 'k6';

export class StateManager {
    constructor() {
        this.sharedState = new Map(); // Хранилище общих данных (ключ-значение)
        this.requestCache = new Map(); // Кэш для запросов
        this.cacheTTL = 30000; // Время жизни кэша по умолчанию (30 секунд)
    }

    // Сохраняет значение в общем состоянии с указанным временем жизни
    // key - ключ для хранения
    // value - значение для хранения
    // ttl - время жизни в миллисекундах (по умолчанию 30 секунд)
    set(key, value, ttl = this.cacheTTL) {
        this.sharedState.set(key, {
            value: value,                    // Само значение
            expiry: Date.now() + ttl        // Время истечения срока действия
        });
    }

    // Получает значение из общего состояния по ключу
    // key - ключ для поиска
    // Возвращает значение или null, если ключ не найден или истек срок действия
    get(key) {
        const item = this.sharedState.get(key);
        if (!item) return null; // Ключ не найден

        // Проверяем, не истек ли срок действия
        if (Date.now() > item.expiry) {
            this.sharedState.delete(key); // Удаляем просроченный элемент
            return null;
        }

        return item.value; // Возвращаем актуальное значение
    }

    // Распределенный механизм блокировки для виртуальных пользователей
    // lockKey - уникальный ключ блокировки
    // timeout - максимальное время ожидания блокировки (в миллисекундах)
    async acquireLock(lockKey, timeout = 5000) {
        const startTime = Date.now();

        // Пытаемся захватить блокировку в течение timeout
        while (Date.now() - startTime < timeout) {
            // Проверяем, свободна ли блокировка
            if (!this.get(`lock_${lockKey}`)) {
                // Захватываем блокировку на 10 секунд
                this.set(`lock_${lockKey}`, true, 10000);
                return true; // Блокировка успешно захвачена
            }

            // Ждем немного перед следующей попыткой
            await sleep(100);
        }

        return false; // Не удалось захватить блокировку в течение timeout
    }

    // Освобождает блокировку
    // lockKey - ключ блокировки для освобождения
    releaseLock(lockKey) {
        this.sharedState.delete(`lock_${lockKey}`);
    }

    // Очищает все просроченные элементы из кэша
    // Вызывайте периодически для поддержания производительности
    cleanupExpired() {
        const now = Date.now();
        let cleanedCount = 0;
        for (const [key, item] of this.sharedState.entries()) {
            if (now > item.expiry) {
                this.sharedState.delete(key);
                cleanedCount++;
            }
        }
        // Используем globalState для хранения статистики очистки
        globalState.set('cleanup_stats', {
            lastCleanup: now,
            itemsCleaned: cleanedCount,
            totalItemsAfterCleanup: this.sharedState.size
        }, 60000); // Храним статистику 1 минуту
    }

    // Возвращает статистику использования (для отладки)
    getStats() {
        const cleanupStats = globalState.get('cleanup_stats');
        return {
            totalItems: this.sharedState.size,
            cacheItems: this.requestCache.size,
            cacheTTL: this.cacheTTL,
            lastCleanupStats: cleanupStats || null
        };
    }
}

export const globalState = new StateManager();

// Пример использования globalState:
// globalState.set('user_count', 100); // Сохранить данные
// const count = globalState.get('user_count'); // Получить данные
// globalState.cleanupExpired(); // Очистить устаревшие данные
