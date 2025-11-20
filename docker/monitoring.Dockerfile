# Оптимизированный multi-stage build для мониторингового стека
# Использует кеширование слоев и минимальные базовые образы для ускорения сборки

# === БАЗОВЫЙ  ===
FROM alpine:3.18 AS base

# Устанавливаем общие инструменты в отдельном слое для кеширования
RUN apk add --no-cache \
    curl \
    wget \
    ca-certificates \
    && update-ca-certificates

# === СТАДИЙ СБОРКИ PROMETHEUS ===
FROM prom/prometheus:v2.47.0 AS prometheus-builder

# Копируем конфигурацию Prometheus (кешируется если не изменилась)
COPY prometheus/prometheus.yml /etc/prometheus/prometheus.yml

# Валидируем конфигурацию на этапе сборки
RUN prometheus --config.check --config.file=/etc/prometheus/prometheus.yml

# === СТАДИЙ СБОРКИ GRAFANA ===
FROM grafana/grafana:10.2.0 AS grafana-builder

# Копируем provisioning файлы (кешируется если не изменились)
COPY grafana/provisioning/ /etc/grafana/provisioning/

# Устанавливаем права для provisioning файлов
RUN chown -R grafana:grafana /etc/grafana/provisioning/

# === СТАДИЙ СБОРКИ ALERTMANAGER ===
FROM prom/alertmanager:v0.26.0 AS alertmanager-builder

# Копируем конфигурацию Alertmanager
COPY alertmanager/alertmanager.yml /etc/alertmanager/alertmanager.yml

# Валидируем конфигурацию на этапе сборки
RUN amtool check-config /etc/alertmanager/alertmanager.yml

# === СТАДИЙ СБОРКИ NODE EXPORTER ===
FROM prom/node-exporter:v1.6.1 AS node-exporter-builder


# === ФИНАЛЬНЫЙ ОБРАЗ ===
FROM alpine:3.18

# Устанавливаем только runtime зависимости в отдельном слое для кеширования
RUN apk add --no-cache \
    ca-certificates \
    curl \
    && update-ca-certificates \
    && addgroup -S monitoring \
    && adduser -S monitoring -G monitoring

# Создаем необходимые директории с правильными правами
RUN mkdir -p \
    /prometheus \
    /alertmanager \
    /var/lib/grafana \
    /var/log/monitoring \
    && chown -R monitoring:monitoring \
    /prometheus \
    /alertmanager \
    /var/lib/grafana \
    /var/log/monitoring

# Копируем бинарные файлы из builder стадий (кешируется если бинарники не изменились)
COPY --from=prometheus-builder --chown=monitoring:monitoring /bin/prometheus /usr/local/bin/prometheus
COPY --from=prometheus-builder --chown=monitoring:monitoring /etc/prometheus /etc/prometheus
COPY --from=grafana-builder --chown=monitoring:monitoring /usr/share/grafana /usr/share/grafana
COPY --from=grafana-builder --chown=monitoring:monitoring /etc/grafana /etc/grafana
COPY --from=alertmanager-builder --chown=monitoring:monitoring /bin/amtool /usr/local/bin/amtool
COPY --from=alertmanager-builder --chown=monitoring:monitoring /bin/alertmanager /usr/local/bin/alertmanager
COPY --from=alertmanager-builder --chown=monitoring:monitoring /etc/alertmanager /etc/alertmanager
COPY --from=node-exporter-builder --chown=monitoring:monitoring /bin/node_exporter /usr/local/bin/node_exporter

# Переключаемся на непривилегированного пользователя
USER monitoring

# Экспортируем порты сервисов
EXPOSE 9090 3000 9093 9100

# Оптимизированный health check с меньшим интервалом
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f --max-time 5 http://localhost:9090/-/healthy || exit 1

# Метки для оптимизации кеширования и идентификации
LABEL maintainer="k6-load-testing" \
      version="1.0.0" \
      description="Optimized monitoring stack for k6 load testing"

# Default command с информацией о готовности
CMD ["sh", "-c", "echo 'Optimized monitoring stack ready - Prometheus:9090, Grafana:3000, Alertmanager:9093, NodeExporter:9100'"]
