import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { DataGenerator } from '../libs/data-generator.js';
import { ENV, API_ENDPOINTS } from '../libs/config.js';

console.log("STARTING TEST: User Journey Test");

// Комплексные метрики для пользовательского сценария
const journeySuccess = new Rate('user_journey_success');
const journeySteps = new Counter('journey_steps_completed');
const journeyDuration = new Trend('journey_duration_ms');

export const options = {
    stages: [
        { duration: '2m', target: 5 },
        { duration: '5m', target: 10 },
        { duration: '2m', target: 5 },
        { duration: '1m', target: 0 }
    ],
    thresholds: {
        'user_journey_success': ['rate>0.85'],
        'journey_duration_ms': ['p(95)<10000']
    }
};

export default function() {
    const journeyStart = Date.now();
    let journeyFailed = false;

    //  СЦЕНАРИЙ: Полное путешествие пользователя
    console.log(' Starting user journey...');

    // Шаг 1: Регистрация нового пользователя
    const newUser = DataGenerator.generateUser();
    const registerResponse = http.post(
        `${ENV.BASE_URL}${API_ENDPOINTS.USERS}`,
        JSON.stringify(newUser),
        { headers: { 'Content-Type': 'application/json' } }
    );

    if (!check(registerResponse, {
        'user registration successful': (r) => r.status === 201
    })) {
        console.log(' User registration failed');
        journeyFailed = true;
    }
    journeySteps.add(1);
    sleep(1);

    if (!journeyFailed) {
        const userId = JSON.parse(registerResponse.body).id;
        console.log(` User registered with ID: ${userId}`);

        // Шаг 2: Создание профиля пользователя
        const profileData = {
            userId: userId,
            bio: `This is the bio of ${newUser.name}. I'm a test user created for load testing.`,
            avatar: `https://i.pravatar.cc/150?u=${userId}`
        };

        const profileResponse = http.post(
            `${ENV.BASE_URL}${API_ENDPOINTS.USERS}`,
            JSON.stringify(profileData),
            { headers: { 'Content-Type': 'application/json' } }
        );

        if (check(profileResponse, {
            'profile created': (r) => r.status === 201
        })) {
            journeySteps.add(1);
            console.log(` Profile created for user ${userId}`);
        }
        sleep(0.5);

        // Шаг 3: Создание нескольких постов
        const postsToCreate = 2;
        let createdPosts = [];

        for (let i = 0; i < postsToCreate; i++) {
            const postData = DataGenerator.generatePost(userId);
            const postResponse = http.post(
                `${ENV.BASE_URL}${API_ENDPOINTS.POSTS}`,
                JSON.stringify(postData),
                { headers: { 'Content-Type': 'application/json' } }
            );

            if (check(postResponse, {
                [`post ${i + 1} created`]: (r) => r.status === 201
            })) {
                createdPosts.push(JSON.parse(postResponse.body));
                journeySteps.add(1);
            }
            sleep(0.3);
        }

        console.log(` Created ${createdPosts.length} posts`);

        // Шаг 4: Добавление комментариев к постам
        if (createdPosts.length > 0) {
            for (const post of createdPosts) {
                const commentData = DataGenerator.generateComment(post.id, newUser.email);
                const commentResponse = http.post(
                    `${ENV.BASE_URL}${API_ENDPOINTS.COMMENTS}`,
                    JSON.stringify(commentData),
                    { headers: { 'Content-Type': 'application/json' } }
                );

                if (check(commentResponse, {
                    'comment added to post': (r) => r.status === 201
                })) {
                    journeySteps.add(1);
                }
                sleep(0.2);
            }
            console.log(` Added comments to ${createdPosts.length} posts`);
        }

        // Шаг 5: Создание задач (todos)
        const todoData = DataGenerator.generateTodo(userId);
        const todoResponse = http.post(
            `${ENV.BASE_URL}${API_ENDPOINTS.TODOS}`,
            JSON.stringify(todoData),
            { headers: { 'Content-Type': 'application/json' } }
        );

        if (check(todoResponse, {
            'todo item created': (r) => r.status === 201
        })) {
            journeySteps.add(1);
            console.log(` Todo item created for user ${userId}`);
        }
        sleep(0.5);

        // Шаг 6: Получение ленты активности пользователя
        const batchRequests = [
            ['GET', `${ENV.BASE_URL}${API_ENDPOINTS.USERS}/${userId}/posts`],
            ['GET', `${ENV.BASE_URL}${API_ENDPOINTS.USERS}/${userId}/comments`],
            ['GET', `${ENV.BASE_URL}${API_ENDPOINTS.USERS}/${userId}/todos`],
            ['GET', `${ENV.BASE_URL}${API_ENDPOINTS.USERS}/${userId}/albums`]
        ];

        const batchResponses = http.batch(batchRequests);

        const batchChecks = check(batchResponses, {
            'all user data retrieved': (r) =>
                r[0].status === 200 &&
                r[1].status === 200 &&
                r[2].status === 200 &&
                r[3].status === 200
        });

        if (batchChecks) {
            journeySteps.add(1);
            console.log(` All user activity data retrieved for ${userId}`);
        }
    }

    // Завершение сценария
    const journeyEnd = Date.now();
    journeyDuration.add(journeyEnd - journeyStart);

    if (!journeyFailed) {
        journeySuccess.add(true);
        console.log(' User journey completed successfully!');
    } else {
        journeySuccess.add(false);
        console.log(' User journey failed');
    }
}