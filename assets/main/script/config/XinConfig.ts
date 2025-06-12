import { Global } from "../base/Global";
import { XinCli } from "../utils/cli/XinCli";
import { XinUtil } from "../utils/XinUtil";

export const XinConfig = {
    "customAdBanner": [
        "adunit-14b8738371ab6b2e",
        "adunit-14b8738371ab6b2e",
        "adunit-14b8738371ab6b2e"
    ],
    "customAd": [
        "adunit-43485078ffca16e5",   // banner失败补充广告
        "adunit-94ab6f26b04aa948",   // 首页_单个格子
        "adunit-94ab6f26b04aa948"    // 首页_单个格子_2
    ],
    "videoAd": [
        "adunit-d50aec02bc1c3265",
        "adunit-d50aec02bc1c3265"    // 6~15秒 debug
    ],
    "interstitialAd": [
        "adunit-e72400e5d13b2912",
        "adunit-e72400e5d13b2912"
    ],
    "wxConfig": {
        "appId": "wx0fd06fb15a178da5",                                     // 微信应用appid
        "getOpenIdUrl": "https://g.junes.cc/wx/getOpenId",                 // 获取openIdUrl
        "shareList": [
            {
                "title": "三分钟上手，五分钟沉迷！",
                "imgUrl": "https://mmocgame.qpic.cn/wechatgame/R6UgI69c0qjwMB22NMWQf5xF5oEOiaUkibkCTSIqM5mugKM2ybjwUsah110xIibCyXJ/0"
            },
            {
                "title": "据说99.99%的人过不了第2关",
                "imgUrl": "https://mmocgame.qpic.cn/wechatgame/2PbYKC5Q34v1IDV3QAu7nEiciaoQdgY9RiaPSvqev0QEYNiclN0EG7tia9jJKp2xribTCg/0"
            },
            {
                "title": "试过了，第二关真的能过",
                "imgUrl": "https://mmocgame.qpic.cn/wechatgame/vldTiaKib2oGVqlb6ick3hhD8UKnduyapfus1qqEo2SicA4LjkeqXJwXqyX7QbvOn1L1/0"
            }
        ]
    },
    "debugOpenId": [
        "web_test",
        "ozn5467rTtdfcHKS0fCo-o_o7Tm8",
        "oyVIY7RjT6yimQ_7Qev8zis1NfPE",
    ],
    "dyVideoAd": [
        "30ln5cbe4n7o1va7o8",
        "30ln5cbe4n7o1va7o8"   // 6~15秒 debug
    ],
    "dyInterstitialAd": [
        "61sh8fpp5dh39mhldn",
        "61sh8fpp5dh39mhldn"
    ],
    "dyConfig": {
        "appId": "tt8f12f9af10186a0002",                                     // 微信应用appid
        "getOpenIdUrl": "https://g.junes.cc/dy/getOpenId",                   // 获取openIdUrl
    },
}

export class GmConfig {
    // 获取随机分享信息
    static getRandomShare(): { title: string; imgUrl: string } {
        let shares = XinConfig.wxConfig.shareList;
        if (XinConfig.wxConfig.shareList.length === 0) {
            throw new Error("No shares available to select from.");
        }

        if (!XinUtil.Storage.getValue("gm_config_shareList")) {
            console.log("gm config getRandomShare");
            XinCli.Php.getGmConfig().then((res: any) => {
                XinUtil.Storage.set("gm_config_shareList", res?.sharesOpen ? res?.shareList : [], 60 * 60)
            });
        }
        const sharesList = XinUtil.Storage.getValue("gm_config_shareList");
        shares = sharesList?.length > 0 ? sharesList : shares;

        const randomIndex = Math.floor(Math.random() * shares.length);
        const randomShare = shares[randomIndex];
        
        return {
            title: randomShare.title,
            imgUrl: randomShare.imgUrl
        };
    }

    // 是否降低关卡难度
    static isDumbDown() {
        // 看广告2次后未通关则降低难度
        if (Global.ins.lvAdData.ad >= 2) {
            return true;
        }
        // 看过1次广告，并且失败过1次的也降低难度
        if (Global.ins.lvAdData.ad >= 1 && Global.ins.lvAdData.fail > 0) {
            return true;
        }
        // 失败次数超过3次后降低难度
        if (Global.ins.lvAdData.fail >= 3) {
            return true;
        }
        return false;
    }

}