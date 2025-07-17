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
var _AvailableOutgoingBitrateIssueDetector_availableOutgoingBitrateThreshold;
import { IssueReason, IssueType, } from '../types';
import BaseIssueDetector from './BaseIssueDetector';
class AvailableOutgoingBitrateIssueDetector extends BaseIssueDetector {
    constructor(params = {}) {
        super(params);
        _AvailableOutgoingBitrateIssueDetector_availableOutgoingBitrateThreshold.set(this, void 0);
        __classPrivateFieldSet(this, _AvailableOutgoingBitrateIssueDetector_availableOutgoingBitrateThreshold, params.availableOutgoingBitrateThreshold ?? 100000, "f"); // 100 KBit/s
    }
    performDetection(data) {
        const issues = [];
        const { availableOutgoingBitrate } = data.connection;
        if (availableOutgoingBitrate === undefined) {
            // availableOutgoingBitrate is not measured yet
            return issues;
        }
        const audioStreamsTotalTargetBitrate = data.audio.outbound
            .reduce((totalBitrate, streamStat) => totalBitrate + streamStat.targetBitrate, 0);
        const videoStreamsTotalBitrate = data.video.outbound
            .reduce((totalBitrate, streamStat) => totalBitrate + streamStat.bitrate, 0);
        if (!audioStreamsTotalTargetBitrate && !videoStreamsTotalBitrate) {
            // there are no streams sending through this connection
            return issues;
        }
        const statsSample = {
            availableOutgoingBitrate,
            videoStreamsTotalBitrate,
            audioStreamsTotalTargetBitrate,
        };
        if (audioStreamsTotalTargetBitrate > availableOutgoingBitrate) {
            issues.push({
                statsSample,
                type: IssueType.Network,
                reason: IssueReason.OutboundNetworkThroughput,
            });
            return issues;
        }
        if (videoStreamsTotalBitrate > 0 && availableOutgoingBitrate < __classPrivateFieldGet(this, _AvailableOutgoingBitrateIssueDetector_availableOutgoingBitrateThreshold, "f")) {
            issues.push({
                statsSample,
                type: IssueType.Network,
                reason: IssueReason.OutboundNetworkThroughput,
            });
            return issues;
        }
        return issues;
    }
}
_AvailableOutgoingBitrateIssueDetector_availableOutgoingBitrateThreshold = new WeakMap();
export default AvailableOutgoingBitrateIssueDetector;
