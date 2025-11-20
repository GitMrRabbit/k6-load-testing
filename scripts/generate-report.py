#!/usr/bin/env python3
import json
import sys
import os
from datetime import datetime

def generate_report(results_dir):
    report = {
        "timestamp": datetime.now().isoformat(),
        "test_suite": "Comprehensive k6 Load Tests",
        "results": []
    }

    for filename in os.listdir(results_dir):
        if filename.endswith('.json'):
            filepath = os.path.join(results_dir, filename)
            with open(filepath, 'r') as f:
                data = json.load(f)

            test_result = {
                "test_name": filename.replace('.json', ''),
                "metrics": data.get('metrics', {}),
                "duration": data.get('state', {}).get('testRunDuration', 0),
                "vus": data.get('state', {}).get('vus', 0)
            }
            report['results'].append(test_result)

    # Сохранение сводного отчета
    report_path = os.path.join(results_dir, 'summary_report.json')
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)

    print(f" Summary report generated: {report_path}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        generate_report(sys.argv[1])
    else:
        print("Please provide results directory")