// tests/scenarios/adaptive-load-test.js
// Этот файл содержит adaptive load тест - адаптивный тест нагрузки.
// Adaptive тесты автоматически регулируют нагрузку на систему на основе ее состояния.
// Они увеличивают нагрузку когда система здорова и уменьшают когда возникают проблемы.

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Gauge } from 'k6/metrics';
import { ENV, API_ENDPOINTS } from '../libs/config.js';

// Выводим сообщение о начале теста для логирования
console.log("STARTING TEST: Adaptive Load Test");

// Метрики для отслеживания адаптивной нагрузки
const adaptiveThroughput = new Gauge('adaptive_throughput');     // Текущая пропускная способность
const systemHealth = new Gauge('system_health_score');           // Оценка здоровья системы (0-1)
const adaptiveDecisions = new Counter('adaptive_decisions');     // Счетчик решений об изменении нагрузки

// Настройки теста - определяют как будет выполняться тест
export const options = {
    stages: [
        { duration: '2m', target: 10 } // Начинаем с 10 VUs на 2 минуты
    ]
};

// Класс для адаптивного управления нагрузкой
class AdaptiveLoadController {
    constructor() {
        this.currentLoad = 10;        // Текущий уровень нагрузки
        this.healthThreshold = 0.9;   // Порог здоровья для принятия решений
        this.maxLoad = 100;           // Максимальная нагрузка
        this.minLoad = 1;             // Минимальная нагрузка
    }

    // Анализирует метрики и принимает решение об изменении нагрузки
    analyzeMetrics(metrics) {
        const healthScore = this.calculateHealthScore(metrics); // Вычисляем как система - жива ли
        systemHealth.add(healthScore); // Записываем метрику здоровья

        // Принимаем решение на основе здоровья системы
        if (healthScore < this.healthThreshold) {
            this.decreaseLoad(); // Если плохонько - уменьшаем нагрузку
        } else if (healthScore > 0.95) {
            this.increaseLoad(); // Если ещё дышит - добиваем...(шутёха)) - увеличиваем нагрузку
        }

        return this.currentLoad; // Возвращаем новую нагрузку
    }

    // Вычисляет оценку здоровья системы на основе метрик
    calculateHealthScore(metrics) {
        const errorRate = metrics.error_rate || 0;     // Доля ошибок
        const responseTime = metrics.response_time || 0; // Среднее время ответа
        const throughput = metrics.throughput || 1;      // Пропускная способность

        let score = 1.0; // Начинаем с идеального здоровья

        // Штраф за ошибки (каждая ошибка сильно ухудшает здоровье)
        score -= errorRate * 2;

        // Штраф за высокое время ответа (больше 1 секунды)
        if (responseTime > 1000) {
            score -= (responseTime - 1000) / 5000; // Нормализуем штраф
        }

        // Бонус за высокую пропускную способность
        score += Math.min(throughput / 100, 0.1); // Максимальный бонус 0.1

        // Ограничиваем оценку в диапазоне 0-1
        return Math.max(0, Math.min(1, score));
    }

    // Увеличивает нагрузку на 20%
    increaseLoad() {
        if (this.currentLoad < this.maxLoad) {
            this.currentLoad = Math.min(this.maxLoad, Math.floor(this.currentLoad * 1.2));
            adaptiveDecisions.add(1, { action: 'increase' }); // Записываем решение
            console.log(`Increasing load to: ${this.currentLoad}`);
        }
    }

    // Уменьшает нагрузку на 30%
    decreaseLoad() {
        this.currentLoad = Math.max(this.minLoad, Math.floor(this.currentLoad * 0.7));
        adaptiveDecisions.add(1, { action: 'decrease' }); // Записываем решение
        console.log(`Decreasing load to: ${this.currentLoad}`);
    }
}

// Основная функция теста - выполняется каждым VUS в цикле во время теста
export default function() {
    const controller = new AdaptiveLoadController(); // Создаем контроллер нагрузки

    // Собираем метрики в реальном времени
    const metrics = {
        error_rate: 0,     // Доля ошибок
        response_time: 0,  // Среднее время ответа
        throughput: 0      // Пропускная способность
    };

    // Выполняем серию запросов для сбора метрик
    const startTime = Date.now(); // Время начала измерений
    let successfulRequests = 0;   // Счетчик успешных запросов
    let totalResponseTime = 0;    // Суммарное время ответов

    // Выполняем 10 запросов с паузой 0.1 секунды между ними
    for (let i = 0; i < 10; i++) {
        const requestStart = Date.now(); // Время начала запроса
        const response = http.get(`${ENV.BASE_URL}${API_ENDPOINTS.POSTS}`);
        const requestTime = Date.now() - requestStart; // Время выполнения запроса

        totalResponseTime += requestTime; // Добавляем к сумме

        if (response.status === 200) {
            successfulRequests++; // Увеличиваем счетчик успешных
        }

        sleep(0.1); // Небольшая пауза между запросами
    }

    // Рассчитываем итоговые метрики
    metrics.error_rate = 1 - (successfulRequests / 10); // Доля ошибок
    metrics.response_time = totalResponseTime / 10;     // Среднее время ответа
    metrics.throughput = successfulRequests / ((Date.now() - startTime) / 1000); // Запросов в секунду

    adaptiveThroughput.add(metrics.throughput); // Записываем метрику пропускной способности

    // Адаптивное управление нагрузкой на основе собранных метрик
    const newLoad = controller.analyzeMetrics(metrics);

    // В реальном k6 динамическое изменение нагрузки сложнее реализовать
    // Здесь просто логируем рекомендацию
    console.log(`Recommended load: ${newLoad}`);

    // Проверяем, что система остается здоровой под нагрузкой
    check(metrics, {
        'system remains healthy under load': (m) => m.error_rate < 0.1, // Ошибок < 10%
        'throughput maintained': (m) => m.throughput > 5 // Минимум 5 запросов в секунду
    });
}
