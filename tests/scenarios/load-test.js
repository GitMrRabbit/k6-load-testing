// тест стабильной нагрузки на приложение.
// производительность системы под постоянной нагрузкой.
// имитация использование приложения множеством пользователей.

// Импортируем конфигурацию и вспомогательные функции
import {ENV, API_ENDPOINTS} from '../libs/config.js';
import {makeGetRequest, makePostRequest} from '../libs/utils.js';
import {complexPayloads} from '../data/test-data.js';
import {initializeParameters, getRandomUser, randomId, paramManager} from '../libs/parameterization.js';


// Инициализируем параметры для параметризации
initializeParameters();

// Выводим сообщение о начале теста
console.log("STARTING TEST: Load Test");

// Настройки теста с поэтапным увеличением нагрузки
export const options = {
    // Стадии теста - постепенное изменение количества виртуальных пользователей
    stages: [
        {duration: '30s', target: 1},    // Ramp-up:
        {duration: '2m', target: 2},     // Стабильная
        {duration: '30s', target: 4},    // Увеличение
        {duration: '30s', target: 4},    // Пиковая
        {duration: '1m', target: 0},      // Ramp-down:
    ],

    // Пороги производительности - критерии успешности теста
    thresholds: {
        http_req_duration: ['p(95)<2000', 'p(99)<5000'],     // 95% ответов < 2с, 99% < 5с
        http_req_failed: ['rate<0.05'],                       // Ошибок < 5%
        'request_duration{endpoint:get_posts}': ['p(95)<1500'], // GET посты < 1.5с
        'request_duration{endpoint:create_post}': ['p(95)<3000'], // POST посты < 3с
        success_rate: ['rate>0.95'],                          // Успех > 95%
        errors: ['count<100']                                 // Всего ошибок < 100
    },

    // Дополнительные настройки для облачного сервиса k6 Cloud
    ext: {
        loadimpact: {
            projectID: 12345,                    // ID проекта в k6 Cloud
            name: 'JSONPlaceholder Load Test'    // Название теста
        }
    }
};

// Основная функция теста - выполняется каждым VUS
export default function () {
    // Реализуем паттерн 70% чтения, 30% записи (типичное соотношение для многих приложений)
    const randomOperation = Math.random(); // Случайное число от 0 до 1

    if (randomOperation < 0.7) {
        // Операции чтения (70% запросов) - получение данных
        const postId = randomId(1, 100); // Используем параметризованный ID поста

        // Выполняем несколько GET запросов для имитации просмотра контента
        makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.POSTS}`, 'get_posts');           // Получить все посты
        makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.POSTS}/${postId}`, 'get_single_post'); // Получить конкретный пост
        makeGetRequest(`${ENV.BASE_URL}${API_ENDPOINTS.COMMENTS}?postId=${postId}`, 'get_comments'); // Получить комментарии к посту
    } else {
        // Операции записи (30% запросов) - создание контента
        // параметризованные данные: либо из CSV, либо сгенерированные
        let userId, postData;

        if (Math.random() < 0.5 && paramManager.getAll('users').length > 0) {
            // 50% шанса использовать данные из CSV
            const user = getRandomUser();
            userId = parseInt(user.id);
            postData = paramManager.generate('post', userId);
        } else {
            // Остальные случаи - генерируем данные
            userId = randomId(1, 10);
            postData = complexPayloads.createPost(userId);
        }

        makePostRequest(`${ENV.BASE_URL}${API_ENDPOINTS.POSTS}`, postData, 'create_post'); // Создаем новый пост
    }
}
