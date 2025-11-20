// tests/libs/performance-budget.js
export class PerformanceBudget {
    static budgets = {
        'API_RESPONSE_TIME': { warning: 1000, critical: 2000 },
        'PAGE_LOAD_TIME': { warning: 2000, critical: 4000 },
        'ERROR_RATE': { warning: 0.01, critical: 0.05 },
        'THROUGHPUT': { warning: 50, critical: 30 }
    };

    static checkBudget(metricName, currentValue) {
        const budget = this.budgets[metricName];
        if (!budget) return 'UNKNOWN';

        if (currentValue >= budget.critical) return 'CRITICAL';
        if (currentValue >= budget.warning) return 'WARNING';
        return 'HEALTHY';
    }

    static generateBudgetReport(metrics) {
        const report = {
            timestamp: new Date().toISOString(),
            overallStatus: 'HEALTHY',
            violations: []
        };

        Object.entries(metrics).forEach(([metric, value]) => {
            const status = this.checkBudget(metric, value);
            if (status !== 'HEALTHY') {
                report.violations.push({
                    metric,
                    value,
                    expected: this.budgets[metric],
                    status
                });

                if (status === 'CRITICAL') {
                    report.overallStatus = 'CRITICAL';
                } else if (report.overallStatus === 'HEALTHY') {
                    report.overallStatus = 'WARNING';
                }
            }
        });

        return report;
    }
}