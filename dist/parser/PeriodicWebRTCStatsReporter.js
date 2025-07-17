import { EventEmitter } from 'events';
class PeriodicWebRTCStatsReporter extends EventEmitter {
    constructor(params) {
        super();
        this.isStopped = false;
        this.compositeStatsParser = params.compositeStatsParser;
        this.getStatsInterval = params.getStatsInterval ?? 10000;
    }
    get isRunning() {
        return !!this.reportTimer && !this.isStopped;
    }
    startReporting() {
        if (this.reportTimer) {
            return;
        }
        const doExtract = () => setTimeout(() => {
            if (this.isStopped) {
                this.reportTimer = undefined;
                return;
            }
            this.parseReports()
                .finally(() => {
                this.reportTimer = doExtract();
            });
        }, this.getStatsInterval);
        this.isStopped = false;
        this.reportTimer = doExtract();
    }
    stopReporting() {
        this.isStopped = true;
        if (this.reportTimer) {
            clearTimeout(this.reportTimer);
            this.reportTimer = undefined;
        }
    }
    async parseReports() {
        const startTime = Date.now();
        const reportItems = await this.compositeStatsParser.parse();
        const timeTaken = Date.now() - startTime;
        this.emit(PeriodicWebRTCStatsReporter.STATS_REPORTS_PARSED, { timeTaken, reportItems });
        reportItems.forEach((item) => {
            this.emit(PeriodicWebRTCStatsReporter.STATS_REPORT_READY_EVENT, item);
        });
    }
}
PeriodicWebRTCStatsReporter.STATS_REPORT_READY_EVENT = 'stats-report-ready';
PeriodicWebRTCStatsReporter.STATS_REPORTS_PARSED = 'stats-reports-parsed';
export default PeriodicWebRTCStatsReporter;
