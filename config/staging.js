// Этот файл содержит конфигурацию для staging


module.exports = {
  // baseUrl - URL staging
  baseUrl: process.env.BASE_URL || 'https://api.staging.com',

  // testDuration - средняя продолжительность теста
  testDuration: process.env.TEST_DURATION || '15m',

  // vus - среднее количество виртуальных пользователей
  vus: parseInt(process.env.VUS) || 50,

  // testOptions - параметры тестирования для staging
  testOptions: {
    // enableChaos - chaos engineering включен
    enableChaos: process.env.ENABLE_CHAOS === 'true' || true,
    // chaosFailureRate - 10% искусственных ошибок для тестирования отказоустойчивости
    chaosFailureRate: parseFloat(process.env.CHAOS_FAILURE_RATE) || 0.1,
    // monitoringEnabled - сбор метрик
    monitoringEnabled: true,
    // alertsEnabled - оповещения отключены
    alertsEnabled: false
  },

  // monitoring - настройки мониторинга
  monitoring: {
    prometheus: {
      // port - порт Prometheus
      port: parseInt(process.env.PROMETHEUS_PORT) || 9090,
      // retention - средний период хранения метрик (7 дней)
      retention: process.env.PROMETHEUS_RETENTION || '7d'
    },
    grafana: {
      // port - порт Grafana
      port: parseInt(process.env.GRAFANA_PORT) || 3001,
      // adminPassword - пароль для staging среды
      adminPassword: process.env.GRAFANA_ADMIN_PASSWORD || 'staging_admin',
      // anonymousAccess - анонимный доступ разрешен
      anonymousAccess: true
    },
    alertmanager: {
      // port - порт Alertmanager
      port: parseInt(process.env.ALERTMANAGER_PORT) || 9093,
      // slackWebhook - URL для оповещений (может быть тестовый канал)
      slackWebhook: process.env.SLACK_WEBHOOK_URL,
      // emailTo - email для оповещений о проблемах
      emailTo: process.env.ALERT_EMAIL_TO
    },
    k6Dashboard: {
      // port - порт дашборда k6
      port: parseInt(process.env.K6_DASHBOARD_PORT) || 6565
    }
  },

  // security - настройки безопасности
  security: {
    // apiKey - API ключ
    apiKey: process.env.API_KEY,
    // basicAuth - базовая аутентификация
    basicAuth: {
      username: process.env.BASIC_AUTH_USER,  // Тестовый пользователь
      password: process.env.BASIC_AUTH_PASS   // Тестовый пароль
    },
    // tlsSkipVerify - проверка SSL может быть отключена для самоподписанных сертификатов
    tlsSkipVerify: process.env.TLS_SKIP_VERIFY === 'true' || true
  },

  // thresholds - пороги производительности для staging
  thresholds: {
    // responseTime95p - 95-й процентиль времени ответа (мс)
    responseTime95p: parseInt(process.env.THRESHOLD_RESPONSE_TIME_95P) || 1500,
    // errorRate - процент ошибок (0.05 = 5%)
    errorRate: parseFloat(process.env.THRESHOLD_ERROR_RATE) || 0.05,
    // throughputMin - минимальная пропускная способность (25 запросов в секунду)
    throughputMin: parseInt(process.env.THRESHOLD_THROUGHPUT_MIN) || 25
  }
};
