import { checkIsConnectionClosed, calcBitrate } from './utils';
import { scheduleTask } from '../utils/tasks';
import { CLEANUP_PREV_STATS_TTL_MS } from '../utils/constants';
class RTCStatsParser {
    constructor(params) {
        this.prevStats = new Map();
        this.allowedReportTypes = new Set([
            'candidate-pair',
            'inbound-rtp',
            'outbound-rtp',
            'remote-outbound-rtp',
            'remote-inbound-rtp',
            'track',
            'transport',
        ]);
        this.ignoreSSRCList = params.ignoreSSRCList ?? [];
        this.logger = params.logger;
    }
    get previouslyParsedStatsConnectionsIds() {
        return [...this.prevStats.keys()];
    }
    async parse(connection) {
        if (checkIsConnectionClosed(connection.pc)) {
            this.logger.debug('Skip stats parsing. Connection is closed.', { connection });
            return undefined;
        }
        return this.getConnectionStats(connection);
    }
    async getConnectionStats(info) {
        const { pc, id } = info;
        try {
            const beforeGetStats = Date.now();
            const recieversWithActiveTracks = pc.getReceivers().filter((r) => r.track?.enabled);
            const sendersWithActiveTracks = pc.getSenders().filter((s) => s.track?.enabled);
            const receiversStats = await Promise.all(recieversWithActiveTracks.map((r) => r.getStats()));
            const sendersStats = await Promise.all(sendersWithActiveTracks.map((r) => r.getStats()));
            const stats = this.mapReportsStats([...receiversStats, ...sendersStats], info);
            return {
                id,
                stats,
                timeTaken: Date.now() - beforeGetStats,
            };
        }
        catch (error) {
            this.logger.error('Failed to get stats for PC', { id, pc, error });
            return undefined;
        }
    }
    mapReportsStats(reports, connectionData) {
        const mappedStats = {
            audio: {
                inbound: [],
                outbound: [],
            },
            video: {
                inbound: [],
                outbound: [],
            },
            connection: {},
            remote: {
                video: {
                    inbound: [],
                    outbound: [],
                },
                audio: {
                    inbound: [],
                    outbound: [],
                },
            },
        };
        reports.forEach((rtcStats) => {
            rtcStats.forEach((reportItem) => {
                if (!this.allowedReportTypes.has(reportItem.type)) {
                    return;
                }
                this.updateMappedStatsWithReportItemData(reportItem, mappedStats, rtcStats);
            });
        });
        const { id: connectionId } = connectionData;
        const prevStatsData = this.prevStats.get(connectionId);
        if (prevStatsData) {
            this.propagateStatsWithRateValues(mappedStats, prevStatsData.stats);
        }
        this.prevStats.set(connectionId, {
            stats: mappedStats,
            ts: Date.now(),
        });
        scheduleTask({
            taskId: connectionId,
            delayMs: CLEANUP_PREV_STATS_TTL_MS,
            callback: () => (this.prevStats.delete(connectionId)),
        });
        return mappedStats;
    }
    updateMappedStatsWithReportItemData(statsItem, mappedStats, stats) {
        const type = statsItem.type;
        if (type === 'candidate-pair' && statsItem.state === 'succeeded' && statsItem.nominated) {
            mappedStats.connection = this.prepareConnectionStats(statsItem, stats);
            return;
        }
        const mediaType = this.getMediaType(statsItem);
        if (!mediaType) {
            return;
        }
        const ssrc = statsItem.ssrc;
        if (ssrc && this.ignoreSSRCList.includes(ssrc)) {
            return;
        }
        if (type === 'outbound-rtp') {
            const trackInfo = stats.get(statsItem.trackId)
                || stats.get(statsItem.mediaSourceId) || {};
            const statsToAdd = {
                ...statsItem,
                track: { ...trackInfo },
            };
            if (mediaType === 'audio') {
                mappedStats[mediaType].outbound.push(statsToAdd);
            }
            else {
                mappedStats[mediaType].outbound.push(statsToAdd);
            }
            return;
        }
        if (type === 'inbound-rtp') {
            const trackInfo = stats.get(statsItem.trackId)
                || stats.get(statsItem.mediaSourceId) || {};
            this.mapConnectionStatsIfNecessary(mappedStats, statsItem, stats);
            const statsToAdd = {
                ...statsItem,
                track: { ...trackInfo },
            };
            if (mediaType === 'audio') {
                mappedStats[mediaType].inbound.push(statsToAdd);
            }
            else {
                mappedStats[mediaType].inbound.push(statsToAdd);
            }
            return;
        }
        if (type === 'remote-outbound-rtp') {
            mappedStats.remote[mediaType].outbound
                .push({ ...statsItem });
            return;
        }
        if (type === 'remote-inbound-rtp') {
            this.mapConnectionStatsIfNecessary(mappedStats, statsItem, stats);
            mappedStats.remote[mediaType].inbound
                .push({ ...statsItem });
        }
    }
    getMediaType(reportItem) {
        const mediaType = (reportItem.mediaType || reportItem.kind);
        if (!['audio', 'video'].includes(mediaType)) {
            const { id: reportId } = reportItem;
            if (!reportId) {
                return undefined;
            }
            // Check for Safari browser as it does not have kind and mediaType props
            if (String(reportId).includes('Video')) {
                return 'video';
            }
            if (String(reportId).includes('Audio')) {
                return 'audio';
            }
            return undefined;
        }
        return mediaType;
    }
    propagateStatsWithRateValues(newStats, prevStats) {
        newStats.audio.inbound.forEach((report) => {
            const prev = prevStats.audio.inbound.find(({ id }) => id === report.id);
            report.bitrate = calcBitrate(report, prev, 'bytesReceived');
            report.packetRate = calcBitrate(report, prev, 'packetsReceived');
        });
        newStats.audio.outbound.forEach((report) => {
            const prev = prevStats.audio.outbound.find(({ id }) => id === report.id);
            report.bitrate = calcBitrate(report, prev, 'bytesSent');
            report.packetRate = calcBitrate(report, prev, 'packetsSent');
        });
        newStats.video.inbound.forEach((report) => {
            const prev = prevStats.video.inbound.find(({ id }) => id === report.id);
            report.bitrate = calcBitrate(report, prev, 'bytesReceived');
            report.packetRate = calcBitrate(report, prev, 'packetsReceived');
        });
        newStats.video.outbound.forEach((report) => {
            const prev = prevStats.video.outbound.find(({ id }) => id === report.id);
            report.bitrate = calcBitrate(report, prev, 'bytesSent');
            report.packetRate = calcBitrate(report, prev, 'packetsSent');
        });
    }
    mapConnectionStatsIfNecessary(mappedStats, statsItem, stats) {
        if (mappedStats.connection.id || !statsItem.transportId) {
            return;
        }
        const transportStats = stats.get(statsItem.transportId);
        if (transportStats && transportStats.selectedCandidatePairId) {
            const candidatePair = stats.get(transportStats.selectedCandidatePairId);
            mappedStats.connection = this.prepareConnectionStats(candidatePair, stats);
        }
    }
    prepareConnectionStats(candidatePair, stats) {
        if (!(candidatePair && stats)) {
            return {};
        }
        const connectionStats = { ...candidatePair };
        if (connectionStats.remoteCandidateId) {
            const candidate = stats.get(connectionStats.remoteCandidateId);
            connectionStats.remote = { ...candidate };
        }
        if (connectionStats.localCandidateId) {
            const candidate = stats.get(connectionStats.localCandidateId);
            connectionStats.local = { ...candidate };
        }
        return connectionStats;
    }
}
export default RTCStatsParser;
