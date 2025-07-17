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
var _OutboundNetworkIssueDetector_highPacketLossThresholdPct, _OutboundNetworkIssueDetector_highJitterThreshold;
import { IssueReason, IssueType, } from '../types';
import BaseIssueDetector from './BaseIssueDetector';
class OutboundNetworkIssueDetector extends BaseIssueDetector {
    constructor(params = {}) {
        var _a, _b;
        super();
        _OutboundNetworkIssueDetector_highPacketLossThresholdPct.set(this, void 0);
        _OutboundNetworkIssueDetector_highJitterThreshold.set(this, void 0);
        __classPrivateFieldSet(this, _OutboundNetworkIssueDetector_highPacketLossThresholdPct, (_a = params.highPacketLossThresholdPct) !== null && _a !== void 0 ? _a : 5, "f");
        __classPrivateFieldSet(this, _OutboundNetworkIssueDetector_highJitterThreshold, (_b = params.highJitterThreshold) !== null && _b !== void 0 ? _b : 200, "f");
    }
    performDetection(data) {
        return this.processData(data);
    }
    processData(data) {
        var _a, _b, _c, _d;
        const issues = [];
        const remoteInboundRTPStreamsStats = [
            ...((_a = data.remote) === null || _a === void 0 ? void 0 : _a.audio.inbound) || [],
            ...((_b = data.remote) === null || _b === void 0 ? void 0 : _b.video.inbound) || [],
        ];
        if (!remoteInboundRTPStreamsStats.length) {
            return issues;
        }
        const previousStats = this.getLastProcessedStats(data.connection.id);
        if (!previousStats) {
            return issues;
        }
        const previousRemoteInboundRTPStreamsStats = [
            ...((_c = previousStats.remote) === null || _c === void 0 ? void 0 : _c.audio.inbound) || [],
            ...((_d = previousStats.remote) === null || _d === void 0 ? void 0 : _d.video.inbound) || [],
        ];
        const { packetsSent } = data.connection;
        const lastPacketsSent = previousStats.connection.packetsSent;
        const rtpNetworkStats = remoteInboundRTPStreamsStats.reduce((stats, currentStreamStats) => {
            const previousStreamStats = previousRemoteInboundRTPStreamsStats
                .find((stream) => stream.ssrc === currentStreamStats.ssrc);
            return {
                sumJitter: stats.sumJitter + currentStreamStats.jitter,
                packetsLost: stats.packetsLost + currentStreamStats.packetsLost,
                lastPacketsLost: stats.lastPacketsLost + ((previousStreamStats === null || previousStreamStats === void 0 ? void 0 : previousStreamStats.packetsLost) || 0),
            };
        }, {
            sumJitter: 0,
            packetsLost: 0,
            lastPacketsLost: 0,
        });
        const rtt = (1e3 * data.connection.currentRoundTripTime) || 0;
        const { sumJitter } = rtpNetworkStats;
        const avgJitter = sumJitter / remoteInboundRTPStreamsStats.length;
        const deltaPacketSent = packetsSent - lastPacketsSent;
        const deltaPacketLost = rtpNetworkStats.packetsLost - rtpNetworkStats.lastPacketsLost;
        const packetLossPct = deltaPacketSent && deltaPacketLost
            ? Math.round((deltaPacketLost * 100) / (deltaPacketSent + deltaPacketLost))
            : 0;
        const isHighPacketsLoss = packetLossPct > __classPrivateFieldGet(this, _OutboundNetworkIssueDetector_highPacketLossThresholdPct, "f");
        const isHighJitter = avgJitter >= __classPrivateFieldGet(this, _OutboundNetworkIssueDetector_highJitterThreshold, "f");
        const isNetworkMediaLatencyIssue = isHighPacketsLoss && isHighJitter;
        const isNetworkIssue = (!isHighPacketsLoss && isHighJitter) || isHighJitter || isHighPacketsLoss;
        const statsSample = {
            rtt,
            avgJitter,
            packetLossPct,
        };
        if (isNetworkMediaLatencyIssue) {
            issues.push({
                statsSample,
                type: IssueType.Network,
                reason: IssueReason.OutboundNetworkMediaLatency,
                iceCandidate: data.connection.local.id,
            });
        }
        if (isNetworkIssue) {
            issues.push({
                statsSample,
                type: IssueType.Network,
                reason: IssueReason.OutboundNetworkQuality,
                iceCandidate: data.connection.local.id,
            });
        }
        return issues;
    }
}
_OutboundNetworkIssueDetector_highPacketLossThresholdPct = new WeakMap(), _OutboundNetworkIssueDetector_highJitterThreshold = new WeakMap();
export default OutboundNetworkIssueDetector;
