var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _NetworkScoresCalculator_lastProcessedStats;
import { scheduleTask } from './utils/tasks';
import { CLEANUP_PREV_STATS_TTL_MS } from './utils/constants';
class NetworkScoresCalculator {
    constructor() {
        _NetworkScoresCalculator_lastProcessedStats.set(this, {});
    }
    calculate(data) {
        const { connection: { id: connectionId } } = data;
        const { mos: outbound, stats: outboundStatsSample } = this.calculateOutboundScore(data) || {};
        const { mos: inbound, stats: inboundStatsSample } = this.calculateInboundScore(data) || {};
        __classPrivateFieldGet(this, _NetworkScoresCalculator_lastProcessedStats, "f")[connectionId] = data;
        scheduleTask({
            taskId: connectionId,
            delayMs: CLEANUP_PREV_STATS_TTL_MS,
            callback: () => (delete __classPrivateFieldGet(this, _NetworkScoresCalculator_lastProcessedStats, "f")[connectionId]),
        });
        return {
            outbound,
            inbound,
            connectionId,
            statsSamples: {
                inboundStatsSample,
                outboundStatsSample,
            },
        };
    }
    calculateOutboundScore(data) {
        const remoteInboundRTPStreamsStats = [
            ...data.remote?.audio.inbound || [],
            ...data.remote?.video.inbound || [],
        ];
        if (!remoteInboundRTPStreamsStats.length) {
            return undefined;
        }
        const previousStats = __classPrivateFieldGet(this, _NetworkScoresCalculator_lastProcessedStats, "f")[data.connection.id];
        if (!previousStats) {
            return undefined;
        }
        const previousRemoteInboundRTPStreamsStats = [
            ...previousStats.remote?.audio.inbound || [],
            ...previousStats.remote?.video.inbound || [],
        ];
        const { packetsSent } = data.connection;
        const lastPacketsSent = previousStats.connection.packetsSent;
        const rtpNetworkStats = remoteInboundRTPStreamsStats.reduce((stats, currentStreamStats) => {
            const previousStreamStats = previousRemoteInboundRTPStreamsStats
                .find((stream) => stream.ssrc === currentStreamStats.ssrc);
            return {
                sumJitter: stats.sumJitter + currentStreamStats.jitter,
                packetsLost: stats.packetsLost + currentStreamStats.packetsLost,
                lastPacketsLost: stats.lastPacketsLost + (previousStreamStats?.packetsLost || 0),
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
        const packetsLoss = deltaPacketSent && deltaPacketLost
            ? Math.round((deltaPacketLost * 100) / (deltaPacketSent + deltaPacketLost))
            : 0;
        const mos = this.calculateMOS({ avgJitter, rtt, packetsLoss });
        return {
            mos,
            stats: { avgJitter, rtt, packetsLoss },
        };
    }
    calculateInboundScore(data) {
        const inboundRTPStreamsStats = [...data.audio?.inbound, ...data.video?.inbound];
        if (!inboundRTPStreamsStats.length) {
            return undefined;
        }
        const previousStats = __classPrivateFieldGet(this, _NetworkScoresCalculator_lastProcessedStats, "f")[data.connection.id];
        if (!previousStats) {
            return undefined;
        }
        const previousInboundStreamStats = [...previousStats.video?.inbound, ...previousStats.audio?.inbound];
        const { packetsReceived } = data.connection;
        const lastPacketsReceived = previousStats.connection.packetsReceived;
        const rtpNetworkStats = inboundRTPStreamsStats.reduce((stats, currentStreamStats) => {
            const previousStreamStats = previousInboundStreamStats.find((stream) => stream.ssrc === currentStreamStats.ssrc);
            return {
                sumJitter: stats.sumJitter + currentStreamStats.jitter,
                packetsLost: stats.packetsLost + currentStreamStats.packetsLost,
                lastPacketsLost: stats.lastPacketsLost + (previousStreamStats?.packetsLost || 0),
            };
        }, {
            sumJitter: 0,
            packetsLost: 0,
            lastPacketsLost: 0,
        });
        const rtt = (1e3 * data.connection.currentRoundTripTime) || 0;
        const { sumJitter } = rtpNetworkStats;
        const avgJitter = sumJitter / inboundRTPStreamsStats.length;
        const deltaPacketReceived = packetsReceived - lastPacketsReceived;
        const deltaPacketLost = rtpNetworkStats.packetsLost - rtpNetworkStats.lastPacketsLost;
        const packetsLoss = deltaPacketReceived && deltaPacketLost
            ? Math.round((deltaPacketLost * 100) / (deltaPacketReceived + deltaPacketLost))
            : 0;
        const mos = this.calculateMOS({ avgJitter, rtt, packetsLoss });
        return {
            mos,
            stats: { avgJitter, rtt, packetsLoss },
        };
    }
    calculateMOS({ avgJitter, rtt, packetsLoss }) {
        const effectiveLatency = rtt + (avgJitter * 2) + 10;
        let rFactor = effectiveLatency < 160
            ? 93.2 - (effectiveLatency / 40)
            : 93.2 - (effectiveLatency / 120) - 10;
        rFactor -= (packetsLoss * 2.5);
        return 1 + (0.035) * rFactor + (0.000007) * rFactor * (rFactor - 60) * (100 - rFactor);
    }
}
_NetworkScoresCalculator_lastProcessedStats = new WeakMap();
export default NetworkScoresCalculator;
