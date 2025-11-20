// Этот файл содержит тестовые данные
// Здесь определены функции для генерации реалистичных тестовых данных различных типов.

// complexPayloads - объект с функциями генерации сложных тестовых данных
// Этот объект содержит простые функции для создания тестовых данных разных типов
// Каждая функция принимает overrides (переопределения) для кастомизации данных
export const complexPayloads = {
    // createUser - создает данные нового пользователя для тестирования
    // Пример использования: complexPayloads.createUser({name: "Иван Иванов"})
    createUser: (overrides = {}) => {
        // Базовые данные пользователя
        const baseUser = {
            name: `Test User ${Date.now()}`,  // Уникальное имя с timestamp
            username: `testuser_${Math.random().toString(36).substr(2, 9)}`,  // Уникальный логин
            email: `test${Date.now()}@example.com`,  // Уникальный email
            address: {
                street: '123 Test Street',
                city: 'Test City',
                zipcode: '12345',
                geo: { lat: '-37.3159', lng: '81.1496' }  // Координаты для карт
            },
            phone: '1-555-123-4567',  // Телефон в международном формате
            website: 'https://test.example.com',  // Сайт для тестирования ссылок
            company: {
                name: 'Test Company',
                catchPhrase: 'dementia and courage!',  // Девиз компании
                bs: 'flipping penguins'  // Описание бизнеса
            }
        };
        // Объединяем базовые данные с переопределениями (k6 совместимый способ)
        return Object.assign({}, baseUser, overrides);
    },

    // createPost - создает данные для поста в блоге
    // userId - ID автора поста (обязательно)
    // Пример: complexPayloads.createPost(1, {title: "Мой пост"})
    createPost: (userId, overrides = {}) => {
        const basePost = {
            userId: userId,  // Кто написал пост
            title: `Comprehensive Test Post ${Math.random().toString(36).substr(2, 5)}`,  // Заголовок
            body: `This is a detailed test post content. It includes multiple paragraphs and various data points for comprehensive testing.\n\nGenerated at: ${new Date().toISOString()}\nUser ID: ${userId}\nRandom ID: ${Math.random().toString(36).substr(2, 10)}`  // Содержимое поста
        };
        return Object.assign({}, basePost, overrides);
    },

    // createComment - создает данные для комментария к посту
    // postId - ID поста, email - email комментатора
    // Пример: complexPayloads.createComment(1, "test@example.com")
    createComment: (postId, email, overrides = {}) => {
        const baseComment = {
            postId: postId,  // К какому посту комментарий
            name: `Test Commenter ${Math.random().toString(36).substr(2, 5)}`,  // Имя комментатора
            email: email,  // Email для связи
            body: `This comment was automatically generated for testing purposes.\nPost ID: ${postId}\nTimestamp: ${Date.now()}`  // Текст комментария
        };
        return Object.assign({}, baseComment, overrides);
    }
};

// Функции-обертки для обратной совместимости с существующим кодом
// generatePostData - простая функция для генерации данных поста
export function generatePostData() {
    const userId = Math.floor(Math.random() * 10) + 1;  // Случайный userId от 1 до 10
    return complexPayloads.createPost(userId);
}

// generateUserData - простая функция для генерации данных пользователя
export function generateUserData() {
    return complexPayloads.createUser();
}

// generateCommentData - простая функция для генерации данных комментария
export function generateCommentData(postId, email) {
    return complexPayloads.createComment(postId, email);
}

// generateComplexScenarioData - генерирует комплексные тестовые данные для сложных сценариев
export function generateComplexScenarioData() {
    // Базовая структура данных для комплексного сценария
    const baseData = {
        user: complexPayloads.createUser(),  // Данные пользователя
        posts: [],                           // Массив постов пользователя
        comments: []                         // Массив комментариев
    };

    // Генерируем несколько постов для пользователя
    for (let i = 0; i < 3; i++) {
        const post = complexPayloads.createPost(1);  // Все посты от userId = 1
        baseData.posts.push(post);
    }

    // Возвращаем готовую структуру данных
    return baseData;
}

// Параметризованные генераторы данных - интеграция с parameterization.js
// generateParameterizedUser - генерирует пользователя с возможностью переопределения
export function generateParameterizedUser(overrides = {}) {
    return complexPayloads.createUser(overrides);
}

// generateParameterizedPost - генерирует пост с параметризацией
export function generateParameterizedPost(userId = null, overrides = {}) {
    const finalUserId = userId || Math.floor(Math.random() * 10) + 1;
    return complexPayloads.createPost(finalUserId, overrides);
}

// generateParameterizedComment - генерирует комментарий с параметризацией
export function generateParameterizedComment(postId = null, email = null, overrides = {}) {
    const finalPostId = postId || Math.floor(Math.random() * 100) + 1;
    const finalEmail = email || `test${Date.now()}@example.com`;
    return complexPayloads.createComment(finalPostId, finalEmail, overrides);
}

// generateBulkData - генерирует массив данных для bulk операций
export function generateBulkData(type, count = 10) {
    const data = [];
    for (let i = 0; i < count; i++) {
        switch (type) {
            case 'users':
                data.push(complexPayloads.createUser());
                break;
            case 'posts':
                data.push(complexPayloads.createPost(Math.floor(Math.random() * 10) + 1));
                break;
            case 'comments':
                data.push(complexPayloads.createComment(
                    Math.floor(Math.random() * 100) + 1,
                    `test${Date.now() + i}@example.com`
                ));
                break;
            default:
                throw new Error(`Unknown data type: ${type}`);
        }
    }
    return data;
}
