# check-services.ps1 - Comprehensive Service Health Check
Write-Host "Starting comprehensive service check..." -ForegroundColor Cyan
Write-Host "============================================================"

# 1. Check Docker containers
Write-Host "`n1. DOCKER CONTAINERS STATUS" -ForegroundColor Yellow
Write-Host "----------------------------------------"

$expectedContainers = @(
    "k6-load-testing-grafana-1",
    "k6-load-testing-influxdb-1",
    "k6-load-testing-prometheus-1",
    "k6-load-testing-k6-dashboard-1",
    "k6-load-testing-node-exporter-1",
    # "k6-load-testing-alertmanager-1", - отключено т.к. до алертов пока не дошло...
    "k6-load-testing-redis-1"
)

$runningContainers = docker ps --format "{{.Names}}"

foreach ($container in $expectedContainers) {
    if ($runningContainers -contains $container) {
        Write-Host "SUCCESS: $container - RUNNING" -ForegroundColor Green
    } else {
        Write-Host "ERROR: $container - NOT RUNNING" -ForegroundColor Red
    }
}

# 2. Check service availability
Write-Host "`n2. SERVICE AVAILABILITY" -ForegroundColor Yellow
Write-Host "----------------------------------------"

$services = @(
    @{Name = "Grafana"; URL = "http://localhost:3001"},
    @{Name = "InfluxDB"; URL = "http://localhost:8086/ping"},
    @{Name = "Prometheus"; URL = "http://localhost:9090"},
    # @{Name = "Alertmanager"; URL = "http://localhost:9093"},
    @{Name = "Node Exporter"; URL = "http://localhost:9100/metrics"}
)

foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri $service.URL -UseBasicParsing -TimeoutSec 5
        Write-Host "SUCCESS: $($service.Name) - ACCESSIBLE" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: $($service.Name) - NOT ACCESSIBLE" -ForegroundColor Red
    }
}

