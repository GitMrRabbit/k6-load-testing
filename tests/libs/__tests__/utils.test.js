// Мокирование k6 модулей
// Назначение:
//   - Заменяем реальные k6 модули на Jest-моки для тестирования без запуска нагрузочных тестов.
//   - Позволяет проверять логику работы функций в изолированной среде.
//   - Гарантирует, что изменения в коде не сломают существующую функциональность.
// =============================================
jest.mock('k6/http', () => ({
  get: jest.fn(),  // Мокаем GET-запросы
  post: jest.fn()  // Мокаем POST-запросы
}), { virtual: true });

jest.mock('k6', () => ({
  check: jest.fn(),  // Мокаем функцию проверки результатов запросов
  Trend: jest.fn(() => ({ add: jest.fn() })),  // Мокаем метрику Trend (для времени ответа)
  Counter: jest.fn(() => ({ add: jest.fn() })), // Мокаем метрику Counter (для ошибок)
  Rate: jest.fn(() => ({ add: jest.fn() })),    // Мокаем метрику Rate (для успеха/неудачи)
  Gauge: jest.fn(() => ({ add: jest.fn() }))   // Мокаем метрику Gauge (для активных пользователей)
}), { virtual: true });

jest.mock('k6/metrics', () => ({
  Trend: jest.fn(() => ({ add: jest.fn() })),
  Counter: jest.fn(() => ({ add: jest.fn() })),
  Rate: jest.fn(() => ({ add: jest.fn() })),
  Gauge: jest.fn(() => ({ add: jest.fn() }))
}), { virtual: true });


// Импорт моков и инициализация метрик
const http = require('k6/http');
const { check } = require('k6');
const { Trend, Counter, Rate, Gauge } = require('k6/metrics');

// Экземпляры моков для всех метрик, которые используются в utils.js
const requestDuration = new Trend('request_duration');  // Метрика времени выполнения запроса
const errorCount = new Counter('errors');              // Метрика количества ошибок
const successRate = new Rate('success_rate');          // Метрика успеха запросов
const activeUsers = new Gauge('active_users');         // Метрика активных пользователей
const responseTimeTrend = new Trend('response_time');  // Метрика времени ответа
const throughputRate = new Rate('throughput');         // Метрика пропускной способности
const errorRate = new Rate('error_rate');              // Метрика частоты ошибок
const memoryUsage = new Gauge('memory_usage');          // Метрика использования памяти
const cpuUsage = new Gauge('cpu_usage');                // Метрика использования CPU

// Импортируем после моков, чтобы избежать конфликтов
const { makeGetRequest, makePostRequest } = require('../utils');

