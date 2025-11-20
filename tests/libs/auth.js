import http from 'k6/http';
import { check } from 'k6';

// Глобальная переменная для хранения токенов между итерациями
let authTokens = {};

export function login(userCredentials) {
    const response = http.post('https://jsonplaceholder.typicode.com/users', {
        username: userCredentials.username,
        password: userCredentials.password
    });

    const success = check(response, {
        'login successful': (r) => r.status === 201,
    });

    if (success) {
        // В реальном API был бы токен
        const fakeToken = `token_${Date.now()}_${Math.random().toString(36)}`;
        authTokens[userCredentials.username] = fakeToken;
        return fakeToken;
    }
    return null;
}

export function getAuthToken(username) {
    return authTokens[username] || null;
}

export function logout(username) {
    delete authTokens[username];
}