var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _WebRTCIssueDetector_running;
import { WebRTCIssueEmitter } from './WebRTCIssueEmitter';
import { EventType, } from './types';
import PeriodicWebRTCStatsReporter from './parser/PeriodicWebRTCStatsReporter';
import DefaultNetworkScoresCalculator from './NetworkScoresCalculator';
import { AvailableOutgoingBitrateIssueDetector, InboundNetworkIssueDetector, NetworkMediaSyncIssueDetector, OutboundNetworkIssueDetector, QualityLimitationsIssueDetector, UnknownVideoDecoderImplementationDetector, FrozenVideoTrackDetector, VideoDecoderIssueDetector, } from './detectors';
import { CompositeRTCStatsParser, RTCStatsParser } from './parser';
import createLogger from './utils/logger';
import MissingStreamDataDetector from './detectors/MissingStreamDataDetector';
class WebRTCIssueDetector {
    constructor(params) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        _WebRTCIssueDetector_running.set(this, false);
        this.detectors = [];
        this.logger = (_a = params.logger) !== null && _a !== void 0 ? _a : createLogger();
        this.eventEmitter = (_b = params.issueEmitter) !== null && _b !== void 0 ? _b : new WebRTCIssueEmitter();
        if (params.onIssues) {
            this.eventEmitter.on(EventType.Issue, params.onIssues);
        }
        if (params.onNetworkScoresUpdated) {
            this.eventEmitter.on(EventType.NetworkScoresUpdated, params.onNetworkScoresUpdated);
        }
        this.detectors = (_c = params.detectors) !== null && _c !== void 0 ? _c : [
            new QualityLimitationsIssueDetector(),
            new InboundNetworkIssueDetector(),
            new OutboundNetworkIssueDetector(),
            new NetworkMediaSyncIssueDetector(),
            new AvailableOutgoingBitrateIssueDetector(),
            new UnknownVideoDecoderImplementationDetector(),
            new FrozenVideoTrackDetector(),
            new VideoDecoderIssueDetector(),
            new MissingStreamDataDetector(),
        ];
        this.networkScoresCalculator = (_d = params.networkScoresCalculator) !== null && _d !== void 0 ? _d : new DefaultNetworkScoresCalculator();
        this.compositeStatsParser = (_e = params.compositeStatsParser) !== null && _e !== void 0 ? _e : new CompositeRTCStatsParser({
            statsParser: new RTCStatsParser({
                ignoreSSRCList: params.ignoreSSRCList,
                logger: this.logger,
            }),
        });
        this.statsReporter = (_f = params.statsReporter) !== null && _f !== void 0 ? _f : new PeriodicWebRTCStatsReporter({
            compositeStatsParser: this.compositeStatsParser,
            getStatsInterval: (_g = params.getStatsInterval) !== null && _g !== void 0 ? _g : 5000,
        });
        window.wid = this;
        this.autoAddPeerConnections = (_h = params.autoAddPeerConnections) !== null && _h !== void 0 ? _h : true;
        if (this.autoAddPeerConnections) {
            this.wrapRTCPeerConnection();
        }
        this.statsReporter.on(PeriodicWebRTCStatsReporter.STATS_REPORT_READY_EVENT, (report) => {
            const networkScores = this.calculateNetworkScores(report.stats);
            this.detectIssues({ data: report.stats }, networkScores);
        });
        this.statsReporter.on(PeriodicWebRTCStatsReporter.STATS_REPORTS_PARSED, (data) => {
            const payload = {
                timeTaken: data.timeTaken,
                ts: Date.now(),
            };
            if (params.onStats) {
                params.onStats(data.reportItems);
            }
            this.eventEmitter.emit(EventType.StatsParsingFinished, payload);
        });
    }
    watchNewPeerConnections() {
        if (!this.autoAddPeerConnections) {
            throw new Error('Auto add peer connections was disabled in the constructor.');
        }
        if (__classPrivateFieldGet(this, _WebRTCIssueDetector_running, "f")) {
            this.logger.warn('WebRTCIssueDetector is already started. Skip processing');
            return;
        }
        this.logger.info('Start watching peer connections');
        __classPrivateFieldSet(this, _WebRTCIssueDetector_running, true, "f");
        this.statsReporter.startReporting();
    }
    stopWatchingNewPeerConnections() {
        if (!__classPrivateFieldGet(this, _WebRTCIssueDetector_running, "f")) {
            this.logger.warn('WebRTCIssueDetector is already stopped. Skip processing');
            return;
        }
        this.logger.info('Stop watching peer connections');
        __classPrivateFieldSet(this, _WebRTCIssueDetector_running, false, "f");
        this.statsReporter.stopReporting();
    }
    handleNewPeerConnection(pc, id) {
        if (!__classPrivateFieldGet(this, _WebRTCIssueDetector_running, "f") && this.autoAddPeerConnections) {
            this.logger.debug('Skip handling new peer connection. Detector is not running', pc);
            return;
        }
        if (!__classPrivateFieldGet(this, _WebRTCIssueDetector_running, "f") && this.autoAddPeerConnections === false) {
            this.logger.info('Starting stats reporting for new peer connection');
            __classPrivateFieldSet(this, _WebRTCIssueDetector_running, true, "f");
            this.statsReporter.startReporting();
        }
        this.logger.debug('Handling new peer connection', pc);
        this.compositeStatsParser.addPeerConnection({ pc, id });
    }
    emitIssues(issues) {
        this.eventEmitter.emit(EventType.Issue, issues);
    }
    detectIssues({ data }, networkScores) {
        const issues = this.detectors
            .reduce((acc, detector) => [...acc, ...detector.detect(data, networkScores)], []);
        if (issues.length > 0) {
            this.emitIssues(issues);
        }
    }
    calculateNetworkScores(data) {
        const networkScores = this.networkScoresCalculator.calculate(data);
        this.eventEmitter.emit(EventType.NetworkScoresUpdated, networkScores);
        return networkScores;
    }
    wrapRTCPeerConnection() {
        if (!window.RTCPeerConnection) {
            this.logger.warn('No RTCPeerConnection found in browser window. Skipping');
            return;
        }
        const OriginalRTCPeerConnection = window.RTCPeerConnection;
        const onConnectionCreated = (pc) => this.handleNewPeerConnection(pc);
        function WIDRTCPeerConnection(rtcConfig) {
            const connection = new OriginalRTCPeerConnection(rtcConfig);
            onConnectionCreated(connection);
            return connection;
        }
        WIDRTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;
        window.RTCPeerConnection = WIDRTCPeerConnection;
    }
}
_WebRTCIssueDetector_running = new WeakMap();
export default WebRTCIssueDetector;
