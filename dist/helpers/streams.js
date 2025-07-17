import { calculateStandardDeviation } from './calc';
export const isDtxLikeBehavior = (ssrc, allProcessedStats, stdDevThreshold = 30) => {
    var _a, _b, _c, _d, _e;
    const frameIntervals = [];
    for (let i = 1; i < allProcessedStats.length - 1; i += 1) {
        const videoStreamStats = (_b = (_a = allProcessedStats[i]) === null || _a === void 0 ? void 0 : _a.video) === null || _b === void 0 ? void 0 : _b.inbound.find((stream) => stream.ssrc === ssrc);
        if (!videoStreamStats) {
            continue;
        }
        const previousVideoStreamStats = (_e = (_d = (_c = allProcessedStats[i - 1]) === null || _c === void 0 ? void 0 : _c.video) === null || _d === void 0 ? void 0 : _d.inbound) === null || _e === void 0 ? void 0 : _e.find((stream) => stream.ssrc === ssrc);
        if (!videoStreamStats || !previousVideoStreamStats) {
            continue;
        }
        const deltaTime = videoStreamStats.timestamp - previousVideoStreamStats.timestamp;
        const deltaFrames = videoStreamStats.framesDecoded - previousVideoStreamStats.framesDecoded;
        if (deltaFrames > 0) {
            const frameInterval = deltaTime / deltaFrames; // Average time per frame
            frameIntervals.push(frameInterval);
        }
    }
    if (frameIntervals.length <= 1) {
        return false;
    }
    const stdDev = calculateStandardDeviation(frameIntervals);
    return stdDev > stdDevThreshold;
};
