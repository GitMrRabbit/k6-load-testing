const { validateConfig } = require('../validation');

// Мокаем config/default.js
jest.mock('../default', () => ({
  baseUrl: 'https://jsonplaceholder.typicode.com',
  testDuration: '10m',
  vus: 10,
  testOptions: {
    chaosFailureRate: 0.1
  },
  monitoring: {
    prometheus: { port: 9090 },
    grafana: { port: 3001 },
    alertmanager: { port: 9093 },
    k6Dashboard: { port: 6565 }
  }
}));

describe('Config Validation', () => {
  let consoleErrorSpy;
  let processExitSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    console.log = jest.fn(); // Мокаем console.log чтобы не засорять вывод
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('should pass validation with valid config', () => {
    validateConfig();

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(processExitSpy).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(' Конфигурация валидна');
  });

  it('should fail with invalid baseUrl', () => {
    // Мокаем невалидный URL
    jest.doMock('../default', () => ({
      baseUrl: 'invalid-url',
      testDuration: '10m',
      vus: 10,
      monitoring: {
        prometheus: { port: 9090 },
        grafana: { port: 3001 },
        alertmanager: { port: 9093 },
        k6Dashboard: { port: 6565 }
      }
    }));

    const { validateConfig } = require('../validation');

    validateConfig();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибки конфигурации:');
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('should fail with invalid port numbers', () => {
    jest.doMock('../default', () => ({
      baseUrl: 'https://testsite.com',
      testDuration: '10m',
      vus: 10,
      monitoring: {
        prometheus: { port: 70000 }, // Invalid port
        grafana: { port: 3001 },
        alertmanager: { port: 9093 },
        k6Dashboard: { port: 6565 }
      }
    }));

    const { validateConfig } = require('../validation');

    validateConfig();

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('should fail with invalid VUS count', () => {
    jest.doMock('../default', () => ({
      baseUrl: 'https://testsite.com',
      testDuration: '10m',
      vus: 1500, // Too high
      monitoring: {
        prometheus: { port: 9090 },
        grafana: { port: 3001 },
        alertmanager: { port: 9093 },
        k6Dashboard: { port: 6565 }
      }
    }));

    const { validateConfig } = require('../validation');

    validateConfig();

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle multiple validation errors', () => {
    jest.doMock('../default', () => ({
      baseUrl: 'invalid',
      testDuration: '10m',
      vus: 2000, // Invalid
      monitoring: {
        prometheus: { port: 99999 }, // Invalid
        grafana: { port: 3001 },
        alertmanager: { port: 9093 },
        k6Dashboard: { port: 6565 }
      }
    }));

    const { validateConfig } = require('../validation');

    validateConfig();

    expect(consoleErrorSpy).toHaveBeenCalledTimes(3); // baseUrl, vus, port
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('should validate chaos failure rate', () => {
    jest.doMock('../default', () => ({
      baseUrl: 'https://testsite.com',
      testDuration: '10m',
      vus: 10,
      testOptions: {
        chaosFailureRate: 1.5 // Invalid (> 1)
      },
      monitoring: {
        prometheus: { port: 9090 },
        grafana: { port: 3001 },
        alertmanager: { port: 9093 },
        k6Dashboard: { port: 6565 }
      }
    }));

    const { validateConfig } = require('../validation');

    validateConfig();

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
