import { check } from 'k6';
import http from 'k6/http';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';
import { SharedArray } from 'k6/data';
import { Rate, Trend } from 'k6/metrics';
import { ENV, API_ENDPOINTS } from '../libs/config.js';

console.log("STARTING TEST: Data Driven Test");

// Загрузка тестовых данных из CSV
const usersData = new SharedArray('users data', function() {
    return papaparse.parse(open('../data/users.csv'), { header: true }).data;
});

// Метрики для data-driven тестов
const dataDrivenSuccessRate = new Rate('data_driven_success_rate');
const processingTime = new Trend('data_processing_time');

export const options = {
    vus: 3,
    duration: '2m',
    thresholds: {
        'data_driven_success_rate': ['rate>0.9'],
        'data_processing_time': ['p(95)<1000']
    }
};

export default function() {
    // Выбор случайного пользователя из данных
    const user = usersData[Math.floor(Math.random() * usersData.length)];

    const startTime = Date.now();

    // Сценарий с использованием данных из CSV
    const payload = {
        name: user.name,
        username: user.username,
        email: user.email,
        address: {
            street: user.street,
            city: user.city,
            zipcode: user.zipcode
        },
        phone: user.phone,
        website: user.website,
        company: {
            name: user.company_name
        }
    };

    // Создание пользователя
    const createResponse = http.post(
        `${ENV.BASE_URL}${API_ENDPOINTS.USERS}`,
        JSON.stringify(payload),
        { headers: { 'Content-Type': 'application/json' } }
    );

    const createSuccess = check(createResponse, {
        'user created from CSV data': (r) => r.status === 201,
        'response contains CSV email': (r) => {
            if (r.status === 201) {
                const body = JSON.parse(r.body);
                return body.email === user.email;
            }
            return false;
        }
    });

    if (createSuccess) {
        const userId = JSON.parse(createResponse.body).id;

        // Создание поста от имени этого пользователя
        const postPayload = {
            userId: userId,
            title: `Post by ${user.name}`,
            body: `This post was created by ${user.name} (${user.email}) from our CSV data import.`
        };

        const postResponse = http.post(
            `${ENV.BASE_URL}${API_ENDPOINTS.POSTS}`,
            JSON.stringify(postPayload),
            { headers: { 'Content-Type': 'application/json' } }
        );

        const postSuccess = check(postResponse, {
            'post created for CSV user': (r) => r.status === 201
        });

        if (postSuccess) {
            // Успешное завершение цепочки
            dataDrivenSuccessRate.add(true);
        } else {
            dataDrivenSuccessRate.add(false);
        }
    } else {
        dataDrivenSuccessRate.add(false);
    }

    const endTime = Date.now();
    processingTime.add(endTime - startTime);
}