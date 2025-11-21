#!/usr/bin/env python3


import os
import json
from datetime import datetime
import matplotlib.pyplot as plt
from imgkit import from_string
import uuid

def count_errors_in_file(filepath):
    error_count = 0
    total_requests = 0
    with open(filepath, 'r') as f:
        for line in f:
            if not line.strip():
                continue
            try:
                data = json.loads(line)
                if data.get('type') == 'Point':
                    metric_name = data.get('metric')
                    if metric_name == 'http_reqs':
                        total_requests += 1
                    elif metric_name == 'http_req_failed' and data['data']['value'] > 0:
                        error_count += 1
            except json.JSONDecodeError:
                continue
    return error_count, total_requests

def generate_pie_chart(passed, failed, output_file):
    labels = ['Passed', 'Failed']
    sizes = [passed, failed]
    colors = ['#4CAF50', '#F44336']
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.pie(sizes, labels=labels, colors=colors, autopct='%1.1f%%', startangle=90, textprops={'color': 'white'})
    ax.axis('equal')
    ax.set_facecolor('#2d2d2d')
    fig.patch.set_facecolor('#2d2d2d')
    plt.title(f"Total: {passed + failed}", color='white', fontsize=14)
    plt.savefig(output_file, dpi=100, facecolor='#2d2d2d')
    plt.close()

def generate_html_report(passed, failed, report_lines, output_file):
    pie_chart_file = f"pie_chart_{uuid.uuid4()}.png"
    generate_pie_chart(passed, failed, pie_chart_file)

    html_content = f"""
    <html>
        <head>
            <style>
                body {{
                    background-color: #2d2d2d;
                    color: white;
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    margin: 0;
                    width: 800px;
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 20px;
                }}
                .test-result {{
                    background-color: #3d3d3d;
                    border-radius: 5px;
                    padding: 10px;
                    margin-bottom: 10px;
                }}
                .summary {{
                    background-color: #3d3d3d;
                    border-radius: 5px;
                    padding: 10px;
                    margin-top: 20px;
                    text-align: center;
                }}
                .chart {{
                    text-align: center;
                    margin-top: 20px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h2>📊 K6 Load Test Report</h2>
                <p>{report_lines[1]}</p>
                <p>{report_lines[2]}</p>
            </div>
            <h3>🔹 РЕЗУЛЬТАТЫ ТЕСТОВ:</h3>
    """

    for line in report_lines[5:-5]:
        html_content += f"<div class='test-result'><p>{line}</p></div>"

    html_content += f"""
            <div class="summary">
                <p>{report_lines[-5]}</p>
                <p>{report_lines[-4]}</p>
                <p>{report_lines[-2]}</p>
            </div>
            <div class="chart">
                <img src="{pie_chart_file}" alt="Pie Chart" width="400"/>
            </div>
        </body>
    </html>
    """

    with open(output_file, 'w') as f:
        f.write(html_content)

    return pie_chart_file, output_file

def generate_telegram_report(results_dir):
    if not os.path.exists(results_dir):
        return None, "❌ Ошибка: Директория с результатами не найдена."
    json_files = [f for f in os.listdir(results_dir) if f.endswith('.json')]
    if not json_files:
        return None, "❌ Ошибка: Нет JSON-файлов с результатами тестов."
    total_tests = len(json_files)
    passed_tests = 0
    failed_tests = 0
    report_lines = []
    report_lines.append("📊 K6 Load Test Report")
    report_lines.append(f"📅 Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report_lines.append(f"📋 Всего тестов: {total_tests}")
    report_lines.append("")
    report_lines.append("🔹 РЕЗУЛЬТАТЫ ТЕСТОВ:")
    for filename in json_files:
        filepath = os.path.join(results_dir, filename)
        error_count, total_requests = count_errors_in_file(filepath)
        test_name = filename.split('-')[0]
        error_rate = (error_count / total_requests * 100) if total_requests > 0 else 0
        if error_rate == 0:
            passed_tests += 1
            status = "✅"
        else:
            failed_tests += 1
            status = "❌"
        report_lines.append(f"  {status} {test_name}:")
        report_lines.append(f"    Запросы: {total_requests}")
        report_lines.append(f"    Ошибки: {error_count}")
        report_lines.append(f"    Процент ошибок: {error_rate:.2f}%")
        report_lines.append("")
    report_lines.append("---")
    report_lines.append(f"✅ Успешно: {passed_tests}")
    report_lines.append(f"❌ С ошибками: {failed_tests}")
    report_lines.append("")
    if failed_tests == 0:
        report_lines.append("✅ ОБЩИЙ СТАТУС: ВСЕ ТЕСТЫ ПРОЙДЕНЫ!")
    else:
        report_lines.append(f"❌ ОБЩИЙ СТАТУС: {failed_tests} ТЕСТ(ОВ) С ОШИБКАМИ")

    html_file = os.path.join(results_dir, 'report.html')
    pie_chart_file, html_file = generate_html_report(passed_tests, failed_tests, report_lines, html_file)

    image_file = os.path.join(results_dir, 'combined_report.png')
    options = {
        'format': 'png',
        'encoding': 'UTF-8',
        'width': '800',
        'quiet': ''
    }
    from_string(open(html_file).read(), image_file, options=options)

    return image_file, None

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        image_file, error = generate_telegram_report(sys.argv[1])
        if error:
            print(error)
        else:
            print(f"IMAGE_FILE={image_file}")
    else:
        print("Usage: python generate_telegram_report.py <results_directory>")
