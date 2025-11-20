import http from 'k6/http';
import { check } from 'k6';
import { Rate, Counter } from 'k6/metrics';
import { DataGenerator } from '../libs/data-generator.js';
import { ENV, API_ENDPOINTS } from '../libs/config.js';

console.log("STARTING TEST: Advanced Chain Test");

// Метрики для цепочки запросов
const chainSuccessRate = new Rate('chain_success_rate');
const chainErrorCount = new Counter('chain_errors');

export const options = {
    vus: 5,
    duration: '3m',
    thresholds: {
        'chain_success_rate': ['rate>0.8'],
        'http_req_duration': ['p(95)<3000']
    }
};

export default function() {
    //  СЦЕНАРИЙ 1: Полная цепочка создания пользователя -> поста -> комментария
    let createdUserId = null;
    let createdPostId = null;
    let createdCommentId = null;

    // Шаг 1: Создание пользователя
    const userData = DataGenerator.generateUser();
    const userResponse = http.post(
        `${ENV.BASE_URL}${API_ENDPOINTS.USERS}`,
        JSON.stringify(userData),
        { headers: { 'Content-Type': 'application/json' } }
    );

    if (check(userResponse, {
        'user created successfully': (r) => r.status === 201,
        'user has id': (r) => {
            if (r.status === 201) {
                const body = JSON.parse(r.body);
                createdUserId = body.id;
                return body.id !== undefined;
            }
            return false;
        }
    })) {
        console.log(` User created with ID: ${createdUserId}`);

        // Шаг 2: Создание поста от имени пользователя
        const postData = DataGenerator.generatePost(createdUserId);
        const postResponse = http.post(
            `${ENV.BASE_URL}${API_ENDPOINTS.POSTS}`,
            JSON.stringify(postData),
            { headers: { 'Content-Type': 'application/json' } }
        );

        if (check(postResponse, {
            'post created successfully': (r) => r.status === 201,
            'post has id': (r) => {
                if (r.status === 201) {
                    const body = JSON.parse(r.body);
                    createdPostId = body.id;
                    return body.id !== undefined;
                }
                return false;
            }
        })) {
            console.log(` Post created with ID: ${createdPostId} for user ${createdUserId}`);

            // Шаг 3: Создание комментария к посту
            const commentData = DataGenerator.generateComment(createdPostId, userData.email);
            const commentResponse = http.post(
                `${ENV.BASE_URL}${API_ENDPOINTS.COMMENTS}`,
                JSON.stringify(commentData),
                { headers: { 'Content-Type': 'application/json' } }
            );

            if (check(commentResponse, {
                'comment created successfully': (r) => r.status === 201,
                'comment has id': (r) => {
                    if (r.status === 201) {
                        const body = JSON.parse(r.body);
                        createdCommentId = body.id;
                        return body.id !== undefined;
                    }
                    return false;
                }
            })) {
                console.log(` Comment created with ID: ${createdCommentId} for post ${createdPostId}`);

                // Шаг 4: Получение созданного комментария
                const getCommentResponse = http.get(
                    `${ENV.BASE_URL}${API_ENDPOINTS.COMMENTS}/${createdCommentId}`
                );

                check(getCommentResponse, {
                    'comment retrieved successfully': (r) => r.status === 200,
                    'retrieved comment matches created': (r) => {
                        if (r.status === 200) {
                            const body = JSON.parse(r.body);
                            return body.email === userData.email;
                        }
                        return false;
                    }
                });

                // Шаг 5: Получение всех постов пользователя
                const userPostsResponse = http.get(
                    `${ENV.BASE_URL}${API_ENDPOINTS.USERS}/${createdUserId}/posts`
                );

                check(userPostsResponse, {
                    'user posts retrieved': (r) => r.status === 200,
                    'user has posts array': (r) => {
                        if (r.status === 200) {
                            const body = JSON.parse(r.body);
                            return Array.isArray(body);
                        }
                        return false;
                    }
                });

                chainSuccessRate.add(true);
            } else {
                console.log(' Failed to create comment');
                chainErrorCount.add(1);
                chainSuccessRate.add(false);
            }
        } else {
            console.log(' Failed to create post');
            chainErrorCount.add(1);
            chainSuccessRate.add(false);
        }
    } else {
        console.log(' Failed to create user');
        chainErrorCount.add(1);
        chainSuccessRate.add(false);
    }

    //  СЦЕНАРИЙ 2: Параллельные запросы с зависимыми данными
    if (createdUserId) {
        const parallelRequests = [
            {
                method: 'GET',
                url: `${ENV.BASE_URL}${API_ENDPOINTS.USERS}/${createdUserId}/todos`
            },
            {
                method: 'GET',
                url: `${ENV.BASE_URL}${API_ENDPOINTS.USERS}/${createdUserId}/albums`
            },
            {
                method: 'GET',
                url: `${ENV.BASE_URL}${API_ENDPOINTS.USERS}/${createdUserId}`
            }
        ];

        const responses = http.batch(parallelRequests);

        check(responses[0], {
            'todos retrieved': (r) => r.status === 200
        });

        check(responses[1], {
            'albums retrieved': (r) => r.status === 200
        });

        check(responses[2], {
            'user data retrieved': (r) => r.status === 200
        });
    }
}