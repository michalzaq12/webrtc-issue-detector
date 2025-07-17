export const checkIsConnectionClosed = (pc) => pc.iceConnectionState === 'closed' || pc.connectionState === 'closed';
export const calcValueRate = (stats, prevStats, statPropName) => {
    if (!prevStats) {
        return 0;
    }
    const currentVal = stats[statPropName];
    const prevVal = prevStats[statPropName];
    if (currentVal == null || prevVal == null) {
        return 0;
    }
    // Time is in such format: 1657105307362.007 (mcs after dot)
    const timeDiffMs = (Math.floor(stats.timestamp) - Math.floor(prevStats.timestamp));
    if (timeDiffMs === 0) {
        return 0;
    }
    const valDiff = Number(currentVal) - Number(prevVal);
    return (valDiff / timeDiffMs) * 1000;
};
export const calcBitrate = (stats, prevStats, statPropName) => 8 * calcValueRate(stats, prevStats, statPropName);
