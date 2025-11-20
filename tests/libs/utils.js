// файл содержит вспомогательные функции и метрики для тестов k6.
// Здесь определены кастомные метрики для мониторинга производительности и функции для выполнения HTTP запросов.

// встроенные метрики k6 для сбора статистики
import { Trend, Counter, Rate, Gauge } from 'k6/metrics';
// check для валидации ответов
import { check } from 'k6';
// модуль http для выполнения HTTP запросов
import http from 'k6/http';

// Кастомные метрики для мониторинга производительности
// Trend - метрика для измерения времени (среднее, процентили и т.д.)
export const requestDuration = new Trend('request_duration', true); // Время выполнения запросов
export const errorCount = new Counter('errors');                   // Счетчик ошибок
export const successRate = new Rate('success_rate');               // Процент успешных запросов
export const activeUsers = new Gauge('active_users');              // Количество активных пользователей

// Дополнительные метрики для детального мониторинга
export const responseTimeTrend = new Trend('response_time');       // Тренд времени ответа
export const throughputRate = new Rate('throughput');              // Пропускная способность (запросов в секунду)
export const errorRate = new Rate('error_rate');                   // Процент ошибок
export const memoryUsage = new Gauge('memory_usage');              // Использование памяти
export const cpuUsage = new Gauge('cpu_usage');                    // Использование CPU

// Функция makeGetRequest выполняет GET запрос и собирает метрики
// url - адрес для запроса, tag - метка для группировки метрик (например, 'posts', 'users')
export function makeGetRequest(url, tag) {
    // Засекаем время начала запроса для измерения общей продолжительности
    const start = Date.now();

    // Выполняем GET запрос
    const response = http.get(url);

    // Вычисляем общее время выполнения запроса
    const duration = Date.now() - start;

    // Обновляем метрики на основе выполненного запроса
    activeUsers.add(1);                                    // Увеличиваем счетчик активных пользователей
    requestDuration.add(duration, { endpoint: tag });      // Добавляем время выполнения с тегом эндпоинта
    responseTimeTrend.add(response.timings.duration);      // Добавляем время ответа сервера
    throughputRate.add(1);                                 // Увеличиваем счетчик пропускной способности

    // Проверяем успешность запроса
    // check возвращает true, если все проверки пройдены
    const isSuccess = check(response, {
        [`${tag} status is 200`]: (r) => r.status === 200,        // Проверяем статус код 200
        [`${tag} response time < 2s`]: (r) => r.timings.duration < 2000 // Проверяем время ответа < 2 секунд
    });

    // Обновляем метрики успеха/ошибки в зависимости от результата проверок
    if (isSuccess) {
        successRate.add(true, { endpoint: tag });   // Увеличиваем счетчик успешных запросов
        errorRate.add(false);                       // Добавляем false в error rate (запрос успешен)
    } else {
        successRate.add(false, { endpoint: tag });  // Увеличиваем счетчик неудачных запросов
        errorCount.add(1, { endpoint: tag });       // Увеличиваем счетчик ошибок
        errorRate.add(true);                        // Добавляем true в error rate (запрос неудачен)
    }

    // Возвращаем ответ для дальнейшей обработки в тесте
    return response;
}

// Функция makePostRequest выполняет POST запрос для создания ресурсов
// url - адрес для запроса, payload - данные для отправки, tag - метка для метрик
export function makePostRequest(url, payload, tag) {
    // Настраиваем параметры запроса
    const params = {
        headers: { 'Content-Type': 'application/json' }, // Указываем тип контента JSON
    };

    // Засекаем время начала запроса
    const start = Date.now();

    // Выполняем POST запрос с JSON данными
    const response = http.post(url, JSON.stringify(payload), params);

    // Вычисляем общее время выполнения запроса
    const duration = Date.now() - start;

    // Обновляем метрики аналогично GET запросу
    activeUsers.add(1);
    requestDuration.add(duration, { endpoint: tag });
    responseTimeTrend.add(response.timings.duration);
    throughputRate.add(1);

    // Для POST запросов ожидаем статус 201 (Created) и более длительное время ответа
    const isSuccess = check(response, {
        [`${tag} status is 201`]: (r) => r.status === 201,        // Проверяем статус код 201
        [`${tag} response time < 3s`]: (r) => r.timings.duration < 3000 // Проверяем время ответа < 3 секунд
    });

    // Обновляем метрики успеха/ошибки
    if (isSuccess) {
        successRate.add(true, { endpoint: tag });
        errorRate.add(false);
    } else {
        successRate.add(false, { endpoint: tag });
        errorCount.add(1, { endpoint: tag });
        errorRate.add(true);
    }

    // Возвращаем ответ для дальнейшей обработки
    return response;
}
