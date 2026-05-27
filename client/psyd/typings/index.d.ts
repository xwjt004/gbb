/// <reference path="./types/index.d.ts" />

interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo,
    justLoggedIn: boolean, // 标记是否刚刚完成登录
    loginTimestamp: number, // 登录时间戳
    apiBaseUrl: string // API基础URL
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
}