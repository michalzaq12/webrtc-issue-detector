import { checkIsConnectionClosed } from './utils';
class CompositeRTCStatsParser {
    constructor(params) {
        this.connections = [];
        this.statsParser = params.statsParser;
    }
    listConnections() {
        return [...this.connections];
    }
    addPeerConnection(payload) {
        this.connections.push({
            id: payload.id ?? String(Date.now() + Math.random().toString(32)),
            pc: payload.pc,
        });
    }
    removePeerConnection(payload) {
        const pcIdxToDelete = this.connections.findIndex(({ pc }) => pc === payload.pc);
        if (pcIdxToDelete >= 0) {
            this.removeConnectionsByIndexes([pcIdxToDelete]);
        }
    }
    async parse() {
        // DESC order to remove elements afterwards without index shifting
        const closedConnectionsIndexesDesc = [];
        const statsPromises = this.connections.map(async (info, index) => {
            if (checkIsConnectionClosed(info.pc)) {
                closedConnectionsIndexesDesc.unshift(index);
                return undefined;
            }
            return this.statsParser.parse(info);
        });
        if (closedConnectionsIndexesDesc.length) {
            this.removeConnectionsByIndexes(closedConnectionsIndexesDesc);
        }
        const statsItemsByPC = await Promise.all(statsPromises);
        return statsItemsByPC.filter((item) => item !== undefined);
    }
    removeConnectionsByIndexes(closedConnectionsIndexesDesc) {
        closedConnectionsIndexesDesc.forEach((idx) => {
            this.connections.splice(idx, 1);
        });
    }
}
export default CompositeRTCStatsParser;
