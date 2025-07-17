export const calculateMean = (values) => values.reduce((acc, val) => acc + val, 0) / values.length;
export const calculateVariance = (mean, values) => values
    .reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
export const calculateStandardDeviation = (values) => {
    const mean = calculateMean(values);
    const variance = calculateVariance(mean, values);
    return Math.sqrt(variance);
};
export const calculateVolatility = (values) => {
    if (values.length === 0) {
        throw new Error('Cannot calculate volatility for empty array');
    }
    const mean = calculateMean(values);
    const meanAbsoluteDeviationFps = values.reduce((acc, val) => acc + Math.abs(val - mean), 0) / values.length;
    return (meanAbsoluteDeviationFps * 100) / mean;
};
