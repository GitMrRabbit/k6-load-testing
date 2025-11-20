import { ENV, API_ENDPOINTS } from '../libs/config.js';
import {errorCount, makeGetRequest, makePostRequest} from '../libs/utils.js';
import { complexPayloads } from '../data/test-data.js';

console.log("STARTING TEST: Stress Test");

export const options = {
    // Report (пока снизил) 2
    stages: [
        { duration: '30s', target: 1 },    // Начало:
        { duration: '1m', target: 5 },     // рост:
        { duration: '1m30s', target: 10 }, // Высокая
        { duration: '1m', target: 20 },    // Экстремальная
        { duration: '30s', target: 0 },    //  спад:
    ],
    thresholds: {
        http_req_duration: ['p(95)<3000', 'p(99)<5000'],
        http_req_failed: ['rate<0.1'],
        'request_duration{endpoint:get_posts}': ['p(95)<2000'],
        'request_duration{endpoint:create_post}': ['p(95)<4000'],
        success_rate: ['rate>0.9'],
        errors: ['count<200']
    },
    ext: {
        loadimpact: {
            projectID: 12345,
            name: 'Stress Test - JSONPlaceholder API'
        }
    }
};

export default function() {
    // Случайный выбор операций с уклоном на чтение
    const randomOperation = Math.random();

    try {
        if (randomOperation < 0.6) {
            // Операции чтения (60%)
            const postId = Math.floor(Math.random() * 100) + 1;
            const userId = Math.floor(Math.random() * 10) + 1;

            makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.POSTS}`, 'get_posts');
            makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.POSTS}/${postId}`, 'get_single_post');
            makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.COMMENTS}?postId=${postId}`, 'get_comments');
            makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.USERS}/${userId}`, 'get_user');
        } else if (randomOperation < 0.8) {
            // Операции записи (20%)
            const userId = Math.floor(Math.random() * 10) + 1;
            const postData = complexPayloads.createPost(userId);
            makePostRequest(`${ENV.BASE_URL}${API_ENDPOINTS.POSTS}`, postData, 'create_post');
        } else {
            // Сложные запросы (20%)
            const userId = Math.floor(Math.random() * 10) + 1;
            makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.ALBUMS}?userId=${userId}`, 'get_albums');
            makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.TODOS}?userId=${userId}`, 'get_todos');
        }
    } catch (error) {
        console.error(`Test error: ${error.message}`);
        errorCount.add(1, { test_type: 'stress_test' });
    }
}

// TODO: scenarios
// запустить несколько независимых сценариев в одном тесте.
// jsCopyexport const options = {
//     scenarios: {
//         get_posts: {
//             executor: 'constant-vus',
//             vus: 10,
//             duration: '1m',
//             exec: 'getPosts',
//         },
//         create_post: {
//             executor: 'ramping-vus',
//             startVUs: 0,
//             stages: [
//                 { duration: '30s', target: 20 },
//                 { duration: '1m', target: 0 },
//             ],
//             exec: 'createPost',
//         },
//     },
// };

////-------------------------------------////
// executor — стратегия выполнения (например, constant-vus, ramping-vus, per-vu-iterations).
//     exec — функция, которая будет выполняться в этом сценарии.
//

// setup — выполняется один раз перед началом теста . @Before
// teardown — выполняется один раз после завершения теста . @After
//
// Пример:
//     jsCopyexport function setup() {
//     // Подготовка данных
//     return { token: 'kakoyToToken123' };
// }
//
// export default function (data) {
//     // Использование из setup
//     console.log(data.token);
// }
//
// export function teardown(data) {
//     // Очистка данных
//     console.log('Test finished');
// }
// env
// Позволяет передавать переменные окружения в скрипт.
// Пример:
// jsCopyexport const options = {
//     env: {
//         BASE_URL: 'https://api.drugol.com',
//         API_KEY: '12345',
//     },
// };
//  tags
// Позволяет добавлять метки к запросам для удобной фильтрации результатов.
// Пример:
// jsCopyexport default function () {
//     http.get('https://api.site.com/posts', {
//         tags: { endpoint: 'get_posts' },
//     });
// }