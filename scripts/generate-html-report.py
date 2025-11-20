#!/usr/bin/env python3
# Скрипт для генерации HTML-отчета по результатам нагрузочного тестирования k6.
# Использует Plotly для интерактивных графиков.

import json
import sys
import os
from datetime import datetime
import plotly.graph_objects as go
from collections import defaultdict

def parse_isoformat(timestamp_str):
    """Парсит временную метку с наносекундами и таймзоной."""
    if '.' in timestamp_str:
        base, fractional = timestamp_str.split('.')
        fractional = fractional[:6]  # Оставляем только микросекунды
        timestamp_str = f"{base}.{fractional}Z" if 'Z' in timestamp_str else f"{base}.{fractional}+00:00"
    return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))

def parse_k6_ndjson(filepath):
    metrics = defaultdict(list)
    test_info = {
        'name': os.path.basename(filepath).replace('.json', '').split('-')[0],  # Убираем хэш
        'start_time': None,
        'end_time': None,
        'total_requests': 0,
        'error_count': 0
    }

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                    if data.get('type') == 'Point':
                        metric_name = data.get('metric')
                        metrics[metric_name].append(data['data'])

                        # Считаем общие метрики
                        if metric_name == 'http_reqs':
                            test_info['total_requests'] += 1
                        elif metric_name == 'http_req_failed' and data['data']['value'] > 0:
                            test_info['error_count'] += 1

                        # Определяем время начала и окончания теста
                        timestamp = data['data']['time']
                        if not test_info['start_time'] or timestamp < test_info['start_time']:
                            test_info['start_time'] = timestamp
                        if not test_info['end_time'] or timestamp > test_info['end_time']:
                            test_info['end_time'] = timestamp
                except json.JSONDecodeError as e:
                    print(f"Ошибка парсинга JSON: {line[:200]}... {e}")
                    continue
    except Exception as e:
        print(f"Ошибка чтения файла {filepath}: {e}")

    return {
        'test_info': test_info,
        'metrics': dict(metrics)
    }

def calculate_metrics(metrics_data):
    """
    Вычисляет агрегированные метрики из сырых данных.
    Args:
        metrics_data (dict): Сырые данные метрик.
    Returns:
        dict: Агрегированные метрики.
    """
    result = {}
    http_reqs = metrics_data.get('http_reqs', [])
    if http_reqs:
        result['http_reqs_count'] = len(http_reqs)

    response_times = [point['value'] for point in metrics_data.get('http_req_duration', [])]
    if response_times:
        result['http_req_duration_avg'] = sum(response_times) / len(response_times)
        result['http_req_duration_min'] = min(response_times)
        result['http_req_duration_max'] = max(response_times)
        if len(response_times) > 0:
            result['http_req_duration_p95'] = sorted(response_times)[int(len(response_times) * 0.95)]
            result['http_req_duration_p99'] = sorted(response_times)[int(len(response_times) * 0.99)]

    total_requests = len(http_reqs)
    error_requests = len([point for point in metrics_data.get('http_req_failed', []) if point['value'] > 0])
    result['error_rate'] = (error_requests / total_requests * 100) if total_requests > 0 else 0

    if metrics_data.get('http_reqs') and len(metrics_data['http_reqs']) > 0:
        start_time = metrics_data['http_reqs'][0]['time']
        end_time = metrics_data['http_reqs'][-1]['time']
        start_dt = parse_isoformat(start_time)
        end_dt = parse_isoformat(end_time)
        duration_seconds = (end_dt - start_dt).total_seconds()
        result['requests_per_second'] = total_requests / duration_seconds if duration_seconds > 0 else 0

    return result

