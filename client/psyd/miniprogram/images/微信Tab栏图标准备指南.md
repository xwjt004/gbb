# Tab栏图标准备指南

## 所需图标清单

为了完成Tab栏改造，我们需要准备以下6张图标：

### 1. 首页图标

**文件名**: 
- `tab-home.png` (未选中状态)
- `tab-home-active.png` (选中状态)

**设计要求**:
- 尺寸: 81 x 81 px
- 格式: PNG (支持透明背景)
- 颜色:
  - 未选中: #999999 (灰色)
  - 选中: #667eea (主题紫色)
- 图标元素: 房子/主页图标

**推荐设计**:
```
未选中: 灰色的简洁房子轮廓
选中: 紫色的实心房子
```

---

### 2. 购物车图标

**文件名**:
- `tab-cart.png` (未选中状态)
- `tab-cart-active.png` (选中状态)

**设计要求**:
- 尺寸: 81 x 81 px
- 格式: PNG (支持透明背景)
- 颜色:
  - 未选中: #999999 (灰色)
  - 选中: #667eea (主题紫色)
- 图标元素: 购物车图标

**推荐设计**:
```
未选中: 灰色的购物车轮廓
选中: 紫色的实心购物车
```

---

### 3. 我的图标

**文件名**:
- `tab-profile.png` (未选中状态)
- `tab-profile-active.png` (选中状态)

**设计要求**:
- 尺寸: 81 x 81 px
- 格式: PNG (支持透明背景)
- 颜色:
  - 未选中: #999999 (灰色)
  - 选中: #667eea (主题紫色)
- 图标元素: 用户/个人图标

**推荐设计**:
```
未选中: 灰色的人物头像轮廓
选中: 紫色的实心人物头像
```

---

## 图标设计工具推荐

### 在线工具
1. **Iconfont（阿里巴巴矢量图标库）**
   - 网址: https://www.iconfont.cn/
   - 优点: 大量免费图标，支持颜色自定义和下载PNG
   
2. **Flaticon**
   - 网址: https://www.flaticon.com/
   - 优点: 图标风格统一，质量高
   
3. **IconPark**
   - 网址: https://iconpark.oceanengine.com/
   - 优点: 字节跳动出品，图标现代简洁

### 设计软件
1. **Figma** (在线 + 桌面)
2. **Sketch** (macOS)
3. **Adobe Illustrator** (专业)

---

## 快速生成方案

### 方案1: 使用Iconfont

1. 访问 https://www.iconfont.cn/
2. 搜索"home"、"cart"、"user"
3. 选择喜欢的图标，添加到项目
4. 下载PNG格式：
   - 尺寸选择 81px
   - 颜色选择 #999999 (未选中)
   - 再次下载，颜色选择 #667eea (选中)
5. 重命名文件并放到 `images` 目录

### 方案2: 使用在线图标编辑器

访问: https://icon-icons.com/
1. 搜索并下载图标
2. 使用在线工具调整颜色和尺寸
3. 导出为PNG

### 方案3: 使用Emoji转PNG

临时方案（用于测试）:
1. 访问: https://emojipedia.org/
2. 截图emoji
3. 使用PS或在线工具调整尺寸和颜色

---

## 临时占位方案

在正式图标准备好之前，我们可以：

1. **复用现有图标**
   - 使用 `placeholder.png` 作为临时图标
   - 或复制 `user.png` 和 `user-active.png`

2. **使用纯色方块**
   - 快速生成纯色PNG用于测试

3. **使用文字图标**
   - 在图标位置显示文字

---

## 放置图标的步骤

### 1. 准备好6张图标后

```bash
# 将图标文件复制到项目目录
cp tab-home.png d:\vscode\GBB\client\psyd\miniprogram\images\
cp tab-home-active.png d:\vscode\GBB\client\psyd\miniprogram\images\
cp tab-cart.png d:\vscode\GBB\client\psyd\miniprogram\images\
cp tab-cart-active.png d:\vscode\GBB\client\psyd\miniprogram\images\
cp tab-profile.png d:\vscode\GBB\client\psyd\miniprogram\images\
cp tab-profile-active.png d:\vscode\GBB\client\psyd\miniprogram\images\
```

### 2. 验证图标

在微信开发者工具中：
1. 打开项目
2. 查看Tab栏是否正常显示
3. 切换Tab，检查选中/未选中状态

### 3. 图标不显示的排查

如果图标不显示：
- 检查文件名是否正确
- 检查文件路径是否正确
- 检查图标尺寸是否为81x81px
- 检查图标格式是否为PNG
- 重新编译小程序

---

## 当前状态

✅ Tab栏配置已完成
✅ 三个Tab页面已创建:
   - pages/index/index (首页)
   - pages/cart/cart (购物车)
   - pages/profile/profile (我的)

⏳ 待完成:
   - [ ] 准备6张Tab图标
   - [ ] 放置图标到images目录
   - [ ] 测试Tab切换功能

---

## 联系设计师

如果团队有设计师，可以发送以下需求：

**标题**: 微信小程序Tab栏图标设计需求

**内容**:
```
需要设计3组共6张Tab栏图标：

1. 首页图标 (home)
   - 未选中状态 (#999999)
   - 选中状态 (#667eea)

2. 购物车图标 (cart)
   - 未选中状态 (#999999)
   - 选中状态 (#667eea)

3. 我的图标 (profile/user)
   - 未选中状态 (#999999)
   - 选中状态 (#667eea)

设计规范：
- 尺寸: 81 x 81 px
- 格式: PNG (透明背景)
- 风格: 简洁、现代、线性
- 颜色: 如上所示

文件命名：
- tab-home.png / tab-home-active.png
- tab-cart.png / tab-cart-active.png
- tab-profile.png / tab-profile-active.png
```

---

## 示例图标

参考微信官方小程序的Tab图标风格：
- 简洁的线性图标
- 选中时可以是实心或加粗
- 保持视觉统一

---

**文档创建时间**: 2025-11-24  
**最后更新**: 2025-11-24
