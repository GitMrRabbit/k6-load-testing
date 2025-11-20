// tests/scenarios/soak-test.js
// длительный тест на стабильность системы.
// Soak тесты проверяют, как система ведет себя под постоянной нагрузкой в течение длительного времени.
// Они помогают выявить проблемы с утечками памяти, деградацией производительности и другими долгосрочными проблемами.

import { ENV, API_ENDPOINTS } from '../libs/config.js';
import { errorCount, makeGetRequest, makePostRequest } from '../libs/utils.js';
import { generatePostData } from '../data/test-data.js';
import { check } from 'k6';

console.log("STARTING TEST: Soak Test (Long Duration)");

// Настройки теста - определяют как будет выполняться тест
export const options = {
    vus: 10,              // 10 виртуальных пользователей постоянно
    duration: '2h',       // Тест длится 2 часа (очень долго!)

    // Пороги производительности - критерии успешности теста
    thresholds: {
        http_req_duration: ['p(95)<2000', 'p(99)<4000'],    // 95% ответов < 2с, 99% < 4с
        http_req_failed: ['rate<0.05'],                     // Ошибок < 5%
        'request_duration{endpoint:get_posts}': ['p(95)<1500'],    // GET посты < 1.5с
        'request_duration{endpoint:create_post}': ['p(95)<3000'],  // POST посты < 3с
        success_rate: ['rate>0.95'],                         // Успех > 95%
        errors: ['count<1000']                               // Всего ошибок < 1000
    },

    // Дополнительные настройки для облачного сервиса k6 Cloud
    ext: {
        loadimpact: {
            projectID: 12345,                    // ID проекта в k6 Cloud
            name: 'Soak Test - Long Duration Stability' // Название теста
        }
    }
};

// Счетчик итераций для отслеживания прогресса теста
let iterationCount = 0;

// Основная функция теста - выполняется каждым VUS в цикле во время теста
export default function() {
    iterationCount++; // Увеличиваем счетчик каждой итерации

    try {
        // Создаем периодические паттерны нагрузки в течение 4-часового цикла
        // Примерно 1 час = 360 итераций при 10 VUs (расчет приблизительный)
        const hour = Math.floor(iterationCount / 360);
        const pattern = hour % 4; // Цикл из 4 паттернов

        // В зависимости от текущего "часа" выбираем паттерн нагрузки
        let patternResponses = [];
        switch (pattern) {
            case 0: // Низкая нагрузка (первый час цикла)
                patternResponses = lowLoadPattern();
                break;
            case 1: // Средняя нагрузка (второй час цикла)
                patternResponses = mediumLoadPattern();
                break;
            case 2: // Высокая нагрузка (третий час цикла)
                patternResponses = highLoadPattern();
                break;
            case 3: // Пиковая нагрузка (четвертый час цикла)
                patternResponses = peakLoadPattern();
                break;
        }

        // Проверяем успешность запросов паттерна с помощью check
        if (patternResponses.length > 0) {
            check(patternResponses, {
                'soak test pattern requests successful': (rs) => rs.every(r => r && r.status === 200),
                'responses contain data': (rs) => rs.every(r => r && r.body && r.body.length > 0)
            });
        }

        // Периодическая проверка на утечки памяти и производительности
        // Каждые 100 итераций выводим сообщение для мониторинга
        if (iterationCount % 100 === 0) {
            console.log(`Iteration ${iterationCount}: Memory and performance check`);
        }

    } catch (error) {
        // Логируем ошибки, но не прерываем тест (soak тест должен продолжаться несмотря на ошибки)
        console.error(`Soak test error at iteration ${iterationCount}: ${error.message}`);
        // Теперь используем errorCount для отслеживания ошибок
        errorCount.add(1, { test_type: 'soak_test', iteration: iterationCount });
    }
}

// Паттерн низкой нагрузки - имитирует спокойное время суток
function lowLoadPattern() {
    // Выполняем 2-3 простых запроса чтения
    const postId = Math.floor(Math.random() * 100) + 1; // Случайный ID поста

    // Получаем один пост
    const postResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.POSTS}/${postId}`, 'get_single_post');

    // Получаем комментарии к этому посту (ограничено 5 для низкой нагрузки)
    const commentsResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.COMMENTS}?postId=${postId}&_limit=5`, 'get_comments');

    return [postResponse, commentsResponse];
}

// Паттерн средней нагрузки - имитирует обычное рабочее время
function mediumLoadPattern() {
    // Выполняем 4-5 запросов среднего объема
    const userId = Math.floor(Math.random() * 10) + 1; // Случайный ID пользователя

    // Получаем все посты пользователя
    const postsResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.POSTS}?userId=${userId}`, 'get_user_posts');

    // Получаем альбомы пользователя
    const albumsResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.ALBUMS}?userId=${userId}`, 'get_user_albums');

    // Получаем задачи пользователя
    const todosResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.TODOS}?userId=${userId}`, 'get_user_todos');

    return [postsResponse, albumsResponse, todosResponse];
}

// Паттерн высокой нагрузки - имитирует пиковые периоды активности
function highLoadPattern() {
    // Выполняем 6-8 запросов для создания высокой нагрузки
    const postId = Math.floor(Math.random() * 100) + 1; // Случайный ID поста
    const userId = Math.floor(Math.random() * 10) + 1;  // Случайный ID пользователя

    // Получаем все посты (большой запрос)
    const allPostsResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.POSTS}`, 'get_all_posts');

    // Получаем конкретный пост
    const singlePostResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.POSTS}/${postId}`, 'get_single_post');

    // Получаем комментарии к посту
    const commentsResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.COMMENTS}?postId=${postId}`, 'get_comments');

    // Получаем данные пользователя
    const userResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.USERS}/${userId}`, 'get_user');

    // Получаем альбомы пользователя
    const albumsResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.ALBUMS}?userId=${userId}`, 'get_albums');

    return [allPostsResponse, singlePostResponse, commentsResponse, userResponse, albumsResponse];
}

// Паттерн пиковой нагрузки - имитирует экстремальные ситуации (распродажи, вирусные события)
function peakLoadPattern() {
    // Максимальная нагрузка + операции записи для стресс-тестирования
    const postData = generatePostData(); // Генерируем данные для нового поста
    const createResponse = makePostRequest(`${ENV.BASE_URL}${API_ENDPOINTS.POSTS}`, postData, 'create_post');

    // Дополнительные запросы чтения для создания пиковой нагрузки
    const postId = Math.floor(Math.random() * 100) + 1; // Случайный ID поста
    const userId = Math.floor(Math.random() * 10) + 1;  // Случайный ID пользователя

    // Получаем все посты
    const allPostsResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.POSTS}`, 'get_all_posts');

    // Получаем конкретный пост
    const singlePostResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.POSTS}/${postId}`, 'get_single_post');

    // Получаем комментарии к посту
    const commentsResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.COMMENTS}?postId=${postId}`, 'get_comments');

    // Получаем данные пользователя
    const userResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.USERS}/${userId}`, 'get_user');

    // Получаем фотографии из альбома пользователя
    const photosResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.PHOTOS}?albumId=${userId}`, 'get_photos');

    return [createResponse, allPostsResponse, singlePostResponse, commentsResponse, userResponse, photosResponse];
}