def generate_html_report(results_dir):
    all_test_data = []
    test_names = []  #

    for filename in os.listdir(results_dir):
        if filename.endswith('.json'):
            filepath = os.path.join(results_dir, filename)
            print(f"Обрабатываем файл: {filename}")
            try:
                parsed_data = parse_k6_ndjson(filepath)
                calculated_metrics = calculate_metrics(parsed_data['metrics'])
                test_data = {
                    'name': parsed_data['test_info']['name'],
                    'test_info': parsed_data['test_info'],
                    'metrics': calculated_metrics,
                    'raw_metrics': parsed_data['metrics']
                }
                all_test_data.append(test_data)
                test_names.append(parsed_data['test_info']['name'])  # очищенное
                print(f"  - Обработано записей: {parsed_data['test_info']['total_requests']}")
                print(f"  - Ошибок: {parsed_data['test_info']['error_count']}")
            except Exception as e:
                print(f"Ошибка обработки файла {filename}: {e}")
                continue

    if not all_test_data:
        print("Нет данных для генерации отчета")
        return

    html_content = create_html_structure(all_test_data, test_names)
    report_path = os.path.join(results_dir, 'k6-load-test-report.html')
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"✅ HTML-отчет сгенерирован: {report_path}")
    print(f"📊 Обработано тестов: {len(all_test_data)}")
    for test in all_test_data:
        print(f"   - {test['name']}: {test['metrics'].get('http_reqs_count', 0)} запросов")

def create_html_structure(test_data, test_names):
    """Создает HTML-структуру отчета с тёмной темой."""
    return f"""
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>K6 Load Testing Report</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #121212;
            color: #ffffff;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: #1e1e1e;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        }}
        .header {{
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #ff8c00;
        }}
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        .metric-card {{
            background: #2d2d2d;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #ff8c00;
        }}
        .metric-value {{
            font-size: 2em;
            font-weight: bold;
            color: #ff8c00;
        }}
        .metric-label {{
            color: #aaaaaa;
            font-size: 0.9em;
        }}
        .chart-container {{
            margin: 30px 0;
            padding: 20px;
            background: #2d2d2d;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
        }}
        .status-success {{ color: #4caf50; }}
        .status-warning {{ color: #ff9800; }}
        .status-danger {{ color: #f44336; }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            color: #ffffff;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #444;
        }}
        th {{
            background-color: #333;
            font-weight: 600;
        }}
        .summary {{
            background: linear-gradient(135deg, #ff8c00 0%, #ff6b00 100%);
            color: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: center;
        }}
        .test-section {{
            margin: 30px 0;
            padding: 20px;
            border: 1px solid #444;
            border-radius: 8px;
            background: #252525;
        }}
        h1, h2, h3 {{
            color: #ffffff;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛠️ K6 Load Testing Report</h1>
            <p>Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
        <div class="summary">
            <h2>Test Summary</h2>
            <p>Total Tests: {len(test_data)} | Test Types: {', '.join(test_names)}</p>
        </div>
        {generate_test_sections(test_data)}
        {generate_comparison_charts(test_data)}
        {generate_detailed_table(test_data)}
    </div>
</body>
</html>
"""

def generate_test_sections(test_data):
    """
    Генерирует секции для каждого теста.
    Использует очищенные имена тестов (без хэшей).
    """
    # Словарь для маппинга коротких имен в более читаемые названия
    test_name_mapping = {
        'smoke': 'Smoke Test',
        'load': 'Load Test',
        'stress': 'Stress Test',
        'volume': 'Volume Test',
        'security': 'Security Test',
        'adaptive': 'Adaptive Test'
    }

    sections = ""
    for test in test_data:
        # короткое
        short_name = test['name']
        # красивое
        display_name = test_name_mapping.get(short_name, short_name)

        metrics = test['metrics']
        sections += f"""
        <div class="test-section">
            <h2>✔️ {display_name}</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">{metrics.get('http_reqs_count', 0):,}</div>
                    <div class="metric-label">Total Requests</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{metrics.get('http_req_duration_avg', 0):.2f}ms</div>
                    <div class="metric-label">Avg Response Time</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{metrics.get('error_rate', 0):.2f}%</div>
                    <div class="metric-label">Error Rate</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{metrics.get('requests_per_second', 0):.1f}</div>
                    <div class="metric-label">Req/Sec</div>
                </div>
            </div>
        </div>
        """
    return sections

