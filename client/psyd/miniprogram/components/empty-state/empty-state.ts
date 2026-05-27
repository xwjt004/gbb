// 空状态组件
Component({
  properties: {
    image: {
      type: String,
      value: ''
    },
    message: {
      type: String,
      value: '暂无数据'
    },
    buttonText: {
      type: String,
      value: ''
    }
  },

  methods: {
    onButtonTap(this: WechatMiniprogram.Component.TrivialInstance) {
      this.triggerEvent('buttontap');
    }
  }
});
