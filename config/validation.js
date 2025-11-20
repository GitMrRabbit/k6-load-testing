// Этот файл содержит функции валидации конфигурационных файлов.
// Валидация проверяет корректность настроек перед запуском тестов, чтобы избежать ошибок во время выполнения.

const path = require('path');

// Определение среды выполнения - берется из переменной окружения NODE_ENV
// Если переменная не задана, используется 'development' по умолчанию
const env = process.env.NODE_ENV || 'development';

// Загрузка соответствующей конфигурации для текущей среды
// Сначала пытаемся загрузить конфиг для указанной среды, если не найден - используем default
let config;
try {
  config = require(`./${env}`);
} catch (error) {
  console.warn(`Конфигурация для среды '${env}' не найдена, используется default`);
  config = require('./default');
}

// Функция validateConfig проверяет все критически важные настройки
function validateConfig() {
  // Массив для сбора всех найденных ошибок валидации
  const errors = [];

  // Проверка базового URL приложения
  // URL должен существовать и начинаться с http или https
  if (!config.baseUrl || !config.baseUrl.startsWith('http')) {
    errors.push('BASE_URL должен быть валидным HTTP(S) URL');
  }

  // Проверка всех сетевых портов в конфигурации
  // Все порты должны быть в допустимом диапазоне от 1 до 65535
  const ports = [
    config.monitoring.prometheus.port,     // Порт Prometheus
    config.monitoring.grafana.port,        // Порт Grafana
    config.monitoring.alertmanager.port,   // Порт Alertmanager
    config.monitoring.k6Dashboard.port     // Порт дашборда k6
  ];

  // Проверяем каждый порт в массиве
  ports.forEach(port => {
    if (port < 1 || port > 65535) {
      errors.push(`Порт ${port} не валиден (должен быть от 1 до 65535)`);
    }
  });

  // Проверка количества виртуальных пользователей (VUS)
  // VUS должны быть в заданных пределах (не в заданных именно здесь - а требуемых системой)
  if (config.vus < 1 || config.vus > 1000) {
    errors.push('VUS должен быть от 1 до 1000');
  }

  // Проверка процента искусственных ошибок для chaos engineering
  // Значение должно быть от 0 (0%) до 1 (100%)
  if (config.testOptions.chaosFailureRate < 0 || config.testOptions.chaosFailureRate > 1) {
    errors.push('CHAOS_FAILURE_RATE должен быть от 0 до 1');
  }

  // Если найдены ошибки валидации, выводим их и завершаем программу с кодом ошибки
  if (errors.length > 0) {
    console.error('Ошибки конфигурации:');
    errors.forEach(error => console.error(`- ${error}`));
    process.exit(1); // Код выхода 1 означает ошибку
  }

  // Если ошибок нет, выводим сообщение об успешной валидации
  console.log(' Конфигурация валидна');
}

module.exports = { validateConfig };
