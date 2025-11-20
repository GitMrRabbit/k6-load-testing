#!/usr/bin/env python3
import json
import sys
import os
from datetime import datetime
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

def compare_test_results(results_dir, baseline_file=None):
    """Сравнивает результаты тестов с baseline или между собой"""

    # Сбор всех результатов
    results = {}
    for filename in os.listdir(results_dir):
        if filename.endswith('.json'):
            filepath = os.path.join(results_dir, filename)
            try:
                with open(filepath, 'r') as f:
                    data = json.load(f)
                    test_name = filename.replace('.json', '')
                    results[test_name] = data
            except:
                continue

    if not results:
        print("Нет результатов для сравнения")
        return

    # Если указан baseline файл, сравниваем с ним
    if baseline_file and os.path.exists(baseline_file):
        with open(baseline_file, 'r') as f:
            baseline_data = json.load(f)

        print(" Сравнение с baseline...")
        generate_baseline_comparison(results, baseline_data)
    else:
        print(" Сравнение между тестами...")
        generate_cross_test_comparison(results)

def generate_baseline_comparison(current_results, baseline_data):
    """Генерирует сравнение с baseline"""

    comparison = {
        "timestamp": datetime.now().isoformat(),
        "comparison_type": "baseline",
        "results": []
    }

    for test_name, current_data in current_results.items():
        baseline_metrics = baseline_data.get('metrics', {})
        current_metrics = current_data.get('metrics', {})

        # Сравнение ключевых метрик
        comparison_result = {
            "test_name": test_name,
            "metrics_comparison": {}
        }

        # Response time comparison
        baseline_rt = baseline_metrics.get('http_req_duration', {}).get('values', {}).get('avg', 0)
        current_rt = current_metrics.get('http_req_duration', {}).get('values', {}).get('avg', 0)

        comparison_result["metrics_comparison"]["response_time"] = {
            "baseline": baseline_rt,
            "current": current_rt,
            "change_percent": calculate_percentage_change(baseline_rt, current_rt),
            "status": get_performance_status(baseline_rt, current_rt, "lower_better")
        }

        # Error rate comparison
        baseline_errors = baseline_metrics.get('http_req_failed', {}).get('values', {}).get('rate', 0)
        current_errors = current_metrics.get('http_req_failed', {}).get('values', {}).get('rate', 0)

        comparison_result["metrics_comparison"]["error_rate"] = {
            "baseline": baseline_errors,
            "current": current_errors,
            "change_percent": calculate_percentage_change(baseline_errors, current_errors),
            "status": get_performance_status(baseline_errors, current_errors, "lower_better")
        }

        # Throughput comparison
        baseline_reqs = baseline_metrics.get('http_reqs', {}).get('values', {}).get('rate', 0)
        current_reqs = current_metrics.get('http_reqs', {}).get('values', {}).get('rate', 0)

        comparison_result["metrics_comparison"]["throughput"] = {
            "baseline": baseline_reqs,
            "current": current_reqs,
            "change_percent": calculate_percentage_change(baseline_reqs, current_reqs),
            "status": get_performance_status(baseline_reqs, current_reqs, "higher_better")
        }

        comparison["results"].append(comparison_result)

    # Сохранение результатов сравнения
    output_file = f"baseline-comparison-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(comparison, f, indent=2)

    print(f" Сравнение сохранено: {output_file}")
    print_comparison_summary(comparison)

def generate_cross_test_comparison(results):
    """Генерирует сравнение между разными тестами"""

    if len(results) < 2:
        print("Нужно минимум 2 теста для сравнения")
        return

    comparison = {
        "timestamp": datetime.now().isoformat(),
        "comparison_type": "cross_test",
        "test_count": len(results),
        "summary": {}
    }

    # Сбор метрик по всем тестам
    metrics_summary = {
        "response_times": {},
        "error_rates": {},
        "throughput": {}
    }

    for test_name, data in results.items():
        metrics = data.get('metrics', {})

        rt = metrics.get('http_req_duration', {}).get('values', {}).get('avg', 0)
        er = metrics.get('http_req_failed', {}).get('values', {}).get('rate', 0)
        tp = metrics.get('http_reqs', {}).get('values', {}).get('rate', 0)

        metrics_summary["response_times"][test_name] = rt
        metrics_summary["error_rates"][test_name] = er
        metrics_summary["throughput"][test_name] = tp

    comparison["summary"] = metrics_summary

    # Определение лучшего/худшего теста
    comparison["analysis"] = {
        "best_response_time": min(metrics_summary["response_times"], key=metrics_summary["response_times"].get),
        "worst_response_time": max(metrics_summary["response_times"], key=metrics_summary["response_times"].get),
        "best_error_rate": min(metrics_summary["error_rates"], key=metrics_summary["error_rates"].get),
        "worst_error_rate": max(metrics_summary["error_rates"], key=metrics_summary["error_rates"].get),
        "best_throughput": max(metrics_summary["throughput"], key=metrics_summary["throughput"].get),
        "worst_throughput": min(metrics_summary["throughput"], key=metrics_summary["throughput"].get)
    }

    # Сохранение результатов
    output_file = f"cross-test-comparison-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(comparison, f, indent=2)

    print(f" Сравнение сохранено: {output_file}")
    print_cross_test_summary(comparison)

def calculate_percentage_change(baseline, current):
    """Вычисляет процентное изменение"""
    if baseline == 0:
        return 0 if current == 0 else 100
    return ((current - baseline) / baseline) * 100

def get_performance_status(baseline, current, direction):
    """Определяет статус производительности"""
    change = calculate_percentage_change(baseline, current)

    if direction == "lower_better":
        if change < -10:  # Улучшение > 10%
            return "improved"
        elif change > 10:  # Ухудшение > 10%
            return "degraded"
        else:
            return "stable"
    else:  # higher_better
        if change > 10:
            return "improved"
        elif change < -10:
            return "degraded"
        else:
            return "stable"

def print_comparison_summary(comparison):
    """Выводит сводку сравнения с baseline"""
    print("\n Сравнение с baseline:")
    print("-" * 50)

    for result in comparison["results"]:
        print(f"\n {result['test_name']}:")
        for metric_name, metric_data in result["metrics_comparison"].items():
            status_icon = {
                "improved": "✅",
                "degraded": "❌",
                "stable": "➡️"
            }.get(metric_data["status"], "❓")

            print(f"  {metric_name}: {status_icon} {metric_data['change_percent']:.1f}% "
                  f"({metric_data['baseline']:.2f} → {metric_data['current']:.2f})")

def print_cross_test_summary(comparison):
    """Выводит сводку сравнения между тестами"""
    print("\n Сравнение между тестами:")
    print("-" * 50)

    analysis = comparison["analysis"]
    print(f" Лучшее время ответа: {analysis['best_response_time']}")
    print(f" Худшее время ответа: {analysis['worst_response_time']}")
    print(f" Лучший error rate: {analysis['best_error_rate']}")
    print(f" Худший error rate: {analysis['worst_error_rate']}")
    print(f" Лучшая пропускная способность: {analysis['best_throughput']}")
    print(f" Худшая пропускная способность: {analysis['worst_throughput']}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python compare-results.py <results_directory> [baseline_file]")
        sys.exit(1)

    results_dir = sys.argv[1]
    baseline_file = sys.argv[2] if len(sys.argv) > 2 else None

    compare_test_results(results_dir, baseline_file)
