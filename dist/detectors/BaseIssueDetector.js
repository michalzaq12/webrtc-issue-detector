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
var _BaseIssueDetector_parsedStatsStorage, _BaseIssueDetector_statsCleanupDelayMs, _BaseIssueDetector_maxParsedStatsStorageSize;
import { scheduleTask } from '../utils/tasks';
import { CLEANUP_PREV_STATS_TTL_MS, MAX_PARSED_STATS_STORAGE_SIZE } from '../utils/constants';
class BaseIssueDetector {
    constructor(params = {}) {
        _BaseIssueDetector_parsedStatsStorage.set(this, new Map());
        _BaseIssueDetector_statsCleanupDelayMs.set(this, void 0);
        _BaseIssueDetector_maxParsedStatsStorageSize.set(this, void 0);
        __classPrivateFieldSet(this, _BaseIssueDetector_statsCleanupDelayMs, params.statsCleanupTtlMs ?? CLEANUP_PREV_STATS_TTL_MS, "f");
        __classPrivateFieldSet(this, _BaseIssueDetector_maxParsedStatsStorageSize, params.maxParsedStatsStorageSize ?? MAX_PARSED_STATS_STORAGE_SIZE, "f");
    }
    detect(data, networkScores) {
        const parsedStatsWithNetworkScores = {
            ...data,
            networkScores: {
                ...networkScores,
                statsSamples: networkScores?.statsSamples || {},
            },
        };
        const result = this.performDetection(parsedStatsWithNetworkScores);
        this.setLastProcessedStats(data.connection.id, parsedStatsWithNetworkScores);
        this.performPrevStatsCleanup({
            connectionId: data.connection.id,
        });
        return result;
    }
    performPrevStatsCleanup(payload) {
        const { connectionId, cleanupCallback } = payload;
        if (!__classPrivateFieldGet(this, _BaseIssueDetector_parsedStatsStorage, "f").has(connectionId)) {
            return;
        }
        scheduleTask({
            taskId: connectionId,
            delayMs: __classPrivateFieldGet(this, _BaseIssueDetector_statsCleanupDelayMs, "f"),
            callback: () => {
                this.deleteLastProcessedStats(connectionId);
                if (typeof cleanupCallback === 'function') {
                    cleanupCallback();
                }
            },
        });
    }
    setLastProcessedStats(connectionId, parsedStats) {
        if (!connectionId || parsedStats.connection.id !== connectionId) {
            return;
        }
        const connectionStats = __classPrivateFieldGet(this, _BaseIssueDetector_parsedStatsStorage, "f").get(connectionId) ?? [];
        connectionStats.push(parsedStats);
        if (connectionStats.length > __classPrivateFieldGet(this, _BaseIssueDetector_maxParsedStatsStorageSize, "f")) {
            connectionStats.shift();
        }
        __classPrivateFieldGet(this, _BaseIssueDetector_parsedStatsStorage, "f").set(connectionId, connectionStats);
    }
    getLastProcessedStats(connectionId) {
        const connectionStats = __classPrivateFieldGet(this, _BaseIssueDetector_parsedStatsStorage, "f").get(connectionId);
        return connectionStats?.[connectionStats.length - 1];
    }
    getAllLastProcessedStats(connectionId) {
        return __classPrivateFieldGet(this, _BaseIssueDetector_parsedStatsStorage, "f").get(connectionId) ?? [];
    }
    deleteLastProcessedStats(connectionId) {
        __classPrivateFieldGet(this, _BaseIssueDetector_parsedStatsStorage, "f").delete(connectionId);
    }
}
_BaseIssueDetector_parsedStatsStorage = new WeakMap(), _BaseIssueDetector_statsCleanupDelayMs = new WeakMap(), _BaseIssueDetector_maxParsedStatsStorageSize = new WeakMap();
export default BaseIssueDetector;
