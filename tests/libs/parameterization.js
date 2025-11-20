// файл содержит утилиты для параметризации тестов
// Позволяет загружать данные из различных источников и генерировать параметризованные тестовые данные.

import { SharedArray } from 'k6/data';
import * as papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

// Класс для управления параметризацией тестов
export class ParameterManager {
    constructor() {
        this.dataSources = new Map(); // Хранилище загруженных данных
        this.generators = new Map();  // Хранилище генераторов данных
    }

    // Загрузка данных из CSV файла
    // filePath - путь к CSV файлу относительно корня проекта
    // name - имя для ссылки на эти данные
    loadCSV(filePath, name) {
        try {
            const data = new SharedArray(name, function() {
                return papaparse.parse(open(filePath), { header: true }).data;
            });
            this.dataSources.set(name, data);
            console.log(`Loaded ${data.length} records from CSV: ${name}`);
            return data;
        } catch (error) {
            console.error(`Failed to load CSV ${filePath}: ${error.message}`);
            return [];
        }
    }

    // Загрузка данных из JSON файла
    // filePath - путь к JSON файлу
    // name - имя для ссылки на эти данные
    loadJSON(filePath, name) {
        try {
            const data = new SharedArray(name, function() {
                return JSON.parse(open(filePath));
            });
            this.dataSources.set(name, data);
            console.log(`Loaded ${data.length} records from JSON: ${name}`);
            return data;
        } catch (error) {
            console.error(`Failed to load JSON ${filePath}: ${error.message}`);
            return [];
        }
    }

    // Регистрация генератора данных
    // name - имя генератора
    // generatorFn - функция, возвращающая данные
    registerGenerator(name, generatorFn) {
        this.generators.set(name, generatorFn);
        console.log(`Registered data generator: ${name}`);
    }

    // Получение случайного элемента из источника данных
    // sourceName - имя источника данных
    getRandomFrom(sourceName) {
        const source = this.dataSources.get(sourceName);
        if (!source || source.length === 0) {
            console.warn(`Data source '${sourceName}' not found or empty`);
            return null;
        }
        return source[Math.floor(Math.random() * source.length)];
    }

    // Получение данных от генератора
    // generatorName - имя генератора
    // ...args - аргументы для генератора
    generate(generatorName, ...args) {
        const generator = this.generators.get(generatorName);
        if (!generator) {
            console.warn(`Generator '${generatorName}' not found`);
            return null;
        }
        return generator(...args);
    }

    // Получение всех данных из источника
    getAll(sourceName) {
        return this.dataSources.get(sourceName) || [];
    }
}

// Глобальный экземпляр менеджера параметров
export const paramManager = new ParameterManager();

// Вспомогательные функции для быстрого доступа

// Получение случайного пользователя из CSV
export function getRandomUser() {
    return paramManager.getRandomFrom('users');
}

// Получение случайного поста из CSV (если есть)
export function getRandomPost() {
    return paramManager.getRandomFrom('posts');
}

// Генерация случайного ID в диапазоне
export function randomId(min = 1, max = 100) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Генерация случайной строки
export function randomString(length = 10) {
    return Math.random().toString(36).substring(2, length + 2);
}

// Генерация случайного email
export function randomEmail() {
    const domains = ['example.com', 'test.com', 'demo.com', 'sample.com'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${randomString(8)}@${domain}`;
}

// Инициализация стандартных источников данных
// Эта функция должна вызываться в начале тестов
export function initializeParameters() {
    // Загружаем пользователей из CSV
    paramManager.loadCSV('../data/users.csv', 'users');

    // Регистрируем генераторы данных
    paramManager.registerGenerator('user', () => ({
        id: randomId(),
        name: `Generated User ${randomString(5)}`,
        email: randomEmail(),
        username: `user_${randomString(6)}`
    }));

    paramManager.registerGenerator('post', (userId = null) => ({
        userId: userId || randomId(1, 10),
        title: `Test Post ${randomString(8)}`,
        body: `Generated post content ${randomString(20)}`
    }));

    paramManager.registerGenerator('comment', (postId = null, email = null) => ({
        postId: postId || randomId(1, 100),
        name: `Commenter ${randomString(5)}`,
        email: email || randomEmail(),
        body: `Generated comment ${randomString(15)}`
    }));

    console.log('Parameter manager initialized');
}
