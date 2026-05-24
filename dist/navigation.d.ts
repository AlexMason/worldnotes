export interface WikiLinkTarget {
    page: string;
    display: string;
}
export declare function pageDisplayName(page: string): string;
export declare function parseWikiLink(value: string): WikiLinkTarget;
export declare function encodePathSearch(search: string, trail: string[]): string;
export declare function decodePathSearch(search: string): string[];
