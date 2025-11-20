// tests/scenarios/volume-test.js
// тест на обработку больших объемов данных.
// как система справляется с большим количеством данных.
// имитирует реальные сценарии с большими наборами данных.

import { ENV, API_ENDPOINTS } from '../libs/config.js';
import {errorCount, makeGetRequest} from '../libs/utils.js';
import { check } from 'k6';

console.log("STARTING TEST: Volume Test");

// Настройки теста - как будет выполняться тест (TODO: проверка CI отчёта - выставлено меньше)
export const options = {
    vus: 4,              // 10 виртуальных пользователей одновременно
    duration: '5m',      // Тест длится 10 минут

    // Пороги производительности - критерии успешности теста
    thresholds: {
        http_req_duration: ['p(95)<2000', 'p(99)<3000'],    // 95% ответов < 2с, 99% < 3с
        http_req_failed: ['rate<0.05'],                     // Ошибок < 5%
        'request_duration{endpoint:get_posts}': ['p(95)<1500'],    // GET посты < 1.5с
        'request_duration{endpoint:get_comments}': ['p(95)<1800'], // GET комментарии < 1.8с
        success_rate: ['rate>0.95'],                         // Успех > 95%
        errors: ['count<500']                                // Всего ошибок < 500
    },

    // Дополнительные настройки для облачного сервиса k6 Cloud
    ext: {
        loadimpact: {
            projectID: 12345,                    // ID проекта в k6 Cloud
            name: 'Volume Test - Large Data Sets' // Название теста
        }
    }
};

// Размеры наборов данных для тестирования
// small - маленький набор (10 элементов)
// medium - средний набор (50 элементов)
// large - большой набор (100 элементов)
// - x2
const dataSizes = {
    small: { limit: 5 },
    medium: { limit: 25 },
    large: { limit: 50 }
};

// Основная функция теста - выполняется каждым VUS в цикле во время теста
export default function() {
    // Случайным образом выбираем размер набора данных для тестирования
    // 50% - small, 30% - medium, 20% - large
    const dataSize = Math.random() < 0.5 ? 'small' : Math.random() < 0.8 ? 'medium' : 'large';
    const limit = dataSizes[dataSize].limit;

    try {
        // Получение большого количества постов с ограничением по размеру
        const postsResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.POSTS}?_limit=${limit}`, `get_posts_${dataSize}`);

        // Получение комментариев для случайного поста с ограничением
        const postId = Math.floor(Math.random() * 100) + 1; // Случайный ID поста от 1 до 100
        const commentsResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.COMMENTS}?postId=${postId}&_limit=${limit}`, `get_comments_${dataSize}`);

        // Получение альбомов пользователя (без ограничения)
        const userId = Math.floor(Math.random() * 10) + 1; // Случайный ID пользователя от 1 до 10
        const albumsResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.ALBUMS}?userId=${userId}`, `get_albums_${dataSize}`);

        // Получение фотографий из альбома с ограничением
        const albumId = Math.floor(Math.random() * 100) + 1; // Случайный ID альбома от 1 до 100
        const photosResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.PHOTOS}?albumId=${albumId}&_limit=${Math.min(limit, 50)}`, `get_photos_${dataSize}`);

        // Проверяем успешность cheeeeck
        check([postsResponse, commentsResponse, albumsResponse, photosResponse], {
            'all volume test requests successful': (rs) => rs.every(r => r.status === 200),
            'responses contain expected data': (rs) => rs.every(r => r.body && r.body.length > 0)
        });

    } catch (error) {
        console.error(`Volume test error: ${error.message}`);
        errorCount.add(1, { test_type: 'volume_test' });
    }
}
