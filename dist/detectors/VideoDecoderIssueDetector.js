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
var _VideoDecoderIssueDetector_volatilityThreshold, _VideoDecoderIssueDetector_affectedStreamsPercentThreshold, _VideoDecoderIssueDetector_minMosQuality;
import { calculateVolatility } from '../helpers/calc';
import { isDtxLikeBehavior } from '../helpers/streams';
import { IssueReason, IssueType, MosQuality, } from '../types';
import { isSvcSpatialLayerChanged } from '../utils/video';
import BaseIssueDetector from './BaseIssueDetector';
const MIN_STATS_HISTORY_LENGTH = 5;
class VideoDecoderIssueDetector extends BaseIssueDetector {
    constructor(params = {}) {
        var _a, _b, _c;
        super(params);
        _VideoDecoderIssueDetector_volatilityThreshold.set(this, void 0);
        _VideoDecoderIssueDetector_affectedStreamsPercentThreshold.set(this, void 0);
        _VideoDecoderIssueDetector_minMosQuality.set(this, void 0);
        __classPrivateFieldSet(this, _VideoDecoderIssueDetector_volatilityThreshold, (_a = params.volatilityThreshold) !== null && _a !== void 0 ? _a : 8, "f");
        __classPrivateFieldSet(this, _VideoDecoderIssueDetector_affectedStreamsPercentThreshold, (_b = params.affectedStreamsPercentThreshold) !== null && _b !== void 0 ? _b : 30, "f");
        __classPrivateFieldSet(this, _VideoDecoderIssueDetector_minMosQuality, (_c = params.minMosQuality) !== null && _c !== void 0 ? _c : MosQuality.BAD, "f");
    }
    performDetection(data) {
        const allHistoricalStats = [
            ...this.getAllLastProcessedStats(data.connection.id),
            data,
        ];
        const isBadNetworkHappened = allHistoricalStats
            .find((stat) => stat.networkScores.inbound !== undefined && stat.networkScores.inbound <= __classPrivateFieldGet(this, _VideoDecoderIssueDetector_minMosQuality, "f"));
        if (isBadNetworkHappened) {
            // do not execute detection on historical stats based on bad network quality
            // to avoid false positives
            return [];
        }
        return this.processData(data);
    }
    processData(data) {
        const issues = [];
        const allProcessedStats = [
            ...this.getAllLastProcessedStats(data.connection.id),
            data,
        ];
        const throtthedStreams = data.video.inbound
            .map((incomeVideoStream) => {
            // At least 5 elements needed to have enough representation
            if (allProcessedStats.length < MIN_STATS_HISTORY_LENGTH) {
                return undefined;
            }
            const isSpatialLayerChanged = isSvcSpatialLayerChanged(incomeVideoStream.ssrc, allProcessedStats);
            if (isSpatialLayerChanged) {
                return undefined;
            }
            const allFps = [];
            for (let i = 0; i < allProcessedStats.length - 1; i += 1) {
                const videoStreamStats = allProcessedStats[i].video.inbound.find((stream) => stream.ssrc === incomeVideoStream.ssrc);
                if ((videoStreamStats === null || videoStreamStats === void 0 ? void 0 : videoStreamStats.framesPerSecond) !== undefined) {
                    allFps.push(videoStreamStats.framesPerSecond);
                }
            }
            if (allFps.length < MIN_STATS_HISTORY_LENGTH) {
                return undefined;
            }
            const isDtx = isDtxLikeBehavior(incomeVideoStream.ssrc, allProcessedStats);
            if (isDtx) {
                // DTX-like behavior detected, ignoring FPS volatility check
                return undefined;
            }
            const volatility = calculateVolatility(allFps);
            if (volatility > __classPrivateFieldGet(this, _VideoDecoderIssueDetector_volatilityThreshold, "f")) {
                return { ssrc: incomeVideoStream.ssrc, allFps, volatility };
            }
            return undefined;
        })
            .filter((throttledVideoStream) => Boolean(throttledVideoStream));
        if (throtthedStreams.length === 0) {
            return issues;
        }
        const affectedStreamsPercent = throtthedStreams.length / (data.video.inbound.length / 100);
        if (affectedStreamsPercent > __classPrivateFieldGet(this, _VideoDecoderIssueDetector_affectedStreamsPercentThreshold, "f")) {
            issues.push({
                type: IssueType.CPU,
                reason: IssueReason.DecoderCPUThrottling,
                statsSample: {
                    affectedStreamsPercent,
                    throtthedStreams,
                },
            });
            // clear all processed stats for this connection to avoid duplicate issues
            this.deleteLastProcessedStats(data.connection.id);
        }
        return issues;
    }
}
_VideoDecoderIssueDetector_volatilityThreshold = new WeakMap(), _VideoDecoderIssueDetector_affectedStreamsPercentThreshold = new WeakMap(), _VideoDecoderIssueDetector_minMosQuality = new WeakMap();
export default VideoDecoderIssueDetector;
