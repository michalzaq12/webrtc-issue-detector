import { IssueReason, IssueType, } from '../types';
import BaseIssueDetector from './BaseIssueDetector';
class QualityLimitationsIssueDetector extends BaseIssueDetector {
    performDetection(data) {
        return this.processData(data);
    }
    processData(data) {
        const streamsWithLimitation = data.video.outbound.filter((stats) => stats.qualityLimitationReason !== 'none');
        const issues = [];
        const previousOutboundRTPVideoStreamsStats = this.getLastProcessedStats(data.connection.id)?.video.outbound;
        if (!previousOutboundRTPVideoStreamsStats) {
            return issues;
        }
        streamsWithLimitation.forEach((streamStats) => {
            const previousStreamStats = previousOutboundRTPVideoStreamsStats.find((item) => item.ssrc === streamStats.ssrc);
            if (!previousStreamStats) {
                // can not determine current status of the stream
                return;
            }
            const statsSample = {
                qualityLimitationReason: streamStats.qualityLimitationReason,
            };
            if (streamStats.framesSent > previousStreamStats.framesSent) {
                // stream is still sending
                return;
            }
            if (streamStats.qualityLimitationReason === 'cpu') {
                issues.push({
                    statsSample,
                    type: IssueType.CPU,
                    reason: IssueReason.EncoderCPUThrottling,
                    ssrc: streamStats.ssrc,
                });
            }
            if (streamStats.qualityLimitationReason === 'bandwidth') {
                issues.push({
                    statsSample,
                    type: IssueType.Network,
                    reason: IssueReason.OutboundNetworkThroughput,
                    ssrc: streamStats.ssrc,
                });
            }
        });
        return issues;
    }
}
export default QualityLimitationsIssueDetector;