def generate_comparison_charts(test_data):
    """
    Генерирует сравнительные графики
    """
    if len(test_data) < 2:
        return "<p>Для сравнения нужно как минимум 2 теста.</p>"

    test_name_mapping = {
        'smoke': 'Smoke Test',
        'load': 'Load Test',
        'stress': 'Stress Test',
        'volume': 'Volume Test',
        'security': 'Security Test',
        'adaptive': 'Adaptive Test'
    }

    display_names = [test_name_mapping.get(test['name'], test['name']) for test in test_data]
    avg_times = [test['metrics'].get('http_req_duration_avg', 0) for test in test_data]

    chart_html = f"""
    <div class="chart-container">
        <h3>📈 Сравнение времени ответа</h3>
        <div id="response-time-chart"></div>
        <script>
            var responseTimeData = [
                {{
                    x: {json.dumps(display_names)},
                    y: {json.dumps(avg_times)},
                    type: 'bar',
                    marker: {{
                        color: '#ff8c00',
                        line: {{
                            color: '#ff8c00',
                            width: 1
                        }},
                        barcornerradius: 10  // Скругление всех углов столбцов
                    }},
                    text: {json.dumps([f"{{avg_times[i]:.2f}} ms" for i in range(len(avg_times))])},
                    textposition: 'auto',
                    textfont: {{color: '#ff8c00'}},
                    hoverlabel: {{
                        bgcolor: '#333333',
                        font: {{color: '#ffffff'}}
                    }}
                }}
            ];

            var layout = {{
                title: {{
                    text: 'Сравнение среднего времени ответа по тестам',
                    font: {{color: '#ffffff'}}
                }},
                xaxis: {{
                    title: 'Тип теста',
                    tickfont: {{color: '#ffffff'}},
                    titlefont: {{color: '#ffffff'}}
                }},
                yaxis: {{
                    title: 'Время (мс)',
                    tickfont: {{color: '#ffffff'}},
                    titlefont: {{color: '#ffffff'}}
                }},
                plot_bgcolor: '#2d2d2d',
                paper_bgcolor: '#2d2d2d',
                font: {{color: '#ffffff'}},
                hovermode: 'closest',
                showlegend: false
            }};

            Plotly.newPlot('response-time-chart', responseTimeData, layout);
        </script>
    </div>
    """
    return chart_html

def generate_detailed_table(test_data):
    """Генерирует детальную таблицу результатов."""
    rows = ""
    for test in test_data:
        metrics = test['metrics']
        error_rate = metrics.get('error_rate', 0)
        status_class = 'status-success'
        status_text = 'PASS'
        if error_rate > 5:
            status_class = 'status-danger'
            status_text = 'FAIL'
        elif error_rate > 1:
            status_class = 'status-warning'
            status_text = 'WARN'
        rows += f"""
            <tr>
                <td>{test['name']}</td>
                <td>{metrics.get('http_reqs_count', 0):,}</td>
                <td>{metrics.get('http_req_duration_avg', 0):.2f}ms</td>
                <td>{metrics.get('http_req_duration_p95', 0):.2f}ms</td>
                <td>{error_rate:.2f}%</td>
                <td>{metrics.get('requests_per_second', 0):.1f}</td>
                <td class="{status_class}">{status_text}</td>
            </tr>
        """
    return f"""
    <div class="chart-container">
        <h3>📋 Детальные результаты</h3>
        <table>
            <thead>
                <tr>
                    <th>Test Name</th>
                    <th>Total Requests</th>
                    <th>Avg Response</th>
                    <th>95th Percentile</th>
                    <th>Error Rate</th>
                    <th>Req/Sec</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                {rows}
            </tbody>
        </table>
    </div>
    """

if __name__ == "__main__":
    if len(sys.argv) > 1:
        generate_html_report(sys.argv[1])
    else:
        print("Usage: python generate-html-report.py <results_directory>")
        print("Example: python generate-html-report.py results/")
