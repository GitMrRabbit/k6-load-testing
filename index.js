// Этот файл является точкой входа для проекта k6 load testing.
// содержит основную логику запуска тестов и инициализации проекта.

// Импортируем необходимые модули
import { validateConfig } from './config/validation.js';  // Валидация конфигурации
import { ENV } from './tests/libs/config.js';             // Конфигурация окружения

// Основная функция инициализации проекта
function initializeProject() {
    console.log('Инициализация проекта k6 Load Testing');
    console.log('=====================================');

    // Вывод информации о текущем окружении
    console.log(`Текущее окружение: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Базовый URL: ${ENV.BASE_URL}`);
    console.log(`Количество VUS: ${ENV.VUS}`);
    console.log(`Продолжительность теста: ${ENV.TEST_DURATION}`);
    console.log(`Chaos Engineering: ${ENV.ENABLE_CHAOS ? 'Включен' : 'Отключен'}`);

    // Валидация конфигурации перед запуском
    try {
        validateConfig();
        console.log('Конфигурация валидна');
    } catch (error) {
        console.error('Ошибка валидации конфигурации:', error.message);
        process.exit(1);
    }

    console.log('=====================================');
    console.log('Проект готов к запуску тестов!');
    console.log('');
    console.log('Доступные команды:');
    console.log('  npm run smoke     - Запуск smoke тестов');
    console.log('  npm run load      - Запуск load тестов');
    console.log('  npm run stress    - Запуск stress тестов');
    console.log('  npm run report    - Генерация HTML отчета');
}

// Запуск инициализации при выполнении файла
initializeProject();
