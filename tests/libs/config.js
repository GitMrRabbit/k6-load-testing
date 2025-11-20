// Этот файл содержит конфигурацию для тестов
// Здесь определены переменные окружения и эндпоинты API для тестирования.

// Конфигурация окружения
export const ENV = {
    // BASE_URL - базовый URL тестируемого приложения
    // По умолчанию используется JSONPlaceholder для демонстрации
    BASE_URL: __ENV.BASE_URL || 'https://jsonplaceholder.typicode.com',

    // TEST_DURATION - продолжительность теста (в формате k6, например '10m', '1h')
    TEST_DURATION: __ENV.TEST_DURATION || '10m',

    // VUS - количество виртуальных пользователей (Virtual Users)
    // Определяет параллельную нагрузку на приложение
    VUS: parseInt(__ENV.VUS) || 10,

    // ENABLE_CHAOS - включение chaos engineering (искусственных сбоев)
    // для тестирования отказоустойчивости
    ENABLE_CHAOS: __ENV.ENABLE_CHAOS === 'true',

    // CHAOS_FAILURE_RATE - процент искусственных ошибок (от 0 до 1)
    // 0.1 означает 10% запросов будут завершаться с ошибкой
    CHAOS_FAILURE_RATE: parseFloat(__ENV.CHAOS_FAILURE_RATE) || 0.1,

    // RESILIENCE - включение тестов на устойчивость системы
    // Проверяет поведение приложения при различных сбоях
    RESILIENCE: __ENV.RESILIENCE === 'true'
};

// API_ENDPOINTS - эндпоинты тестируемого API
// Все пути указаны относительно BASE_URL
export const API_ENDPOINTS = {
    // POSTS - эндпоинт для работы с постами (CRUD операции)
    POSTS: '/posts',

    // COMMENTS - эндпоинт для комментариев к постам
    COMMENTS: '/comments',

    // USERS - эндпоинт для пользователей системы
    USERS: '/users',

    // ALBUMS - эндпоинт для альбомов (фотографий)
    ALBUMS: '/albums',

    // PHOTOS - эндпоинт для отдельных фотографий
    PHOTOS: '/photos',

    // TODOS - эндпоинт для задач/списка дел
    TODOS: '/todos'
};
