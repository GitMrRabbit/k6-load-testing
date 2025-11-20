#!/usr/bin/env python3

import os
import json
from datetime import datetime

def count_errors_in_file(filepath):
    """Считает количество ошибок и запросов в JSON-файле."""
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

def generate_telegram_report(results_dir):
    """отчёт для Telegram"""
    if not os.path.exists(results_dir):
        return "❌ Ошибка: Директория с результатами не найдена."

    json_files = [f for f in os.listdir(results_dir) if f.endswith('.json')]
    if not json_files:
        return "❌ Ошибка: Нет JSON-файлов с результатами тестов."

    total_tests = len(json_files)
    passed_tests = 0
    failed_tests = 0
    report_lines = []

    report_lines.append("📊 *K6 Load Test Report*")
    report_lines.append(f"📅 *Date*: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report_lines.append(f"📋 *Total Tests*: {total_tests}")
    report_lines.append("")

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

        report_lines.append(f"- {test_name}: {status} (Requests: {total_requests}, Errors: {error_count}, Error Rate: {error_rate:.2f}%)")

    report_lines.append("")
    report_lines.append(f"✅ *Passed*: {passed_tests}")
    report_lines.append(f"❌ *Failed*: {failed_tests}")

    if failed_tests == 0:
        report_lines.append("🎉 *Overall Status*: ALL TESTS PASSED!")
    else:
        report_lines.append(f"💥 *Overall Status*: {failed_tests} TEST(S) FAILED")

    return "%0A".join(report_lines)

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        report = generate_telegram_report(sys.argv[1])
        print(report)
    else:
        print("Usage: python generate_telegram_report.py <results_directory>")
