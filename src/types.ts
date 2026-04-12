export enum RemoveBGModel {
    BRIAAI_RMBG_1_4 = "briaai/RMBG-1.4",
    U2NET = "u2net",
    U2NET_HUMAN_SEG = "u2net_human_seg",
    BIREFNET_PORTRAIT = "birefnet-portrait"
}

export interface PluginInfo {
    name: string;
    support_gen_image: boolean;
    support_gen_mask: boolean;
}

export interface RunPluginRequest {
    name: string;
    image: string; // base64 encoded image
    clicks: number[][];
    scale: number; // magnification factor
}
