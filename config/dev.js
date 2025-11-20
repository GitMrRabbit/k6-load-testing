// Этот файл содержит конфигурацию для среды разработки (development).
// Здесь переопределяются настройки из default.js для удобства разработки и тестирования.
// используются менее строгие настройки и больше отладочной информации.

module.exports = {
  // baseUrl - URL тестового приложения для разработки
  baseUrl: process.env.BASE_URL || 'https://jsonplaceholder.typicode.com',

  // testDuration - короче, чем в prod, для быстрой проверки
  testDuration: process.env.TEST_DURATION || '5m',

  // vus - количество виртуальных пользователей для разработки
  // Может быть меньше, чем в prod, для экономии ресурсов
  vus: parseInt(process.env.VUS) || 10,

  // testOptions - параметры тестирования для dev среды
  testOptions: {
    // enableChaos
    enableChaos: process.env.ENABLE_CHAOS === 'true' || false,
    // chaosFailureRate - процент искусственных ошибок (0.0 значит отключено)
    chaosFailureRate: parseFloat(process.env.CHAOS_FAILURE_RATE) || 0.0,
    // monitoringEnabled - сбор метрик включен для анализа результатов
    monitoringEnabled: true,
    // alertsEnabled - оповещения отключены
    alertsEnabled: false
  },

  // monitoring - настройки систем мониторинга для dev среды
  monitoring: {
    prometheus: {
      // port - порт Prometheus
      port: parseInt(process.env.PROMETHEUS_PORT) || 9090,
      // retention - сколько хранить метрики (1d = 1 день, меньше чем в prod для экономии места)
      retention: process.env.PROMETHEUS_RETENTION || '1d'
    },
    grafana: {
      // port - порт Grafana
      port: parseInt(process.env.GRAFANA_PORT) || 3001,
      // adminPassword
      adminPassword: process.env.GRAFANA_ADMIN_PASSWORD || 'admin',
      // anonymousAccess - разрешен ли анонимный
      anonymousAccess: true
    },
    alertmanager: {
      // port - порт Alertmanager
      port: parseInt(process.env.ALERTMANAGER_PORT) || 9093,
      // slackWebhook - URL для отправки уведомлений в Slack
      slackWebhook: process.env.SLACK_WEBHOOK_URL,
      // emailTo - email для отправки оповещений
      emailTo: process.env.ALERT_EMAIL_TO
    },
    k6Dashboard: {
      // port - порт встроенного дашборда k6
      port: parseInt(process.env.K6_DASHBOARD_PORT) || 6565
    }
  },

  // security - настройки безопасности для dev среды
  security: {
    // apiKey - API ключ для аутентификации в тестируемом приложении
    apiKey: process.env.API_KEY,
    // basicAuth - базовая HTTP аутентификация
    basicAuth: {
      username: process.env.BASIC_AUTH_USER,  // Имя пользователя
      password: process.env.BASIC_AUTH_PASS   // Пароль
    },
    // tlsSkipVerify - пропускать ли проверку SSL сертификатов
    tlsSkipVerify: process.env.TLS_SKIP_VERIFY === 'true' || true
  },

  // thresholds - пороги производительности, которые должны соблюдаться во время тестов
  // Если метрики превышают эти пороги, тест считается провалившимся
  thresholds: {
    // responseTime95p - 95-й процентиль времени ответа должен быть меньше 2000мс
    responseTime95p: parseInt(process.env.THRESHOLD_RESPONSE_TIME_95P) || 2000,
    // errorRate - процент ошибок должен быть меньше 0.1 (10%)
    errorRate: parseFloat(process.env.THRESHOLD_ERROR_RATE) || 0.1,
    // throughputMin - минимальная пропускная способность (в секунду)
    throughputMin: parseInt(process.env.THRESHOLD_THROUGHPUT_MIN) || 5
  }
};
