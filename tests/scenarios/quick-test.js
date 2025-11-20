import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';

// Кастомные метрики для быстрого теста
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// Опции теста - очень быстрый smoke тест
export const options = {
  vus: 1,              // 1 виртуальный пользователь
  duration: '10s',     // Длительность 10 секунд
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% запросов должны быть < 500ms
    errors: ['rate<0.1'],             // Ошибок должно быть < 10%
  },
};

// Тестовый сценарий
export default function () {
  const startTime = new Date().getTime();

  // Простой HTTP GET запрос к httpbin.org (тестовый сервис)
  const response = http.get('https://httpbin.org/get', {
    headers: {
      'User-Agent': 'k6-quick-test',
    },
  });

  const endTime = new Date().getTime();
  const duration = endTime - startTime;

  // Проверка ответа
  const checkResult = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
    'has json response': (r) => r.json() !== undefined,
  });

  // Запись метрик
  errorRate.add(!checkResult);
  responseTime.add(duration);

  // Небольшая пауза между запросами
  sleep(1);
}

// Setup функция - выполняется перед тестом
// TODO: продумать логику перехода от одной точки входа при запуске ENV
export function setup() {
  console.log(' Starting quick k6 test...');
  console.log(' Testing connection to monitoring services...');
}

// Teardown функция - выполняется после теста
export function teardown(data) {
  console.log(' Quick test completed!');
  console.log(' Check results in Grafana: http://localhost:3001');
  console.log(' InfluxDB: http://localhost:8086');
}
