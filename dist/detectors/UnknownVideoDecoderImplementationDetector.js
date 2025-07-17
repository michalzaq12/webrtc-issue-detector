var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _UnknownVideoDecoderImplementationDetector_lastDecoderWithIssue;
import { IssueReason, IssueType, } from '../types';
import BaseIssueDetector from './BaseIssueDetector';
class UnknownVideoDecoderImplementationDetector extends BaseIssueDetector {
    constructor() {
        super(...arguments);
        this.UNKNOWN_DECODER = 'unknown';
        _UnknownVideoDecoderImplementationDetector_lastDecoderWithIssue.set(this, {});
    }
    performDetection(data) {
        return this.processData(data);
    }
    performPrevStatsCleanup(payload) {
        const { connectionId, cleanupCallback } = payload;
        super.performPrevStatsCleanup({
            ...payload,
            cleanupCallback: () => {
                delete __classPrivateFieldGet(this, _UnknownVideoDecoderImplementationDetector_lastDecoderWithIssue, "f")[connectionId];
                if (typeof cleanupCallback === 'function') {
                    cleanupCallback();
                }
            },
        });
    }
    processData(data) {
        const issues = [];
        const { id: connectionId } = data.connection;
        const previousInboundRTPVideoStreamsStats = this.getLastProcessedStats(connectionId)?.video.inbound;
        data.video.inbound.forEach((streamStats) => {
            const { decoderImplementation: currentDecoder, ssrc } = streamStats;
            const prevStats = previousInboundRTPVideoStreamsStats?.find((item) => item.ssrc === ssrc);
            // skipping the first iteration on purpose
            if (!prevStats) {
                return;
            }
            if (currentDecoder !== this.UNKNOWN_DECODER) {
                this.setLastDecoderWithIssue(connectionId, ssrc, undefined);
                return;
            }
            if (!this.hadLastDecoderWithIssue(connectionId, ssrc)) {
                this.setLastDecoderWithIssue(connectionId, ssrc, this.UNKNOWN_DECODER);
                const statsSample = {
                    mimeType: streamStats.mimeType,
                    decoderImplementation: currentDecoder,
                };
                issues.push({
                    ssrc,
                    statsSample,
                    type: IssueType.Stream,
                    reason: IssueReason.UnknownVideoDecoderIssue,
                    trackIdentifier: streamStats.track.trackIdentifier,
                });
            }
        });
        return issues;
    }
    setLastDecoderWithIssue(connectionId, ssrc, decoder) {
        const issues = __classPrivateFieldGet(this, _UnknownVideoDecoderImplementationDetector_lastDecoderWithIssue, "f")[connectionId] ?? {};
        if (decoder === undefined) {
            delete issues[ssrc];
        }
        else {
            issues[ssrc] = decoder;
        }
        __classPrivateFieldGet(this, _UnknownVideoDecoderImplementationDetector_lastDecoderWithIssue, "f")[connectionId] = issues;
    }
    hadLastDecoderWithIssue(connectionId, ssrc) {
        const issues = __classPrivateFieldGet(this, _UnknownVideoDecoderImplementationDetector_lastDecoderWithIssue, "f")[connectionId];
        const decoder = issues && issues[ssrc];
        return decoder === this.UNKNOWN_DECODER;
    }
}
_UnknownVideoDecoderImplementationDetector_lastDecoderWithIssue = new WeakMap();
export default UnknownVideoDecoderImplementationDetector;
