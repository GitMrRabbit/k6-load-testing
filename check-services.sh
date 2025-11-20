#!/bin/bash

# check-services.sh - Comprehensive Service Health Check
echo "Starting comprehensive service check..."
echo "============================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 1. Check Docker containers
echo -e "\n${YELLOW}1. DOCKER CONTAINERS STATUS${NC}"
echo "----------------------------------------"

expected_containers=(
    "k6-load-testing-grafana-1"
    "k6-load-testing-influxdb-1"
    "k6-load-testing-prometheus-1"
    "k6-load-testing-k6-dashboard-1"
    "k6-load-testing-node-exporter-1"
    "k6-load-testing-redis-1"
)

running_containers=$(docker ps --format "{{.Names}}")

for container in "${expected_containers[@]}"; do
    if echo "$running_containers" | grep -q "^${container}$"; then
        echo -e "${GREEN}SUCCESS: $container - RUNNING${NC}"
    else
        echo -e "${RED}ERROR: $container - NOT RUNNING${NC}"
    fi
done

# 2. Check service availability
echo -e "\n${YELLOW}2. SERVICE AVAILABILITY${NC}"
echo "----------------------------------------"

services=(
    "Grafana:http://localhost:3001"
    "InfluxDB:http://localhost:8086/ping"
    "Prometheus:http://localhost:9090"
    "Node_Exporter:http://localhost:9100/metrics"
)

for service in "${services[@]}"; do
    name=$(echo "$service" | cut -d: -f1)
    url=$(echo "$service" | cut -d: -f2-)

    if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}SUCCESS: $name - ACCESSIBLE${NC}"
    else
        echo -e "${RED}ERROR: $name - NOT ACCESSIBLE${NC}"
    fi
done

# 3. Check InfluxDB metrics
echo -e "\n${YELLOW}3. INFLUXDB METRICS CHECK${NC}"
echo "----------------------------------------"

if curl -s --max-time 5 "http://localhost:8086/query?q=SHOW%20DATABASES" | grep -q '"k6"'; then
    echo -e "${GREEN}SUCCESS: Database 'k6' exists${NC}"
else
    echo -e "${YELLOW}WARNING: Database 'k6' not found${NC}"
fi

measurements=$(curl -s --max-time 5 "http://localhost:8086/query?db=k6&q=SHOW%20MEASUREMENTS" 2>/dev/null)
if echo "$measurements" | grep -q '"values"'; then
    metric_count=$(echo "$measurements" | grep -o '"[^"]*"' | grep -v '"values"' | grep -v '"series"' | wc -l)
    echo -e "${GREEN}SUCCESS: Found $metric_count metrics in InfluxDB${NC}"

    key_metrics=("http_reqs" "http_req_duration" "vus" "checks")
    for metric in "${key_metrics[@]}"; do
        if echo "$measurements" | grep -q "\"$metric\""; then
            echo -e "${GREEN}   SUCCESS: $metric${NC}"
        else
            echo -e "${YELLOW}   WARNING: $metric${NC}"
        fi
    done
else
    echo -e "${YELLOW}WARNING: No metrics found in InfluxDB${NC}"
fi

# 4. Check Prometheus metrics
echo -e "\n${YELLOW}4. PROMETHEUS METRICS CHECK${NC}"
echo "----------------------------------------"

prometheus_metrics=$(curl -s --max-time 5 "http://localhost:9090/api/v1/label/__name__/values" 2>/dev/null)
if echo "$prometheus_metrics" | grep -q '"data"'; then
    system_metrics=("node_cpu_seconds_total" "node_memory_MemTotal_bytes" "node_load1")
    found_count=0

    for metric in "${system_metrics[@]}"; do
        if echo "$prometheus_metrics" | grep -q "\"$metric\""; then
            echo -e "${GREEN}   SUCCESS: $metric${NC}"
            ((found_count++))
        else
            echo -e "${YELLOW}   WARNING: $metric${NC}"
        fi
    done

    if [ $found_count -gt 0 ]; then
        echo -e "${GREEN}SUCCESS: Prometheus is collecting system metrics${NC}"
    else
        echo -e "${YELLOW}WARNING: No system metrics found in Prometheus${NC}"
    fi
else
    echo -e "${RED}ERROR: Cannot check Prometheus metrics${NC}"
fi

# 5. Check k6 container
echo -e "\n${YELLOW}5. K6 CONTAINER CHECK${NC}"
echo "----------------------------------------"

if docker exec k6-load-testing-k6-dashboard-1 k6 version > /dev/null 2>&1; then
    k6_version=$(docker exec k6-load-testing-k6-dashboard-1 k6 version 2>/dev/null | head -1)
    echo -e "${GREEN}SUCCESS: k6 is working: $k6_version${NC}"

    test_files=$(docker exec k6-load-testing-k6-dashboard-1 find /scripts -name "*.js" -type f 2>/dev/null | wc -l)
    if [ "$test_files" -gt 0 ]; then
        echo -e "${GREEN}SUCCESS: Found $test_files test files${NC}"
    else
        echo -e "${YELLOW}WARNING: No test files found in /scripts${NC}"
    fi
else
    echo -e "${RED}ERROR: k6 is not working properly${NC}"
fi

# 6. Check network connectivity
echo -e "\n${YELLOW}6. CONTAINER NETWORK CHECK${NC}"
echo "----------------------------------------"

network_checks=(
    "k6-dashboard:influxdb:8086"
)

for check in "${network_checks[@]}"; do
    from=$(echo "$check" | cut -d: -f1)
    to=$(echo "$check" | cut -d: -f2)
    port=$(echo "$check" | cut -d: -f3)

    if docker exec k6-load-testing-k6-dashboard-1 sh -c "wget -q --timeout=2 --tries=1 -O - http://$to:$port/ping 2>/dev/null && echo 'SUCCESS' || echo 'FAILED'" | grep -q "SUCCESS"; then
        echo -e "${GREEN}SUCCESS: $from -> $to:$port - CONNECTED${NC}"
    else
        echo -e "${RED}ERROR: $from -> $to:$port - NO CONNECTION${NC}"
    fi
done

# 7. Summary
echo -e "\n${CYAN}7. SUMMARY${NC}"
echo "============================================================"

container_status=$(docker ps --format "{{.Names}}" | wc -l)
expected_container_count=${#expected_containers[@]}

accessible_services=0
for service in "${services[@]}"; do
    url=$(echo "$service" | cut -d: -f2-)
    if curl -s --max-time 2 "$url" > /dev/null 2>&1; then
        ((accessible_services++))
    fi
done

echo "Containers: $container_status/$expected_container_count running"
echo "Services: $accessible_services/${#services[@]} accessible"

if [ "$container_status" -eq "$expected_container_count" ]; then
    echo -e "${GREEN}ALL SYSTEMS OPERATIONAL! Ready for load testing.${NC}"
else
    echo -e "${YELLOW}WARNING: Some services need attention before testing.${NC}"
fi

echo -e "\n${CYAN}Quick commands:${NC}"
echo -e "${NC}  View logs: docker compose logs [service]"
echo -e "${NC}  Restart: docker compose restart"
echo -e "${NC}  Test: npm run smoke"
echo -e "${NC}  All tests: npm run all-tests"
echo -e "${NC}  Check: npm run check${NC}"
