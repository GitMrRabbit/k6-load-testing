#!/usr/bin/env python3

import os
import json
from datetime import datetime
import matplotlib.pyplot as plt
from matplotlib.gridspec import GridSpec

def count_errors_in_file(filepath):
    error_count = 0
    total_requests = 0

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
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
    except Exception as e:
        print(f"Error processing file {filepath}: {e}")

    return error_count, total_requests

def generate_modern_report(passed, failed, tests_data, output_file):

    fig = plt.figure(figsize=(12, 16), facecolor='#1e1e1e')
    gs = GridSpec(3, 1, height_ratios=[0.7, 1, 1.3], hspace=0.3)

    ax_header = fig.add_subplot(gs[0])
    ax_header.set_facecolor('#1e1e1e')
    ax_header.axis('off')

    ax_header.text(0.4, 0.85, 'K6 LOAD TEST REPORT',  #   0.5  0.4
                   fontsize=24, color='#ffffff', ha='center', va='center',
                   weight='bold', family='sans-serif')

    ax_header.text(0.4, 0.65, f'Date: {current_date}',  # 0.5  0.4
                   fontsize=12, color='#cccccc', ha='center', va='center',
                   family='monospace')

    total_tests = passed + failed
    status_color = '#4CAF50' if failed == 0 else '#FF6B6B'
    ax_header.text(0.98, 0.95, f'TOTAL: {total_tests}',
                   fontsize=16, color=status_color, ha='right', va='top',
                   weight='bold', bbox=dict(boxstyle="round,pad=0.3",
                                           facecolor='#2d2d2d',
                                           edgecolor=status_color,
                                           linewidth=2))

    ax_middle = fig.add_subplot(gs[1])
    ax_middle.set_facecolor('#1e1e1e')
    ax_middle.axis('off')

    ax_pie = fig.add_axes([0.1, 0.48, 0.4, 0.4])  #  bottom с 0.52 до 0.5
    labels = ['PASSED', 'FAILED']
    sizes = [passed, failed]
    colors = ['#4CAF50', '#F44336']

    if failed == 0:
        wedges, texts = ax_pie.pie([1], colors=['#4CAF50'], startangle=90)
        ax_pie.text(0, 0, '100%', ha='center', va='center',
                   fontsize=20, color='white', weight='bold')
    else:
        wedges, texts, autotexts = ax_pie.pie(sizes, colors=colors, startangle=90,
                                             autopct='%1.1f%%', textprops={'color':'white'})
        for autotext in autotexts:
            autotext.set_color('white')
            autotext.set_weight('bold')

    ax_pie.axis('equal')
    ax_pie.set_title('Test Results Distribution', color='white', pad=20, weight='bold')
    ax_pie.set_facecolor('#1e1e1e')

    ax_status = fig.add_axes([0.55, 0.52, 0.4, 0.4])
    ax_status.set_facecolor('#1e1e1e')
    ax_status.axis('off')

    y_pos = 0.9
    stats = [
        (f'{passed}', 'PASSED TESTS', '#4CAF50'),
        (f'{failed}', 'FAILED TESTS', '#F44336' if failed > 0 else '#4CAF50'),  # Исправил FALLED на FAILED
        (f'{total_tests}', 'TOTAL TESTS', '#2196F3')
    ]

    for value, label, color in stats:
        ax_status.text(0.5, y_pos, value, fontsize=26, color=color,
                      ha='center', va='center', weight='bold')
        ax_status.text(0.5, y_pos - 0.1, label, fontsize=11, color='#cccccc',
                      ha='center', va='center')
        y_pos -= 0.22

    overall_status = "ALL TESTS PASSED" if failed == 0 else f"{failed} TESTS FAILED"
    status_color = '#4CAF50' if failed == 0 else '#F44336'
    ax_status.text(0.5, 0.15, overall_status, fontsize=14, color=status_color,
                  ha='center', va='center', weight='bold',
                  bbox=dict(boxstyle="round,pad=0.5", facecolor='#2d2d2d',
                           edgecolor=status_color, linewidth=2))

    ax_details = fig.add_subplot(gs[2])
    ax_details.set_facecolor('#1e1e1e')
    ax_details.axis('off')

    ax_details.text(0.02, 0.95, 'DETAILED TEST RESULTS',
                   fontsize=16, color='#ffffff', ha='left', va='top',
                   weight='bold')

    y_pos = 0.85
    row_height = 0.06

    headers = ['TEST NAME', 'REQUESTS', 'ERRORS', 'ERROR RATE', 'STATUS']
    header_x_positions = [0.02, 0.25, 0.45, 0.65, 0.85]

    for header, x_pos in zip(headers, header_x_positions):
        ax_details.text(x_pos, y_pos, header, fontsize=11, color='#888888',
                       ha='left', va='center', weight='bold')

    y_pos -= row_height

    for test in tests_data:
        status_color = '#4CAF50' if test['error_rate'] == 0 else '#F44336'
        status_text = 'PASS' if test['error_rate'] == 0 else 'FAIL'

        cells = [
            test['name'].upper(),
            f"{test['requests']:,}",
            str(test['errors']),
            f"{test['error_rate']:.2f}%",
            status_text
        ]

        for cell, x_pos in zip(cells, header_x_positions):
            color = 'white' if x_pos != 0.85 else status_color
            weight = 'normal' if x_pos != 0.85 else 'bold'
            font_size = 9 if x_pos == 0.02 else 9
            ax_details.text(x_pos, y_pos, cell, fontsize=font_size, color=color,
                           ha='left', va='center', weight=weight,
                           family='monospace' if x_pos != 0.02 else 'sans-serif')

        if y_pos > 0.1:
            ax_details.axhline(y=y_pos - row_height/2, xmin=0.02, xmax=0.98,
                              color='#333333', linewidth=0.5)

        y_pos -= row_height

    ax_details.text(0.02, 0.02, 'Generated by K6 Load Testing CI/CD',
                   fontsize=9, color='#666666', ha='left', va='bottom')

    plt.tight_layout()
    plt.savefig(output_file, dpi=120, facecolor='#1e1e1e', bbox_inches='tight',
                pad_inches=0.5)
    plt.close()
    print(f"Report generated: {output_file}")

