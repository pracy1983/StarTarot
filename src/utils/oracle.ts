export function normalizeOracleServices<T extends { allows_video?: boolean | null; allows_text?: boolean | null }>(oracle: T) {
    if (oracle.allows_video || oracle.allows_text) {
        return oracle
    }

    return {
        ...oracle,
        allows_video: false,
        allows_text: true
    }
}

export function normalizeOracleServicesList<T extends { allows_video?: boolean | null; allows_text?: boolean | null }>(oracles: T[] = []) {
    return oracles.map(normalizeOracleServices)
}
