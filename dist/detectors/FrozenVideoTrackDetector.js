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
var _FrozenVideoTrackDetector_avgFreezeDurationThresholdMs, _FrozenVideoTrackDetector_frozenDurationThresholdPct, _FrozenVideoTrackDetector_minMosQuality;
import { isDtxLikeBehavior } from '../helpers/streams';
import { IssueReason, IssueType, MosQuality, } from '../types';
import { isSvcSpatialLayerChanged } from '../utils/video';
import BaseIssueDetector from './BaseIssueDetector';
class FrozenVideoTrackDetector extends BaseIssueDetector {
    constructor(params = {}) {
        super();
        _FrozenVideoTrackDetector_avgFreezeDurationThresholdMs.set(this, void 0);
        _FrozenVideoTrackDetector_frozenDurationThresholdPct.set(this, void 0);
        _FrozenVideoTrackDetector_minMosQuality.set(this, void 0);
        __classPrivateFieldSet(this, _FrozenVideoTrackDetector_avgFreezeDurationThresholdMs, params.avgFreezeDurationThresholdMs ?? 1000, "f");
        __classPrivateFieldSet(this, _FrozenVideoTrackDetector_frozenDurationThresholdPct, params.frozenDurationThresholdPct ?? 30, "f");
        __classPrivateFieldSet(this, _FrozenVideoTrackDetector_minMosQuality, params.minMosQuality ?? MosQuality.BAD, "f");
    }
    performDetection(data) {
        const inboundScore = data.networkScores.inbound;
        if (inboundScore !== undefined && inboundScore <= __classPrivateFieldGet(this, _FrozenVideoTrackDetector_minMosQuality, "f")) {
            // do not execute detection on stats based on poor network quality
            // to avoid false positives
            return [];
        }
        return this.processData(data);
    }
    processData(data) {
        const issues = [];
        const allLastProcessedStats = this.getAllLastProcessedStats(data.connection.id);
        if (allLastProcessedStats.length === 0) {
            return [];
        }
        const frozenStreams = data.video.inbound
            .map((videoStream) => {
            const prevStat = allLastProcessedStats[allLastProcessedStats.length - 1]
                .video.inbound.find((stream) => stream.ssrc === videoStream.ssrc);
            if (!prevStat) {
                return undefined;
            }
            const isSpatialLayerChanged = isSvcSpatialLayerChanged(videoStream.ssrc, [
                allLastProcessedStats[allLastProcessedStats.length - 1],
                data,
            ]);
            if (isSpatialLayerChanged) {
                return undefined;
            }
            const isDtx = isDtxLikeBehavior(videoStream.ssrc, allLastProcessedStats);
            if (isDtx) {
                // DTX-like behavior detected, ignoring freezes check
                return undefined;
            }
            const deltaFreezeCount = videoStream.freezeCount - (prevStat.freezeCount ?? 0);
            const deltaFreezesTimeMs = (videoStream.totalFreezesDuration - (prevStat.totalFreezesDuration ?? 0)) * 1000;
            const avgFreezeDurationMs = deltaFreezeCount > 0 ? deltaFreezesTimeMs / deltaFreezeCount : 0;
            const statsTimeDiff = videoStream.timestamp - prevStat.timestamp;
            const frozenDurationPct = (deltaFreezesTimeMs / statsTimeDiff) * 100;
            if (frozenDurationPct > __classPrivateFieldGet(this, _FrozenVideoTrackDetector_frozenDurationThresholdPct, "f")) {
                return {
                    ssrc: videoStream.ssrc,
                    avgFreezeDurationMs,
                    frozenDurationPct,
                };
            }
            if (avgFreezeDurationMs > __classPrivateFieldGet(this, _FrozenVideoTrackDetector_avgFreezeDurationThresholdMs, "f")) {
                return {
                    ssrc: videoStream.ssrc,
                    avgFreezeDurationMs,
                    frozenDurationPct,
                };
            }
            return undefined;
        })
            .filter((stream) => stream !== undefined);
        if (frozenStreams.length > 0) {
            issues.push({
                type: IssueType.Stream,
                reason: IssueReason.FrozenVideoTrack,
                statsSample: {
                    ssrcs: frozenStreams.map((stream) => stream.ssrc),
                },
            });
            // clear all processed stats for this connection to avoid duplicate issues
            this.deleteLastProcessedStats(data.connection.id);
        }
        return issues;
    }
}
_FrozenVideoTrackDetector_avgFreezeDurationThresholdMs = new WeakMap(), _FrozenVideoTrackDetector_frozenDurationThresholdPct = new WeakMap(), _FrozenVideoTrackDetector_minMosQuality = new WeakMap();
export default FrozenVideoTrackDetector;
