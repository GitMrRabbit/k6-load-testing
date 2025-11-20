// tests/libs/feature-flags.js
// Этот файл содержит класс FeatureFlags для управления фича-флагами в тестах
// Фича-флаги позволяют включать/выключать определенные функции тестирования без изменения кода.
// полезно для постепенного внедрения новых функций и A/B тестирования.

// Класс для управления фича-флагами
export class FeatureFlags {
    // Проверяет, включена ли определенная фича
    // flagName - имя фича-флага (например, 'ENABLE_CHAOS_TESTING')
    // defaultValue - значение по умолчанию, если флаг не найден (по умолчанию false)
    // Возвращает true если флаг включен, false если выключен
    static isEnabled(flagName, defaultValue = false) {
        // Определяем доступные фича-флаги и их значения
        // Значения берутся из переменных окружения k6 (__ENV)
        const flags = {
            'ENABLE_CHAOS_TESTING': __ENV.ENABLE_CHAOS === 'true',        // Включение chaos engineering
            'ENABLE_PERFORMANCE_MONITORING': __ENV.PERF_MONITORING === 'true', // Мониторинг производительности
            'ENABLE_ADVANCED_METRICS': true,                             // Расширенные метрики (всегда включены)
            'ENABLE_RESILIENCE_CHECKS': __ENV.RESILIENCE === 'true'      // Проверки отказоустойчивости
        };

        // Возвращаем значение флага или значение по умолчанию
        return flags[flagName] !== undefined ? flags[flagName] : defaultValue;
    }

    // Получает конфигурацию для chaos testing
    // Возвращает объект с настройками хаоса:
    // - FAILURE_RATE: процент искусственных ошибок (0-1)
    // - LATENCY_MS: искусственная задержка в миллисекундах
    // - RANDOM_ERRORS: включение случайных ошибок
    static getChaosConfig() {
        return {
            FAILURE_RATE: parseFloat(__ENV.CHAOS_FAILURE_RATE) || 0.05,  // 5% ошибок по умолчанию
            LATENCY_MS: parseInt(__ENV.CHAOS_LATENCY) || 500,            // 500мс задержки по умолчанию
            RANDOM_ERRORS: __ENV.CHAOS_ERRORS === 'true'                 // Случайные ошибки
        };
    }
}

// Примеры использования:
// if (FeatureFlags.isEnabled('ENABLE_CHAOS_TESTING')) {
//     // Выполняем chaos testing
// }
//
// const chaosConfig = FeatureFlags.getChaosConfig();
// console.log(`Failure rate: ${chaosConfig.FAILURE_RATE}`);
