// tests/libs/data-generator.js
// Этот файл содержит класс DataGenerator для генерации тестовых данных.
// Позволяет создавать реалистичные данные для пользователей, постов, комментариев и задач.
// Используется для наполнения тестов данными без жесткого кодирования.

// Класс для генерации тестовых данных
export class DataGenerator {
    // Генерирует данные пользователя
    // Возвращает объект с полями: id, name, username, email, phone, website
    static generateUser() {
        // Генерируем уникальный ID от 1 до 1000
        const id = Math.floor(Math.random() * 1000) + 1;

        // Создаем данные пользователя
        return {
            id: id,
            name: `User ${id}`,  // Имя пользователя
            username: `user${id}`,  // Логин
            email: `user${id}@testmail.com`,  // Email для тестирования
            phone: `+1-555-${Math.random().toString().substr(2, 3)}-${Math.random().toString().substr(2, 4)}`, // Телефон
            website: `https://user${id}.com` // Сайт пользователя
        };
    }

    // Генерирует данные поста для указанного пользователя
    // userId - ID пользователя, который создает пост
    // Возвращает объект с полями: userId, title, body
    static generatePost(userId) {
        return {
            userId: userId,  // Автор поста
            title: `Test Post ${Math.random().toString(36).substring(7)}`, // Заголовок с случайным текстом
            body: `This is a comprehensive test post body generated at ${new Date().toISOString()}. It contains detailed information for testing purposes.` // Содержимое поста
        };
    }

    // Генерирует данные комментария к посту
    // postId - ID поста, к которому пишется комментарий
    // email - email автора комментария
    // Возвращает объект с полями: postId, name, email, body
    static generateComment(postId, email) {
        return {
            postId: postId,   // Пост, к которому комментарий
            name: `Comment Author ${Math.random().toString(36).substring(7)}`, // Имя автора комментария
            email: email,   // Email автора
            body: `This is a test comment for post ${postId}. Generated at: ${Date.now()}` // Текст комментария
        };
    }

    // Генерирует данные задачи (TODO) для пользователя
    // userId - ID пользователя, которому назначена задача
    // Возвращает объект с полями: userId, title, completed
    static generateTodo(userId) {
        return {
            userId: userId,  // Владелец задачи
            title: `Todo Item ${Math.random().toString(36).substring(7)}`, // Название задачи
            completed: Math.random() > 0.5   // Случайный статус выполнения (true/false)
        };
    }
}

// Примерно так выглядит:
// const user = DataGenerator.generateUser();
// console.log(user); // { id: 123, name: "User 123", ... }
//
// const post = DataGenerator.generatePost(1);
// console.log(post); // { userId: 1, title: "Test Post abc123", ... }
