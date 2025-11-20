// tests/scenarios/canary-test.js
// canary deployment тест
// Canary тесты проверяют новую версию приложения, направляя на нее небольшую часть трафика.
// сравнивает производительность старой и новой версий.

import { check } from 'k6';
import http from 'k6/http';
import { Counter, Trend } from 'k6/metrics';
import { ENV, API_ENDPOINTS } from '../libs/config.js';

// Выводим сообщение о начале теста для логирования
console.log("STARTING TEST: Canary Deployment Test");

// Метрики для отслеживания canary развертывания
const canaryTraffic = new Counter('canary_traffic');     // Счетчик трафика по версиям
const canaryErrors = new Counter('canary_errors');       // Счетчик ошибок по версиям
const canaryPerformance = new Trend('canary_performance_delta'); // Разница в производительности

// Настройки теста - определяют как будет выполняться тест
export const options = {
    vus: 20,             // 20 виртуальных пользователей
    duration: '5m'       // Тест длится 5 минут
};

// Класс для управления canary развертыванием
class CanaryDeployment {
    constructor(controlEndpoint, canaryEndpoint, trafficSplit = 0.1) {
        this.controlEndpoint = controlEndpoint; // URL стабильной версии (control)
        this.canaryEndpoint = canaryEndpoint;   // URL новой версии (canary)
        this.trafficSplit = trafficSplit;       // Доля трафика на canary (0.1 = 10%)
    }

    // Выбирает endpoint для запроса на основе traffic split
    getEndpoint() {
        const isCanary = Math.random() < this.trafficSplit; // Случайный выбор
        return {
            endpoint: isCanary ? this.canaryEndpoint : this.controlEndpoint,
            version: isCanary ? 'canary' : 'control' // Метка версии
        };
    }

    // Сравнивает производительность control и canary версий
    async comparePerformance(operation) {
        // Замеряем время выполнения для control версии
        const controlStart = Date.now();
        const controlResult = await operation(this.controlEndpoint);
        const controlTime = Date.now() - controlStart;

        // Замеряем время выполнения для canary версии
        const canaryStart = Date.now();
        const canaryResult = await operation(this.canaryEndpoint);
        const canaryTime = Date.now() - canaryStart;

        // Вычисляем разницу в производительности
        const performanceDelta = canaryTime - controlTime;
        canaryPerformance.add(performanceDelta); // Записываем метрику

        return {
            control: { result: controlResult, time: controlTime },
            canary: { result: canaryResult, time: canaryTime },
            delta: performanceDelta // Положительное значение = canary медленнее
        };
    }
}

// Основная функция теста - выполняется каждым VUS в цикле во время теста
export default function() {
    // Создаем экземпляр canary развертывания
    const canary = new CanaryDeployment(
        ENV.BASE_URL, // Стабильная версия
        ENV.BASE_URL, // Новая версия (в реальности другой URL)
        0.2 // 20% трафика на canary
    );

    // Выбираем endpoint для этого запроса
    const { endpoint, version } = canary.getEndpoint();
    canaryTraffic.add(1, { version }); // Записываем метрику трафика

    // Выполняем запросы к выбранной версии
    const requests = [
        ['GET', `${ENV.BASE_URL}${API_ENDPOINTS.POSTS}`],    // Получить все посты
        ['GET', `${ENV.BASE_URL}${API_ENDPOINTS.USERS}/1`],  // Получить пользователя
        ['POST', `${ENV.BASE_URL}${API_ENDPOINTS.POSTS}`, JSON.stringify({ // Создать пост
            title: `Canary Test ${version}`,
            body: 'Testing canary deployment',
            userId: 1
        })]
    ];

    // Выполняем запросы параллельно с метками версии
    const responses = http.batch(requests.map(req => ({
        method: req[0],     // HTTP метод
        url: req[1],        // URL запроса
        body: req[2],       // Тело запроса (для POST)
        params: {
            headers: { 'Content-Type': 'application/json' },
            tags: { version } // Метка версии для метрик
        }
    })));

    // Анализируем результаты запросов
    const success = check(responses, {
        [`${version} all requests successful`]: (rs) => // Все запросы к версии успешны
            rs.every(r => r.status >= 200 && r.status < 400), // Статусы 2xx-3xx
        [`${version} performance acceptable`]: (rs) => // Производительность версии приемлема
            rs.every(r => r.timings.duration < 2000) // Каждый запрос < 2 секунды
    });

    // Если запросы не удались, записываем ошибку
    if (!success) {
        canaryErrors.add(1, { version });
    }

    // Периодическое сравнение производительности (только 10% VUs для экономии ресурсов)
    if (Math.random() < 0.1) {
        // Сравниваем производительность версий
        canary.comparePerformance(async (baseUrl) => {
            return http.get(`${ENV.BASE_URL}${API_ENDPOINTS.POSTS}`);
        }).then(comparison => {
            console.log(`Performance delta: ${comparison.delta}ms`); // Логируем разницу

            // Предупреждаем если разница значительная
            if (Math.abs(comparison.delta) > 1000) {
                console.warn(`Significant performance difference detected: ${comparison.delta}ms`);
            }
        }).catch(err => {
            console.error(`Performance comparison failed: ${err.message}`);
        });
    }
}