// Блок тестов для утилит
describe('Utils Functions', () => {
  // Сбрасываем все моки перед каждым тестом, чтобы избежать взаимного влияния
  beforeEach(() => {
    jest.clearAllMocks();
    requestDuration.add = jest.fn();
    errorCount.add = jest.fn();
    successRate.add = jest.fn();
  });


  // Тесты для функции makeGetRequest
  describe('makeGetRequest', () => {
    // Тест: успешный GET-запрос и корректный сбор метрик
    it('should make GET request and track metrics on success', () => {
      const mockResponse = {
        status: 200,
        timings: { duration: 150 }
      };
      http.get.mockReturnValue(mockResponse);
      check.mockReturnValue(true);

      const result = makeGetRequest('http://example.com/api', 'test_endpoint');

      // Проверяем, что GET-запрос был вызван с правильным URL
      expect(http.get).toHaveBeenCalledWith('http://example.com/api');
      // Проверяем, что результат соответствует моку
      expect(result).toBe(mockResponse);
      // Проверяем, что метрики времени и успеха были обновлены
      expect(requestDuration.add).toHaveBeenCalled();
      expect(successRate.add).toHaveBeenCalledWith(true, { endpoint: 'test_endpoint' });
    });

    // Тест: обработка неудачного GET-запроса (статус 500)
    it('should handle failed requests', () => {
      const mockResponse = {
        status: 500,
        timings: { duration: 200 }
      };
      http.get.mockReturnValue(mockResponse);
      check.mockReturnValue(false);

      makeGetRequest('http://example.com/api', 'test_endpoint');

      // Проверяем, что ошибка была зафиксирована в метриках
      expect(errorCount.add).toHaveBeenCalledWith(1, { endpoint: 'test_endpoint' });
      expect(successRate.add).toHaveBeenCalledWith(false, { endpoint: 'test_endpoint' });
    });

    // Тест: обработка сетевых ошибок (например, таймаут)
    it('should handle network errors', () => {
      http.get.mockImplementation(() => {
        throw new Error('Network error');
      });

      // Проверяем, что функция выбрасывает ошибку
      expect(() => makeGetRequest('http://example.com/api', 'test_endpoint')).toThrow('Network error');
    });
  });


  // Тесты для функции makePostRequest
  describe('makePostRequest', () => {
    // Тест: успешный POST-запрос с корректной полезной нагрузкой
    it('should make POST request with correct payload', () => {
      const mockResponse = {
        status: 201,
        timings: { duration: 300 }
      };
      const payload = { name: 'test', value: 123 };
      http.post.mockReturnValue(mockResponse);
      check.mockReturnValue(true);

      const result = makePostRequest('http://example.com/api', payload, 'create_test');

      // Проверяем, что POST-запрос был вызван с правильными параметрами
      expect(http.post).toHaveBeenCalledWith(
          'http://example.com/api',
          JSON.stringify(payload),
          { headers: { 'Content-Type': 'application/json' } }
      );
      expect(result).toBe(mockResponse);
    });

    // Тест: обработка неудачного POST-запроса (статус 400)
    it('should handle POST request failures', () => {
      const mockResponse = {
        status: 400,
        timings: { duration: 250 }
      };
      http.post.mockReturnValue(mockResponse);
      check.mockReturnValue(false);

      makePostRequest('http://example.com/api', {}, 'create_test');

      // Проверяем, что ошибка была зафиксирована в метриках
      expect(errorCount.add).toHaveBeenCalledWith(1, { endpoint: 'create_test' });
    });
  });


  // Тесты для обработки ошибок
  describe('Error handling', () => {
    // Тест: обработка некорректного URL
    it('should handle malformed URLs', () => {
      http.get.mockImplementation(() => {
        throw new Error('Invalid URL');
      });

      expect(() => makeGetRequest('invalid-url', 'test')).toThrow('Invalid URL');
    });

    // Тест: обработка таймаута запроса
    it('should handle timeout errors', () => {
      http.get.mockImplementation(() => {
        throw new Error('Request timeout');
      });

      expect(() => makeGetRequest('http://slow-api.com', 'slow_endpoint')).toThrow('Request timeout');
    });
  });

  // Тесты для сбора метрик
  describe('Metrics tracking', () => {
    // Тест: корректный сбор метрики времени ответа
    it('should track response time correctly', () => {
      const mockResponse = {
        status: 200,
        timings: { duration: 175 }
      };
      http.get.mockReturnValue(mockResponse);
      check.mockReturnValue(true);

      makeGetRequest('http://example.com', 'test');

      // Проверяем, что метрика времени была обновлена
      expect(requestDuration.add).toHaveBeenCalledWith(expect.any(Number), { endpoint: 'test' });
    });

    // Тест: сбор метрик пропускной способности
    it('should track throughput metrics', () => {
      const mockResponse = {
        status: 200,
        timings: { duration: 100 }
      };
      http.get.mockReturnValue(mockResponse);
      check.mockReturnValue(true);

      makeGetRequest('http://example.com', 'test');

      // Проверяем, что все метрики были обновлены
      expect(requestDuration.add).toHaveBeenCalled();
      expect(successRate.add).toHaveBeenCalled();
    });

    // Тест: корректный сбор метрики ошибок
    it('should track error rates correctly', () => {
      const mockResponse = {
        status: 500,
        timings: { duration: 200 }
      };
      http.get.mockReturnValue(mockResponse);
      check.mockReturnValue(false);

      makeGetRequest('http://example.com', 'failing_endpoint');

      // Проверяем, что ошибка была зафиксирована
      expect(errorCount.add).toHaveBeenCalledWith(1, { endpoint: 'failing_endpoint' });
      expect(successRate.add).toHaveBeenCalledWith(false, { endpoint: 'failing_endpoint' });
    });

    // Тест: агрегация метрик для нескольких запросов
    it('should handle multiple requests and aggregate metrics', () => {
      // Первый запрос: успешный
      http.get.mockReturnValueOnce({
        status: 200,
        timings: { duration: 100 }
      });
      check.mockReturnValueOnce(true);
      makeGetRequest('http://example.com/success', 'success_endpoint');

      // Второй запрос: неудачный
      http.get.mockReturnValueOnce({
        status: 404,
        timings: { duration: 50 }
      });
      check.mockReturnValueOnce(false);
      makeGetRequest('http://example.com/fail', 'fail_endpoint');

      // Проверяем, что метрики были обновлены для обоих запросов
      expect(requestDuration.add).toHaveBeenCalledTimes(2);
      expect(successRate.add).toHaveBeenCalledTimes(2);
      expect(errorCount.add).toHaveBeenCalledTimes(1); // Только для неудачного запроса
    });
  });
});
