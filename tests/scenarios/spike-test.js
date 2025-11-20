import { check } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';
import { ENV, API_ENDPOINTS } from '../libs/config.js';

console.log("STARTING TEST: Spike Test");

const spikeSuccessRate = new Rate('spike_success_rate');

export const options = {
    stages: [
        { duration: '30s', target: 50 },   // Резкий рост
        { duration: '1m', target: 50 },    // Поддержание
        { duration: '10s', target: 200 },  // СПАЙК!
        { duration: '1m', target: 200 },   // Пиковая нагрузка
        { duration: '30s', target: 50 },   // Быстрое снижение
        { duration: '30s', target: 0 }     // Завершение
    ],
    thresholds: {
        'http_req_duration': ['p(95)<5000'], // Разрешаем больше времени при спайке
        'spike_success_rate': ['rate>0.7']   // Более низкий порог для спайка
    }
};

export default function() {
    // Интенсивные операции для спайк-тестирования
    const requests = [
        // Множественные GET запросы
        { method: 'GET', url: `${ENV.BASE_URL}${API_ENDPOINTS.POSTS}` },
        { method: 'GET', url: `${ENV.BASE_URL}${API_ENDPOINTS.COMMENTS}` },
        { method: 'GET', url: `${ENV.BASE_URL}${API_ENDPOINTS.USERS}` },

        // Параллельные создания
        {
            method: 'POST',
            url: `${ENV.BASE_URL}${API_ENDPOINTS.POSTS}`,
            body: JSON.stringify({
                userId: 1,
                title: `Spike test post ${Math.random()}`,
                body: 'This is a post created during spike testing'
            }),
            params: { headers: { 'Content-Type': 'application/json' } }
        }
    ];

    // Выполнение нескольких запросов параллельно
    const responses = http.batch(requests);

    // Проверка успешности основных операций
    const success = check(responses, {
        'spike requests successful': (r) =>
            r[0].status === 200 &&
            r[1].status === 200 &&
            r[2].status === 200 &&
            r[3].status === 201
    });

    spikeSuccessRate.add(success);
}