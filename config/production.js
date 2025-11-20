// Этот файл содержит конфигурацию для prod среды.

module.exports = {
  // baseUrl - URL боевого приложения, которое будет тестироваться
  baseUrl: process.env.BASE_URL || 'https://api.production.com',

  // testDuration - длительный тест для проверки стабильности под реальной нагрузкой
  testDuration: process.env.TEST_DURATION || '30m',

  // vus - большое количество виртуальных пользователей для имитации реальной нагрузки
  vus: parseInt(process.env.VUS) || 100,

  // testOptions - параметры тестирования для production
  testOptions: {
    // enableChaos
    enableChaos: process.env.ENABLE_CHAOS === 'true' || false,
    // chaosFailureRate - небольшой процент искусственных ошибок для тестирования resilience
    chaosFailureRate: parseFloat(process.env.CHAOS_FAILURE_RATE) || 0.05,
    // monitoringEnabled - сбор метрик
    monitoringEnabled: true,
    // alertsEnabled - оповещения
    alertsEnabled: true
  },

  // monitoring - настройки мониторинга
  monitoring: {
    prometheus: {
      // port - порт Prometheus
      port: parseInt(process.env.PROMETHEUS_PORT) || 9090,
      // retention - длительное хранение метрик (30 дней)
      retention: process.env.PROMETHEUS_RETENTION || '30d'
    },
    grafana: {
      // port - порт Grafana
      port: parseInt(process.env.GRAFANA_PORT) || 3001,
      // adminPassword
      adminPassword: process.env.GRAFANA_ADMIN_PASSWORD || 'secure_password',
      // anonymousAccess - анонимный доступ отключен
      anonymousAccess: false
    },
    alertmanager: {
      // port - порт Alertmanager
      port: parseInt(process.env.ALERTMANAGER_PORT) || 9093,
      // slackWebhook - URL для отправки оповещений в Slack команде
      slackWebhook: process.env.SLACK_WEBHOOK_URL,
      // emailTo - email для отправки критических оповещений
      emailTo: process.env.ALERT_EMAIL_TO
    },
    k6Dashboard: {
      // port - порт дашборда k6
      port: parseInt(process.env.K6_DASHBOARD_PORT) || 6565
    }
  },

  // security
  security: {
    // apiKey - API ключ для аутентификации
    apiKey: process.env.API_KEY,
    // basicAuth - базовая аутентификация для защищенных эндпоинтов
    basicAuth: {
      username: process.env.BASIC_AUTH_USER,  // Имя пользователя для доступа
      password: process.env.BASIC_AUTH_PASS   // Пароль для доступа
    },
    // tlsSkipVerify - проверка SSL сертификатов
    tlsSkipVerify: process.env.TLS_SKIP_VERIFY === 'true' || false
  },

  // thresholds
  thresholds: {
    // responseTime95p - 95-й процентиль времени ответа
    responseTime95p: parseInt(process.env.THRESHOLD_RESPONSE_TIME_95P) || 1000,
    // errorRate - процент ошибок
    errorRate: parseFloat(process.env.THRESHOLD_ERROR_RATE) || 0.01,
    // throughputMin - минимальная пропускная способность
    throughputMin: parseInt(process.env.THRESHOLD_THROUGHPUT_MIN) || 50
  }
};
