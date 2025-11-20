// базовая проверка функциональности приложения.
// проверяют основные функции без нагрузки.
// Они используются для быстрой проверки работоспособности после изменений.

import { check } from 'k6';        // Для валидации ответов
import { ENV, API_ENDPOINTS } from '../libs/config.js';
import { makeGetRequest, successRate, errorCount } from '../libs/utils.js';
import { initializeParameters, randomId } from '../libs/parameterization.js';

// Инициализируем параметры для параметризации
initializeParameters();

// Выводим сообщение о начале теста для логирования
console.log("STARTING TEST: Smoke Test");

// Настройки теста - определяют как будет выполняться тест
export const options = {
    vus: 1,              // Всего 1 виртуальный пользователь (VUS) - минимальная нагрузка
    duration: '1m',      // Тест длится 1 минуту

    // Пороги производительности - критерии успешности теста
    thresholds: {
        http_req_duration: ['p(95)<1000'],    // 95-й процентиль времени ответа < 1000мс
        http_req_failed: ['rate<0.01'],       // Процент ошибок < 1%
        success_rate: ['rate>0.99'],          // Процент успеха > 99%
        errors: ['count<5']                   // Всего ошибок < 5
    }
};

// Основная функция теста - выполняется каждым VUS в цикле во время теста
export default function() {
    // Тест получения всех постов - проверяем основной эндпоинт
    const postsResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.POSTS}`, 'get_posts');

    // Тест получения конкретного поста по ID - используем параметризованный ID
    const postId = randomId(1, 100); // Случайный ID поста от 1 до 100
    const singlePostResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.POSTS}/${postId}`, 'get_single_post');

    // Тест получения комментариев с фильтром - используем параметризованный postId
    const commentsResponse = makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.COMMENTS}?postId=${postId}`, 'get_comments');

    // Проверяем успешность всех запросов  check
    const allSuccessful = check([postsResponse, singlePostResponse, commentsResponse], {
        'all smoke test requests successful': (rs) => rs.every(r => r.status === 200),
        'all responses have valid JSON': (rs) => rs.every(r => {
            try {
                JSON.parse(r.body);
                return true;
            } catch (error) {
                return false;
            }
        })
    });

    // Используем successRate и errorCount для отслеживания результатов
    if (allSuccessful) {
        successRate.add(true); // Увеличиваем счетчик успешных тестов
    } else {
        errorCount.add(1); // Увеличиваем счетчик ошибок
        successRate.add(false); // Отмечаем неудачу
    }
}

// default function не требуется, если мы используем exec в сценариях
//Primer:
// export const options = {
//     scenarios: {
//         smoke_test: {
//             executor: 'shared-iterations',
//             vus: 1,
//             iterations: 5,
//             maxDuration: '1m',
//             exec: 'smokeTestFunction', // Указываем, что для этого сценария нужно выполнять функцию smokeTestFunction
//         },
//         another_test: {
//             executor: 'shared-iterations',
//             vus: 2,
//             iterations: 10,
//             maxDuration: '1m',
//             exec: 'anotherTestFunction', // А для этого - anotherTestFunction
//         },
//     },
//     thresholds: {
//         http_req_duration: ['p(95)<1000'],
//         http_req_failed: ['rate<0.01'],
//         success_rate: ['rate>0.99'],
//         errors: ['count<5']
//     }
// };