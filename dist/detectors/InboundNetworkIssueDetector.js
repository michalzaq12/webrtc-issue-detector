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
var _InboundNetworkIssueDetector_highPacketLossThresholdPct, _InboundNetworkIssueDetector_highJitterThreshold, _InboundNetworkIssueDetector_highJitterBufferDelayThresholdMs, _InboundNetworkIssueDetector_highRttThresholdMs;
import { IssueReason, IssueType, } from '../types';
import BaseIssueDetector from './BaseIssueDetector';
class InboundNetworkIssueDetector extends BaseIssueDetector {
    constructor(params = {}) {
        var _a, _b, _c, _d;
        super();
        _InboundNetworkIssueDetector_highPacketLossThresholdPct.set(this, void 0);
        _InboundNetworkIssueDetector_highJitterThreshold.set(this, void 0);
        _InboundNetworkIssueDetector_highJitterBufferDelayThresholdMs.set(this, void 0);
        _InboundNetworkIssueDetector_highRttThresholdMs.set(this, void 0);
        __classPrivateFieldSet(this, _InboundNetworkIssueDetector_highPacketLossThresholdPct, (_a = params.highPacketLossThresholdPct) !== null && _a !== void 0 ? _a : 5, "f");
        __classPrivateFieldSet(this, _InboundNetworkIssueDetector_highJitterThreshold, (_b = params.highJitterThreshold) !== null && _b !== void 0 ? _b : 200, "f");
        __classPrivateFieldSet(this, _InboundNetworkIssueDetector_highJitterBufferDelayThresholdMs, (_c = params.highJitterBufferDelayThresholdMs) !== null && _c !== void 0 ? _c : 500, "f");
        __classPrivateFieldSet(this, _InboundNetworkIssueDetector_highRttThresholdMs, (_d = params.highRttThresholdMs) !== null && _d !== void 0 ? _d : 250, "f");
    }
    performDetection(data) {
        return this.processData(data);
    }
    processData(data) {
        var _a, _b, _c, _d;
        const issues = [];
        const inboundRTPStreamsStats = [...(_a = data.audio) === null || _a === void 0 ? void 0 : _a.inbound, ...(_b = data.video) === null || _b === void 0 ? void 0 : _b.inbound];
        if (!inboundRTPStreamsStats.length) {
            return issues;
        }
        const previousStats = this.getLastProcessedStats(data.connection.id);
        if (!previousStats) {
            return issues;
        }
        const previousInboundStreamStats = [...(_c = previousStats.video) === null || _c === void 0 ? void 0 : _c.inbound, ...(_d = previousStats.audio) === null || _d === void 0 ? void 0 : _d.inbound];
        const { packetsReceived } = data.connection;
        const lastPacketsReceived = previousStats.connection.packetsReceived;
        const rtpNetworkStats = inboundRTPStreamsStats.reduce((stats, currentStreamStats) => {
            const previousStreamStats = previousInboundStreamStats.find((stream) => stream.ssrc === currentStreamStats.ssrc);
            const lastJitterBufferDelay = (previousStreamStats === null || previousStreamStats === void 0 ? void 0 : previousStreamStats.jitterBufferDelay) || 0;
            const lastJitterBufferEmittedCount = (previousStreamStats === null || previousStreamStats === void 0 ? void 0 : previousStreamStats.jitterBufferEmittedCount) || 0;
            const delay = currentStreamStats.jitterBufferDelay - lastJitterBufferDelay;
            const emitted = currentStreamStats.jitterBufferEmittedCount - lastJitterBufferEmittedCount;
            const jitterBufferDelayMs = delay && emitted ? (1e3 * delay) / emitted : 0;
            return {
                sumJitter: stats.sumJitter + currentStreamStats.jitter,
                sumJitterBufferDelayMs: stats.sumJitterBufferDelayMs + jitterBufferDelayMs,
                packetsLost: stats.packetsLost + currentStreamStats.packetsLost,
                lastPacketsLost: stats.lastPacketsLost + ((previousStreamStats === null || previousStreamStats === void 0 ? void 0 : previousStreamStats.packetsLost) || 0),
            };
        }, {
            sumJitter: 0,
            sumJitterBufferDelayMs: 0,
            packetsLost: 0,
            lastPacketsLost: 0,
        });
        const rtt = (1e3 * data.connection.currentRoundTripTime) || 0;
        const { sumJitter, sumJitterBufferDelayMs } = rtpNetworkStats;
        const avgJitter = sumJitter / inboundRTPStreamsStats.length;
        const avgJitterBufferDelay = sumJitterBufferDelayMs / inboundRTPStreamsStats.length;
        const deltaPacketReceived = packetsReceived - lastPacketsReceived;
        const deltaPacketLost = rtpNetworkStats.packetsLost - rtpNetworkStats.lastPacketsLost;
        const packetLossPct = deltaPacketReceived && deltaPacketLost
            ? Math.round((deltaPacketLost * 100) / (deltaPacketReceived + deltaPacketLost))
            : 0;
        const isHighPacketsLoss = packetLossPct > __classPrivateFieldGet(this, _InboundNetworkIssueDetector_highPacketLossThresholdPct, "f");
        const isHighJitter = avgJitter >= __classPrivateFieldGet(this, _InboundNetworkIssueDetector_highJitterThreshold, "f");
        const isHighRTT = rtt >= __classPrivateFieldGet(this, _InboundNetworkIssueDetector_highRttThresholdMs, "f");
        const isHighJitterBufferDelay = avgJitterBufferDelay > __classPrivateFieldGet(this, _InboundNetworkIssueDetector_highJitterBufferDelayThresholdMs, "f");
        const isNetworkIssue = isHighJitter || isHighPacketsLoss;
        const isServerIssue = isHighRTT && !isHighJitter && !isHighPacketsLoss;
        const isNetworkMediaLatencyIssue = isHighPacketsLoss && isHighJitter;
        const isNetworkMediaSyncIssue = isHighJitter && isHighJitterBufferDelay;
        const statsSample = {
            rtt,
            packetLossPct,
            avgJitter,
            avgJitterBufferDelay,
        };
        if (isNetworkIssue) {
            issues.push({
                statsSample,
                type: IssueType.Network,
                reason: IssueReason.InboundNetworkQuality,
                iceCandidate: data.connection.local.id,
            });
        }
        if (isServerIssue) {
            issues.push({
                statsSample,
                type: IssueType.Server,
                reason: IssueReason.ServerIssue,
                iceCandidate: data.connection.remote.id,
            });
        }
        if (isNetworkMediaLatencyIssue) {
            issues.push({
                statsSample,
                type: IssueType.Network,
                reason: IssueReason.InboundNetworkMediaLatency,
                iceCandidate: data.connection.local.id,
            });
        }
        if (isNetworkMediaSyncIssue) {
            issues.push({
                statsSample,
                type: IssueType.Network,
                reason: IssueReason.NetworkMediaSyncFailure,
                iceCandidate: data.connection.local.id,
            });
        }
        return issues;
    }
}
_InboundNetworkIssueDetector_highPacketLossThresholdPct = new WeakMap(), _InboundNetworkIssueDetector_highJitterThreshold = new WeakMap(), _InboundNetworkIssueDetector_highJitterBufferDelayThresholdMs = new WeakMap(), _InboundNetworkIssueDetector_highRttThresholdMs = new WeakMap();
export default InboundNetworkIssueDetector;
