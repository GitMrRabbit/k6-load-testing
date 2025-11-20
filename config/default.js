// Этот файл содержит базовую конфигурацию для проекта
const path = require('path');

// Экспортируем объект с настройками, который будет использоваться во всем проекте
module.exports = {
  // Основные настройки тестирования
  // baseUrl - базовый URL тестируемого приложения, куда будут отправляться все HTTP запросы
  // process.env.BASE_URL берет значение из переменной окружения, если она не задана - используется значение по умолчанию
  baseUrl: process.env.BASE_URL || 'https://jsonplaceholder.typicode.com',

  // testDuration - продолжительность выполнения теста (например, '10m' значит 10 минут)
  // Во время этого времени виртуальные пользователи будут выполнять сценарий теста
  testDuration: process.env.TEST_DURATION || '10m',

  // vus (Virtual Users) - количество виртуальных пользователей, которые одновременно выполняют тест
  // Каждый VUS запускает отдельный экземпляр сценария теста, создавая параллельную нагрузку на сервер
  // parseInt преобразует строковое значение из переменной окружения в число
  vus: parseInt(process.env.VUS) || 10,

  // Пути к директориям проекта
  // path.join создает корректные пути, совместимые с операционной системой
  // __dirname - это директория текущего файла (config), .. поднимается на уровень выше
  testsDir: path.join(__dirname, '..', 'tests'),     // Директория с тестовыми сценариями
  scriptsDir: path.join(__dirname, '..', 'scripts'), // Директория со скриптами автоматизации
  resultsDir: process.env.RESULTS_DIR || 'results',   // Директория для сохранения результатов тестов

  // API endpoints - конкретные пути к различным частям API приложения
  // Эти эндпоинты будут комбинироваться с baseUrl для формирования полных URL запросов
  apiEndpoints: {
    posts: '/posts',      // Эндпоинт для работы с постами (статьями)
    comments: '/comments', // Эндпоинт для работы с комментариями
    users: '/users'       // Эндпоинт для работы с пользователями
  },

  // Настройки систем мониторинга для сбора метрик во время тестирования
  monitoring: {
    prometheus: {
      // Порт, на котором работает Prometheus для сбора и хранения метрик
      port: parseInt(process.env.PROMETHEUS_PORT) || 9090,
      // Путь к файлу конфигурации Prometheus
      configFile: path.join(__dirname, '..', 'prometheus', 'prometheus.yml')
    },
    grafana: {
      // Порт для веб-интерфейса Grafana, где отображаются графики и дашборды
      port: parseInt(process.env.GRAFANA_PORT) || 3001,
      // Учетные данные администратора для доступа к Grafana
      adminUser: process.env.GRAFANA_ADMIN_USER || 'admin',
      adminPassword: process.env.GRAFANA_ADMIN_PASSWORD || 'admin'
    },
    alertmanager: {
      // Порт для Alertmanager - системы оповещений о проблемах
      port: parseInt(process.env.ALERTMANAGER_PORT) || 9093
    },
    k6Dashboard: {
      // Порт для встроенного дашборда k6 с метриками в реальном времени
      port: parseInt(process.env.K6_DASHBOARD_PORT) || 6565
    }
  },

  // Настройки параметров тестирования
  testOptions: {
    // enableChaos - включать ли chaos engineering (искусственное создание проблем для тестирования устойчивости)
    enableChaos: process.env.ENABLE_CHAOS === 'true',
    // chaosFailureRate - процент запросов, которые будут искусственно fail (0.1 = 10%)
    chaosFailureRate: parseFloat(process.env.CHAOS_FAILURE_RATE) || 0.1,
    // resilience - включать ли механизмы отказоустойчивости (повторные попытки, fallback)
    resilience: process.env.RESILIENCE === 'true',
    // monitoringEnabled - собирать ли метрики во время теста
    monitoringEnabled: true,
    // alertsEnabled - отправлять ли оповещения при проблемах
    alertsEnabled: false
  },

  // Настройки генерации отчетов после завершения тестов
  reports: {
    // generateHtml - создавать ли HTML отчеты с графиками и таблицами
    generateHtml: process.env.GENERATE_HTML_REPORT === 'true',
    // generatePdf - создавать ли PDF версии отчетов
    generatePdf: process.env.GENERATE_PDF_REPORT === 'true'
  },

  // Настройки для систем непрерывной интеграции (CI/CD)
  ci: {
    // registryImage - образ Docker для развертывания в CI (теперь использует GitHub Container Registry)
    registryImage: process.env.GITHUB_REGISTRY_IMAGE,
    // slackWebhook - URL для отправки уведомлений в Slack
    slackWebhook: process.env.SLACK_WEBHOOK_URL
  },

  // Настройки Docker для контейнеризации
  docker: {
    // composeFile - файл docker-compose для запуска инфраструктуры
    composeFile: process.env.DOCKER_COMPOSE_FILE || 'docker-compose.yml'
  }
};
