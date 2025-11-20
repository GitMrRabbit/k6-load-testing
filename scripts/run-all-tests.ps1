# scripts/run-all-tests.ps1
Write-Host "Starting Advanced k6 Load Testing Suite"

# Создание директории для результатов
$TIMESTAMP = Get-Date -Format "yyyyMMdd-HHmmss"
$RESULTS_DIR = "advanced-$TIMESTAMP"
$FULL_RESULTS_PATH = "results/$RESULTS_DIR"
New-Item -ItemType Directory -Force -Path $FULL_RESULTS_PATH | Out-Null

Write-Host "Results will be saved to: $FULL_RESULTS_PATH"

# Запуск расширенной инфраструктуры
Write-Host "Starting advanced monitoring infrastructure..."
docker-compose up -d

# Ожидание запуска сервисов
Start-Sleep -Seconds 15

# Получаем имя контейнера автоматически
$K6_CONTAINER = docker ps --filter "name=k6-dashboard" --format "{{.Names}}"

Write-Host "Running resilience tests..."
docker exec $K6_CONTAINER k6 run --out influxdb=http://influxdb:8086/k6 --out json=/results/$RESULTS_DIR/resilience.json /scripts/scenarios/chaos-engineering-test.js

Write-Host "Running canary tests..."
docker exec $K6_CONTAINER k6 run --out influxdb=http://influxdb:8086/k6 --out json=/results/$RESULTS_DIR/canary.json /scripts/scenarios/canary-test.js

Write-Host "Running security tests..."
docker exec $K6_CONTAINER k6 run --out influxdb=http://influxdb:8086/k6 --out json=/results/$RESULTS_DIR/security.json /scripts/scenarios/security-load-test.js

Write-Host "Running adaptive tests..."
docker exec $K6_CONTAINER k6 run --out influxdb=http://influxdb:8086/k6 --out json=/results/$RESULTS_DIR/adaptive.json /scripts/scenarios/adaptive-load-test.js

Write-Host "Running adaptive tests..."
docker exec $K6_CONTAINER k6 run --out influxdb=http://influxdb:8086/k6 --out json=/results/$RESULTS_DIR/advanced-comprehensive.json /scripts/scenarios/advanced-chain-test.js
# # Запуск различных типов тестов с разными конфигурациями
# Write-Host "Running resilience tests..."
# docker exec k6-load-testing-k6-dashboard-1 k6 run --out influxdb=http://influxdb:8086/k6 --out json=/results/$RESULTS_DIR/resilience.json /scripts/scenarios/chaos-engineering-test.js
#
# Write-Host "Running canary tests..."
# docker exec k6-load-testing-k6-dashboard-1 k6 run --out influxdb=http://influxdb:8086/k6 --out json=/results/$RESULTS_DIR/canary.json /scripts/scenarios/canary-test.js
#
# Write-Host "Running security tests..."
# docker exec k6-load-testing-k6-dashboard-1 k6 run --out influxdb=http://influxdb:8086/k6 --out json=/results/$RESULTS_DIR/security.json /scripts/scenarios/security-load-test.js
#
# Write-Host "Running adaptive tests..."
# docker exec k6-load-testing-k6-dashboard-1 k6 run --out influxdb=http://influxdb:8086/k6 --out json=/results/$RESULTS_DIR/adaptive.json /scripts/scenarios/adaptive-load-test.js

#Write-Host "Running comprehensive advanced tests..."
#docker exec k6-load-testing-k6-dashboard-1 k6 run --out influxdb=http://influxdb:8086/k6 --out json=/results/$RESULTS_DIR/advanced-comprehensive.json /scripts/scenarios/advanced-chain-test.js

# Генерация расширенного отчета
Write-Host "Generating advanced test report..."
if (Get-Command python -ErrorAction SilentlyContinue) {
    if (Test-Path "scripts/generate-report.py") {
        python scripts/generate-report.py $FULL_RESULTS_PATH
    }
    if (Test-Path "scripts/generate-html-report.py") {
        python scripts/generate-html-report.py $FULL_RESULTS_PATH
    }
} else {
    Write-Host "Python not found, skipping report generation"
}

# Сравнение результатов с предыдущими запусками
Write-Host "Comparing results with previous runs..."
if (Test-Path "baseline-results.json") {
    if (Get-Command python -ErrorAction SilentlyContinue) {
        if (Test-Path "scripts/compare-results.py") {
            python scripts/compare-results.py $FULL_RESULTS_PATH baseline-results.json
        }
    }
} else {
    if (Get-Command python -ErrorAction SilentlyContinue) {
        if (Test-Path "scripts/compare-results.py") {
            python scripts/compare-results.py $FULL_RESULTS_PATH
        }
    }
}

# Сохранение текущих результатов как baseline для следующих сравнений
Write-Host "Saving current results as baseline..."
if (Test-Path "$FULL_RESULTS_PATH/summary_report.json") {
    Copy-Item "$FULL_RESULTS_PATH/summary_report.json" "baseline-results.json" -ErrorAction SilentlyContinue
} else {
    Write-Host "No summary report to save as baseline"
}

# Сохранение конфигурации
Write-Host "Saving test configuration..."
docker-compose config > "$FULL_RESULTS_PATH/infrastructure-config.yml"

# Проверка метрик в InfluxDB
Write-Host "Checking InfluxDB metrics..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8086/query?db=k6" -Method GET -Body "q=SHOW MEASUREMENTS" -UseBasicParsing
    Write-Host "InfluxDB is working correctly. Measurements available."
} catch {
    Write-Host "Warning: Could not connect to InfluxDB or no measurements found"
}

Write-Host "Advanced tests completed!"
Write-Host "Grafana: http://localhost:3001 (admin/admin)"
Write-Host "InfluxDB: http://localhost:8086"
Write-Host "Results: $FULL_RESULTS_PATH"
Write-Host "InfluxDB metrics will be available in Grafana dashboards"