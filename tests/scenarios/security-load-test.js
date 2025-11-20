// tests/scenarios/security-load-test.js
//  тест безопасности под нагрузкой.
//  уязвимости системы (SQL injection, XSS) во время нагрузки.

import { check } from 'k6';
import http from 'k6/http';
import { Counter, Rate } from 'k6/metrics';
import { ENV, API_ENDPOINTS } from '../libs/config.js';

// Выводим сообщение о начале теста для логирования
console.log("STARTING TEST: Security Load Test");

// Метрики для отслеживания security уязвимостей
const securityViolations = new Counter('security_violations'); // Счетчик найденных уязвимостей
const attackSuccessRate = new Rate('attack_success_rate');    // Процент успешных атак

// Настройки теста - определяют как будет выполняться тест
export const options = {
    vus: 5,              // 5 виртуальных пользователей
    duration: '3m'       // Тест длится 3 минуты
};

// Класс для тестирования безопасности
class SecurityTester {
    // Список payloads для SQL injection атак
    static sqlInjectionPayloads = [
        "' OR '1'='1",                    // Классическая SQL инъекция
        "'; DROP TABLE users; --",       // Попытка удаления таблицы
        "' UNION SELECT username, password FROM users --" // Извлечение данных
    ];

    // Список payloads для XSS атак
    static xssPayloads = [
        "<script>alert('XSS')</script>",  // Простой скрипт
        "<img src=x onerror=alert('XSS')>", // XSS через изображение
        "javascript:alert('XSS')"         // JavaScript URL
    ];

    // Выполняет тесты на SQL injection
    // baseUrl - базовый URL тестируемого приложения
    static performSQLInjectionTests(baseUrl) {
        let detected = 0; // Счетчик обнаруженных уязвимостей

        // Проверяем каждый payload
        this.sqlInjectionPayloads.forEach(payload => {
            const response = http.get(`${baseUrl}${API_ENDPOINTS.POSTS}?search=${encodeURIComponent(payload)}`);

            // Проверяем признаки успешной SQL инъекции в ответе
            if (this.detectSQLInjection(response)) {
                securityViolations.add(1, { type: 'sql_injection' }); // Записываем метрику
                detected++; // Увеличиваем счетчик
            }
        });

        return detected; // Возвращаем количество найденных уязвимостей
    }

    // Выполняет тесты на XSS уязвимости
    // baseUrl - базовый URL тестируемого приложения
    static performXSSTests(baseUrl) {
        let detected = 0; // Счетчик обнаруженных уязвимостей

        // Проверяем каждый payload
        this.xssPayloads.forEach(payload => {
            const response = http.post(`${baseUrl}${API_ENDPOINTS.POSTS}`, JSON.stringify({
                title: payload,    // Вставляем payload в заголовок
                body: 'Test content', // Обычное содержимое
                userId: 1          // ID пользователя
            }), {
                headers: { 'Content-Type': 'application/json' }
            });

            // Проверяем признаки XSS в ответе
            if (this.detectXSS(response)) {
                securityViolations.add(1, { type: 'xss' }); // Записываем метрику
                detected++; // Увеличиваем счетчик
            }
        });

        return detected; // Возвращаем количество найденных уязвимостей
    }

    // Проверяет ответ на признаки успешной SQL инъекции
    static detectSQLInjection(response) {
        const indicators = [
            'sql syntax',    // Сообщение об ошибке SQL
            'mysql_fetch',   // Функция MySQL
            'ora-',          // Oracle ошибка
            'postgresql',    // PostgreSQL
            'sqlite'         // SQLite
        ];

        // Проверяем, содержит ли тело ответа какой-либо индикатор
        return indicators.some(indicator =>
            response.body.toLowerCase().includes(indicator)
        );
    }

    // Проверяет ответ на признаки XSS уязвимости
    static detectXSS(response) {
        // В реальном тесте мы бы проверяли отражение payload в HTML ответе
        // Здесь упрощенная проверка - если запрос прошел, считаем что XSS возможен
        return response.status === 201; // Created - пост успешно создан
    }
}

// Основная функция теста - выполняется каждым VUS в цикле во время теста
export default function() {
    const baseUrl = ENV.BASE_URL;

    // Совмещаем нагрузочное и security
    // Сначала выполняем обычные нагрузочные запросы
    const loadRequests = [
        ['GET', `${baseUrl}${API_ENDPOINTS.POSTS}`],     // Получить все посты
        ['GET', `${baseUrl}${API_ENDPOINTS.USERS}/1`],   // Получить пользователя
        ['POST', `${baseUrl}${API_ENDPOINTS.POSTS}`, JSON.stringify({ // Создать пост
            title: 'Security Test',
            body: 'Testing under load',
            userId: 1
        })]
    ];

    // Выполняем нагрузочные запросы параллельно
    const loadResponses = http.batch(loadRequests.map(req => ({
        method: req[0],     // Метод HTTP
        url: req[1],        // URL запроса
        body: req[2],       // Тело запроса (для POST)
        params: { headers: { 'Content-Type': 'application/json' } }
    })));

    // Периодически выполняем security тесты (30% виртуальных пользователей)
    if (Math.random() < 0.3) {
        // Выполняем тесты на SQL injection
        const sqlInjectionsDetected = SecurityTester.performSQLInjectionTests(baseUrl);

        // Выполняем тесты на XSS
        const xssDetected = SecurityTester.performXSSTests(baseUrl);

        // Если найдены уязвимости, записываем в метрики
        if (sqlInjectionsDetected > 0 || xssDetected > 0) {
            attackSuccessRate.add(true); // Атака успешна
            console.warn(`Security vulnerabilities detected: SQLi=${sqlInjectionsDetected}, XSS=${xssDetected}`);
        } else {
            attackSuccessRate.add(false); // Атак не найдено
        }
    }

    // Проверяем результаты нагрузочных запросов
    check(loadResponses, {
        'service resilient to mixed load': (rs) => // Сервис устойчив к смешанной нагрузке
            rs.every(r => r.status >= 200 && r.status < 500), // Все ответы 2xx-4xx
        'no security breaches under load': (rs) => // Нет security брешей под нагрузкой
            !rs.some(r => r.body.includes('sql syntax') || r.body.includes('<script>')) // Нет индикаторов атак
    });
}
