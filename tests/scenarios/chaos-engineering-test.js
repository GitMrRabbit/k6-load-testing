// tests/scenarios/chaos-engineering-test.js
// Этот файл содержит chaos engineering тест - тест инженерии хаоса.
// Chaos тесты намеренно вносят сбои в систему для проверки ее устойчивости.
// Они помогают выявить слабые места и улучшить отказоустойчивость системы.

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';
import { FeatureFlags } from '../libs/feature-flags.js';
import { CircuitBreaker } from '../libs/resilience.js';
import { ENV, API_ENDPOINTS } from '../libs/config.js';

// Выводим сообщение о начале теста для логирования
console.log("STARTING TEST: Chaos Engineering Test");

// Метрики для отслеживания хаоса и устойчивости
const chaosInjectedErrors = new Counter('chaos_injected_errors'); // Счетчик искусственно созданных ошибок
const resilienceSuccessRate = new Rate('resilience_success_rate'); // Процент успешных операций несмотря на хаос
const recoveryTime = new Trend('recovery_time_ms'); // Время восстановления после сбоев

// Настройки теста - определяют как будет выполняться тест
export const options = {
    stages: [
        { duration: '1m', target: 10 },  // Разгон до 10 VUs за 1 минуту
        { duration: '3m', target: 10 },  // Держим 10 VUs 3 минуты
        { duration: '2m', target: 30 },  // Резко увеличиваем до 30 VUs
        { duration: '2m', target: 10 },  // Возвращаем к 10 VUs
        { duration: '1m', target: 0 }    // Завершаем тест
    ],

    // Пороги успешности теста
    thresholds: {
        'resilience_success_rate': ['rate>0.8'], // Минимум 80% успешных операций
        'recovery_time_ms': ['p(95)<5000']       // 95% восстановлений < 5 секунд
    }
};

// создает искусственные проблемы
class ChaosMonkey {
    // Вводит искусственную задержку (latency injection)
    static injectLatency() {
        if (Math.random() < 0.1) { // 10% шанс
            const latency = Math.random() * 2000 + 1000; // Задержка 1-3 секунды
            sleep(latency / 1000); // Спим указанное время
            return true; // Возвращаем true если инъекция произошла
        }
        return false; // Инъекция не произошла
    }

    // Вводит искусственную ошибку (error injection)
    static injectError() {
        if (Math.random() < 0.05) { // 5% шанс
            chaosInjectedErrors.add(1); // Записываем метрику
            throw new Error('Chaos Monkey: Injected failure'); // Бросаем исключение
        }
    }

    // Портит данные в payload (data corruption)
    static corruptData(payload) {
        if (Math.random() < 0.03) { // 3% шанс
            if (payload.userId) {
                payload.userId = 'CORRUPTED_' + payload.userId; // Портим userId
            }
            return true; // Возвращаем true если порча произошла
        }
        return false; // Порча не произошла
    }
}

// Основная функция теста - выполняется каждым VUS в цикле во время теста
export default function() {
    const circuitBreaker = new CircuitBreaker(); // Создаем предохранитель
    const startTime = Date.now(); // Запоминаем время начала

    try {
        // Инъекция хаоса - только если включена фича-флагом
        if (FeatureFlags.isEnabled('ENABLE_CHAOS_TESTING')) {
            ChaosMonkey.injectError();  // Пытаемся ввести ошибку
            ChaosMonkey.injectLatency(); // Пытаемся ввести задержку
        }

        // Выполняем операцию через предохранитель
        const result = circuitBreaker.execute(() => {
            // Создаем тестовые данные пользователя
            const userData = {
                name: `Chaos User ${Math.random().toString(36).substring(7)}`, // Случайное имя
                email: `chaos${Date.now()}@example.com` // Уникальный email
            };

            // Портим данные если включен хаос
            if (FeatureFlags.isEnabled('ENABLE_CHAOS_TESTING')) {
                ChaosMonkey.corruptData(userData);
            }

            // Отправляем POST запрос на создание пользователя
            const response = http.post(
                `${ENV.BASE_URL}${API_ENDPOINTS.USERS}`,
                JSON.stringify(userData),
                { headers: { 'Content-Type': 'application/json' } }
            );

            // Если статус >= 400, бросаем исключение
            if (response.status >= 400) {
                throw new Error(`HTTP ${response.status}: ${response.body}`);
            }

            return response; // Возвращаем успешный ответ
        });

        // Логируем статус предохранителя и ответа
        console.log(`Circuit Breaker Status: ${JSON.stringify(circuitBreaker.getStatus())}`);
        console.log(`Response Status: ${result.status}`);

        // Проверяем результат
        const success = check(result, {
            'request succeeded despite chaos': (r) => r && r.status === 201, // Успешное создание
            'data integrity maintained': (r) => { // Целостность данных сохранена
                if (!r || !r.body) {
                    console.log("VALIDATION ERROR: No response body");
                    return false;
                }
                try {
                    const body = JSON.parse(r.body); // Пытаемся распарсить JSON
                    return body && typeof body === 'object'; // Проверяем что это объект
                } catch (e) {
                    const bodyText = r.body ? r.body.substring(0, 100) : 'NO_BODY';
                    console.log(`JSON Parse Error: ${e.message}, Body: ${bodyText}`);
                    return false;
                }
            }
        });

        // Записываем метрику успешности
        if (success) {
            resilienceSuccessRate.add(true); // Успех
        } else {
            resilienceSuccessRate.add(false); // Неудача
        }

    } catch (error) {
        // Логируем перехваченные ошибки
        const errorMessage = error.message || 'Unknown error';
        console.log(`Chaos survived: ${errorMessage}`);
        resilienceSuccessRate.add(false); // Записываем неудачу
    } finally {
        // Всегда измеряем время восстановления
        const endTime = Date.now();
        recoveryTime.add(endTime - startTime);
    }
}