def get_test_display_name(filename):

    name_without_ext = filename.replace('.json', '')

    test_names = {
        'smoke': 'SMOKE TEST',
        'load': 'LOAD TEST',
        'stress': 'STRESS TEST',
        'volume': 'VOLUME TEST',
        'security': 'SECURITY TEST',
        'adaptive': 'ADAPTIVE TEST'
    }

    for test_key, display_name in test_names.items():
        if test_key in name_without_ext.lower():
            return display_name

    parts = name_without_ext.split('-')
    if len(parts) > 1:
        return parts[0].upper() + ' TEST'
    else:
        return name_without_ext.upper()

def generate_telegram_report(results_dir):
    """Генерация отчета для Telegram"""
    print(f"Scanning directory: {results_dir}")

    if not os.path.exists(results_dir):
        return None, f"Error: Directory {results_dir} not found"

    json_files = [f for f in os.listdir(results_dir) if f.endswith('.json')]
    print(f"Found JSON files: {json_files}")

    if not json_files:
        return None, "Error: No JSON test result files found"

    total_tests = len(json_files)
    passed_tests = 0
    failed_tests = 0
    tests_data = []

    for filename in json_files:
        filepath = os.path.join(results_dir, filename)
        print(f"Processing file: {filename}")
        error_count, total_requests = count_errors_in_file(filepath)

        test_name = get_test_display_name(filename)
        error_rate = (error_count / total_requests * 100) if total_requests > 0 else 0

        print(f"Test: {test_name}, Requests: {total_requests}, Errors: {error_count}, Rate: {error_rate:.2f}%")

        if error_rate == 0:
            passed_tests += 1
        else:
            failed_tests += 1

        tests_data.append({
            'name': test_name,
            'requests': total_requests,
            'errors': error_count,
            'error_rate': error_rate
        })

    tests_data.sort(key=lambda x: x['name'])

    image_file = os.path.join(results_dir, 'modern_test_report.png')
    generate_modern_report(passed_tests, failed_tests, tests_data, image_file)

    return image_file, None

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        image_file, error = generate_telegram_report(sys.argv[1])
        if error:
            print(f"ERROR: {error}")
            sys.exit(1)
        else:
            print(f"IMAGE_FILE={image_file}")
    else:
        print("Usage: python generate_telegram_report.py <results_directory>")
        sys.exit(1)