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
var _MissingStreamDataDetector_lastMarkedAt, _MissingStreamDataDetector_timeoutMs, _MissingStreamDataDetector_steps;
import { IssueReason, IssueType, } from '../types';
import BaseIssueDetector from './BaseIssueDetector';
export default class MissingStreamDataDetector extends BaseIssueDetector {
    constructor(params = {}) {
        super();
        _MissingStreamDataDetector_lastMarkedAt.set(this, new Map());
        _MissingStreamDataDetector_timeoutMs.set(this, void 0);
        _MissingStreamDataDetector_steps.set(this, void 0);
        __classPrivateFieldSet(this, _MissingStreamDataDetector_timeoutMs, params.timeoutMs ?? 15000, "f");
        __classPrivateFieldSet(this, _MissingStreamDataDetector_steps, params.steps ?? 3, "f");
    }
    performDetection(data) {
        return this.processData(data);
    }
    processData(data) {
        const issues = [];
        const allLastProcessedStats = [...this.getAllLastProcessedStats(data.connection.id), data];
        if (allLastProcessedStats.length < __classPrivateFieldGet(this, _MissingStreamDataDetector_steps, "f")) {
            return issues;
        }
        const lastNProcessedStats = allLastProcessedStats.slice(-__classPrivateFieldGet(this, _MissingStreamDataDetector_steps, "f"));
        const lastNVideoInbound = lastNProcessedStats.map((stats) => stats.video.inbound);
        const lastNAudioInbound = lastNProcessedStats.map((stats) => stats.audio.inbound);
        issues.push(...this.detectMissingData(lastNAudioInbound, IssueType.Stream, IssueReason.MissingAudioStreamData));
        issues.push(...this.detectMissingData(lastNVideoInbound, IssueType.Stream, IssueReason.MissingVideoStreamData));
        const unvisitedTrackIds = new Set(__classPrivateFieldGet(this, _MissingStreamDataDetector_lastMarkedAt, "f").keys());
        unvisitedTrackIds.forEach((trackId) => {
            const lastMarkedAt = __classPrivateFieldGet(this, _MissingStreamDataDetector_lastMarkedAt, "f").get(trackId);
            if (lastMarkedAt && Date.now() - lastMarkedAt > __classPrivateFieldGet(this, _MissingStreamDataDetector_timeoutMs, "f")) {
                this.removeMarkedIssue(trackId);
            }
        });
        return issues;
    }
    detectMissingData(lastNInboundStats, type, reason) {
        const issues = [];
        const currentInboundStats = lastNInboundStats.pop();
        const prevInboundItemsByTrackId = MissingStreamDataDetector.mapStatsByTrackId(lastNInboundStats);
        currentInboundStats.forEach((inboundItem) => {
            const trackId = inboundItem.track.trackIdentifier;
            const prevInboundItems = prevInboundItemsByTrackId.get(trackId);
            if (!Array.isArray(prevInboundItems) || prevInboundItems.length === 0) {
                return;
            }
            if (inboundItem.track.detached || inboundItem.track.ended) {
                return;
            }
            if (!MissingStreamDataDetector.isAllBytesReceivedDidntChange(inboundItem.bytesReceived, prevInboundItems)) {
                this.removeMarkedIssue(trackId);
                return;
            }
            const issueMarked = this.markIssue(trackId);
            if (!issueMarked) {
                return;
            }
            const statsSample = {
                bytesReceived: inboundItem.bytesReceived,
            };
            issues.push({
                type,
                reason,
                statsSample,
                trackIdentifier: trackId,
            });
        });
        return issues;
    }
    static mapStatsByTrackId(items) {
        const statsById = new Map();
        items.forEach((inboundItems) => {
            inboundItems.forEach((inbountItem) => {
                const accumulatedItems = statsById.get(inbountItem.track.trackIdentifier) || [];
                accumulatedItems.push(inbountItem);
                statsById.set(inbountItem.track.trackIdentifier, accumulatedItems);
            });
        });
        return statsById;
    }
    static isAllBytesReceivedDidntChange(bytesReceived, inboundItems) {
        for (let i = 0; i < inboundItems.length; i += 1) {
            const inboundItem = inboundItems[i];
            if (inboundItem.bytesReceived !== bytesReceived) {
                return false;
            }
        }
        return true;
    }
    markIssue(trackId) {
        const now = Date.now();
        const lastMarkedAt = __classPrivateFieldGet(this, _MissingStreamDataDetector_lastMarkedAt, "f").get(trackId);
        if (!lastMarkedAt || now - lastMarkedAt > __classPrivateFieldGet(this, _MissingStreamDataDetector_timeoutMs, "f")) {
            __classPrivateFieldGet(this, _MissingStreamDataDetector_lastMarkedAt, "f").set(trackId, now);
            return true;
        }
        return false;
    }
    removeMarkedIssue(trackId) {
        __classPrivateFieldGet(this, _MissingStreamDataDetector_lastMarkedAt, "f").delete(trackId);
    }
}
_MissingStreamDataDetector_lastMarkedAt = new WeakMap(), _MissingStreamDataDetector_timeoutMs = new WeakMap(), _MissingStreamDataDetector_steps = new WeakMap();
