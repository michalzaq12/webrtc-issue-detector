export var EventType;
(function (EventType) {
    EventType["Issue"] = "issue";
    EventType["NetworkScoresUpdated"] = "network-scores-updated";
    EventType["StatsParsingFinished"] = "stats-parsing-finished";
})(EventType || (EventType = {}));
export var IssueType;
(function (IssueType) {
    IssueType["Network"] = "network";
    IssueType["CPU"] = "cpu";
    IssueType["Server"] = "server";
    IssueType["Stream"] = "stream";
})(IssueType || (IssueType = {}));
export var IssueReason;
(function (IssueReason) {
    IssueReason["OutboundNetworkQuality"] = "outbound-network-quality";
    IssueReason["InboundNetworkQuality"] = "inbound-network-quality";
    IssueReason["OutboundNetworkMediaLatency"] = "outbound-network-media-latency";
    IssueReason["InboundNetworkMediaLatency"] = "inbound-network-media-latency";
    IssueReason["NetworkMediaSyncFailure"] = "network-media-sync-failure";
    IssueReason["OutboundNetworkThroughput"] = "outbound-network-throughput";
    IssueReason["InboundNetworkThroughput"] = "inbound-network-throughput";
    IssueReason["EncoderCPUThrottling"] = "encoder-cpu-throttling";
    IssueReason["DecoderCPUThrottling"] = "decoder-cpu-throttling";
    IssueReason["ServerIssue"] = "server-issue";
    IssueReason["UnknownVideoDecoderIssue"] = "unknown-video-decoder";
    IssueReason["LowInboundMOS"] = "low-inbound-mean-opinion-score";
    IssueReason["LowOutboundMOS"] = "low-outbound-mean-opinion-score";
    IssueReason["FrozenVideoTrack"] = "frozen-video-track";
    IssueReason["MissingVideoStreamData"] = "missing-video-stream-data";
    IssueReason["MissingAudioStreamData"] = "missing-audio-stream-data";
})(IssueReason || (IssueReason = {}));
export var MosQuality;
(function (MosQuality) {
    MosQuality[MosQuality["BAD"] = 2.1] = "BAD";
    MosQuality[MosQuality["POOR"] = 2.6] = "POOR";
    MosQuality[MosQuality["FAIR"] = 3.1] = "FAIR";
    MosQuality[MosQuality["GOOD"] = 3.8] = "GOOD";
    MosQuality[MosQuality["EXCELLENT"] = 4.3] = "EXCELLENT";
})(MosQuality || (MosQuality = {}));