# 3. Check InfluxDB metrics
Write-Host "`n3. INFLUXDB METRICS CHECK" -ForegroundColor Yellow
Write-Host "----------------------------------------"

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8086/query?q=SHOW DATABASES" -UseBasicParsing
    $databases = $response.Content | ConvertFrom-Json
    $dbExists = $false
    foreach ($db in $databases.results.series.values) {
        if ($db[0] -eq "k6") {
            $dbExists = $true
            break
        }
    }
    if ($dbExists) {
        Write-Host "SUCCESS: Database 'k6' exists" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Database 'k6' not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR: Cannot check InfluxDB databases" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8086/query?db=k6&q=SHOW MEASUREMENTS" -UseBasicParsing
    $measurements = $response.Content | ConvertFrom-Json
    $metricCount = $measurements.results.series.values.Count

    if ($metricCount -gt 0) {
        Write-Host "SUCCESS: Found $metricCount metrics in InfluxDB" -ForegroundColor Green

        $keyMetrics = @("http_reqs", "http_req_duration", "vus", "checks")

        # ИСПРАВЛЕНИЕ: Правильно извлекаем названия метрик
        $availableMetrics = $measurements.results.series.values | ForEach-Object { $_[0] }

        foreach ($metric in $keyMetrics) {
            if ($availableMetrics -contains $metric) {
                Write-Host "   SUCCESS: $metric" -ForegroundColor Green
            } else {
                Write-Host "   WARNING: $metric" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "WARNING: No metrics found in InfluxDB" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR: Cannot check InfluxDB metrics" -ForegroundColor Red
}

# 4. Check Prometheus metrics
Write-Host "`n4. PROMETHEUS METRICS CHECK" -ForegroundColor Yellow
Write-Host "----------------------------------------"

try {
    $response = Invoke-WebRequest -Uri "http://localhost:9090/api/v1/label/__name__/values" -UseBasicParsing
    $metrics = $response.Content | ConvertFrom-Json

    $systemMetrics = @("node_cpu_seconds_total", "node_memory_MemTotal_bytes", "node_load1")
    $foundCount = 0

    foreach ($metric in $systemMetrics) {
        if ($metrics.data -contains $metric) {
            Write-Host "   SUCCESS: $metric" -ForegroundColor Green
            $foundCount++
        } else {
            Write-Host "   WARNING: $metric" -ForegroundColor Yellow
        }
    }

    if ($foundCount -gt 0) {
        Write-Host "SUCCESS: Prometheus is collecting system metrics" -ForegroundColor Green
    } else {
        Write-Host "WARNING: No system metrics found in Prometheus" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR: Cannot check Prometheus metrics" -ForegroundColor Red
}

# 5. Check k6 container
Write-Host "`n5. K6 CONTAINER CHECK" -ForegroundColor Yellow
Write-Host "----------------------------------------"

try {
    $k6Version = docker exec k6-load-testing-k6-dashboard-1 k6 version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: k6 is working: $($k6Version | Select-String 'k6 v')" -ForegroundColor Green

        # Более надежная проверка тестовых файлов
        $testFiles = docker exec k6-load-testing-k6-dashboard-1 find /scripts -name "*.js" -type f 2>$null
        if ($testFiles) {
            $fileCount = ($testFiles -split "`n" | Where-Object { $_ -match "\.js$" }).Count
            Write-Host "SUCCESS: Found $fileCount test files" -ForegroundColor Green
        } else {
            Write-Host "WARNING: No test files found in /scripts" -ForegroundColor Yellow
        }
    } else {
        Write-Host "ERROR: k6 is not working properly" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: Cannot check k6 container" -ForegroundColor Red
}

# 6. Check network connectivity
Write-Host "`n6. CONTAINER NETWORK CHECK" -ForegroundColor Yellow
Write-Host "----------------------------------------"

$networkChecks = @(
    @{From = "k6-dashboard"; To = "influxdb"; Port = 8086}
)

foreach ($check in $networkChecks) {
    try {
        # Используем wget который есть в Alpine Linux
        $testResult = docker exec k6-load-testing-k6-dashboard-1 sh -c "wget -q --timeout=2 --tries=1 -O - http://$($check.To):$($check.Port)/ping 2>/dev/null && echo 'SUCCESS' || echo 'FAILED'"
        if ($testResult -eq "SUCCESS") {
            Write-Host "SUCCESS: $($check.From) -> $($check.To):$($check.Port) - CONNECTED" -ForegroundColor Green
        } else {
            Write-Host "ERROR: $($check.From) -> $($check.To):$($check.Port) - NO CONNECTION" -ForegroundColor Red
        }
    } catch {
        Write-Host "WARNING: $($check.From) -> $($check.To):$($check.Port) - CHECK FAILED" -ForegroundColor Yellow
    }
}

# 7. Summary
Write-Host "`n7. SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================"

$containerStatus = (docker ps --format "{{.Names}}" | Measure-Object).Count
$expectedContainerCount = $expectedContainers.Count

$accessibleServices = 0
foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri $service.URL -UseBasicParsing -TimeoutSec 2
        $accessibleServices++
    } catch {
        # Service not accessible
    }
}

Write-Host "Containers: $containerStatus/$expectedContainerCount running"
Write-Host "Services: $accessibleServices/$($services.Count) accessible"

if ($containerStatus -eq $expectedContainerCount) {
    Write-Host "ALL SYSTEMS OPERATIONAL! Ready for load testing." -ForegroundColor Green
} else {
    Write-Host "WARNING: Some services need attention before testing." -ForegroundColor Yellow
}

Write-Host "`nQuick commands:" -ForegroundColor Cyan
Write-Host "  View logs: docker-compose logs [service]" -ForegroundColor Gray
Write-Host "  Restart: docker-compose restart" -ForegroundColor Gray
Write-Host "  Test: npm run smoke" -ForegroundColor Gray
Write-Host "  All tests: npm run all-tests" -ForegroundColor Gray
Write-Host "  Check: npm run check" -ForegroundColor Gray