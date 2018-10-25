export interface Entity {
    name: string
    preview?: string
    definitions: SearchAndCapturePatterns[]
    references: SearchAndCapturePatterns[]
    implementations: SearchAndCapturePatterns[]
}

export interface SearchAndCapturePatterns {
    capture: string
    search: string
}
