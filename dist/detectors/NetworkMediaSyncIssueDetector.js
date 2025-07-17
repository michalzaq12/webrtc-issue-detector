var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _NetworkMediaSyncIssueDetector_correctedSamplesThresholdPct;
import { IssueReason, IssueType, } from '../types';
import BaseIssueDetector from './BaseIssueDetector';
class NetworkMediaSyncIssueDetector extends BaseIssueDetector {
    constructor(params = {}) {
        var _a;
        super();
        _NetworkMediaSyncIssueDetector_correctedSamplesThresholdPct.set(this, void 0);
        __classPrivateFieldSet(this, _NetworkMediaSyncIssueDetector_correctedSamplesThresholdPct, (_a = params.correctedSamplesThresholdPct) !== null && _a !== void 0 ? _a : 5, "f");
    }
    performDetection(data) {
        return this.processData(data);
    }
    processData(data) {
        var _a;
        const inboundRTPAudioStreamsStats = data.audio.inbound;
        const issues = [];
        const previousInboundRTPAudioStreamsStats = (_a = this.getLastProcessedStats(data.connection.id)) === null || _a === void 0 ? void 0 : _a.audio.inbound;
        if (!previousInboundRTPAudioStreamsStats) {
            return issues;
        }
        inboundRTPAudioStreamsStats.forEach((stats) => {
            const previousStreamStats = previousInboundRTPAudioStreamsStats.find((item) => item.ssrc === stats.ssrc);
            if (!previousStreamStats) {
                return;
            }
            const nowCorrectedSamples = stats.track.insertedSamplesForDeceleration
                + stats.track.removedSamplesForAcceleration;
            const lastCorrectedSamples = previousStreamStats.track.insertedSamplesForDeceleration
                + previousStreamStats.track.removedSamplesForAcceleration;
            if (nowCorrectedSamples === lastCorrectedSamples) {
                return;
            }
            const deltaSamplesReceived = stats.track.totalSamplesReceived - previousStreamStats.track.totalSamplesReceived;
            const deltaCorrectedSamples = nowCorrectedSamples - lastCorrectedSamples;
            const correctedSamplesPct = Math.round((deltaCorrectedSamples * 100) / deltaSamplesReceived);
            const statsSample = {
                correctedSamplesPct,
            };
            if (correctedSamplesPct > __classPrivateFieldGet(this, _NetworkMediaSyncIssueDetector_correctedSamplesThresholdPct, "f")) {
                issues.push({
                    statsSample,
                    type: IssueType.Network,
                    reason: IssueReason.NetworkMediaSyncFailure,
                    ssrc: stats.ssrc,
                });
            }
        });
        return issues;
    }
}
_NetworkMediaSyncIssueDetector_correctedSamplesThresholdPct = new WeakMap();
export default NetworkMediaSyncIssueDetector;
